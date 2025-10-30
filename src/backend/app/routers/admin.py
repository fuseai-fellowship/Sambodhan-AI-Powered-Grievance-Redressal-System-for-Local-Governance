
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.admin import Admin
from app.schemas.admin import AdminCreate, AdminRead
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from jose import jwt
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/admins", tags=["Admins"])

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

SECRET_KEY = "your-very-secret-key"  # Replace with env var in production
# NOTE: This SECRET_KEY must match chatbot_api.py for JWT compatibility
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

from typing import Optional
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str

class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminRead


@router.post("/register", response_model=AdminRead, status_code=status.HTTP_201_CREATED)
def register_admin(admin_in: AdminCreate, db: Session = Depends(get_db)):
    existing_admin = db.query(Admin).filter(Admin.email == admin_in.email).first()
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    new_admin = Admin(
        name=admin_in.name,
        email=admin_in.email,
        password_hash=hash_password(admin_in.password),
        role=admin_in.role,
        department=admin_in.department,
        municipality_id=admin_in.municipality_id,
        district_id=admin_in.district_id,
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    return new_admin


# Admin login endpoint
@router.post("/login", response_model=AdminLoginResponse)
def login_admin(login_req: AdminLoginRequest, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.email == login_req.email).first()
    if not admin or not verify_password(login_req.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token_data = {"sub": str(admin.id), "role": admin.role, "email": admin.email}
    access_token = create_access_token(token_data)
    # Convert SQLAlchemy admin to AdminRead schema
    admin_read = AdminRead.model_validate(admin)
    return AdminLoginResponse(access_token=access_token, admin=admin_read)

# GET /api/admins/{id} endpoint
from fastapi import Path
@router.get("/{admin_id}", response_model=AdminRead)
def get_admin_by_id(admin_id: int = Path(..., description="Admin ID"), db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
    return AdminRead.model_validate(admin)
