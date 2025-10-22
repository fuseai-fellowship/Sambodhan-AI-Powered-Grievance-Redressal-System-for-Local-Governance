from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_
from app.core.database import SessionLocal
from app import models, schemas

router = APIRouter(prefix="/complaints", tags=["Complaints"])


# Dependency: create and close DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 🔹 GET: Fetch complaints (with optional filters)
@router.get("/", response_model=list[schemas.ComplaintRead])
def get_complaints(
    department: int | None = Query(None),
    urgency: int | None = Query(None),
    status: int | None = Query(None),
    district_id: int | None = Query(None),
    municipality_id: int | None = Query(None),
    ward_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(models.Complaint)

    # Apply optional filters
    if department is not None:
        query = query.filter(models.Complaint.department == department)
    if urgency is not None:
        query = query.filter(models.Complaint.urgency == urgency)
    if status is not None:
        query = query.filter(models.Complaint.current_status == status)
    if district_id is not None:
        query = query.filter(models.Complaint.district_id == district_id)
    if municipality_id is not None:
        query = query.filter(models.Complaint.municipality_id == municipality_id)
    if ward_id is not None:
        query = query.filter(models.Complaint.ward_id == ward_id)

    complaints = query.all()

    return {
        "success": True,
        "count": len(complaints),
        "data": complaints
    }


# 🔹 POST: Create new complaint
@router.post("/", response_model=schemas.ComplaintRead)
def create_complaint(complaint: schemas.ComplaintCreate, db: Session = Depends(get_db)):
    # ✅ Check if citizen exists if provided
    if complaint.citizen_id is not None:
        user_exists = db.query(models.User).filter(models.User.id == complaint.citizen_id).first()
        if not user_exists:
            raise HTTPException(status_code=400, detail="Citizen with this ID does not exist")

    db_complaint = models.Complaint(**complaint.model_dump())
    try:
        db.add(db_complaint)
        db.commit()
        db.refresh(db_complaint)
        return{
            "success": True,
            "message": "Complaint created successfully.",
            "data": db_complaint
        }
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid data provided") from exc
# @router.post("/", response_model=dict)
# def create_complaint(complaint: schemas.ComplaintCreate, db: Session = Depends(get_db)):
#     db_complaint = models.Complaint(**complaint.model_dump())
#     db.add(db_complaint)
#     db.commit()
#     db.refresh(db_complaint)

#     return {
#         "success": True,
#         "message": "Complaint created successfully.",
#         "data": db_complaint
#     }


# 🔹 PATCH: Update complaint (partial update)
@router.patch("/{complaint_id}", response_model=dict)
def update_complaint(complaint_id: int, updated: schemas.ComplaintUpdate, db: Session = Depends(get_db)):
    db_complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not db_complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    update_data = updated.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_complaint, key, value)

    db.commit()
    db.refresh(db_complaint)

    return {
        "success": True,
        "message": "Complaint updated successfully.",
        "data": db_complaint
    }
