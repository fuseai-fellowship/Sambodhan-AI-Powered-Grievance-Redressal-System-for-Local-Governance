from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from enum import Enum
from app.schemas.location import WardRead


# Enum for role
class UserRole(str, Enum):
    citizen = "citizen"
    official = "official"
    mayor = "mayor"
    super_admin = "super_admin"


class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    role: UserRole = Field(default=UserRole.citizen)
    department: Optional[int] = Field(None, ge=0, le=4)
    ward_id: int | None = None


class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    department: Optional[int] = Field(None, ge=0, le=4)
    ward_id: Optional[int] = None
    password: Optional[str] = None 


class UserRead(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    ward: WardRead | None = None  # nested read

    class Config:
        orm_mode = True
