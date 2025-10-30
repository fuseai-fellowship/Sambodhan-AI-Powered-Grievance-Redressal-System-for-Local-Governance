
"""
Chatbot API for Sambodhan Grievance Redressal System.
Handles conversational intent routing, complaint creation, and status tracking.
"""

# === Imports and Router Setup ===
from fastapi import APIRouter, Depends, HTTPException, status
from .rag_utils import retrieve_docs_context, call_grok_llm
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
import traceback
from .models import Complaint, User, ComplaintStatusHistory
from .models.location import District, Municipality, Ward
from app.core.database import get_db
from app.routers.complaints import predict_urgency, predict_department, DEPARTMENT_API_BASE, CLASSIFIER_TIMEOUT_SECONDS
import httpx
import os
import jwt
from passlib.context import CryptContext

# Password hashing setup
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# FastAPI security
security = HTTPBearer()
from .models import Municipality, Ward, Complaint, User
from .utils.enums import Department, Urgency
from datetime import datetime, timedelta

# --- Constants (define safe defaults for now) ---
ACCESS_TOKEN_EXPIRE_MINUTES = 60
ALGORITHM = "HS256"
SECRET_KEY = "dev-secret-key"
STATUS_NAMES = {
    0: "Pending",
    1: "In Progress",
    2: "Resolved",
    3: "Closed"
}

# --- Define missing Pydantic models for ChatReply and ChatMessage ---
class ChatMessage(BaseModel):
    message: str
    user_id: Optional[int] = None
    context: Optional[Dict[str, Any]] = None

class ChatReply(BaseModel):
    reply: str
    intent: str
    next_step: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

# --- Department and Urgency name mappings ---
DEPARTMENT_NAMES = {
    Department.MUNICIPAL_GOVERNANCE: "Municipal Governance",
    Department.EDUCATION_HEALTH_WELFARE: "Education, Health & Welfare",
    Department.INFRASTRUCTURE_UTILITIES: "Infrastructure & Utilities",
    Department.SECURITY_LAW_ENFORCEMENT: "Security & Law Enforcement",
    0: "Municipal Governance",
    1: "Education, Health & Welfare",
    2: "Infrastructure & Utilities",
    3: "Security & Law Enforcement"
}
URGENCY_NAMES = {
    Urgency.NORMAL: "Normal",
    Urgency.URGENT: "Urgent",
    Urgency.HIGHLY_URGENT: "Highly Urgent",
    0: "Normal",
    1: "Urgent",
    2: "Highly Urgent"
}

router = APIRouter(prefix="/api/chatbot")


# --- SQLAlchemy instance value helpers ---
def extract_int(obj, field):
    # Safely extract integer field from SQLAlchemy or dict object, always returns int
    if obj is None:
        return 0
    if isinstance(obj, dict):
        val = obj.get(field, 0)
        try:
            return int(val)
        except (TypeError, ValueError):
            return 0
    try:
        return int(getattr(obj, field, 0))
    except (TypeError, ValueError, AttributeError):
        return 0

# Helper to extract string fields
def extract_str(obj, field):
    if obj is None:
        return ""
    if isinstance(obj, dict):
        return str(obj.get(field, "") or "")
    return str(getattr(obj, field, "") or "")
@router.post("/message", response_model=ChatReply)
async def chatbot_message(chat: ChatMessage, db: Session = Depends(get_db)):
    """Main chatbot endpoint. Handles user input and returns appropriate response. Intent routing: info, file_grievance, track_complaint, unknown. Supports authenticated users (user_id provided) and anonymous users."""

    context = getattr(chat, 'context', None)
    if not isinstance(context, dict):
        context = {}

    # Detect intent on first message or if not set in context, or if user message is not a number (so user is typing a new command)
    msg = chat.message.strip()
    # Only re-detect intent if not in the middle of a multi-turn flow
    in_active_flow = (
        context.get("district_id") or context.get("municipality_id") or context.get("ward_id") or context.get("problem_description") or context.get("complaint_id")
    )
    if not context.get("intent") or (not msg.isdigit() and msg and not in_active_flow):
        intent = detect_intent(msg)
        context["intent"] = intent
    else:
        intent = context["intent"]

    # === TRACK COMPLAINT FLOW ===
    if intent == "check_status":
        # If complaint_id not yet provided, prompt for it
        if not context.get("complaint_id"):
            # Try to extract complaint id from message
            if msg.isdigit():
                context["complaint_id"] = int(msg)
            else:
                return ChatReply(
                    reply="Please provide your complaint ID to track its status.",
                    intent="check_status",
                    next_step="Provide your complaint ID",
                    data={"context": context}
                )
        # Fetch complaint status
        complaint = db.query(Complaint).filter(Complaint.id == context["complaint_id"]).first()
        if not complaint:
            context.pop("complaint_id", None)
            return ChatReply(
                reply="Complaint ID not found. Please enter a valid complaint ID.",
                intent="check_status",
                next_step="Provide your complaint ID",
                data={"context": context}
            )
        # Fetch status history
        history = db.query(ComplaintStatusHistory).filter(
            ComplaintStatusHistory.complaint_id == complaint.id
        ).order_by(ComplaintStatusHistory.changed_at.desc()).all()
        history_list = [
            {
                "status": STATUS_NAMES.get(extract_int(h, 'status'), "Unknown"),
                "changed_at": extract_str(h, 'changed_at'),
                "comment": extract_str(h, 'comment'),
                "changed_by_user_id": extract_int(h, 'changed_by_user_id') if getattr(h, 'changed_by_user_id', None) is not None else None
            }
            for h in history
        ]
        return ChatReply(
            reply=f"Complaint Status for ID #{complaint.id}:\nStatus: {STATUS_NAMES.get(extract_int(complaint, 'current_status'), 'Pending')}\nDepartment: {DEPARTMENT_NAMES.get(extract_int(complaint, 'department'), 'Unclassified')}\nUrgency: {URGENCY_NAMES.get(extract_int(complaint, 'urgency'), 'Unclassified')}\nMessage: {extract_str(complaint, 'message')}\n\nStatus History:\n" + "\n".join([f"- {h['status']} at {h['changed_at']} ({h['comment']})" for h in history_list]),
            intent="check_status",
            next_step=None,
            data={"context": context, "complaint_id": complaint.id, "history": history_list}
        )


    # === FILE GRIEVANCE FLOW ===
    if intent == "file_complaint" and context.get("intent") == "file_complaint":
        # Step 1: District selection (robust)
        if not context.get("district_id"):
            districts = db.query(District).filter(District.is_active == True).all()
            if msg.isdigit():
                idx = int(msg) - 1
                if 0 <= idx < len(districts):
                    selected_district = districts[idx]
                    context["district_id"] = selected_district.id
                    context["district_name"] = str(selected_district.name)
                    # After district selection, prompt for municipality for the selected district only, and RETURN immediately
                    municipalities = db.query(Municipality).filter(Municipality.district_id == selected_district.id, Municipality.is_active == True).all()
                    muni_list = [f"{i+1}. {str(m.name)}" for i, m in enumerate(municipalities)]
                    return ChatReply(
                        reply=f"District '{str(selected_district.name)}' selected. Please select your municipality by number or name.\nAvailable municipalities:\n" + "\n".join(muni_list),
                        intent="file_grievance",
                        next_step="Provide your municipality number",
                        data={"context": context}
                    )
                else:
                    district_list = [f"{i+1}. {str(d.name)}" for i, d in enumerate(districts)]
                    return ChatReply(
                        reply=f"Invalid selection. Please select your district by number.\nAvailable districts:\n" + "\n".join(district_list),
                        intent="file_grievance",
                        next_step="Provide your district number",
                        data={"context": context}
                    )
            # If not a valid district selection, always prompt for district again
            district_list = [f"{i+1}. {str(d.name)}" for i, d in enumerate(districts)]
            return ChatReply(
                reply=f"Please select your district by number:\n" + "\n".join(district_list),
                intent="file_grievance",
                next_step="Provide your district number",
                data={"context": context}
            )

    # If intent is unknown or not handled, prompt user to clarify
    # Use Groq LLM via RAG for 'help' and 'unknown' intents
    if intent in ("help", "unknown"):
        # Retrieve context from docs
        docs_context = retrieve_docs_context(msg)
        llm_reply = await call_grok_llm(msg, docs_context)
        return ChatReply(
            reply=llm_reply,
            intent=intent,
            next_step="Clarify intent",
            data={"context": context}
        )


    # Step 2: Municipality (numbered selection, robust, single path)
    if not context.get("municipality_id"):
        district_id = context.get("district_id")
        if not district_id:
            # Defensive: should never happen, but fallback to district selection
            districts = db.query(District).filter(District.is_active == True).all()
            district_list = [f"{i+1}. {str(d.name)}" for i, d in enumerate(districts)]
            return ChatReply(
                reply=f"Please select your district by number:\n" + "\n".join(district_list),
                intent="file_grievance",
                next_step="Provide your district number",
                data={"context": context}
            )
        municipalities = db.query(Municipality).filter(Municipality.district_id == district_id, Municipality.is_active == True).all()
        msg = chat.message.strip()
        selected_muni = None
        if msg.isdigit():
            idx = int(msg) - 1
            if 0 <= idx < len(municipalities):
                selected_muni = municipalities[idx]
        else:
            # Try to match by name (case-insensitive, partial match)
            msg_lower = msg.lower()
            for m in municipalities:
                if msg_lower in str(m.name).lower():
                    selected_muni = m
                    break
        if selected_muni:
            context["municipality_id"] = selected_muni.id
            context["municipality_name"] = str(selected_muni.name)
            # Prompt for ward selection next
            wards = db.query(Ward).filter(Ward.municipality_id == selected_muni.id, Ward.is_active == True).all()
            ward_list = [f"{i+1}. {str(w.ward_number)}" for i, w in enumerate(wards)]
            return ChatReply(
                reply=f"Municipality '{str(selected_muni.name)}' selected. Please select your ward by number.\nAvailable wards:\n" + "\n".join(ward_list),
                intent="file_grievance",
                next_step="Provide your ward number",
                data={"context": context}
            )
        else:
            muni_list = [f"{i+1}. {str(m.name)}" for i, m in enumerate(municipalities)]
            return ChatReply(
                reply=f"Invalid selection. Please select your municipality by number or name.\nAvailable municipalities:\n" + "\n".join(muni_list),
                intent="file_grievance",
                next_step="Provide your municipality number",
                data={"context": context}
            )

    # Step 3: Ward (numbered selection, robust, single path)
    if not context.get("ward_id"):
        municipality_id = context.get("municipality_id")
        if not municipality_id:
            # Defensive: should never happen, but fallback to municipality selection
            district_id = context.get("district_id")
            municipalities = db.query(Municipality).filter(Municipality.district_id == district_id, Municipality.is_active == True).all()
            muni_list = [f"{i+1}. {str(m.name)}" for i, m in enumerate(municipalities)]
            return ChatReply(
                reply=f"Please select your municipality by number or name.\nAvailable municipalities:\n" + "\n".join(muni_list),
                intent="file_grievance",
                next_step="Provide your municipality number",
                data={"context": context}
            )
        wards = db.query(Ward).filter(Ward.municipality_id == municipality_id, Ward.is_active == True).all()
        msg = chat.message.strip()
        if msg.isdigit():
            idx = int(msg) - 1
            if 0 <= idx < len(wards):
                selected_ward = wards[idx]
                context["ward_id"] = selected_ward.id
                context["ward_number"] = str(selected_ward.ward_number)
                return ChatReply(
                    reply=f"Ward {str(selected_ward.ward_number)} selected. Please describe your grievance/problem in detail (at least 10 characters).",
                    intent="file_grievance",
                    next_step="Provide your grievance/problem description",
                    data={"context": context}
                )
            else:
                ward_list = [f"{i+1}. {str(w.ward_number)}" for i, w in enumerate(wards)]
                return ChatReply(
                    reply=f"Invalid selection. Please select your ward by number.\nAvailable wards:\n" + "\n".join(ward_list),
                    intent="file_grievance",
                    next_step="Provide your ward number",
                    data={"context": context}
                )
        else:
            ward_list = [f"{i+1}. {str(w.ward_number)}" for i, w in enumerate(wards)]
            return ChatReply(
                reply=f"Please select your ward by number:\n" + "\n".join(ward_list),
                intent="file_grievance",
                next_step="Provide your ward number",
                data={"context": context}
            )

    # Step 4: Problem description (single path)
    if not context.get("problem_description"):
        msg = chat.message.strip()
        if len(msg) >= 10:
            context["problem_description"] = msg
        else:
            return ChatReply(
                reply="Please describe your grievance/problem in detail (at least 10 characters).",
                intent="file_grievance",
                next_step="Provide your grievance/problem description",
                data={"context": context}
            )

    # All info collected, file complaint (single path)
    urgency_result = await predict_urgency(context["problem_description"])
    dept_result = await predict_department(context["problem_description"])
    new_complaint = Complaint(
        citizen_id=chat.user_id,
        department=dept_result["department"],
        message=context["problem_description"],
        message_processed=None,
        urgency=urgency_result["urgency"],
        current_status=0,
        district_id=context["district_id"],
        municipality_id=context["municipality_id"],
        ward_id=context["ward_id"],
        date_submitted=func.now()
    )
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)
    # Clear context after successful filing
    return ChatReply(
        reply=f"✅ Complaint filed successfully!\n\nComplaint ID: #{new_complaint.id}\nLocation: District ID {extract_str(new_complaint, 'district_id')}, Municipality ID {extract_str(new_complaint, 'municipality_id')}, Ward ID {extract_str(new_complaint, 'ward_id')}\nDepartment: {DEPARTMENT_NAMES.get(dept_result['department'], 'Unclassified')}\nUrgency: {URGENCY_NAMES.get(urgency_result['urgency'], 'Unclassified')}\nStatus: Pending\n\nYour complaint has been registered. You can track it using complaint ID #{new_complaint.id}",
        intent="file_grievance",
        next_step=None,
        data={"complaint_id": new_complaint.id, "created": True}
    )




class ComplaintStatusResponse(BaseModel):
    """Response for complaint status query"""
    complaint_id: int
    department: str
    urgency: str
    current_status: str
    date_submitted: datetime
    message: str
    history: List[Dict[str, Any]]


class GeoListResponse(BaseModel):
    """Generic geo entity list response"""
    success: bool
    count: int
    data: List[Dict[str, Any]]


class UserSignupRequest(BaseModel):
    """User signup request"""
    name: str = Field(..., min_length=2, max_length=100, description="User's full name")
    email: EmailStr = Field(..., description="User's email address")
    phone: str = Field(..., min_length=10, max_length=20, description="User's phone number")
    password: str = Field(..., min_length=6, max_length=100, description="User's password")
    ward_id: Optional[int] = Field(None, description="User's ward ID (optional)")


class UserLoginRequest(BaseModel):
    """User login request"""
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=1, description="User's password")


class AuthResponse(BaseModel):
    """Authentication response with JWT token"""
    success: bool
    message: str
    token: Optional[str] = None
    user: Optional[Dict[str, Any]] = None


class UserProfileResponse(BaseModel):
    """User profile data"""
    id: int
    name: str
    email: str
    phone: Optional[str]
    ward_id: Optional[int]
    ward_name: Optional[str]
    municipality_name: Optional[str]
    district_name: Optional[str]
    role: str
    created_at: datetime


# ========== Helper Functions ==========

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    # Convert sub to string to avoid JWT decode issues
    if "sub" in to_encode and isinstance(to_encode["sub"], int):
        to_encode["sub"] = str(to_encode["sub"])
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current authenticated user from JWT token"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - no credentials provided"
        )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token - no user ID"
            )
        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token - invalid user ID format"
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.InvalidTokenError as e:
        print(f"JWT decode error: {str(e)}")  # Debug logging
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        print(f"Unexpected error in get_current_user: {str(e)}")  # Debug logging
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user


# ========== Intent Detection ==========

def detect_intent(message: str) -> str:
    # Rule-based intent detection using keyword matching.
    message_lower = message.lower()
    if any(word in message_lower for word in ["file", "register", "submit", "complaint", "grievance"]):
        return "file_complaint"
    if any(word in message_lower for word in ["status", "track", "progress", "update"]):
        return "check_status"
    if any(word in message_lower for word in ["help", "support", "assist", "how"]):
        return "help"
    return "unknown"


async def predict_department(text: str) -> Dict[str, Any]:
    """Call external department classifier API. Returns: {"department": int, "confidence": float}"""
    try:
        async with httpx.AsyncClient(timeout=CLASSIFIER_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{DEPARTMENT_API_BASE}/predict",
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
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Department classifier timed out"
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Department classifier error: {str(e)}"
        )



@router.get("/complaints/{complaint_id}", response_model=ComplaintStatusResponse)
def get_complaint_status(complaint_id: int, db: Session = Depends(get_db)):
    """Retrieve complaint details and status history by ID."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint ID {complaint_id} not found"
        )
    
    # Fetch status history
    history = db.query(ComplaintStatusHistory).filter(
        ComplaintStatusHistory.complaint_id == complaint_id
    ).order_by(ComplaintStatusHistory.changed_at.desc()).all()

    history_list = [
        {
            "status": STATUS_NAMES.get(extract_int(h, 'status'), "Unknown"),
            "changed_at": extract_str(h, 'changed_at'),
            "comment": extract_str(h, 'comment'),
            "changed_by_user_id": extract_int(h, 'changed_by_user_id') if getattr(h, 'changed_by_user_id', None) is not None else None
        }
        for h in history
    ]

    return ComplaintStatusResponse(
        complaint_id=extract_int(complaint, 'id'),
        department=DEPARTMENT_NAMES.get(extract_int(complaint, 'department'), "Unclassified"),
        urgency=URGENCY_NAMES.get(extract_int(complaint, 'urgency'), "Unclassified"),
        current_status=STATUS_NAMES.get(extract_int(complaint, 'current_status'), "Pending"),
        date_submitted=getattr(complaint, 'date_submitted', None) or datetime.now(),
        message=extract_str(complaint, 'message') or "",
        history=history_list
    )


@router.get("/geo/districts", response_model=GeoListResponse)
def get_districts(db: Session = Depends(get_db)):
    """Get list of active districts."""
    districts = db.query(District).filter(District.is_active == True).all()
    
    return GeoListResponse(
        success=True,
        count=len(districts),
        data=[{"id": d.id, "name": d.name} for d in districts]
    )


@router.get("/geo/municipalities", response_model=GeoListResponse)
def get_municipalities(district_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get list of active municipalities, optionally filtered by district_id."""
    query = db.query(Municipality).filter(Municipality.is_active == True)
    
    if district_id:
        query = query.filter(Municipality.district_id == district_id)
    
    municipalities = query.all()
    
    return GeoListResponse(
        success=True,
        count=len(municipalities),
        data=[
            {"id": m.id, "name": m.name, "district_id": m.district_id}
            for m in municipalities
        ]
    )


@router.get("/geo/wards", response_model=GeoListResponse)
def get_wards(municipality_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get list of active wards, optionally filtered by municipality_id."""
    query = db.query(Ward).filter(Ward.is_active == True)
    
    if municipality_id:
        query = query.filter(Ward.municipality_id == municipality_id)
    
    wards = query.all()
    
    return GeoListResponse(
        success=True,
        count=len(wards),
        data=[
            {"id": w.id, "ward_number": w.ward_number, "municipality_id": w.municipality_id}
            for w in wards
        ]
    )


@router.get("/departments", response_model=Dict[int, str])
def get_departments():
    """Return the controlled list of department codes and names."""
    return DEPARTMENT_NAMES


# ========== Authentication Endpoints ==========

@router.post("/auth/signup", response_model=AuthResponse)
async def signup(request: UserSignupRequest, db: Session = Depends(get_db)):
    """Register a new citizen user account. Returns JWT token on success."""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate ward_id if provided
    if request.ward_id:
        ward = db.query(Ward).filter(Ward.id == request.ward_id, Ward.is_active == True).first()
        if not ward:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ward ID"
            )
    
    # Create new user
    hashed_password = get_password_hash(request.password)
    new_user = User(
        name=request.name,
        email=request.email,
        phone=request.phone,
        password_hash=hashed_password,
        ward_id=request.ward_id,
        role="citizen"  # Default role
        # created_at is auto-generated by database
    )
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Generate JWT token
        access_token = create_access_token(data={"sub": new_user.id})
        
        # Get location info if ward_id exists
        location_info = {}
        if extract_int(new_user, 'ward_id') > 0:
            ward = db.query(Ward).filter(Ward.id == extract_int(new_user, 'ward_id')).first()
            if ward:
                municipality = db.query(Municipality).filter(Municipality.id == extract_int(ward, 'municipality_id')).first()
                if municipality:
                    district = db.query(District).filter(District.id == extract_int(municipality, 'district_id')).first()
                    location_info = {
                        "ward_name": f"Ward {extract_int(ward, 'ward_number')}",
                        "municipality_name": extract_str(municipality, 'name'),
                        "district_name": extract_str(district, 'name') if district else None
                    }
        
        return AuthResponse(
            success=True,
            message="Account created successfully",
            token=access_token,
            user={
                "id": extract_int(new_user, 'id'),
                "name": extract_str(new_user, 'name'),
                "email": extract_str(new_user, 'email'),
                "phone": extract_str(new_user, 'phone'),
                "ward_id": extract_int(new_user, 'ward_id'),
                "role": extract_str(new_user, 'role'),
                **location_info
            }
        )
    except Exception as e:
        db.rollback()
        print(f"Signup error: {str(e)}")  # Debug logging
        import traceback
        traceback.print_exc()  # Print full stack trace
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create account: {str(e)}"
        )


@router.post("/auth/login", response_model=AuthResponse)
async def login(request: UserLoginRequest, db: Session = Depends(get_db)):
    """Login with email and password. Returns JWT token on success."""
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(request.password, extract_str(user, 'password_hash')):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Generate JWT token
    access_token = create_access_token(data={"sub": user.id})
    
    # Get location info if ward_id exists
    location_info = {}
    if extract_int(user, 'ward_id') > 0:
        ward = db.query(Ward).filter(Ward.id == extract_int(user, 'ward_id')).first()
        if ward:
            municipality = db.query(Municipality).filter(Municipality.id == extract_int(ward, 'municipality_id')).first()
            if municipality:
                district = db.query(District).filter(District.id == extract_int(municipality, 'district_id')).first()
                location_info = {
                    "ward_name": f"Ward {extract_int(ward, 'ward_number')}",
                    "municipality_name": extract_str(municipality, 'name'),
                    "district_name": extract_str(district, 'name') if district else None
                }
    
    return AuthResponse(
        success=True,
        message="Login successful",
        token=access_token,
        user={
            "id": extract_int(user, 'id'),
            "name": extract_str(user, 'name'),
            "email": extract_str(user, 'email'),
            "phone": extract_str(user, 'phone'),
            "ward_id": extract_int(user, 'ward_id'),
            "role": extract_str(user, 'role'),
            **location_info
        }
    )


@router.get("/auth/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current authenticated user's profile. Requires valid JWT token in Authorization header."""
    # get_current_user already validates authentication
    
    # Get location info
    ward_name = None
    municipality_name = None
    district_name = None
    
    if extract_int(current_user, 'ward_id'):
        ward = db.query(Ward).filter(Ward.id == extract_int(current_user, 'ward_id')).first()
        if ward:
            ward_name = f"Ward {extract_int(ward, 'ward_number')}"
            municipality = db.query(Municipality).filter(Municipality.id == extract_int(ward, 'municipality_id')).first()
            if municipality:
                municipality_name = extract_str(municipality, 'name')
                district = db.query(District).filter(District.id == extract_int(municipality, 'district_id')).first()
                if district:
                    district_name = extract_str(district, 'name')

    return UserProfileResponse(
        id=extract_int(current_user, 'id'),
        name=extract_str(current_user, 'name') or "",
        email=extract_str(current_user, 'email') or "",
        phone=extract_str(current_user, 'phone'),
        ward_id=extract_int(current_user, 'ward_id'),
        ward_name=ward_name,
        municipality_name=municipality_name,
        district_name=district_name,
        role=extract_str(current_user, 'role') or "",
        created_at=getattr(current_user, 'created_at', None) or datetime.now()
    )


@router.get("/auth/complaints", response_model=List[Dict[str, Any]])
async def get_user_complaints(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all complaints filed by the current authenticated user. Requires valid JWT token."""
    # get_current_user already validates authentication
    
    # Get user's complaints
    complaints = db.query(Complaint).filter(
        Complaint.citizen_id == current_user.id
    ).order_by(Complaint.created_at.desc()).all()
    

    result = []
    for complaint in complaints:
        # Get location info
        ward = db.query(Ward).filter(Ward.id == complaint.ward_id).first()
        municipality_id_val = extract_int(complaint, "municipality_id")
        municipality = db.query(Municipality).filter(Municipality.id == municipality_id_val).first() if municipality_id_val else None
        district_id_val = extract_int(complaint, "district_id")
        district = db.query(District).filter(District.id == district_id_val).first() if district_id_val else None

        result.append({
            "id": extract_int(complaint, "id"),
            "message": extract_str(complaint, "message"),
            "department": extract_int(complaint, "department"),
            "department_name": DEPARTMENT_NAMES.get(extract_int(complaint, "department"), "Unknown"),
            "urgency": extract_int(complaint, "urgency"),
            "urgency_name": URGENCY_NAMES.get(extract_int(complaint, "urgency"), "Unknown"),
            "current_status": extract_int(complaint, "current_status"),
            "status_name": STATUS_NAMES.get(extract_int(complaint, "current_status"), "Unknown"),
            "created_at": getattr(complaint, "created_at", None),
            "ward_id": extract_int(complaint, "ward_id"),
            "ward_name": extract_str(ward, "name") if ward else None,
            "municipality_id": extract_int(complaint, "municipality_id"),
            "municipality_name": extract_str(municipality, "name") if municipality else None,
            "district_id": extract_int(complaint, "district_id"),
            "district_name": extract_str(district, "name") if district else None,
        })
    return result
