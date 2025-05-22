from pydantic import BaseModel
from typing import List  # ✅ Import List

# Pydantic model
class Product(BaseModel):
    product_id: int
    name: str
    price: float
    description: str
    review_count: int
    reviews: str
    sizes: List[str]         
    colors: List[str]
    images: List[str]
    main_category: str
    sub_category: str
    ratings: float
    discount_price: float
    stock: int
    brand: str
    features: List[str]
