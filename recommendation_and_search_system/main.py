from fastapi import FastAPI, HTTPException
from typing import List, Dict
from fastapi.middleware.cors import CORSMiddleware
from models import Product
from collections import defaultdict
from operator import itemgetter
import httpx
import os

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
API_URL = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2"
headers = {"Authorization": f"Bearer {api_token}"}


async def fetch_all_products() -> List[dict]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{PRODUCTS_SERVICE_URL}/get_all_products/")
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Could not fetch products from products service")
        return response.json()


async def get_similarity_scores(source_sentence: str, sentences: List[str]) -> List[float]:
    payload = {"inputs": {"source_sentence": source_sentence, "sentences": sentences}}
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(API_URL, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()


@app.get("/product_semantic_search", response_model=List[Product])
async def recommend_products(query: str, top_k: int = 5):
    all_products = await fetch_all_products()
    products = all_products[:100]

    if not products:
        raise HTTPException(status_code=404, detail="No products found")

    names = list(map(itemgetter("name"), products))

    try:
        scores = await get_similarity_scores(query, names)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Hugging Face API error: {str(e)}")

    combined = map(lambda pair: {**pair[0], "score": pair[1]}, zip(products, scores))
    top_products = list(sorted(combined, key=itemgetter("score"), reverse=True))[:top_k]

    return [Product(**p) for p in top_products]


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
