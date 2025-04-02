from pydantic import BaseModel



# Pydantic model
class Product(BaseModel):
    product_id: int
    name: str
    description: str
    price: float
    discounted_price: float
    stock: int
    image_url: str
