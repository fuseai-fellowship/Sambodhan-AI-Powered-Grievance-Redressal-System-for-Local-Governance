from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_
from app.core.database import SessionLocal
from app.utils.label_converter import resolve_label
from app.schemas.complaint import DEPARTMENT_LABEL_MAP, URGENCY_LABEL_MAP
from app import models, schemas
from typing import Optional
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
                "NORMAL": 0,
                "URGENT": 1,
                "HIGHLY URGENT": 2
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
                "infrastructure": 0,
                "health": 1,
                "education": 2,
                "environment": 3
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


# 🔹 POST: Create new complaint
@router.post("/", response_model=schemas.ComplaintRead)
async def create_complaint(
    complaint: schemas.ComplaintCreate,
    db: Session = Depends(get_db)
):
    # ✅ Check if citizen exists (if provided)
    if complaint.citizen_id is not None:
        user_exists = db.query(models.User).filter(models.User.id == complaint.citizen_id).first()
        if not user_exists:
            raise HTTPException(status_code=400, detail="Citizen with this ID does not exist")

    complaint_data = complaint.model_dump()

    # ✅ ML classification
    try:
        urgency_result = await predict_urgency(complaint.message)
        department_result = await predict_department(complaint.message)

        print(f"ML Classification: urgency={urgency_result['urgency']}, department={department_result['department']}")

        # Convert predicted numeric values to string labels before saving
        complaint_data["urgency"] = resolve_label(urgency_result["urgency"], URGENCY_LABEL_MAP)
        complaint_data["department"] = resolve_label(department_result["department"], DEPARTMENT_LABEL_MAP)

    except Exception as e:
        print(f"ML classification failed, using defaults: {str(e)}")
        # fallback if prediction fails
        complaint_data["urgency"] = resolve_label(complaint.urgency, URGENCY_LABEL_MAP)
        complaint_data["department"] = resolve_label(complaint.department, DEPARTMENT_LABEL_MAP)

    # ✅ Save to DB
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

# 🔹 POST: Report a misclassified complaint
@router.post("/misclassified", response_model=schemas.MisclassifiedComplaintRead)
def report_misclassification(
    data: schemas.MisclassifiedComplaintCreate,
    db: Session = Depends(get_db)
):
    # ✅ Check if the complaint exists
    complaint = db.query(models.Complaint).filter(models.Complaint.id == data.complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # ✅ Create misclassified record
    misclassified = models.MisclassifiedComplaint(
        complaint_id=complaint.id,
        model_predicted_urgency=complaint.urgency,
        model_predicted_department=complaint.department,
        correct_urgency=resolve_label(data.correct_urgency, URGENCY_LABEL_MAP) if data.correct_urgency is not None else complaint.urgency,
        correct_department=resolve_label(data.correct_department, DEPARTMENT_LABEL_MAP) if data.correct_department is not None else complaint.department,
        reported_by_user_id=data.reported_by_user_id
    )

    try:
        db.add(misclassified)
        db.commit()
        db.refresh(misclassified)
        return misclassified
    except IntegrityError as exc:
        db.rollback()
        error_msg = str(exc.orig) if hasattr(exc, "orig") else str(exc)
        raise HTTPException(status_code=400, detail=f"Database error: {error_msg}") from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Server error: {str(exc)}") from exc



# 🔹 GET: Fetch all or filtered misclassified complaints
# @router.get("/misclassified", response_model=list[schemas.MisclassifiedComplaintRead])
# def get_misclassified_complaints(
#     reviewed: bool | None = Query(False, description="Filter by review status (True/False)"),
#     complaint_id: int | None = Query(None, description="Filter by complaint ID"),
#     reported_by_user_id: int | None = Query(None, description="Filter by reporter user ID"),
#     only_mismatched: Optional[str] = Query(
#         "false", description="If true/True/1, return only records where model prediction != correct value"
#     ),
#     db: Session = Depends(get_db)
# ):
#     query = db.query(models.MisclassifiedComplaint)
#     only_mismatched_value = str(only_mismatched).lower() in {"true", "1", "yes"}

#     # ✅ Apply filters
#     if reviewed is not None:
#         query = query.filter(models.MisclassifiedComplaint.reviewed == reviewed)
#     if complaint_id is not None:
#         query = query.filter(models.MisclassifiedComplaint.complaint_id == complaint_id)
#     if reported_by_user_id is not None:
#         query = query.filter(models.MisclassifiedComplaint.reported_by_user_id == reported_by_user_id)
#     if only_mismatched_value:
#         query = query.filter(
#             or_(
#                 models.MisclassifiedComplaint.correct_urgency != models.MisclassifiedComplaint.model_predicted_urgency,
#                 models.MisclassifiedComplaint.correct_department != models.MisclassifiedComplaint.model_predicted_department,
#             )
#         )

#     results = query.order_by(models.MisclassifiedComplaint.created_at.desc()).all()
#     return results


# 🔹 GET: Fetch only misclassified urgency complaints
@router.get("/misclassified/urgency", response_model=list[schemas.MisclassifiedComplaintRead])
def get_misclassified_urgency_complaints(
    reviewed: bool | None = Query(False, description="Filter by review status (True/False)"),
    reported_by_user_id: int | None = Query(None, description="Filter by reporter user ID"),
    db: Session = Depends(get_db),
):
    query = db.query(models.MisclassifiedComplaint).filter(
        models.MisclassifiedComplaint.correct_urgency != models.MisclassifiedComplaint.model_predicted_urgency
    )

    # Apply optional filters
    if reviewed is not None:
        query = query.filter(models.MisclassifiedComplaint.reviewed == reviewed)
    if reported_by_user_id is not None:
        query = query.filter(models.MisclassifiedComplaint.reported_by_user_id == reported_by_user_id)

    results = query.order_by(models.MisclassifiedComplaint.created_at.desc()).all()
    return results


# 🔹 GET: Fetch only misclassified department complaints
@router.get("/misclassified/department", response_model=list[schemas.MisclassifiedComplaintRead])
def get_misclassified_department_complaints(
    reviewed: bool | None = Query(False, description="Filter by review status (True/False)"),
    reported_by_user_id: int | None = Query(None, description="Filter by reporter user ID"),
    db: Session = Depends(get_db),
):
    query = db.query(models.MisclassifiedComplaint).filter(
        models.MisclassifiedComplaint.correct_department != models.MisclassifiedComplaint.model_predicted_department
    )

    # Apply optional filters
    if reviewed is not None:
        query = query.filter(models.MisclassifiedComplaint.reviewed == reviewed)
    if reported_by_user_id is not None:
        query = query.filter(models.MisclassifiedComplaint.reported_by_user_id == reported_by_user_id)

    results = query.order_by(models.MisclassifiedComplaint.created_at.desc()).all()
    return results


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

    return db_complaint
# 🔹 PUT: Full update of complaint details
@router.put("/{complaint_id}", response_model=schemas.ComplaintRead)
def update_complaint_details(
    complaint_id: int,
    updated: schemas.ComplaintDetailUpdate,
    db: Session = Depends(get_db)
):
    db_complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not db_complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    update_data = updated.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_complaint, key, value)

    db.commit()
    db.refresh(db_complaint)
    return db_complaint

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
    if municipality_id is not None or district_id is not None:
        # Join Ward → Municipality → District only if needed
        query = query.join(models.Complaint.ward).join(models.Ward.municipality)
        if municipality_id is not None:
            query = query.filter(models.Municipality.id == municipality_id)
        if district_id is not None:
            query = query.join(models.Municipality.district).filter(models.District.id == district_id)

    if ward_id is not None:
        query = query.filter(models.Complaint.ward_id == ward_id)

    complaints = query.all()

    return complaints

# GET: Fetch a single complaint by ID
@router.get("/{complaint_id}", response_model=schemas.ComplaintRead)
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    complaint = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

