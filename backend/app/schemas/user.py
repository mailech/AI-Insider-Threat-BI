from pydantic import BaseModel, EmailStr


# ----------------------------
# User Registration Schema
# ----------------------------
class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str


# ----------------------------
# User Login Schema
# ----------------------------
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ----------------------------
# User Response Schema
# ----------------------------
class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True