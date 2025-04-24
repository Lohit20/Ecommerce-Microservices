from pydantic import BaseModel

# Pydantic model
class Product(BaseModel):
    product_id: int
    name: str
    main_category: str
    sub_category: str
    image: str
    ratings: float
    no_of_ratings: int
    actual_price: float
    discount_price: float
    stock: int


