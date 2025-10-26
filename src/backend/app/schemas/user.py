from datetime import datetime
from typing import Optional, Union
from pydantic import BaseModel, EmailStr, Field
from enum import Enum
from app.schemas.location import WardRead

DEPARTMENT_LABEL_MAP = {
    0: "Municipal Governance & Community Services",
    1: "Education, Health & Social Welfare",
    2: "Infrastructure, Utilities & Natural Resources",
    3: "Security & Law Enforcement"
}

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
    department: Optional[Union[int, str]] = Field(
        None, description="Department code (0–3) or string label"
    )
    ward_id: int | None = None


class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    department: Optional[Union[int, str]] = Field(None, description="Department code (0–3) or string label")
    ward_id: Optional[int] = None
    password: Optional[str] = None 


class UserRead(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    ward: WardRead | None = None  # nested read

    class Config:
        orm_mode = True
