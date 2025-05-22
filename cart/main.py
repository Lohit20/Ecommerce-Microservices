from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.encoders import jsonable_encoder
from typing import List
from datetime import datetime
from uuid import uuid4
import os

from models import CartItem, Cart, Order, PaymentMethod

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Or use "*" temporarily for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URI)
db = client["ecommerce"]
cart_collection = db["carts"]
order_collection = db["orders"]


# -------------------- 1. SAVE CART --------------------
@app.post("/save_cart")
async def save_cart(cart: Cart):
    print("--------------------------------------------------------------------------------------------")
    print(cart)
    if not cart.items:
        raise HTTPException(status_code=400, detail="Cart must contain items")

    # Remove existing cart for the user
    await cart_collection.delete_many({"user_id": cart.user_id})

    cart_data = jsonable_encoder({
        "cart_id": str(uuid4()),
        "user_id": cart.user_id,
        "items": cart.items,
        "updated_at": datetime.utcnow()
    })

    await cart_collection.insert_one(cart_data)

    return {"message": "Cart saved", "cart_id": cart_data["cart_id"]}


@app.get("/cart/{user_id}")
async def get_cart(user_id: str):
    cart = await cart_collection.find_one({"user_id": user_id})
    if not cart:
        return {"message": "No cart found", "cart": None}
    cart["id"] = str(cart["_id"])
    del cart["_id"]
    return cart


@app.post("/checkout")
async def checkout_cart(order: Order = Body(...)):
    # Delete the cart if it exists for this user
    await cart_collection.delete_many({"user_id": str(order.user_id)})

    # Save the order as a transaction
    order_data = jsonable_encoder({
        **order.dict(),
        "order_id": int(uuid4().int % 1e12)
    })

    result = await order_collection.insert_one(order_data)

    return {
        "message": "Checkout successful",
        "order_id": order_data["order_id"],
        "transaction_id": str(result.inserted_id)
    }


@app.get("/transactions/{user_id}")
async def get_transactions(user_id: str):
    transactions = await order_collection.find({"user_id": user_id}).to_list(length = 100)
    if not transactions:
        return {"message": "No orders found", "transactions": None}
    return transactions
