from pydantic import BaseModel
from datetime import datetime

class ComplaintBase(BaseModel):
    message: str
    department: int
    urgency: int
    current_status: int
    location: str | None = None

class ComplaintCreate(ComplaintBase):
    pass

class ComplaintRead(ComplaintBase):
    id: int
    date_submitted: datetime

    class Config:
        orm_mode = True
