from fastapi import FastAPI, HTTPException, Body, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from models import Product
from fastapi.middleware.cors import CORSMiddleware
from dependencies.auth import get_current_user

import os

app = FastAPI()

# MongoDB Connection
# MONGO_URI = "mongodb://mongodb:27017" 
# MONGO_URI = "mongodb://localhost:27017"
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "products_db"
Collection = "products"




client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
collection = db[Collection]

origins = [
    "http://localhost:3000",   # React/Frontend dev server
    "http://127.0.0.1:3000",   # Alternate localhost
    "http://192.168.1.244:3000"  # Production frontend domain
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,             # List of allowed origins
    allow_credentials=True,
    allow_methods=["*"],               # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],               # Allow all headers
)


@app.get("/get_all_products/")
async def list_products():
    products = []
    async for product in collection.find():
        product["id"] = str(product["_id"])
        del product["_id"]
        products.append(product)
    return products


@app.get("/get_product/{product_id}")
async def get_product(product_id: int):
    product = await collection.find_one({"product_id": product_id})
    if product:
        product["id"] = str(product["_id"])
        del product["_id"]
        return product
    raise HTTPException(status_code=404, detail="Product not found")



@app.patch("/update_stock/{product_id}")
async def update_stock(product_id: int, payload: dict = Body(...)):
    quantity_change = payload.get("quantity")

    if quantity_change is None or not isinstance(quantity_change, int):
        raise HTTPException(status_code=400, detail="Field 'quantity' must be an integer")

    # Build filter: for decrements, require sufficient stock atomically
    query_filter = {"product_id": product_id}
    if quantity_change < 0:
        query_filter["stock"] = {"$gte": abs(quantity_change)}

    updated = await collection.find_one_and_update(
        query_filter,
        {"$inc": {"stock": quantity_change}},
        return_document=True
    )

    if updated is None:
        product = await collection.find_one({"product_id": product_id})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        raise HTTPException(status_code=409, detail="Insufficient stock")

    return {
        "message": "Stock updated",
        "product_id": product_id,
        "new_stock": updated["stock"]
    }


@app.put("/update_product/{product_id}")
async def update_product(product_id: int, product: Product, current_user: dict = Depends(get_current_user)):
    result = await collection.update_one({"product_id": product_id}, {"$set": product.dict()})
    if result.modified_count:
        return {"message": "Product updated successfully"}
    raise HTTPException(status_code=404, detail="Product not found")

@app.post("/insert_new_product/")
async def create_product(product: Product, current_user: dict = Depends(get_current_user)):
    product_dict = product.dict()
    result = await collection.insert_one(product_dict)
    return {"id": str(result.inserted_id)}

@app.delete("/delete_product/{product_id}")
async def delete_product(product_id: int, current_user: dict = Depends(get_current_user)):
    result = await collection.delete_one({"product_id": product_id})
    if result.deleted_count:
        return {"message": "Product deleted successfully"}
    raise HTTPException(status_code=404, detail="Product not found")
