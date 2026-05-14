import os
import json
from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["products_db"]
collection = db["products"]

existing = collection.count_documents({})
if existing > 0:
    print(f"Database already has {existing} products — skipping seed.")
else:
    with open("products.json", encoding="utf-8") as f:
        products = json.load(f)

    # Strip MongoDB Extended JSON _id fields to avoid insert conflicts
    for p in products:
        p.pop("_id", None)

    result = collection.insert_many(products)
    print(f"Seeded {len(result.inserted_ids)} products into ecommerce_db.products")

client.close()
