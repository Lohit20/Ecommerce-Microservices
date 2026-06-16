"""ADK tools for Vera — each tool is a plain async function.

Rules (enforced by ADK):
  • The last parameter must be `tool_context: ToolContext` — ADK injects it.
  • `tool_context` must NOT appear in the docstring — ADK reads the docstring
    to describe the tool to the model.
  • All other parameters are exposed to the model via their type hints + docstring.
"""

from typing import List
from google.adk.tools import ToolContext
import services as svc


async def search_catalogue(query: str, max_results: int, tool_context: ToolContext) -> dict:
    """Search Velour's product catalogue for items matching the shopper's request.

    Args:
        query: Natural-language search query, e.g. "wireless earbuds under £40"
        max_results: How many results to return (use 5 by default, max 8)
    """
    results = await svc.search(query, top_k=min(max_results, 8))

    fallback = False
    if not results:
        recs = await svc.recommendations(top_n=5)
        results = []
        for cat_products in recs.values():
            results.extend(cat_products if isinstance(cat_products, list) else [])
            if len(results) >= 6:
                break
        fallback = True

    cards = [svc.shape_card(p) for p in results]

    # Write full cards to session state for the FastAPI layer to collect
    state = tool_context.state
    candidates = dict(state.get("candidates") or {})
    for c in cards:
        candidates[str(c["product_id"])] = c
    tool_context.state["candidates"] = candidates
    tool_context.state["display_ids"] = [c["product_id"] for c in cards]

    # Return a compact summary so as not to bloat the agent's context window
    summary = [
        f"id:{c['product_id']} | {c['name'][:60]} | £{c['price']:.2f}"
        + (f" (was £{c['was']:.2f}, {c['discount_pct']}% off)" if c.get("was") else "")
        + f" | ⭐{c['rating']} | stock:{c['stock']}"
        for c in cards
    ]
    return {
        "count": len(cards),
        "fallback_to_recommendations": fallback,
        "products": summary,
    }


async def lookup_product(product_id: int, tool_context: ToolContext) -> dict:
    """Fetch complete details for a single product by its numeric ID.

    Args:
        product_id: The integer product_id to look up
    """
    p = await svc.product(product_id)
    if not p:
        return {"error": "product_not_found", "product_id": product_id}

    card = svc.shape_card(p)

    # Add to session candidates
    state = tool_context.state
    candidates = dict(state.get("candidates") or {})
    candidates[str(product_id)] = card
    tool_context.state["candidates"] = candidates

    return card


async def get_my_orders(tool_context: ToolContext) -> dict:
    """Fetch the signed-in shopper's recent order history."""
    state = tool_context.state
    user_id = state.get("user_id")
    auth_token = state.get("auth_token")

    if not user_id or not auth_token:
        return {
            "logged_in": False,
            "message": "Shopper is not signed in. Ask them to sign in to view orders.",
        }

    order_list = await svc.orders(user_id, auth_token)
    if not order_list:
        return {
            "logged_in": True,
            "orders": [],
            "message": "No orders found for this account.",
        }

    # Return the 3 most recent orders with a readable summary
    recent = order_list[-3:]
    summaries = []
    for o in reversed(recent):
        total = svc.to_gbp(o.get("total_amount", 0))
        items = o.get("product_cart", o.get("items", []))
        names = [
            i.get("name", f"product #{i.get('product_id', '?')}")[:40]
            for i in items[:3]
        ]
        if len(items) > 3:
            names.append(f"+ {len(items) - 3} more")
        summaries.append({
            "order_id": o.get("order_id"),
            "total": f"£{total:.2f}",
            "payment": o.get("payment_method", "card"),
            "date": str(o.get("created_at", ""))[:10],
            "items": names,
        })

    return {"logged_in": True, "orders": summaries}


async def view_cart(tool_context: ToolContext) -> dict:
    """View the current contents of the signed-in shopper's cart."""
    state = tool_context.state
    user_id = state.get("user_id")
    auth_token = state.get("auth_token")

    if not user_id or not auth_token:
        return {
            "logged_in": False,
            "message": "Shopper is not signed in. Ask them to sign in.",
        }

    cart = await svc.cart(user_id, auth_token)
    if not cart or not cart.get("items"):
        return {"logged_in": True, "items": [], "message": "Cart is empty."}

    items = cart["items"]
    total = sum(
        svc.to_gbp(i.get("price", 0)) * i.get("quantity", 1) for i in items
    )
    summary = [
        f"product_id:{i.get('product_id')} qty:{i.get('quantity', 1)} "
        f"£{svc.to_gbp(i.get('price', 0)):.2f} each"
        for i in items
    ]
    return {
        "logged_in": True,
        "item_count": len(items),
        "estimated_total": f"£{total:.2f}",
        "items": summary,
    }


async def propose_add_to_cart(product_id: int, tool_context: ToolContext) -> dict:
    """Propose adding a product to the cart and ask the shopper to confirm.

    This does NOT modify the cart. It checks stock and records the intended action
    so that confirm_add_to_cart can execute it after the shopper says yes.
    Always call this first, then ask the shopper to confirm.

    Args:
        product_id: The integer product_id of the item to add
    """
    state = tool_context.state
    user_id = state.get("user_id")
    auth_token = state.get("auth_token")

    if not user_id or not auth_token:
        return {
            "logged_in": False,
            "message": "Shopper must be signed in to add to cart. Ask them to sign in.",
        }

    p = await svc.product(product_id)
    if not p:
        return {"error": "product_not_found", "product_id": product_id}

    card = svc.shape_card(p)
    if card["stock"] <= 0:
        return {
            "error": "out_of_stock",
            "product": card["name"],
            "message": "Item is out of stock. Suggest alternatives.",
        }

    # Record the pending action (safety gate for confirm_add_to_cart)
    tool_context.state["pending_action"] = {
        "type": "add_to_cart",
        "product_id": product_id,
        "quantity": 1,
    }
    tool_context.state["options"] = ["Yes, add to cart", "No thanks"]

    # Ensure the card is in candidates so the frontend renders it
    candidates = dict(state.get("candidates") or {})
    candidates[str(product_id)] = card
    tool_context.state["candidates"] = candidates
    display_ids = list(state.get("display_ids") or [])
    if product_id not in display_ids:
        display_ids.append(product_id)
    tool_context.state["display_ids"] = display_ids

    return {
        "status": "awaiting_confirmation",
        "product": card["name"],
        "price": f"£{card['price']:.2f}",
        "stock_available": card["stock"],
        "instruction": "Ask the shopper to confirm. Do NOT call confirm_add_to_cart until they say yes.",
    }


async def confirm_add_to_cart(product_id: int, quantity: int, tool_context: ToolContext) -> dict:
    """Execute a previously proposed cart addition after the shopper has confirmed.

    Only call this when the shopper's latest message is a clear yes to the pending proposal.
    The propose_add_to_cart tool must have been called first in this conversation.

    Args:
        product_id: The integer product_id to add (must match the pending proposal)
        quantity: Number of units to add (usually 1)
    """
    state = tool_context.state
    user_id = state.get("user_id")
    auth_token = state.get("auth_token")

    if not user_id or not auth_token:
        return {"logged_in": False, "message": "Shopper must be signed in."}

    # Safety check: if pending_action exists in this session, verify it matches
    pending = state.get("pending_action")
    if pending and pending.get("product_id") != product_id:
        return {
            "error": "product_id_mismatch",
            "message": "Proposed product does not match. Call propose_add_to_cart again.",
        }

    result = await svc.cart_add(
        user_id, [{"product_id": product_id, "quantity": quantity}], auth_token
    )

    # Clear the pending action regardless of outcome
    tool_context.state["pending_action"] = None

    if result.get("error") == "insufficient_stock":
        tool_context.state["options"] = []
        return {
            "status": "out_of_stock",
            "message": "Item just sold out. Apologise and suggest alternatives.",
        }

    if result.get("ok"):
        tool_context.state["options"] = ["Go to checkout", "Keep shopping"]
        return {
            "status": "added",
            "product_id": product_id,
            "quantity": quantity,
            "message": "Successfully added to cart.",
        }

    return {"status": "error", "message": result.get("error", "Unknown error")}


async def set_quick_replies(options_csv: str, tool_context: ToolContext) -> dict:
    """Set quick-reply button labels for the shopper to tap as their next message.

    Use when asking a clarifying question (e.g. budget range, category preference).
    Pass the button labels as a single comma-separated string.

    Args:
        options_csv: 2-4 button labels separated by commas, e.g. "Men's shirts,Women's shirts,Kids' shirts"
    """
    items = [o.strip() for o in options_csv.split(",") if o.strip()][:4]
    tool_context.state["options"] = items
    return {"set": True, "options": items}
