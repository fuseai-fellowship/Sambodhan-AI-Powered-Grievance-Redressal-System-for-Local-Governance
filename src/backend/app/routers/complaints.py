from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app import models, schemas
from datetime import datetime

router = APIRouter(prefix="/complaints", tags=["Complaints"])

@router.get("/", response_model=list[schemas.ComplaintRead])
def get_complaints(db: Session = Depends(get_db)):
    return db.query(models.Complaint).all()

@router.post("/", response_model=schemas.ComplaintRead)
def create_complaint(complaint: schemas.ComplaintCreate, db: Session = Depends(get_db)):
    db_complaint = models.Complaint(
        message=complaint.message,
        department=complaint.department,
        urgency=complaint.urgency,
        current_status=complaint.current_status,
        location=complaint.location,
        date_submitted=datetime.now()
    )
    db.add(db_complaint)
    db.commit()
    db.refresh(db_complaint)
    return db_complaint
