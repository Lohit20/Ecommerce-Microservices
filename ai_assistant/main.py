from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os

app = FastAPI()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
PRODUCTS_SERVICE_URL = os.getenv("PRODUCTS_SERVICE_URL", "http://products_service:8000")
CART_SERVICE_URL = os.getenv("CART_SERVICE_URL", "http://cart_service:8000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """You are Vera, Velour's friendly AI shopping assistant. Velour is a UK online marketplace.

You help customers with:
- Finding products that match their needs and budget (prices are in GBP £)
- Comparing products and answering questions about specs/features
- Cart and order questions
- Returns, delivery, and account support

Key facts about Velour:
- Free UK delivery on orders over £50
- Easy 30-day returns on all items
- All products are genuine and quality-checked
- Support: support@velour.co.uk

Rules:
- Be warm, concise, and helpful. Max 3-4 sentences per reply unless detail is needed.
- Always quote prices in £. Never invent prices or specs not in the context.
- If product info is provided below, use it to answer accurately.
- If order info is provided, reference it directly.
- If you genuinely don't know something, say so and suggest contacting support."""

INR_TO_GBP = 106


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[Message] = []
    product_context: Optional[dict] = None
    user_id: Optional[str] = None
    auth_token: Optional[str] = None


def format_product(p: dict) -> str:
    price = round(p.get("discount_price", 0) / INR_TO_GBP, 2)
    was = round(p.get("actual_price", 0) / INR_TO_GBP, 2)
    discount = round(((was - price) / was) * 100) if was > price else 0
    lines = [
        f"Name: {p.get('name', '')}",
        f"Price: £{price:.2f}" + (f" (was £{was:.2f}, {discount}% off)" if discount else ""),
        f"Category: {p.get('sub_category', p.get('main_category', ''))}",
        f"Rating: {p.get('ratings', 'N/A')}/5 from {p.get('no_of_ratings', 0):,} reviews",
        f"Stock: {'In stock' if p.get('stock', 0) > 0 else 'Out of stock'}",
    ]
    return "\n".join(lines)


async def search_products(query: str) -> List[dict]:
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(f"{PRODUCTS_SERVICE_URL}/get_all_products/")
            if resp.status_code == 200:
                q = query.lower()
                matches = [
                    p for p in resp.json()
                    if q in p.get("name", "").lower()
                    or q in p.get("main_category", "").lower()
                    or q in p.get("sub_category", "").lower()
                ]
                matches.sort(key=lambda p: -p.get("ratings", 0))
                return matches[:5]
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


@app.post("/chat")
async def chat(req: ChatRequest):
    context_blocks = [SYSTEM_PROMPT]

    # Current product page context
    if req.product_context:
        context_blocks.append(
            "=== Product the customer is currently viewing ===\n"
            + format_product(req.product_context)
        )

    # Product search for recommendation/comparison queries
    search_triggers = ["recommend", "suggest", "find", "looking for", "need", "want",
                       "best", "compare", "similar", "cheap", "under £", "budget", "buy"]
    msg_lower = req.message.lower()
    if any(t in msg_lower for t in search_triggers) and not req.product_context:
        results = await search_products(req.message)
        if results:
            formatted = "\n\n".join(format_product(p) for p in results)
            context_blocks.append("=== Relevant products from our catalogue ===\n" + formatted)

    # Order history for order-related queries
    order_triggers = ["order", "orders", "purchase", "bought", "delivery", "tracking", "receipt"]
    if any(t in msg_lower for t in order_triggers) and req.user_id and req.auth_token:
        orders = await fetch_orders(req.user_id, req.auth_token)
        if orders:
            lines = []
            for o in orders[-4:]:
                total = round(o.get("total_amount", 0) / INR_TO_GBP, 2)
                lines.append(
                    f"Order #{o.get('order_id')} — £{total:.2f} — "
                    f"{o.get('payment_method', '')} — {o.get('created_at', '')[:10]}"
                )
            context_blocks.append("=== Customer's recent orders ===\n" + "\n".join(lines))

    system = "\n\n".join(context_blocks)
    messages = [{"role": "system", "content": system}]
    for m in req.history[-10:]:
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": req.message})

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": messages,
                    "stream": False,
                    "options": {"temperature": 0.7, "num_predict": 400},
                },
            )
            resp.raise_for_status()
            reply = resp.json().get("message", {}).get("content", "").strip()
    except httpx.ConnectError:
        reply = (
            "I'm not able to connect right now — please make sure Ollama is running "
            "(`ollama serve`) and try again."
        )
    except Exception:
        reply = "Something went wrong. Please try again in a moment."

    return {"response": reply}


@app.get("/health")
async def health():
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            ollama_ok = r.status_code == 200
            models = [m["name"] for m in r.json().get("models", [])] if ollama_ok else []
    except Exception:
        ollama_ok = False
        models = []
    return {"status": "ok", "ollama_connected": ollama_ok, "model": OLLAMA_MODEL, "available_models": models}
