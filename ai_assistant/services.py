import os
from typing import Optional
import httpx

PRODUCTS_URL = os.getenv("PRODUCTS_SERVICE_URL", "http://products_service:8000")
CART_URL = os.getenv("CART_SERVICE_URL", "http://cart_service:8000")
SEARCH_URL = os.getenv("RECOMMENDATION_SERVICE_URL", "http://recommendation_service:8000")
INR_TO_GBP_RATE = float(os.getenv("INR_TO_GBP_RATE", "106"))
TIMEOUT = float(os.getenv("TOOL_HTTP_TIMEOUT", "12"))

_client: Optional[httpx.AsyncClient] = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=TIMEOUT)
    return _client


async def close_client() -> None:
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None


# ── Price helpers ─────────────────────────────────────────────────────────────

def to_gbp(inr: float) -> float:
    return round(inr / INR_TO_GBP_RATE, 2)


def shape_card(p: dict) -> dict:
    price = to_gbp(p.get("discount_price", 0))
    was = to_gbp(p.get("actual_price", 0))
    discount = round(((was - price) / was) * 100) if was > price else None
    return {
        "product_id": p.get("product_id"),
        "name": p.get("name", ""),
        "image": p.get("image", ""),
        "sub_category": p.get("sub_category", ""),
        "price": price,
        "was": was if was > price else None,
        "discount_pct": discount,
        "rating": p.get("ratings", 0),
        "no_of_ratings": p.get("no_of_ratings", 0),
        "stock": p.get("stock", 0),
    }


# ── Service calls ─────────────────────────────────────────────────────────────

async def search(query: str, top_k: int = 6) -> list:
    try:
        r = await _get_client().get(
            f"{SEARCH_URL}/product_semantic_search",
            params={"query": query, "top_k": top_k},
        )
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return []


async def recommendations(top_n: int = 5) -> dict:
    try:
        r = await _get_client().get(
            f"{SEARCH_URL}/recommendations",
            params={"top_n": top_n},
        )
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return {}


async def product(product_id: int) -> Optional[dict]:
    try:
        r = await _get_client().get(f"{PRODUCTS_URL}/get_product/{product_id}")
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


async def orders(user_id: str, token: str) -> list:
    try:
        r = await _get_client().get(
            f"{CART_URL}/transactions/{user_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return []


async def cart(user_id: str, token: str) -> Optional[dict]:
    try:
        r = await _get_client().get(
            f"{CART_URL}/cart/{user_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


async def cart_add(user_id: str, items: list, token: str) -> dict:
    try:
        r = await _get_client().post(
            f"{CART_URL}/cart/{user_id}/add",
            json=items,
            headers={"Authorization": f"Bearer {token}"},
        )
        if r.status_code == 409:
            return {"error": "insufficient_stock"}
        if r.status_code == 200:
            return {"ok": True}
        return {"error": f"http_{r.status_code}"}
    except Exception as e:
        return {"error": str(e)}


async def checkout(user_id: str, method: str, token: str) -> dict:
    try:
        r = await _get_client().post(
            f"{CART_URL}/checkout/{user_id}",
            json=method,
            headers={"Authorization": f"Bearer {token}"},
        )
        if r.status_code == 200:
            return r.json()
        return {"error": f"http_{r.status_code}"}
    except Exception as e:
        return {"error": str(e)}
