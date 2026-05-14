from fastapi import APIRouter, HTTPException, Body, Depends
from fastapi.encoders import jsonable_encoder
from datetime import datetime
from typing import List
import httpx
import os

from models import CartItem, ProductCartItem
from dependencies.auth import get_current_user

router = APIRouter()

PRODUCTS_SERVICE_URL = os.getenv("PRODUCTS_SERVICE_URL", "http://localhost:8001")


def verify_user(user_id: str, current_user: dict):
    if current_user.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")


@router.get("/cart/{user_id}")
async def get_cart(user_id: str, current_user: dict = Depends(get_current_user)):
    from main import cart_collection
    verify_user(user_id, current_user)
    cart = await cart_collection.find_one({"user_id": user_id})
    if not cart:
        return {"user_id": user_id, "items": []}
    cart["id"] = str(cart["_id"])
    del cart["_id"]
    return cart


@router.post("/cart/{user_id}/add")
async def add_to_cart(user_id: str, items: List[CartItem] = Body(...), current_user: dict = Depends(get_current_user)):
    from main import cart_collection
    verify_user(user_id, current_user)
    async with httpx.AsyncClient() as client:
        validated_items = []
        for item in items:
            response = await client.get(f"{PRODUCTS_SERVICE_URL}/get_product/{item.product_id}")
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

            stock_response = await client.patch(
                f"{PRODUCTS_SERVICE_URL}/update_stock/{item.product_id}",
                json={"quantity": -item.quantity}
            )
            if stock_response.status_code not in (200, 409):
                raise HTTPException(status_code=500, detail=f"Failed to update stock for product {item.product_id}")
            if stock_response.status_code == 409:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for product {item.product_id}")

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


@router.post("/cart/{user_id}/remove/{product_id}")
async def remove_from_cart(user_id: str, product_id: int, current_user: dict = Depends(get_current_user)):
    from main import cart_collection
    verify_user(user_id, current_user)
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

    async with httpx.AsyncClient() as client:
        restore_response = await client.patch(
            f"{PRODUCTS_SERVICE_URL}/update_stock/{product_id}",
            json={"quantity": item_to_restore["quantity"]}
        )
        if restore_response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to restore stock in product service")

    if not updated_items:
        await cart_collection.delete_one({"user_id": user_id})
        return {"message": "Product removed, stock restored, and cart deleted (now empty)"}

    return {"message": "Product removed from cart and stock restored"}


@router.post("/cart/{user_id}/clear")
async def clear_cart(user_id: str, current_user: dict = Depends(get_current_user)):
    from main import cart_collection
    verify_user(user_id, current_user)
    await cart_collection.delete_one({"user_id": user_id})
    return {"message": "Cart cleared"}
