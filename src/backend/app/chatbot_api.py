"""
Chatbot API for Sambodhan Grievance Redressal System.
Handles conversational intent routing, complaint creation, and status tracking.
"""


# --- SQLAlchemy instance value helpers ---
def extract_int(obj, field):
    val = getattr(obj, field, None)
    if val is not None and hasattr(val, '__get__'):
        val = val.__get__(obj, type(obj))
    # Always return int, default to 0 if None
    return int(val) if val is not None else 0

def extract_str(obj, field):
    val = getattr(obj, field, None)
    if val is not None and hasattr(val, '__get__'):
        val = val.__get__(obj, type(obj))
    if val is None:
        return ""
    return str(val)

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from passlib.context import CryptContext
import httpx
import os
import re
import jwt

from app.core.database import get_db
from app.models.complaint import Complaint, ComplaintStatusHistory
from app.models.location import District, Municipality, Ward
from app.models.user import User

# ========== Configuration ==========
URGENCY_API_BASE = os.getenv("URGENCY_API_BASE", "https://kar137-sambodhan-urgency-classifier-space.hf.space")
DEPARTMENT_API_BASE = os.getenv("DEPARTMENT_API_BASE", "https://mr-kush-sambodhan-department-classifier.hf.space")
CLASSIFIER_TIMEOUT_SECONDS = int(os.getenv("CLASSIFIER_TIMEOUT_SECONDS", "30"))

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])
security = HTTPBearer(auto_error=False)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ========== Department Mapping ==========
# Department codes: 0=Unclassified, 1=Infrastructure, 2=Health, 3=Education, 4=Environment
DEPARTMENT_NAMES = {
    0: "Unclassified",
    1: "Infrastructure",
    2: "Health",
    3: "Education",
    4: "Environment"
}

# Status codes: 0=Pending, 1=In Progress, 2=Resolved, 3=Rejected
STATUS_NAMES = {
    0: "Pending",
    1: "In Progress",
    2: "Resolved",
    3: "Rejected"
}

# Urgency codes: 0=Unclassified, 1=Low, 2=Medium, 3=High
URGENCY_NAMES = {
    0: "Unclassified",
    1: "Low",
    2: "Medium",
    3: "High"
}


# ========== Pydantic Models ==========

class ChatMessage(BaseModel):
    """User message to the chatbot"""
    message: str = Field(..., min_length=1, max_length=2000, description="User message text")
    user_id: Optional[int] = Field(None, description="Logged-in user's ID (from authentication)")
    user_email: Optional[str] = Field(None, description="Logged-in user's email")
    user_name: Optional[str] = Field(None, description="Logged-in user's name")
    user_phone: Optional[str] = Field(None, description="Logged-in user's phone")
    session_id: Optional[str] = Field(None, description="Session identifier for multi-turn conversations")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Conversation context state")

    @validator('message')
    def validate_message(cls, v):
        """Ensure message is not just whitespace"""
        if not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()


class ChatReply(BaseModel):
    """Chatbot response to user"""
    reply: str = Field(..., description="Bot's textual response")
    intent: str = Field(..., description="Detected intent: info, file_grievance, track_complaint, unknown")
    next_step: Optional[str] = Field(None, description="Guidance for next user action")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional structured data")


class ComplaintCreationRequest(BaseModel):
    """Request to create a new complaint"""
    message: str = Field(..., min_length=10, max_length=2000, description="Complaint description")
    district_id: int = Field(..., gt=0, description="District ID")
    municipality_id: int = Field(..., gt=0, description="Municipality ID")
    ward_id: int = Field(..., gt=0, description="Ward ID")
    citizen_id: Optional[int] = Field(None, description="Citizen user ID (optional for anonymous)")

    @validator('message')
    def validate_message(cls, v):
        if not v.strip():
            raise ValueError("Complaint message cannot be empty")
        return v.strip()


class ComplaintCreated(BaseModel):
    """Response after creating complaint"""
    success: bool
    complaint_id: int
    department: str
    urgency: str
    status: str
    message: str


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
        # Convert string user_id back to int
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
    """
    Rule-based intent detection using keyword matching.
    Returns: info, file_grievance, track_complaint, unknown
    """
    message_lower = message.lower()
    
    # Track complaint intent
    track_keywords = ["track", "status", "check", "complaint id", "my complaint", "where is", "progress"]
    if any(keyword in message_lower for keyword in track_keywords):
        # Check if message contains a number (potential complaint ID)
        if re.search(r'\d+', message):
            return "track_complaint"
    
    # File grievance intent
    file_keywords = ["complaint", "grievance", "problem", "issue", "report", "submit", "file", "register"]
    if any(keyword in message_lower for keyword in file_keywords):
        return "file_grievance"
    
    # Info intent
    info_keywords = ["help", "how", "what", "who", "when", "where", "info", "information", "about"]
    if any(keyword in message_lower for keyword in info_keywords):
        return "info"
    
    # Greetings
    greeting_keywords = ["hello", "hi", "hey", "greetings", "namaste"]
    if any(keyword in message_lower for keyword in greeting_keywords):
        return "info"
    
    return "unknown"


def extract_location_from_message(message: str, db: Session) -> Optional[Dict[str, Any]]:
    """
    Extract district, municipality, and ward from user message.
    Returns: {"district_id": int, "municipality_id": int, "ward_id": int} or None
    """
    message_lower = message.lower()
    
    # Try to find district name
    districts = db.query(District).filter(District.is_active == True).all()
    found_district = None
    for district in districts:
        if district.name.lower() in message_lower:
            found_district = district
            break
    
    if not found_district:
        return None
    
    # Try to find municipality name
    municipalities = db.query(Municipality).filter(
        Municipality.district_id == found_district.id,
        Municipality.is_active == True
    ).all()
    found_municipality = None
    for municipality in municipalities:
        if municipality.name.lower() in message_lower:
            found_municipality = municipality
            break
    
    if not found_municipality:
        return None
    
    # Try to extract ward number
    ward_numbers = re.findall(r'\b(\d+)\b', message)
    found_ward = None
    for ward_num_str in ward_numbers:
        ward_num = int(ward_num_str)
        ward = db.query(Ward).filter(
            Ward.municipality_id == found_municipality.id,
            Ward.ward_number == ward_num,
            Ward.is_active == True
        ).first()
        if ward:
            found_ward = ward
            break
    
    if not found_ward:
        return None
    
    return {
        "district_id": found_district.id,
        "district_name": found_district.name,
        "municipality_id": found_municipality.id,
        "municipality_name": found_municipality.name,
        "ward_id": found_ward.id,
        "ward_number": found_ward.ward_number
    }


def extract_complaint_description(message: str) -> Optional[str]:
    """
    Extract the actual complaint description from the message.
    Filters out location information and keeps the problem description.
    """
    # Remove common location patterns
    lines = message.split('\n')
    complaint_parts = []
    
    for line in lines:
        line_lower = line.lower().strip()
        # Skip lines that are just numbers or location info
        if line_lower and not re.match(r'^\d+[\.\):]?\s*[a-z\s]*$', line_lower):
            # Keep lines that describe the actual problem
            if any(keyword in line_lower for keyword in ['water', 'road', 'garbage', 'light', 'problem', 'issue', 'not', 'no', 'broken', 'damaged']):
                complaint_parts.append(line.strip())
    
    if complaint_parts:
        return ' '.join(complaint_parts)
    
    # If no specific complaint keywords found, return the whole message cleaned up
    cleaned = re.sub(r'^\d+[\.\):]?\s*', '', message, flags=re.MULTILINE)
    cleaned = '\n'.join([line.strip() for line in cleaned.split('\n') if line.strip()])
    return cleaned if len(cleaned) > 10 else None


def extract_complaint_id(message: str) -> Optional[int]:
    """Extract complaint ID number from message"""
    matches = re.findall(r'\b(\d+)\b', message)
    if matches:
        try:
            return int(matches[0])
        except ValueError:
            return None
    return None


# ========== External Classifier Calls ==========

async def predict_urgency(text: str) -> Dict[str, Any]:
    """
    Call external urgency classifier API.
    Returns: {"urgency": str, "confidence": float}
    """
    try:
        async with httpx.AsyncClient(timeout=CLASSIFIER_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{URGENCY_API_BASE}/predict_urgency",
                json={"text": text, "return_probabilities": False}
            )
            response.raise_for_status()
            result = response.json()
            
            # Map string urgency to int code
            urgency_map = {"low": 1, "medium": 2, "high": 3}
            urgency_code = urgency_map.get(result.get("urgency", "").lower(), 0)
            
            return {
                "urgency": urgency_code,
                "confidence": result.get("confidence", 0.0)
            }
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Urgency classifier timed out"
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Urgency classifier error: {str(e)}"
        )
    except Exception as e:
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
    except Exception as e:
        # Fallback to unclassified if classifier fails
        return {"department": 0, "confidence": 0.0}


# ========== API Endpoints ==========

@router.post("/message", response_model=ChatReply)
async def chatbot_message(chat: ChatMessage, db: Session = Depends(get_db)):
    """
    Main chatbot endpoint. Handles user input and returns appropriate response.
    Intent routing: info, file_grievance, track_complaint, unknown
    Supports authenticated users (user_id provided) and anonymous users.
    """
    import traceback
    try:
        print(f"[Chatbot] Incoming: {chat.dict()}")
        intent = detect_intent(chat.message)
        # Get user info if authenticated
        user = None
        user_location = None
        if chat.user_id:
            user = db.query(User).filter(User.id == chat.user_id).first()
            if user and extract_int(user, 'ward_id') > 0:
                # Get user's location from their profile
                ward = db.query(Ward).filter(Ward.id == extract_int(user, 'ward_id')).first()
                if ward:
                    municipality = db.query(Municipality).filter(Municipality.id == extract_int(ward, 'municipality_id')).first()
                    if municipality:
                        district = db.query(District).filter(District.id == extract_int(municipality, 'district_id')).first()
                        if district:
                            user_location = {
                                "district_id": extract_int(district, 'id'),
                                "district_name": extract_str(district, 'name'),
                                "municipality_id": extract_int(municipality, 'id'),
                                "municipality_name": extract_str(municipality, 'name'),
                                "ward_id": extract_int(ward, 'id'),
                                "ward_number": extract_int(ward, 'ward_number')
                            }
        # Handle info/help intent
        if intent == "info":
            greeting = f"Hello {chat.user_name or 'there'}! " if chat.user_name else "Welcome to Sambodhan! "
            return ChatReply(
                reply=greeting + "I can help you:\n"
                      "1. File a new grievance/complaint\n"
                      "2. Track your existing complaint status\n"
                      "3. Provide information about our services\n\n"
                      "How can I assist you today?",
                intent="info",
                next_step="You can say 'file a complaint' or 'track complaint ID 123'",
                data={"user_authenticated": user is not None}
            )
        # Handle track complaint intent
        elif intent == "track_complaint":
            complaint_id = extract_complaint_id(chat.message)
            if not complaint_id:
                return ChatReply(
                    reply="Please provide a valid complaint ID number to track. For example: 'Track complaint 123' or 'Status of 456'",
                    intent="track_complaint",
                    next_step="Provide your complaint ID number",
                    data={}
                )
            # Fetch complaint from database
            complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
            if not complaint:
                return ChatReply(
                    reply=f"Sorry, I couldn't find a complaint with ID {complaint_id}. Please verify the ID and try again.",
                    intent="track_complaint",
                    next_step="Double-check your complaint ID",
                    data={"complaint_id": complaint_id, "found": False}
                )
            # Build status response using top-level extract_int
            dept_name = DEPARTMENT_NAMES.get(extract_int(complaint, 'department'), "Unknown")
            status_name = STATUS_NAMES.get(extract_int(complaint, 'current_status'), "Unknown")
            urgency_name = URGENCY_NAMES.get(extract_int(complaint, 'urgency'), "Unknown")
            return ChatReply(
                reply=f"Complaint #{complaint_id} Status:\n"
                      f"• Department: {dept_name}\n"
                      f"• Urgency: {urgency_name}\n"
                      f"• Current Status: {status_name}\n"
                      f"• Submitted: {complaint.date_submitted.strftime('%Y-%m-%d %H:%M')}\n\n"
                      f"Your complaint is being processed. You'll be notified of updates.",
                intent="track_complaint",
                next_step=None,
                data={
                    "complaint_id": complaint_id,
                    "found": True,
                    "department": dept_name,
                    "status": status_name,
                    "urgency": urgency_name
                }
            )
        # Handle file grievance intent
        elif intent == "file_grievance":
            # Try to extract location from message first, fallback to user's profile location
            location_info = extract_location_from_message(chat.message, db)
            if not location_info and user_location:
                location_info = user_location
            complaint_desc = extract_complaint_description(chat.message)
            # If user is authenticated and we have description, create complaint
            if location_info and complaint_desc and len(complaint_desc) >= 10:
                try:
                    # Call external classifiers
                    urgency_result = await predict_urgency(complaint_desc)
                    dept_result = await predict_department(complaint_desc)
                    # Create complaint record with user info
                    new_complaint = Complaint(
                        citizen_id=chat.user_id,  # Link to authenticated user
                        department=dept_result["department"],
                        message=complaint_desc,
                        message_processed=None,
                        urgency=urgency_result["urgency"],
                        current_status=0,  # Pending
                        district_id=location_info["district_id"],
                        municipality_id=location_info["municipality_id"],
                        ward_id=location_info["ward_id"],
                        date_submitted=func.now()
                    )
                    db.add(new_complaint)
                    db.commit()
                    db.refresh(new_complaint)
                    user_info = f"Name: {chat.user_name}\nEmail: {chat.user_email}\n" if chat.user_name and chat.user_email else ""
                    return ChatReply(
                        reply=f"✅ Complaint filed successfully!\n\n"
                              f"Complaint ID: #{new_complaint.id}\n"
                              f"{user_info}"
                              f"Location: {location_info['district_name']}, {location_info['municipality_name']}, Ward {location_info['ward_number']}\n"
                              f"Department: {DEPARTMENT_NAMES.get(dept_result['department'], 'Unclassified')}\n"
                              f"Urgency: {URGENCY_NAMES.get(urgency_result['urgency'], 'Unclassified')}\n"
                              f"Status: Pending\n\n"
                              f"Your complaint has been registered. You can track it using complaint ID #{new_complaint.id}",
                        intent="file_grievance",
                        next_step=None,
                        data={
                            "complaint_id": new_complaint.id,
                            "created": True,
                            "location": location_info,
                            "user_authenticated": user is not None
                        }
                    )
                except Exception as e:
                    print(f"[Chatbot] Error creating complaint: {str(e)}")
                    traceback.print_exc()
                    return ChatReply(
                        reply=f"Sorry, there was an error creating your complaint. Please try again or contact support.\nError: {str(e)}",
                        intent="file_grievance",
                        next_step="Try again with complete details",
                        data={"error": str(e)}
                    )
            # If missing information, guide the user
            missing = []
            has_profile_location = user_location is not None
            if not location_info:
                if has_profile_location:
                    missing.append("You can just describe your problem (we'll use your registered ward location)")
                else:
                    missing.append("location (district, municipality, ward number)")
            if not complaint_desc or len(complaint_desc) < 10:
                missing.append("detailed description of your problem")
            if has_profile_location:
                example_message = f"Example:\nThere is no water supply in my area for the past 3 days.\n\n" \
                                 f"(We'll automatically use your registered location: {user_location['district_name']}, " \
                                 f"{user_location['municipality_name']}, Ward {user_location['ward_number']})"
            else:
                example_message = "Example:\n" \
                                 "District: Sunsari\n" \
                                 "Municipality: Barahakshetra\n" \
                                 "Ward: 10\n" \
                                 "Problem: Water supply not available for 3 days"
            return ChatReply(
                reply=f"I'll help you file a grievance. I need the following information:\n\n"
                      f"Missing: {', '.join(missing)}\n\n"
                      f"{example_message}\n\n"
                      f"Please provide all details in one message.",
                intent="file_grievance",
                next_step="Provide complete location and problem description",
                data={
                    "has_location": location_info is not None,
                    "has_description": complaint_desc is not None,
                    "missing": missing
                }
            )
        # Unknown intent - but check if it might be a complaint with details
        else:
            # Try to parse as a complaint anyway
            location_info = extract_location_from_message(chat.message, db)
            complaint_desc = extract_complaint_description(chat.message)
            if location_info and complaint_desc and len(complaint_desc) >= 10:
                # Redirect to file_grievance handling
                try:
                    urgency_result = await predict_urgency(complaint_desc)
                    dept_result = await predict_department(complaint_desc)
                    new_complaint = Complaint(
                        citizen_id=None,
                        department=dept_result["department"],
                        message=complaint_desc,
                        message_processed=None,
                        urgency=urgency_result["urgency"],
                        current_status=0,
                        district_id=location_info["district_id"],
                        municipality_id=location_info["municipality_id"],
                        ward_id=location_info["ward_id"],
                        date_submitted=func.now()
                    )
                    db.add(new_complaint)
                    db.commit()
                    db.refresh(new_complaint)
                    return ChatReply(
                        reply=f"✅ Complaint filed successfully!\n\n"
                              f"Complaint ID: #{new_complaint.id}\n"
                              f"Location: {location_info['district_name']}, {location_info['municipality_name']}, Ward {location_info['ward_number']}\n"
                              f"Department: {DEPARTMENT_NAMES.get(dept_result['department'], 'Unclassified')}\n"
                              f"Urgency: {URGENCY_NAMES.get(urgency_result['urgency'], 'Unclassified')}\n"
                              f"Status: Pending\n\n"
                              f"Your complaint has been registered. You can track it using complaint ID #{new_complaint.id}",
                        intent="file_grievance",
                        next_step=None,
                        data={
                            "complaint_id": new_complaint.id,
                            "created": True
                        }
                    )
                except Exception as e:
                    print(f"[Chatbot] Error creating complaint (unknown intent): {str(e)}")
                    traceback.print_exc()
                    # Fall through to unknown intent response
            return ChatReply(
                reply=(
                    "I'm not sure I understand. I can help you:\n"
                    "• File a new complaint\n"
                    "• Track an existing complaint\n"
                    "• Answer questions about Sambodhan\n\n"
                    "What would you like to do?"
                ),
                intent="unknown",
                next_step="Please clarify your request",
                data={}
            )
    except Exception as e:
        print(f"[Chatbot] Unhandled error: {str(e)}")
        traceback.print_exc()
        return ChatReply(
            reply="Sorry, I couldn't process your request due to a server error. Please try again later.",
            intent="error",
            next_step=None,
            data={"error": str(e)}
        )
    # (Removed duplicate/erroneous fallback code)
        if not citizen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Citizen ID {complaint_req.citizen_id} not found"
            )
    
    # Step 2 & 3: Call external classifiers
    urgency_result = await predict_urgency(complaint_req.message)
    dept_result = await predict_department(complaint_req.message)
    
    # Step 4: Create complaint record
    new_complaint = Complaint(
        citizen_id=complaint_req.citizen_id,
        department=dept_result["department"],
        message=complaint_req.message,
        message_processed=None,  # Can be populated later by NLP preprocessing
        urgency=urgency_result["urgency"],
        current_status=0,  # Pending
        district_id=complaint_req.district_id,
        municipality_id=complaint_req.municipality_id,
        ward_id=complaint_req.ward_id,
        date_submitted=func.now()
    )
    
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)
    
    # Step 5: Return response
    return ComplaintCreated(
        success=True,
        complaint_id=int(getattr(new_complaint, 'id')),
        department=DEPARTMENT_NAMES.get(int(getattr(new_complaint, 'department')), "Unclassified"),
        urgency=URGENCY_NAMES.get(int(getattr(new_complaint, 'urgency')), "Unclassified"),
        status=STATUS_NAMES.get(int(getattr(new_complaint, 'current_status')), "Pending"),
        message=f"Complaint #{int(getattr(new_complaint, 'id'))} filed successfully. Department: {DEPARTMENT_NAMES.get(int(getattr(new_complaint, 'department')))}. "
                f"You will receive updates on your complaint status."
    )


@router.get("/complaints/{complaint_id}", response_model=ComplaintStatusResponse)
def get_complaint_status(complaint_id: int, db: Session = Depends(get_db)):
    """
    Retrieve complaint details and status history by ID.
    """
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
    """
    Get list of active districts.
    """
    districts = db.query(District).filter(District.is_active == True).all()
    
    return GeoListResponse(
        success=True,
        count=len(districts),
        data=[{"id": d.id, "name": d.name} for d in districts]
    )


@router.get("/geo/municipalities", response_model=GeoListResponse)
def get_municipalities(district_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Get list of active municipalities, optionally filtered by district_id.
    """
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
    """
    Get list of active wards, optionally filtered by municipality_id.
    """
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
    """
    Return the controlled list of department codes and names.
    """
    return DEPARTMENT_NAMES


# ========== Authentication Endpoints ==========

@router.post("/auth/signup", response_model=AuthResponse)
async def signup(request: UserSignupRequest, db: Session = Depends(get_db)):
    """
    Register a new citizen user account.
    Returns JWT token on success.
    """
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
    """
    Login with email and password.
    Returns JWT token on success.
    """
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
    """
    Get current authenticated user's profile.
    Requires valid JWT token in Authorization header.
    """
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
    """
    Get all complaints filed by the current authenticated user.
    Requires valid JWT token.
    """
    # get_current_user already validates authentication
    
    # Get user's complaints
    complaints = db.query(Complaint).filter(
        Complaint.citizen_id == current_user.id
    ).order_by(Complaint.created_at.desc()).all()
    
    result = []
    for complaint in complaints:
        # Get location info
        ward = db.query(Ward).filter(Ward.id == complaint.ward_id).first()
        municipality = None
        district = None
        
        if ward:
            municipality = db.query(Municipality).filter(Municipality.id == ward.municipality_id).first()
            if municipality:
                district = db.query(District).filter(District.id == municipality.district_id).first()
        
        result.append({
            "id": extract_int(complaint, 'id'),
            "message": extract_str(complaint, 'message'),
            "department": DEPARTMENT_NAMES.get(extract_int(complaint, 'department'), "Unknown"),
            "urgency": URGENCY_NAMES.get(extract_int(complaint, 'urgency'), "Unknown"),
            "status": STATUS_NAMES.get(extract_int(complaint, 'current_status'), "Unknown"),
            "district": district.name if district else None,
            "municipality": municipality.name if municipality else None,
            "ward": f"Ward {ward.ward_number}" if ward else None,
            "created_at": extract_str(complaint, 'created_at'),
            "updated_at": extract_str(complaint, 'updated_at') if getattr(complaint, 'updated_at', None) else None
        })
    
    return result
