from pydantic import BaseModel, Field
from typing import List
from enum import Enum
from datetime import datetime


class PaymentMethod(str, Enum):
    credit_card = "credit_card"
    paypal = "paypal"
    cod = "cod"  # Cash on Delivery


class ProductCartItem(BaseModel):
    product_id: int = Field(..., description="ID of the product")
    quantity: int = Field(..., gt=0, description="Quantity of the product")
    price: float = Field(..., gt=0, description="Price at time of adding")


class CartItem(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)


class Cart(BaseModel):
    user_id: int
    items: List[ProductCartItem]
    updated_at: datetime


class Order(BaseModel):
    order_id: int
    user_id: int
    product_cart: List[ProductCartItem]
    total_amount: float
    payment_method: PaymentMethod
    created_at: datetime
