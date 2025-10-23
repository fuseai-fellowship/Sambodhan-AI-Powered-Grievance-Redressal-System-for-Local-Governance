from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_
from app.core.database import SessionLocal
from app import models, schemas
import httpx
import os
from typing import Dict, Any

router = APIRouter(prefix="/api/complaints", tags=["Complaints"])

# Hugging Face API endpoints
URGENCY_API_BASE = os.getenv("URGENCY_API_BASE", "https://kar137-sambodhan-urgency-classifier-space.hf.space")
DEPARTMENT_API_BASE = os.getenv("DEPARTMENT_API_BASE", "https://mr-kush-sambodhan-department-classifier.hf.space")
CLASSIFIER_TIMEOUT_SECONDS = int(os.getenv("CLASSIFIER_TIMEOUT_SECONDS", "30"))


# Dependency: create and close DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ML Classification helper functions
async def predict_urgency(text: str) -> Dict[str, Any]:
    """
    Call external urgency classifier API.
    Returns: {"urgency": int, "confidence": float}
    """
    try:
        async with httpx.AsyncClient(timeout=CLASSIFIER_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{URGENCY_API_BASE}/predict_urgency",
                json={"text": text}
            )
            response.raise_for_status()
            result = response.json()
            # Map model label to int code
            label_map = {
                "NORMAL": 1,
                "URGENT": 2,
                "HIGHLY URGENT": 3
            }
            urgency_code = label_map.get(result.get("label", "").upper(), 0)
            return {
                "urgency": urgency_code,
                "confidence": result.get("confidence", 0.0),
                "label": result.get("label", "")
            }
    except Exception as e:
        print(f"Urgency classifier error: {str(e)}")
        # Fallback to default urgency if classifier fails
        return {"urgency": 0, "confidence": 0.0}


async def predict_department(text: str) -> Dict[str, Any]:
    """
    Call external department classifier API.
    Returns: {"department": int, "confidence": float}
    """
    try:
        async with httpx.AsyncClient(timeout=CLASSIFIER_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{DEPARTMENT_API_BASE}/predict_department",
                json={"text": text, "return_probabilities": False}
            )
            response.raise_for_status()
            result = response.json()
            
            # Map string department to int code
            dept_map = {
                "infrastructure": 1,
                "health": 2,
                "education": 3,
                "environment": 4
            }
            dept_code = dept_map.get(result.get("department", "").lower(), 0)
            
            return {
                "department": dept_code,
                "confidence": result.get("confidence", 0.0)
            }
    except Exception as e:
        print(f"Department classifier error: {str(e)}")
        # Fallback to unclassified if classifier fails
        return {"department": 0, "confidence": 0.0}


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
async def create_complaint(complaint: schemas.ComplaintCreate, db: Session = Depends(get_db)):
    # ✅ Check if citizen exists if provided
    if complaint.citizen_id is not None:
        user_exists = db.query(models.User).filter(models.User.id == complaint.citizen_id).first()
        if not user_exists:
            raise HTTPException(status_code=400, detail="Citizen with this ID does not exist")

    # Create complaint data
    complaint_data = complaint.model_dump()
    # ML classification
    try:
        urgency_result = await predict_urgency(complaint.message)
        print(f"Urgency classifier raw result: {urgency_result}")
        department_result = await predict_department(complaint.message)
        print(f"Department classifier raw result: {department_result}")
        complaint_data["urgency"] = urgency_result["urgency"]
        complaint_data["department"] = department_result["department"]
        print(f"ML Classification: urgency={{urgency_result['urgency']}}, department={{department_result['department']}}")
    except Exception as e:
        print(f"ML classification failed, using defaults: {str(e)}")
    # Create complaint with data
    db_complaint = models.Complaint(**complaint_data)
    try:
        db.add(db_complaint)
        db.commit()
        db.refresh(db_complaint)
        return db_complaint
    except IntegrityError as exc:
        db.rollback()
        error_msg = str(exc.orig) if hasattr(exc, 'orig') else str(exc)
        raise HTTPException(status_code=400, detail=f"Database error: {error_msg}") from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Server error: {str(exc)}") from exc
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


# GET: Fetch a single complaint by ID
@router.get("/{complaint_id}", response_model=schemas.ComplaintRead)
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint
