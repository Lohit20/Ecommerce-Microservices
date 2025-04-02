from pydantic import BaseModel
from typing import List
from datetime import datetime

# Pydantic model for Product in Cart
class ProductCartItem(BaseModel):
    product_id: int
    quantity: int
    price: float

# Pydantic model for Order
class Order(BaseModel):
    order_id: int
    user_id: int
    product_cart: List[ProductCartItem]
    total_amount: float
    payment_method: str  # ENUM (Credit Card, PayPal, etc.)
    created_at: datetime