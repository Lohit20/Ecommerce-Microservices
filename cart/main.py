from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from models import Order
import requests
from datetime import datetime
import os

app = FastAPI()

# MongoDB Connection
# MONGO_URI = "mongodb://localhost:27017"
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "ecommerce_db"
Collection = "cart"

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
collection = db[Collection]


@app.get("/get_all_transactions/")
async def list_all_transactions():
    transactions = []
    async for cart in collection.find():
        cart["id"] = str(cart["_id"])
        del cart["_id"]
        transactions.append(cart)
    return transactions

@app.get("/get_user_transactions/{user_id}")
async def get_user_transactions(user_id: int):
    transactions = await collection.find({"user_id": user_id}).to_list(None)
    
    if transactions:
        for transaction in transactions:
            transaction["id"] = str(transaction["_id"])
            del transaction["_id"]
        return transactions
    
    raise HTTPException(status_code=404, detail="No transactions found for this user")

@app.post("/insert_user_transactions/{user_id}/{product_id}/{quantity}")
async def create_post(user_id: int, product_id: int, quantity: int):
    product_response = requests.get(f"http://products_service:8000/get_product/{product_id}")
    if product_response.status_code != 200:
        raise HTTPException(status_code=404, detail="Product not found")

    product_data = product_response.json()
    if quantity > product_data["stock"]:
        raise HTTPException(status_code=400, detail="Not enough stock available")
    
    order = Order(
        order_id=106,  # We have to generate dynamically
        user_id=user_id,
        product_cart=[{"product_id": product_id, "quantity": quantity, "price": product_data["discount_price"]}],
        total_amount=product_data["discount_price"] * quantity,
        payment_method="Credit Card",
        created_at=datetime.utcnow(),
    )

    order_data = order.dict()
    result = await collection.insert_one(order_data)

    return {"id": str(result.inserted_id)}