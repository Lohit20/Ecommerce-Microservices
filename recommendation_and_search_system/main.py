from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional,List, Dict, Any
from models import Product

app = FastAPI()

# MongoDB Connection
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "ecommerce_db"
Collection = "products"

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
collection = db[Collection]

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