from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
import httpx
import os
import json
import re
import asyncio

app = FastAPI()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

PRODUCTS_SERVICE_URL = os.getenv("PRODUCTS_SERVICE_URL", "http://products_service:8000")
CART_SERVICE_URL = os.getenv("CART_SERVICE_URL", "http://cart_service:8000")
RECOMMENDATION_SERVICE_URL = os.getenv(
    "RECOMMENDATION_SERVICE_URL", "http://recommendation_service:8000"
)

INR_TO_GBP = 106

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are Vera — Velour's expert AI shopping assistant and personal stylist. \
Velour is a premium UK online marketplace. All prices are in British pounds (£).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT — CRITICAL, FOLLOW EXACTLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Always respond with valid JSON in this exact shape:

  {
    "reply": "your conversational message",
    "products": [product_id_1, product_id_2],
    "options": ["Option A", "Option B"]
  }

FIELD RULES:

"reply" (always required):
  • When recommending products: ONE short sentence only (e.g. "Here are some brilliant picks for you!")
    NEVER describe individual products in text — the customer sees the cards.
    NEVER list product names, prices, or features in "reply" when "products" is present.
  • When answering policy/order questions: 2–4 clear sentences.
  • Vary your openers. Don't start with "I". Keep it warm and direct.

"products" (optional — include when recommending items):
  • Array of product_id INTEGERS ONLY — e.g. [12345, 67890, 11111]
  • Choose 2–4 products that BEST match the customer's need.
  • Prefer higher ratings and better value. Mix price points when useful.
  • Only use product_ids from the catalogue below — NEVER invent IDs.
  • Omit this field (or use []) when not recommending specific products.
  • KEEP THIS ARRAY SHORT — just the integers, nothing else.

"options" (optional — include ONLY when asking a clarifying question):
  • 2–4 short labels (1–5 words each) for the customer to tap.
  • Use when the customer's request is vague and you need 1 more detail.
  • Good: ["Men's", "Women's", "Kids'"] or ["Under £30", "£30–£60", "Over £60"]
  • NEVER include "options" in the same response as "products" — pick one or the other.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR PERSONALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Warm, confident, genuinely excited about helping
• Conversational UK English — knowledgeable friend, not a brochure
• Direct and concise — no waffle
• Never pushy — guide, don't pressure

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR GOALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. UNDERSTAND — If the need is vague, ask ONE question WITH options (no products yet)
2. RECOMMEND — Return matching product_ids (2–4) with a short warm intro in "reply"
3. SELL THE BENEFIT — In "reply" mention why these are great (1 sentence max)
4. REMOVE BARRIERS — Address price/returns concerns naturally in "reply"
5. CLOSE — End "reply" with a soft question to continue the conversation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SALES SKILLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• "Just browsing" → use options: ["Browse categories", "Find a gift", "Get a deal", "Something specific"]
• Price objection → acknowledge, show value, offer cheaper alternative via product_ids
• Great ratings → mention in reply: "Each has over 100,000 happy customers"
• Good discount → mention in reply: "and they're all brilliantly priced right now"
• Cross-sell → after recommending, mention "customers who bought this also loved..."
• Out of stock → suggest the next best alternative via product_ids

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VELOUR POLICIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Free UK delivery on orders over £50
• Easy 30-day hassle-free returns — no questions asked
• All products genuine and quality-checked
• Secure checkout — all major cards
• Support: support@velour.co.uk | +44 20 7946 0321
• Delivery: 2–5 working days

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HANDLING COMMON SITUATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Orders: Use provided order data. If not logged in, ask them to log in or email support.
• Returns: 30-day no-hassle. Direct to support@velour.co.uk to start a return.
• Complaints: Empathise first, then solve. Never be defensive.
• Comparison: Be honest — recommend the genuinely better product for their need.

Use product/order context provided below precisely. Never guess prices or stock."""


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[Message] = []
    product_context: Optional[dict] = None
    user_id: Optional[str] = None
    auth_token: Optional[str] = None


def fmt_product(p: dict) -> str:
    price = round(p.get("discount_price", 0) / INR_TO_GBP, 2)
    was = round(p.get("actual_price", 0) / INR_TO_GBP, 2)
    stock = p.get("stock", 0)
    discount = round(((was - price) / was) * 100) if was > price else 0
    # Keep compact — every token counts against rate limits
    name = p.get("name", "")[:80]
    line = (
        f"id:{p.get('product_id')} | {name} | "
        f"£{price:.2f}" + (f"(was £{was:.2f},{discount}%off)" if discount else "") +
        f" | ⭐{p.get('ratings','?')}/5 ({p.get('no_of_ratings',0):,}rev) | "
        f"{'✓' if stock > 0 else '✗'}stock"
        + (f"(only {stock}left)" if 0 < stock <= 10 else "")
    )
    return line


async def search_products(query: str, top_k: int = 6) -> List[dict]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{RECOMMENDATION_SERVICE_URL}/product_semantic_search",
                params={"query": query, "top_k": top_k},
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return []


async def fetch_orders(user_id: str, token: str) -> List[dict]:
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{CART_SERVICE_URL}/transactions/{user_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return []


SEARCH_TRIGGERS = {
    "recommend", "suggest", "find", "looking for", "need a", "want a", "want some",
    "show me", "i want", "best", "top", "cheap", "budget", "under £", "under £",
    "pounds", "affordable", "compare", "vs", "similar", "alternative",
    "buy", "purchase", "headphone", "phone", "laptop", "shoe", "jacket", "dress",
    "earphone", "speaker", "watch", "bag", "camera", "tv", "fridge",
    "gift", "present", "birthday", "christmas", "option", "deal", "sale",
    "shirt", "trouser", "pant", "skirt", "top", "hoodie", "blouse",
}

ORDER_TRIGGERS = {
    "order", "orders", "purchase", "bought", "delivery", "tracking",
    "track", "receipt", "invoice", "dispatched", "shipped", "arrived", "where is",
    "when will", "my purchase", "transaction",
}


@app.post("/chat")
async def chat(req: ChatRequest):
    if not GEMINI_API_KEY:
        return {"response": "Gemini API key is not configured. Please contact support.", "options": [], "products": []}

    msg_lower = req.message.lower()
    context_parts = [SYSTEM_PROMPT]
    catalogue_products: List[dict] = []

    # Current product context
    if req.product_context:
        context_parts.append(
            "=== PRODUCT THE CUSTOMER IS VIEWING RIGHT NOW ===\n"
            + fmt_product(req.product_context)
            + "\nThis is the primary product. Refer to it when answering questions."
        )
        catalogue_products.append(req.product_context)

    # Catalogue search — also fire when recent history suggests a product flow
    is_product_query = any(t in msg_lower for t in SEARCH_TRIGGERS)
    if not is_product_query and req.history:
        recent_text = " ".join(m.content for m in req.history[-4:]).lower()
        if any(t in recent_text for t in SEARCH_TRIGGERS):
            is_product_query = True

    if is_product_query and not req.product_context:
        # Build combined query: merge recent user turns with current message
        user_context = [m.content for m in req.history[-4:] if m.role == "user"]
        search_query = " ".join(user_context + [req.message]) if user_context else req.message

        results = await search_products(search_query, top_k=5)
        if results:
            catalogue_products = results
            formatted = "\n\n---\n".join(fmt_product(p) for p in results)
            context_parts.append(
                "=== MATCHING PRODUCTS FROM VELOUR'S CATALOGUE ===\n"
                "Select 2–4 of these by their product_id in your response.\n\n"
                + formatted
            )

    # Order history
    is_order_query = any(t in msg_lower for t in ORDER_TRIGGERS)
    if is_order_query and req.user_id and req.auth_token:
        orders = await fetch_orders(req.user_id, req.auth_token)
        if orders:
            lines = []
            for o in orders[-5:]:
                total = round(o.get("total_amount", 0) / INR_TO_GBP, 2)
                items = o.get("items", [])
                summary = ", ".join(i.get("name", "item")[:30] for i in items[:2])
                if len(items) > 2:
                    summary += "…"
                lines.append(
                    f"• Order #{o.get('order_id')} — £{total:.2f} — "
                    f"{o.get('payment_method', 'card')} — "
                    f"Placed: {str(o.get('created_at', ''))[:10]} — "
                    f"Items: {summary or f'{len(items)} item(s)'}"
                )
            context_parts.append(
                "=== CUSTOMER'S RECENT ORDERS ===\n" + "\n".join(lines)
            )
        else:
            context_parts.append(
                "=== ORDER NOTE ===\nNo orders found for this customer account."
            )

    full_system = "\n\n".join(context_parts)

    # Build Gemini conversation
    contents = []
    for m in req.history[-6:]:
        gemini_role = "model" if m.role == "assistant" else "user"
        contents.append({"role": gemini_role, "parts": [{"text": m.content}]})
    contents.append({"role": "user", "parts": [{"text": req.message}]})

    payload = {
        "system_instruction": {"parts": [{"text": full_system}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.85,
            "maxOutputTokens": 1024,
            "topP": 0.95,
            "responseMimeType": "application/json",
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ],
    }

    reply = ""
    options: List[str] = []
    product_cards: List[dict] = []

    for attempt in range(2):  # one retry on 429
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    GEMINI_API_URL,
                    params={"key": GEMINI_API_KEY},
                    json=payload,
                )
                if resp.status_code == 429 and attempt == 0:
                    await asyncio.sleep(4)
                    continue
                resp.raise_for_status()
                data = resp.json()
                raw_text = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                    .strip()
                )

                try:
                    clean = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.DOTALL).strip()
                    parsed = json.loads(clean)
                    reply = parsed.get("reply", "").strip()

                    raw_opts = parsed.get("options", [])
                    if isinstance(raw_opts, list):
                        options = [str(o).strip() for o in raw_opts if str(o).strip()][:4]

                    raw_pids = parsed.get("products", [])
                    if isinstance(raw_pids, list) and catalogue_products:
                        pid_map = {p.get("product_id"): p for p in catalogue_products}
                        for pid in raw_pids[:4]:
                            try:
                                pid_int = int(pid)
                            except (TypeError, ValueError):
                                continue
                            if pid_int in pid_map:
                                p = pid_map[pid_int]
                                price = round(p.get("discount_price", 0) / INR_TO_GBP, 2)
                                was = round(p.get("actual_price", 0) / INR_TO_GBP, 2)
                                product_cards.append({
                                    "product_id": p.get("product_id"),
                                    "name": p.get("name", ""),
                                    "image": p.get("image", ""),
                                    "sub_category": p.get("sub_category", ""),
                                    "price": price,
                                    "was": was if was > price else None,
                                    "discount_pct": round(((was - price) / was) * 100) if was > price else 0,
                                    "rating": p.get("ratings", 0),
                                    "no_of_ratings": p.get("no_of_ratings", 0),
                                    "stock": p.get("stock", 0),
                                })
                except (json.JSONDecodeError, ValueError):
                    reply = raw_text

                if not reply:
                    reply = "Sorry, I couldn't generate a response. Please try again."
                break  # success — exit retry loop

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                if attempt == 0:
                    await asyncio.sleep(4)
                    continue
                reply = "I'm a little busy right now — please try again in a moment!"
            elif e.response.status_code in (401, 403):
                reply = "There's an issue with my configuration. Please contact support@velour.co.uk."
                break
            else:
                reply = "Something went wrong on my end. Please try again shortly."
                break
        except httpx.ConnectError:
            reply = "I can't reach my AI brain right now. Please try again."
            break
        except Exception:
            reply = "Something went wrong. Please try again in a moment."
            break

    return {"response": reply, "options": options, "products": product_cards}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "provider": "gemini",
        "model": GEMINI_MODEL,
        "api_key_configured": bool(GEMINI_API_KEY),
    }
