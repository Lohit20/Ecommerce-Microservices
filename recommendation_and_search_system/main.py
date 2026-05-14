from fastapi import FastAPI, HTTPException
from typing import List, Dict, Optional
from fastapi.middleware.cors import CORSMiddleware
from models import Product
from collections import defaultdict
import httpx
import os
import re

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.244:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PRODUCTS_SERVICE_URL = os.getenv("PRODUCTS_SERVICE_URL", "http://localhost:8001")
api_token = os.getenv("HF_API_TOKEN", "")
HF_API_URL = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2"

INR_TO_GBP = 106

STOP_WORDS = {
    'a', 'an', 'the', 'and', 'or', 'for', 'with', 'in', 'on', 'at', 'to',
    'of', 'is', 'are', 'some', 'any', 'i', 'me', 'my', 'want', 'need',
    'looking', 'find', 'show', 'get', 'buy', 'best', 'good', 'new',
}

# Maps common search words → canonical main_category value
CATEGORY_ALIASES = {
    'tv': 'tv, audio & cameras',
    'television': 'tv, audio & cameras',
    'audio': 'tv, audio & cameras',
    'camera': 'tv, audio & cameras',
    'cameras': 'tv, audio & cameras',
    'headphone': 'tv, audio & cameras',
    'headphones': 'tv, audio & cameras',
    'earphone': 'tv, audio & cameras',
    'earphones': 'tv, audio & cameras',
    'speaker': 'tv, audio & cameras',
    'speakers': 'tv, audio & cameras',
    'wireless': 'tv, audio & cameras',
    'bluetooth': 'tv, audio & cameras',
    'kitchen': 'home & kitchen',
    'home': 'home & kitchen',
    'cookware': 'home & kitchen',
    'sport': 'sports & fitness',
    'sports': 'sports & fitness',
    'fitness': 'sports & fitness',
    'gym': 'sports & fitness',
    'exercise': 'sports & fitness',
    'workout': 'sports & fitness',
    'yoga': 'sports & fitness',
    'running': 'sports & fitness',
    'appliance': 'appliances',
    'appliances': 'appliances',
    'washing': 'appliances',
    'fridge': 'appliances',
    'refrigerator': 'appliances',
    'microwave': 'appliances',
    'beauty': 'beauty & health',
    'health': 'beauty & health',
    'skincare': 'beauty & health',
    'makeup': 'beauty & health',
    'cosmetic': 'beauty & health',
    'perfume': 'beauty & health',
    'toy': 'toys & baby products',
    'toys': 'toys & baby products',
    'baby': 'toys & baby products',
    'bag': 'bags & luggage',
    'bags': 'bags & luggage',
    'luggage': 'bags & luggage',
    'backpack': 'bags & luggage',
    'suitcase': 'bags & luggage',
    'car': 'car & motorbike',
    'motorbike': 'car & motorbike',
    'bike': 'car & motorbike',
    'men': "men's clothing",
    "men's": "men's clothing",
    'women': "women's clothing",
    "women's": "women's clothing",
    'kids': "kids' fashion",
    'children': "kids' fashion",
    'child': "kids' fashion",
    'grocery': 'grocery & gourmet foods',
    'food': 'grocery & gourmet foods',
    'gourmet': 'grocery & gourmet foods',
    'pet': 'pet supplies',
    'dog': 'pet supplies',
    'cat': 'pet supplies',
    'accessory': 'accessories',
    'accessories': 'accessories',
    'jewellery': 'accessories',
    'jewelry': 'accessories',
    'watch': 'accessories',
    'shoes': "men's shoes",
    'shoe': "men's shoes",
    'trainers': "men's shoes",
    'sneakers': "men's shoes",
    'boots': "men's shoes",
}


async def fetch_all_products() -> List[dict]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{PRODUCTS_SERVICE_URL}/get_all_products/")
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Could not fetch products from products service")
        return response.json()


def extract_price_ceiling(query: str) -> Optional[float]:
    """Parse price constraint like 'under £100', 'below 50', 'less than £200'."""
    match = re.search(
        r'(?:under|below|less\s+than|max|cheaper\s+than|budget\s+of)\s*[£$]?\s*(\d+(?:\.\d+)?)',
        query, re.IGNORECASE
    )
    if match:
        return float(match.group(1))
    return None


def score_product(
    product: dict,
    query_lower: str,
    search_words: set,
    price_ceiling_gbp: Optional[float],
) -> float:
    name = product.get('name', '').lower()
    category = product.get('main_category', '').lower()
    sub_category = product.get('sub_category', '').lower()

    score = 0.0

    # Exact phrase in name — strongest signal
    if query_lower in name:
        score += 150

    for word in search_words:
        if len(word) < 2:
            continue

        # Name matches
        if word in name:
            score += 30
            if name.startswith(word):
                score += 10

        # Sub-category match
        if word in sub_category:
            score += 22

        # Category match (direct)
        if word in category:
            score += 15

        # Category alias match
        alias_category = CATEGORY_ALIASES.get(word)
        if alias_category and alias_category in category:
            score += 25

    if score <= 0:
        return 0.0

    # Price ceiling constraint
    if price_ceiling_gbp is not None:
        product_price_gbp = product.get('discount_price', 0) / INR_TO_GBP
        if product_price_gbp <= price_ceiling_gbp:
            score += 40  # strong bonus for meeting the constraint
        elif product_price_gbp > price_ceiling_gbp * 1.5:
            score *= 0.15  # heavy penalty — well over budget

    # Quality boosts (tiebreakers)
    rating = product.get('ratings', 0)
    no_of_ratings = product.get('no_of_ratings', 0)
    score += rating * 4
    score += min(no_of_ratings / 5000, 5)  # popularity bonus capped at 5

    actual = product.get('actual_price', 0)
    discounted = product.get('discount_price', actual)
    if actual > 0 and actual > discounted:
        discount_pct = (actual - discounted) / actual
        score += discount_pct * 12  # up to 12 pts for deep discount

    return score


def local_search(all_products: List[dict], query: str, top_k: int) -> List[dict]:
    query_lower = query.lower().strip()
    raw_words = set(query_lower.split())
    search_words = raw_words - STOP_WORDS
    if not search_words:
        search_words = raw_words

    price_ceiling = extract_price_ceiling(query_lower)

    scored = []
    for p in all_products:
        s = score_product(p, query_lower, search_words, price_ceiling)
        if s > 0:
            scored.append((s, p))

    scored.sort(key=lambda x: -x[0])
    return [p for _, p in scored[:top_k]]


@app.get("/product_semantic_search", response_model=List[Product])
async def recommend_products(query: str, top_k: int = 24):
    all_products = await fetch_all_products()
    if not all_products:
        raise HTTPException(status_code=404, detail="No products found")

    results = local_search(all_products, query, top_k)

    # Optional HF semantic search — only used when local results are sparse
    # and an API token is configured. Failures are silently ignored.
    if api_token and len(results) < 6:
        try:
            sample = all_products[:300]
            names = [p['name'] for p in sample]
            payload = {"inputs": {"source_sentence": query, "sentences": names}}
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    HF_API_URL,
                    headers={"Authorization": f"Bearer {api_token}"},
                    json=payload,
                )
                if resp.status_code == 200:
                    scores = resp.json()
                    combined = sorted(zip(sample, scores), key=lambda x: -x[1])
                    seen_ids = {p['product_id'] for p in results}
                    for p, _ in combined:
                        if p['product_id'] not in seen_ids and len(results) < top_k:
                            results.append(p)
                            seen_ids.add(p['product_id'])
        except Exception:
            pass  # HF failure is non-fatal

    # Absolute fallback: return top-rated products so the page is never empty
    if not results:
        fallback = sorted(all_products, key=lambda p: -p.get('ratings', 0))[:top_k]
        return [Product(**p) for p in fallback]

    return [Product(**p) for p in results]


@app.get("/recommendations", response_model=Dict[str, List[Product]])
async def fetch_recommendations(top_n: int = 5):
    all_products = await fetch_all_products()

    in_stock = [p for p in all_products if p.get("stock", 0) > 0]

    by_category: Dict[str, List[dict]] = defaultdict(list)
    for p in in_stock:
        by_category[p["main_category"]].append(p)

    result = {}
    for category, products in by_category.items():
        sorted_products = sorted(
            products,
            key=lambda p: (-p.get("ratings", 0), -p.get("no_of_ratings", 0), p.get("discount_price", 0))
        )
        result[category] = [Product(**p) for p in sorted_products[:top_n]]

    return result
