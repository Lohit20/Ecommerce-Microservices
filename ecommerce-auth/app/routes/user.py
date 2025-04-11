from fastapi import APIRouter, HTTPException
from app.models import UserRegister, UserLogin
from app.database import user_collection
from app.auth import hash_password, verify_password, create_access_token
from bson.objectid import ObjectId


#Create FastAPI router instance
router = APIRouter()


#Route to register a new user
@router.post("/register")
def register(user: UserRegister):
    #Check if email already exists
    if user_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already exists")


    #Prepare the user dict and hash the password
    user_dict = user.dict()
    user_dict["password"] = hash_password(user.password)


    #Insert into MongoDB
    result = user_collection.insert_one(user_dict)


    return {
        "message": "User registered successfully",
        "user_id": str(result.inserted_id)
    }


#Route to login user and return JWT
@router.post("/login")
def login(user: UserLogin):
    #Find user by email
    db_user = user_collection.find_one({"email": user.email})


    #If not found or password incorrect
    if not db_user or not verify_password(user.password, db_user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    

    #Generate JWT
    access_token = create_access_token(data={"sub": db_user["email"]})

    return {"access_token": access_token, "token_type": "bearer"}