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
    role: str = Field(default="citizen")
    department: Optional[int] = Field(None, ge=0, le=4)
    ward_id: int | None = None


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    ward: WardRead | None = None  # nested read

    class Config:
        orm_mode = True
