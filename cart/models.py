from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from typing import List, Optional


class PaymentMethod(str, Enum):
    credit_card = "credit_card"
    paypal = "paypal"
    cod = "cod"  # Cash on Delivery


# class ProductCartItem(BaseModel):
#     product_id: int = Field(..., description="ID of the product")
#     quantity: int = Field(..., gt=0, description="Quantity of the product")
#     price: float = Field(..., gt=0, description="Price at time of adding")


class ProductCartItem(BaseModel):
    product_id: int
    price: float
    quantity: int
    size: Optional[str] = None
    color: Optional[str] = None

class CartItem(BaseModel):
    product_id: int
    id: int
    key: str
    name: str
    image: str
    price: float
    quantity: int
    totalPrice: float
    size: Optional[str] = None
    color: Optional[str] = None

class Cart(BaseModel):
    user_id: str
    items: List[CartItem]
    totalItems: int
    totalPrice: float


class ShippingAddress(BaseModel):
    address: str
    city: str
    state: str
    postal_code: str


class Order(BaseModel):
    user_id: str  # ObjectId as string
    product_cart: List[ProductCartItem]
    shipping_address: ShippingAddress
    shipping_cost: float
    total_amount: float
    total_cost: float
    payment_method: str  # Can be kept as string unless you enforce Enum
    created_at: datetime

    class Config:
        orm_mode = True
        extra = "forbid"  # change to "allow" if you want to permit extra fields

