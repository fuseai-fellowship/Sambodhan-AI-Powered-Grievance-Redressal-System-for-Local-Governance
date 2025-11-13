from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.complaint import Complaint, MisclassifiedComplaint
from app.models.admin import Admin

router = APIRouter(prefix="/api/misclassifications", tags=["misclassifications"])


class MisclassificationCreate(BaseModel):
    complaint_id: int
    correct_department: Optional[str] = None
    correct_urgency: Optional[str] = None
    

class MisclassificationResponse(BaseModel):
    id: int
    complaint_id: int
    model_predicted_department: Optional[str]
    model_predicted_urgency: Optional[str]
    correct_department: Optional[str]
    correct_urgency: Optional[str]
    reported_by_admin_id: Optional[int]
    reviewed: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.post("/", response_model=MisclassificationResponse)
async def report_misclassification(
    misclassification: MisclassificationCreate,
    reported_by_admin_id: int = Query(..., description="ID of the admin reporting the misclassification"),
    db: Session = Depends(get_db)
):
    """
    Report a misclassified complaint. Department admins can flag complaints
    that have incorrect department or urgency classifications.
    """
    # Get the complaint
    complaint = db.query(Complaint).filter(Complaint.id == misclassification.complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    # Check if already reported
    existing = db.query(MisclassifiedComplaint).filter(
        MisclassifiedComplaint.complaint_id == misclassification.complaint_id,
        MisclassifiedComplaint.reviewed == False
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="This complaint has already been reported as misclassified and is pending review"
        )
    
    # Validate that at least one correction is provided
    if not misclassification.correct_department and not misclassification.correct_urgency:
        raise HTTPException(
            status_code=400,
            detail="At least one correction (department or urgency) must be provided"
        )
    
    # Create misclassification record
    db_misclassification = MisclassifiedComplaint(
        complaint_id=misclassification.complaint_id,
        model_predicted_department=complaint.department,
        model_predicted_urgency=complaint.urgency,
        correct_department=misclassification.correct_department,
        correct_urgency=misclassification.correct_urgency,
        reported_by_admin_id=reported_by_admin_id,
        reviewed=False
    )
    
    db.add(db_misclassification)
    db.commit()
    db.refresh(db_misclassification)
    
    return db_misclassification


@router.get("/", response_model=List[MisclassificationResponse])
async def list_misclassifications(
    reviewed: Optional[bool] = Query(None),
    department: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(100),
    db: Session = Depends(get_db)
):
    """
    List misclassified complaints.
    """
    query = db.query(MisclassifiedComplaint)
    
    # Filter by reviewed status
    if reviewed is not None:
        query = query.filter(MisclassifiedComplaint.reviewed == reviewed)
    
    # Filter by department if provided
    if department:
        query = query.join(Complaint).filter(Complaint.department == department)
    
    misclassifications = query.offset(skip).limit(limit).all()
    return misclassifications


@router.get("/{misclassification_id}", response_model=MisclassificationResponse)
async def get_misclassification(
    misclassification_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific misclassification record"""
    misclassification = db.query(MisclassifiedComplaint).filter(
        MisclassifiedComplaint.id == misclassification_id
    ).first()
    
    if not misclassification:
        raise HTTPException(status_code=404, detail="Misclassification not found")
    
    return misclassification


@router.delete("/{misclassification_id}")
async def delete_misclassification(
    misclassification_id: int,
    reported_by_admin_id: int = Query(..., description="ID of the admin who reported this"),
    db: Session = Depends(get_db)
):
    """Delete a misclassification report (only if reported by current admin and not reviewed)"""
    misclassification = db.query(MisclassifiedComplaint).filter(
        MisclassifiedComplaint.id == misclassification_id
    ).first()
    
    if not misclassification:
        raise HTTPException(status_code=404, detail="Misclassification not found")
    
    # Only the reporter can delete, and only if not yet reviewed
    reported_by = getattr(misclassification, 'reported_by_admin_id', None)
    is_reviewed = getattr(misclassification, 'reviewed', False)
    
    if reported_by != reported_by_admin_id:
        raise HTTPException(status_code=403, detail="You can only delete your own reports")
    
    if is_reviewed:
        raise HTTPException(status_code=400, detail="Cannot delete reviewed misclassifications")
    
    db.delete(misclassification)
    db.commit()
    
    return {"message": "Misclassification report deleted successfully"}


@router.put("/{misclassification_id}/review")
async def review_misclassification(
    misclassification_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark a misclassification as reviewed.
    This is for acknowledging the report without necessarily changing the complaint.
    """
    misclassification = db.query(MisclassifiedComplaint).filter(
        MisclassifiedComplaint.id == misclassification_id
    ).first()
    
    if not misclassification:
        raise HTTPException(status_code=404, detail="Misclassification not found")
    
    # Update the object using query.update to avoid SQLAlchemy column assignment issues
    db.query(MisclassifiedComplaint).filter(
        MisclassifiedComplaint.id == misclassification_id
    ).update({
        "reviewed": True,
        "reviewed_at": datetime.utcnow()
    })
    
    db.commit()
    db.refresh(misclassification)
    
    return {"message": "Misclassification marked as reviewed", "misclassification": misclassification}
