from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


# Shared fields (used by both create & update)
class ComplaintBase(BaseModel):
    department: int = Field(0, ge=0, le=4, description="Department code (0–4)")
    message: str
    urgency: int = Field(0, ge=0, le=3, description="Urgency level (0–3)")


# For creating a new complaint
class ComplaintCreate(ComplaintBase):
    citizen_id: Optional[int] = Field(
        None, description="Citizen ID (optional for anonymous complaints)"
    )
    district_id: int = Field(..., description="District ID")
    municipality_id: int = Field(..., description="Municipality ID")
    ward_id: int = Field(..., description="Ward ID")


# For updating complaint status or message
class ComplaintUpdate(BaseModel):
    current_status: Optional[int] = Field(None, ge=0, le=3, description="Complaint status (0–3)")
    message_processed: Optional[str] = Field(None, description="Processed message by system or admin")

    model_config = ConfigDict(from_attributes=True)  # Allows ORM-like usage

class ComplaintDetailUpdate(BaseModel):
    department: Optional[int] = Field(None, ge=0, le=4, description="Department code (0–4)")
    urgency: Optional[int] = Field(None, ge=0, le=3, description="Urgency level (0–3)")
    message: Optional[str] = None
    district_id: Optional[int] = None
    municipality_id: Optional[int] = None
    ward_id: Optional[int] = None
    current_status: Optional[int] = Field(None, ge=0, le=3)
    message_processed: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)



# For reading/returning complaints from DB
class ComplaintRead(ComplaintBase):
    id: int
    citizen_id: Optional[int] = None
    current_status: int = Field(0, ge=0, le=3, description="Complaint current status (0–3)")
    date_submitted: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# -------------------- Misclassified Complaints --------------------

class MisclassifiedComplaintCreate(BaseModel):
    complaint_id: int = Field(..., description="ID of the complaint being corrected")
    correct_urgency: Optional[int] = Field(None, ge=0, le=3, description="Correct urgency level if predicted was wrong")
    correct_department: Optional[int] = Field(None, ge=0, le=4, description="Correct department code if predicted was wrong")
    reported_by_user_id: Optional[int] = Field(None, description="User ID of the reporter")

class MisclassifiedComplaintRead(BaseModel):
    id: int
    complaint_id: int
    model_predicted_urgency: Optional[int] = None
    model_predicted_department: Optional[int] = None
    correct_urgency: Optional[int] = None
    correct_department: Optional[int] = None
    reported_by_user_id: Optional[int] = None
    reviewed: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

