from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional

class AdminBase(BaseModel):
    name: str
    email: EmailStr
    role: str
    department: Optional[str] = None
    municipality_id: Optional[int] = None
    district_id: Optional[int] = None

class AdminCreate(AdminBase):
    password: str

class AdminRead(AdminBase):
    id: int
    created_at: Optional[datetime] = None
    municipality_name: Optional[str] = None
    district_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
