from sqlalchemy import Column, Integer, String, Boolean
from pydantic import BaseModel, EmailStr, Field
from app.db.database import Base

# SQLAlchemy model
class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="employee")  # employee, hr, admin

# Pydantic models for API validation
class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str
    role: str = "employee"

class UserUpdate(BaseModel):
    email: EmailStr = None
    username: str = None
    password: str = None
    role: str = None

class User(UserBase):
    id: int
    is_active: bool
    role: str

    class Config:
        orm_mode = True

# Token models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str = None
    role: str = None
    permissions: list = []
    email: str = None
