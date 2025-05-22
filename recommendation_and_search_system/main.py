from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional,List, Dict, Any
from models import Product
import httpx
from operator import itemgetter

from fastapi.middleware.cors import CORSMiddleware



app = FastAPI()

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # or ["*"] for all origins (not safe in prod)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "ecommerce_db"
Collection = "products"

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
collection = db[Collection]

api_token = "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"
API_URL = "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2"
headers = {"Authorization": f"Bearer {api_token}"}

# Hugging Face scoring
async def get_similarity_scores(source_sentence: str, sentences: List[str]) -> List[float]:
    payload = {
        "inputs": {
            "source_sentence": source_sentence,
            "sentences": sentences
        }
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(API_URL, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()


# /recommend endpoint
@app.get("/product_semantic_search", response_model=List[Product])
async def recommend_products(query: str, top_k: int = 5):
    products = await collection.find({}, {"_id": 0}).to_list(length=100)

    if not products:
        raise HTTPException(status_code=404, detail="No products found")

    names = list(map(itemgetter("name"), products))

    try:
        scores = await get_similarity_scores(query, names)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Hugging Face API error: {str(e)}")

    # Attach scores using map + zip (no loop or list comp)
    combined = map(lambda pair: {**pair[0], "score": pair[1]}, zip(products, scores))

    # Sort using sorted() with itemgetter, then slice top_k
    top_products = list(sorted(combined, key=itemgetter("score"), reverse=True))[:top_k]

    # Convert to Product instances using map (no loop)
    return list(map(Product.parse_obj, top_products))


async def aggregate_recommendations(top_n: int = 5) -> Dict[str, List[Product]]:
    pipeline = [
        {"$match": {"stock": {"$gt": 0}}},
        {"$sort": {
            "main_category": 1,
            "ratings": -1,
            "no_of_ratings": -1,
            "discount_price": 1
        }},
        {"$group": {
            "_id": "$main_category",
            "products": {"$push": "$$ROOT"}
        }},
        {"$project": {
            "_id": 0,
            "main_category": "$_id",
            "top_products": {"$slice": ["$products", top_n]}
        }}
    ]

    cursor = collection.aggregate(pipeline)
    result = await cursor.to_list(length=None)

    # Map into Dict[str, List[Product]]
    return {
        item["main_category"]: [Product(**prod) for prod in item["top_products"]]
        for item in result
    }

@app.get("/recommendations", response_model=Dict[str, List[Product]])
async def fetch_recommendations():
    return await aggregate_recommendations()


