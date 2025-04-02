from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from models import Product

app = FastAPI()

# MongoDB Connection
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "ecommerce_db"
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
