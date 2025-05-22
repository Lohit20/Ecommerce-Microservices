from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from models import Product
import os
from fastapi.middleware.cors import CORSMiddleware
from pymongo import DESCENDING
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
# MONGO_URI = "mongodb://mongodb:27017"
# MONGO_URI = "mongodb://localhost:27017"
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "ecommerce"
Collection = "products"
client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
collection = db[Collection]
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
@app.put("/update_product/{product_id}")
async def update_product(product_id: int, product: Product):
    result = await collection.update_one({"product_id": product_id}, {"$set": product.dict()})
    if result.modified_count:
        return {"message": "Product updated successfully"}
    raise HTTPException(status_code=404, detail="Product not found")
@app.post("/insert_new_product/")
async def create_product(product: Product):
    product_dict = product.dict()
    result = await collection.insert_one(product_dict)
    return {"id": str(result.inserted_id)}
@app.delete("/delete_product/{product_id}")
async def delete_product(product_id: int):
    result = await collection.delete_one({"product_id": product_id})
    if result.deleted_count:
        return {"message": "Product deleted successfully"}
    raise HTTPException(status_code=404, detail="Product not found")
##################################################
# Utility to format product
def format_product(product):
    product["_id"] = str(product["_id"])
    del product["_id"]
    return product
# get the good products
@app.get("/get_hot_picks")
async def get_hot_picks():
    try:
        cursor = collection.find().sort(
            [("ratings", -1), ("review_count", -1)]
        ).limit(12)
        products = await cursor.to_list(length=15)
        hot_picks = []
        for product in products:
            product["_id"] = str(product["_id"])
            del product["_id"]
            hot_picks.append(product)
        return {"hot_picks": hot_picks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# get the new arrivals
@app.get("/get_new_arrivals")
async def get_new_arrivals():
    try:
        cursor = collection.find().sort("arrival_date", DESCENDING).limit(12)
        products = await cursor.to_list(length=12)
        new_arrivals = []
        for product in products:
            product["_id"] = str(product["_id"])
            del product["_id"]
            new_arrivals.append(product)
        return {"new_arrivals": new_arrivals}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# get the best sellers
@app.get("/get_best_sellers")
async def get_hot_picks():
    try:
        cursor = collection.find().sort(
            [("ratings", -1)]
        ).limit(12)
        products = await cursor.to_list(length=15)
        best_sellers = []
        for product in products:
            product["_id"] = str(product["_id"])
            del product["_id"]
            best_sellers.append(product)
        return {"best_sellers": best_sellers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# Men Category
@app.get("/get_men_products")
async def get_men_products():
    try:
        cursor = collection.find({"main_category": "Men"}).limit(20)
        products = await cursor.to_list(length=20)
        return {"men_products": [format_product(p) for p in products]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# Women Category
@app.get("/get_women_products")
async def get_women_products():
    try:
        cursor = collection.find({"main_category": "Women"}).limit(20)
        products = await cursor.to_list(length=20)
        return {"women_products": [format_product(p) for p in products]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# Girls Category
@app.get("/get_girls_products")
async def get_girls_products():
    try:
        cursor = collection.find({"main_category": "Girls"}).limit(20)
        products = await cursor.to_list(length=20)
        return {"girls_products": [format_product(p) for p in products]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# Boys Category
@app.get("/get_boys_products")
async def get_boys_products():
    try:
        cursor = collection.find({"main_category": "Boys"}).limit(20)
        products = await cursor.to_list(length=20)
        return {"boys_products": [format_product(p) for p in products]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# Sale Products (discount_price is not null)
@app.get("/get_sale_products")
async def get_sale_products():
    try:
        cursor = collection.find({"discount_price": {"$ne": None}}).limit(20)
        products = await cursor.to_list(length=20)
        return {"sale_products": [format_product(p) for p in products]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))