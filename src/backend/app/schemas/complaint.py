from datetime import datetime
from typing import Optional, Union
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.location import WardRead


# Mappings
URGENCY_LABEL_MAP = {0: "NORMAL", 1: "URGENT", 2: "HIGHLY URGENT"}
DEPARTMENT_LABEL_MAP = {
    0: "Municipal Governance & Community Services",
    1: "Education, Health & Social Welfare",
    2: "Infrastructure, Utilities & Natural Resources",
    3: "Security & Law Enforcement"
}
STATUS_LABEL_MAP = {
    0: "PENDING",
    1: "IN PROCESS",
    2: "RESOLVED",
    3: "REJECTED"
}


# ---------------- Base ----------------
class ComplaintBase(BaseModel):
    # department: Optional[Union[int, str]] = Field(
    #     None, description="Department code (0–3) or string label"
    # )
    message: str
    # urgency: Optional[Union[int, str]] = Field(
    #     None, description="Urgency code (0–2) or string label"
    # )


class ComplaintCreate(ComplaintBase):
    citizen_id: Optional[int] = None
    ward_id: int | None = None
    date_submitted: Optional[datetime] = None 
    urgency: Optional[Union[int, str]] = None
    department: Optional[Union[int, str]] = None


class ComplaintUpdate(BaseModel):
    current_status: Optional[int] = Field(None, ge=0, le=3)
    message_processed: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class ComplaintDetailUpdate(BaseModel):
    department: Optional[Union[int, str]] = Field(None)
    urgency: Optional[Union[int, str]] = Field(None)
    message: Optional[str] = None
    ward_id: Optional[int] = None
    current_status: Optional[Union[int, str]] = Field(None)
    message_processed: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class ComplaintRead(BaseModel):
    id: int
    citizen_id: Optional[int] = None
    department: Optional[str] = None
    urgency: Optional[str] = None
    current_status: Optional[str] = None
    message: str
    # message_processed: Optional[str] = None
    ward_id: Optional[int] = None
    ward: WardRead | None = None
    date_submitted: datetime
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# -------------------- Misclassified Complaints --------------------


class MisclassifiedComplaintCreate(BaseModel):
    complaint_id: int = Field(..., description="ID of the complaint being corrected")
    correct_urgency: Optional[Union[int, str]] = Field(
        None, description="Correct urgency (int code 0–2 or string label)"
    )
    correct_department: Optional[Union[int, str]] = Field(
        None, description="Correct department (int code 0–3 or string label)"
    )
    reported_by_user_id: Optional[int] = Field(
        None, description="User ID of the reporter"
    )
class MisclassifiedComplaintRead(BaseModel):
    id: int
    complaint_id: int
    model_predicted_urgency: Optional[str] = None
    model_predicted_department: Optional[str] = None
    correct_urgency: Optional[str] = None
    correct_department: Optional[str] = None
    reported_by_user_id: Optional[int] = None
    reviewed: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

