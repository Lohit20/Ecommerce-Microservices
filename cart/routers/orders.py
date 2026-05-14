from fastapi import APIRouter, HTTPException, Body, Depends
from fastapi.encoders import jsonable_encoder
from datetime import datetime
import httpx
import os
from uuid import uuid4

from models import ProductCartItem, Order, PaymentMethod
from dependencies.auth import get_current_user

router = APIRouter()

PRODUCTS_SERVICE_URL = os.getenv("PRODUCTS_SERVICE_URL", "http://localhost:8001")


def verify_user(user_id: str, current_user: dict):
    if current_user.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")


@router.post("/checkout/{user_id}")
async def checkout_cart(user_id: str, payment_method: PaymentMethod = Body(...), current_user: dict = Depends(get_current_user)):
    from main import cart_collection, transaction_collection
    verify_user(user_id, current_user)
    cart = await cart_collection.find_one({"user_id": user_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=404, detail="Cart is empty or not found")

    validated_items = []
    total_amount = 0.0

    async with httpx.AsyncClient() as client:
        for item in cart["items"]:
            response = await client.get(f"{PRODUCTS_SERVICE_URL}/get_product/{item['product_id']}")
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


@router.get("/transactions/{user_id}")
async def get_user_transactions(user_id: str, skip: int = 0, limit: int = 20, current_user: dict = Depends(get_current_user)):
    from main import transaction_collection
    verify_user(user_id, current_user)
    cursor = transaction_collection.find({"user_id": user_id}).skip(skip).limit(limit)
    transactions = await cursor.to_list(length=limit)

    if not transactions:
        return []

    for txn in transactions:
        txn["id"] = str(txn["_id"])
        del txn["_id"]

    return transactions
