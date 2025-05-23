from fastapi import FastAPI, HTTPException, Body
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from datetime import datetime
from typing import List
import httpx
import os
from uuid import uuid4

from models import CartItem, ProductCartItem, Cart, Order, PaymentMethod

app = FastAPI()

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URI)
db = client["ecommerce_db"]
cart_collection = db["carts"]
transaction_collection = db["transactions"]

# ---------------------- CART SERVICE ----------------------

origins = [
    "http://localhost:3000",   # React/Frontend dev server
    "http://127.0.0.1:3000",   # Alternate localhost
    "http:/192.168.1.244:3000"  # Production frontend domain
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,             # List of allowed origins
    allow_credentials=True,
    allow_methods=["*"],               # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],               # Allow all headers
)

@app.get("/cart/{user_id}")
async def get_cart(user_id: int):
    cart = await cart_collection.find_one({"user_id": user_id})
    if not cart:
        return {"user_id": user_id, "items": []}
    cart["id"] = str(cart["_id"])
    del cart["_id"]
    return cart


@app.post("/cart/{user_id}/add")
async def add_to_cart(user_id: int, items: List[CartItem] = Body(...)):
    async with httpx.AsyncClient() as client:
        validated_items = []
        for item in items:
            response = await client.get(f"http:///localhost:8004/get_product/{item.product_id}")
            if response.status_code != 200:

                raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
            product_data = response.json()
            if item.quantity > product_data["stock"]:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for product {item.product_id}")

            validated_items.append(ProductCartItem(
                product_id=item.product_id,
                quantity=item.quantity,
                price=product_data["discount_price"]
            ))
            
            ## updating stock
            stock_response = await client.patch(
                f"http://products_service:8000/update_stock/{item.product_id}",
                json={"quantity": -item.quantity}
            )
            if stock_response.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Failed to update stock for product {item.product_id}")



    existing_cart = await cart_collection.find_one({"user_id": user_id})
    new_items = jsonable_encoder(validated_items)

    if existing_cart:
        existing_items = existing_cart.get("items", [])
        for new_item in new_items:
            matched = next((i for i in existing_items if i["product_id"] == new_item["product_id"]), None)
            if matched:
                matched["quantity"] += new_item["quantity"]
            else:
                existing_items.append(new_item)

        await cart_collection.update_one(
            {"user_id": user_id},
            {"$set": {"items": existing_items, "updated_at": datetime.utcnow()}}
        )
    else:
        await cart_collection.insert_one({
            "user_id": user_id,
            "items": new_items,
            "updated_at": datetime.utcnow()
        })

    return {"message": "Items added to cart"}


@app.post("/cart/{user_id}/remove/{product_id}")
async def remove_from_cart(user_id: int, product_id: int):
    cart = await cart_collection.find_one({"user_id": user_id})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    item_to_restore = next((item for item in cart["items"] if item["product_id"] == product_id), None)
    if not item_to_restore:
        raise HTTPException(status_code=404, detail="Product not found in cart")

    updated_items = [item for item in cart["items"] if item["product_id"] != product_id]

    await cart_collection.update_one(
        {"user_id": user_id},
        {"$set": {"items": updated_items, "updated_at": datetime.utcnow()}}
    )

    # Restore stock using unified endpoint
    async with httpx.AsyncClient() as client:
        restore_response = await client.patch(
            f"http://localhost:8004/update_stock/{product_id}",
            json={"quantity": item_to_restore["quantity"]}
        )
        if restore_response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to restore stock in product service")

    if not updated_items:
        await cart_collection.delete_one({"user_id": user_id})
        return {"message": "Product removed, stock restored, and cart deleted (now empty)"}

    return {"message": "Product removed from cart and stock restored"}




@app.post("/cart/{user_id}/clear")
async def clear_cart(user_id: int):
    await cart_collection.delete_one({"user_id": user_id})
    return {"message": "Cart cleared"}

# ---------------------- TRANSACTION (CHECKOUT) ----------------------

@app.post("/checkout/{user_id}")
async def checkout_cart(user_id: int, payment_method: PaymentMethod = Body(...)):
    cart = await cart_collection.find_one({"user_id": user_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=404, detail="Cart is empty or not found")

    validated_items = []
    total_amount = 0.0

    async with httpx.AsyncClient() as client:
        for item in cart["items"]:
            response = await client.get(f"http://localhost:8004/get_product/{item['product_id']}")
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail=f"Product {item['product_id']} not found")

            product_data = response.json()
            validated_items.append(ProductCartItem(
                product_id=item["product_id"],
                quantity=item["quantity"],
                price=product_data["discount_price"]
            ))

            total_amount += item["quantity"] * product_data["discount_price"]

    order = Order(
        order_id=int(uuid4().int % 1e12),
        user_id=user_id,
        product_cart=validated_items,
        total_amount=total_amount,
        payment_method=payment_method,
        created_at=datetime.utcnow()
    )

    result = await transaction_collection.insert_one(jsonable_encoder(order))
    await cart_collection.delete_one({"user_id": user_id})

    return {
        "message": "Transaction completed",
        "order_id": order.order_id,
        "transaction_id": str(result.inserted_id)
    }

@app.get("/transactions/{user_id}")
async def get_user_transactions(user_id: str,skip: int = 0,limit: int = 20):
    print("user id ",user_id)
    cursor = transaction_collection.find({"user_id": user_id}).skip(skip).limit(limit)
    transactions = await cursor.to_list(length=limit)
    
    if not transactions:
        return []

    for txn in transactions:
        txn["id"] = str(txn["_id"])
        del txn["_id"]
        
    return transactions
