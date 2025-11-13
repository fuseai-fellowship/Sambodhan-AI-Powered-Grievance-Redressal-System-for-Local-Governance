
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
from app.utils.label_converter import resolve_label
from app.schemas.complaint import DEPARTMENT_LABEL_MAP, URGENCY_LABEL_MAP
import httpx
import os
from jose import jwt
from jose.exceptions import JWTError, ExpiredSignatureError
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
SECRET_KEY = "your-very-secret-key"
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
    """Main chatbot endpoint. Handles user input and returns appropriate response. Intent routing: greeting, info, file_complaint, check_status, list_complaints, help, unknown. Supports authenticated users (user_id provided) and anonymous users."""

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

    # === GREETING INTENT ===
    if intent == "greeting":
        greeting_msg = "🙏 Namaste! Welcome to Sambodhan Grievance System.\n\nI can help you with:\n\n1️⃣ **File a Complaint** - Submit a new grievance\n2️⃣ **Track Status** - Check your complaint status by ID\n3️⃣ **My Complaints** - View all your complaints\n4️⃣ **Help** - Get assistance\n\nWhat would you like to do today?"
        context.clear()  # Clear any previous context
        return ChatReply(
            reply=greeting_msg,
            intent="greeting",
            next_step=None,
            data={"context": context}
        )

    # === LIST COMPLAINTS INTENT ===
    if intent == "list_complaints":
        if not chat.user_id:
            return ChatReply(
                reply="❌ Please login to view your complaints.\n\nYou can login from the dashboard to access this feature.",
                intent="list_complaints",
                next_step=None,
                data={"context": {}}
            )
        
        # Get user's complaints
        from sqlalchemy.orm import joinedload
        complaints = db.query(Complaint).options(
            joinedload(Complaint.ward).joinedload(Ward.municipality).joinedload(Municipality.district)
        ).filter(
            Complaint.citizen_id == chat.user_id
        ).order_by(Complaint.created_at.desc()).limit(10).all()
        
        if not complaints:
            return ChatReply(
                reply="📋 You haven't filed any complaints yet.\n\nWould you like to file a new complaint? Just type 'file complaint'.",
                intent="list_complaints",
                next_step=None,
                data={"context": {}}
            )
        
        complaint_list = "📋 **Your Recent Complaints:**\n\n"
        for c in complaints:
            dept = extract_str(c, "department") or "General"
            status = extract_str(c, "current_status") or "Pending"
            complaint_list += f"• **ID #{extract_int(c, 'id')}** - {dept}\n  Status: {status}\n  Date: {extract_str(c, 'created_at')[:10]}\n\n"
        
        complaint_list += "\n💡 To check status of a specific complaint, type: 'track <complaint_id>'"
        
        return ChatReply(
            reply=complaint_list,
            intent="list_complaints",
            next_step=None,
            data={"context": {}, "complaints": [extract_int(c, 'id') for c in complaints]}
        )

    # === TRACK COMPLAINT FLOW ===
    if intent == "check_status":
        # If complaint_id not yet provided, prompt for it
        if not context.get("complaint_id"):
            # Try to extract complaint id from message (e.g., "track 123" or just "123")
            words = msg.split()
            complaint_id = None
            for word in words:
                if word.isdigit():
                    complaint_id = int(word)
                    break
            
            if complaint_id:
                context["complaint_id"] = complaint_id
            else:
                return ChatReply(
                    reply="🔍 **Track Complaint Status**\n\nPlease provide your complaint ID number.\n\nExample: Type '123' or 'track 123'",
                    intent="check_status",
                    next_step="Provide your complaint ID",
                    data={"context": context}
                )
        
        # Fetch complaint status
        complaint = db.query(Complaint).filter(Complaint.id == context["complaint_id"]).first()
        if not complaint:
            context.pop("complaint_id", None)
            return ChatReply(
                reply="❌ **Complaint Not Found**\n\nComplaint ID not found. Please check the ID and try again.\n\nYou can view all your complaints by typing 'my complaints'.",
                intent="check_status",
                next_step="Provide your complaint ID",
                data={"context": context}
            )
        
        # Get location info
        ward = complaint.ward
        municipality = ward.municipality if ward else None
        district = municipality.district if municipality else None
        
        # Fetch status history
        history = db.query(ComplaintStatusHistory).filter(
            ComplaintStatusHistory.complaint_id == complaint.id
        ).order_by(ComplaintStatusHistory.changed_at.desc()).all()
        
        history_text = ""
        if history:
            history_text = "\n\n📜 **Status History:**\n"
            for h in history[:5]:  # Show last 5 updates
                status_name = STATUS_NAMES.get(extract_int(h, 'status'), "Unknown")
                changed_date = extract_str(h, 'changed_at')[:16]  # Format: YYYY-MM-DD HH:MM
                comment = extract_str(h, 'comment')
                history_text += f"• {status_name} - {changed_date}\n"
                if comment:
                    history_text += f"  Note: {comment}\n"
        
        dept_str = extract_str(complaint, "department") or "General"
        urgency_str = extract_str(complaint, "urgency") or "NORMAL"
        status_str = extract_str(complaint, "current_status") or "Pending"
        
        location_str = ""
        if district:
            location_str = f"\n📍 **Location:** {district.name}"
            if municipality:
                location_str += f", {municipality.name}"
            if ward:
                location_str += f", Ward {ward.ward_number}"
        
        status_reply = f"✅ **Complaint Status - ID #{complaint.id}**\n\n"
        status_reply += f"📂 **Department:** {dept_str}\n"
        status_reply += f"⚡ **Urgency:** {urgency_str}\n"
        status_reply += f"📊 **Status:** {status_str}\n"
        status_reply += f"📅 **Submitted:** {extract_str(complaint, 'created_at')[:10]}"
        status_reply += location_str
        status_reply += f"\n\n💬 **Message:**\n{extract_str(complaint, 'message')[:200]}"
        status_reply += history_text
        
        context.clear()  # Clear context after showing status
        
        return ChatReply(
            reply=status_reply,
            intent="check_status",
            next_step=None,
            data={"context": context, "complaint_id": complaint.id}
        )


    # === FILE GRIEVANCE FLOW ===
    if intent == "file_complaint" and context.get("intent") == "file_complaint":
        # Check if user is authenticated (optional but recommended)
        if not chat.user_id:
            return ChatReply(
                reply="⚠️ **Please Login First**\n\nTo file a complaint, please login to your account from the dashboard.\n\nIf you don't have an account, you can register quickly!",
                intent="file_complaint",
                next_step=None,
                data={"context": {}}
            )
        
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
                    muni_list = [f"  {i+1}. {str(m.name)}" for i, m in enumerate(municipalities)]
                    return ChatReply(
                        reply=f"✅ District **{str(selected_district.name)}** selected.\n\n📍 **Step 2:** Select your municipality\n\n" + "\n".join(muni_list) + "\n\nType the number of your municipality.",
                        intent="file_complaint",
                        next_step="Provide your municipality number",
                        data={"context": context}
                    )
                else:
                    district_list = [f"  {i+1}. {str(d.name)}" for i, d in enumerate(districts)]
                    return ChatReply(
                        reply=f"❌ Invalid selection.\n\n📍 **Step 1:** Select your district\n\n" + "\n".join(district_list) + "\n\nType the number of your district.",
                        intent="file_complaint",
                        next_step="Provide your district number",
                        data={"context": context}
                    )
            # If not a valid district selection, always prompt for district again
            district_list = [f"  {i+1}. {str(d.name)}" for i, d in enumerate(districts)]
            return ChatReply(
                reply=f"📝 **Filing a New Complaint**\n\n📍 **Step 1:** Select your district\n\n" + "\n".join(district_list) + "\n\nType the number of your district.",
                intent="file_complaint",
                next_step="Provide your district number",
                data={"context": context}
            )

    # Step 2: Municipality (numbered selection, robust, single path)
    if not context.get("municipality_id"):
        district_id = context.get("district_id")
        if not district_id:
            # Defensive: should never happen, but fallback to district selection
            districts = db.query(District).filter(District.is_active == True).all()
            district_list = [f"  {i+1}. {str(d.name)}" for i, d in enumerate(districts)]
            return ChatReply(
                reply=f"📝 **Filing a New Complaint**\n\n📍 **Step 1:** Select your district\n\n" + "\n".join(district_list) + "\n\nType the number of your district.",
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
            ward_list = [f"  {i+1}. Ward {str(w.ward_number)}" for i, w in enumerate(wards)]
            return ChatReply(
                reply=f"✅ Municipality **{str(selected_muni.name)}** selected.\n\n📍 **Step 3:** Select your ward\n\n" + "\n".join(ward_list) + "\n\nType the number of your ward.",
                intent="file_complaint",
                next_step="Provide your ward number",
                data={"context": context}
            )
        else:
            muni_list = [f"  {i+1}. {str(m.name)}" for i, m in enumerate(municipalities)]
            return ChatReply(
                reply=f"❌ Invalid selection.\n\n📍 **Step 2:** Select your municipality\n\n" + "\n".join(muni_list) + "\n\nType the number of your municipality.",
                intent="file_complaint",
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
                    reply=f"✅ Ward **{str(selected_ward.ward_number)}** selected.\n\n💬 **Step 4:** Describe your grievance\n\nPlease describe your problem in detail (minimum 10 characters).\n\nBe as specific as possible to help us resolve your issue quickly.",
                    intent="file_complaint",
                    next_step="Provide your grievance/problem description",
                    data={"context": context}
                )
            else:
                ward_list = [f"  {i+1}. Ward {str(w.ward_number)}" for i, w in enumerate(wards)]
                return ChatReply(
                    reply=f"❌ Invalid selection.\n\n📍 **Step 3:** Select your ward\n\n" + "\n".join(ward_list) + "\n\nType the number of your ward.",
                    intent="file_complaint",
                    next_step="Provide your ward number",
                    data={"context": context}
                )
        else:
            ward_list = [f"  {i+1}. Ward {str(w.ward_number)}" for i, w in enumerate(wards)]
            return ChatReply(
                reply=f"📍 **Step 3:** Select your ward\n\n" + "\n".join(ward_list) + "\n\nType the number of your ward.",
                intent="file_complaint",
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
                reply="❌ Description too short.\n\n💬 **Step 4:** Describe your grievance\n\nPlease provide more details (minimum 10 characters).",
                intent="file_complaint",
                next_step="Provide your grievance/problem description",
                data={"context": context}
            )

    # All info collected, file complaint - Use same logic as submit grievance
    try:
        urgency_result = await predict_urgency(context["problem_description"])
        dept_result = await predict_department(context["problem_description"])
        
        # Use resolve_label to convert API results to proper string format
        urgency_label = resolve_label(urgency_result["urgency"], URGENCY_LABEL_MAP)
        department_label = resolve_label(dept_result["department"], DEPARTMENT_LABEL_MAP)
        
    except Exception as e:
        print(f"ML classification failed in chatbot, using defaults: {str(e)}")
        # Fallback if prediction fails - same as submit grievance
        urgency_label = resolve_label(0, URGENCY_LABEL_MAP)
        department_label = resolve_label(0, DEPARTMENT_LABEL_MAP)
    
    # Get location names for display
    district = db.query(District).filter(District.id == context["district_id"]).first()
    municipality = db.query(Municipality).filter(Municipality.id == context["municipality_id"]).first()
    
    new_complaint = Complaint(
        citizen_id=chat.user_id,
        department=department_label,
        message=context["problem_description"],
        message_processed=None,
        urgency=urgency_label,
        current_status="Pending",
        ward_id=context["ward_id"],
        date_submitted=func.now()
    )
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)
    
    # Format success message - use the labels directly
    dept_name = department_label
    urgency_name = urgency_label
    
    success_msg = f"✅ **Complaint Filed Successfully!**\n\n"
    success_msg += f"📋 **Complaint ID:** #{new_complaint.id}\n"
    success_msg += f"📂 **Department:** {dept_name}\n"
    success_msg += f"⚡ **Urgency:** {urgency_name}\n"
    success_msg += f"📊 **Status:** Pending\n"
    success_msg += f"📍 **Location:** {district.name if district else ''}, {municipality.name if municipality else ''}, Ward {context['ward_number']}\n"
    success_msg += f"\n💡 **Track your complaint:** Use ID #{new_complaint.id}\n"
    success_msg += f"\n📌 You can check status anytime by typing: 'track {new_complaint.id}'"
    
    # Clear context after successful filing
    context.clear()
    
    return ChatReply(
        reply=success_msg,
        intent="file_complaint",
        next_step=None,
        data={"complaint_id": new_complaint.id, "created": True, "context": {}}
    )

    # === HELP INTENT ===
    if intent == "help":
        help_msg = "ℹ️ **Sambodhan Chatbot Help**\n\n"
        help_msg += "I can assist you with:\n\n"
        help_msg += "1️⃣ **File a Complaint**\n   Type: 'file complaint' or 'submit grievance'\n\n"
        help_msg += "2️⃣ **Track Status**\n   Type: 'track <ID>' or 'status <ID>'\n   Example: 'track 123'\n\n"
        help_msg += "3️⃣ **View My Complaints**\n   Type: 'my complaints' or 'list all'\n\n"
        help_msg += "4️⃣ **Get Help**\n   Type: 'help' or 'support'\n\n"
        help_msg += "💡 **Tips:**\n"
        help_msg += "• Be specific when describing your grievance\n"
        help_msg += "• Keep your complaint ID for tracking\n"
        help_msg += "• Login to view all your complaints\n\n"
        help_msg += "How can I help you today?"
        
        return ChatReply(
            reply=help_msg,
            intent="help",
            next_step=None,
            data={"context": {}}
        )

    # === UNKNOWN INTENT - Use RAG/LLM ===
    if intent == "unknown":
        # Try to use RAG documentation lookup
        try:
            docs_context = retrieve_docs_context(msg)
            llm_reply = await call_grok_llm(msg, docs_context)
            return ChatReply(
                reply=llm_reply + "\n\n💡 Type 'help' to see what I can do!",
                intent="unknown",
                next_step=None,
                data={"context": {}}
            )
        except:
            # Fallback if RAG fails
            fallback_msg = "🤔 I'm not sure I understand.\n\n"
            fallback_msg += "Here's what I can help with:\n\n"
            fallback_msg += "• **File a complaint** - Type 'file complaint'\n"
            fallback_msg += "• **Track status** - Type 'track <ID>'\n"
            fallback_msg += "• **View complaints** - Type 'my complaints'\n"
            fallback_msg += "• **Get help** - Type 'help'\n\n"
            fallback_msg += "What would you like to do?"
            
            return ChatReply(
                reply=fallback_msg,
                intent="unknown",
                next_step=None,
                data={"context": {}}
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
        user_id_str = payload.get("sub")
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
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except JWTError as e:
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
    """Rule-based intent detection using keyword matching."""
    message_lower = message.lower()
    
    # Greeting intent
    if any(word in message_lower for word in ["hello", "hi", "hey", "namaste", "greetings"]):
        return "greeting"
    
    # File complaint intent
    if any(word in message_lower for word in ["file", "register", "submit", "complaint", "grievance", "problem", "issue", "report"]):
        return "file_complaint"
    
    # Check status intent
    if any(word in message_lower for word in ["status", "track", "check", "progress", "update", "where is", "my complaint"]):
        return "check_status"
    
    # List my complaints
    if any(word in message_lower for word in ["my complaints", "my grievances", "list", "show all", "view all"]):
        return "list_complaints"
    
    # Help intent
    if any(word in message_lower for word in ["help", "support", "assist", "how", "what can you do", "guide"]):
        return "help"
    
    return "unknown"


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
    
    # Get user's complaints with eager loading of ward -> municipality -> district
    from sqlalchemy.orm import joinedload
    complaints = db.query(Complaint).options(
        joinedload(Complaint.ward).joinedload(Ward.municipality).joinedload(Municipality.district)
    ).filter(
        Complaint.citizen_id == current_user.id
    ).order_by(Complaint.created_at.desc()).all()
    

    result = []
    for complaint in complaints:
        # Get location info from ward relationship
        ward = complaint.ward
        municipality = ward.municipality if ward else None
        district = municipality.district if municipality else None
        
        # Get ward number if available
        ward_name = f"Ward {ward.ward_number}" if (ward and ward.ward_number) else ""
        
        # Get department and urgency as strings (database stores them as strings)
        department_str = extract_str(complaint, "department") or ""
        urgency_str = extract_str(complaint, "urgency") or ""

        result.append({
            "id": extract_int(complaint, "id"),
            "message": extract_str(complaint, "message"),
            "department": department_str,  # Return string value
            "department_name": department_str if department_str else "Unknown",  # Use the string directly
            "urgency": urgency_str,  # Return string value  
            "urgency_name": urgency_str if urgency_str else "NORMAL",  # Use the string directly
            "current_status": extract_str(complaint, "current_status") or "PENDING",
            "status_name": extract_str(complaint, "current_status") or "PENDING",
            "created_at": getattr(complaint, "created_at", None),
            "ward_id": extract_int(complaint, "ward_id"),
            "ward_name": ward_name,
            "ward_number": ward.ward_number if ward else None,
            "municipality_id": municipality.id if municipality else None,
            "municipality_name": municipality.name if municipality else None,
            "district_id": district.id if district else None,
            "district_name": district.name if district else None,
        })
    return result
