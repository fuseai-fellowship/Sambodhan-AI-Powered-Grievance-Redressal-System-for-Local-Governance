from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import DEPARTMENT_LABEL_MAP, UserCreate, UserRead, UserUpdate
from app.utils.label_converter import resolve_label
from typing import List, Optional
from passlib.context import CryptContext

router = APIRouter(prefix="/api/users", tags=["Users"])

# Password hashing setup
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Helper function
def hash_password(password: str):
    return pwd_context.hash(password)


# Register a new user
@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create new user
    new_user = User(
        name=user_in.name,
        email=user_in.email,
        phone=user_in.phone,
        role=user_in.role,
        department=resolve_label(user_in.department, DEPARTMENT_LABEL_MAP),
        password_hash=hash_password(user_in.password),
        ward_id=user_in.ward_id,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Handle password hashing
    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["password_hash"] = hash_password(update_data.pop("password"))

    # Update all other fields dynamically
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user

# Get all users
@router.get("/", response_model=List[UserRead])
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users

@router.get("/", response_model=List[UserRead])
def get_all_users(
    role: Optional[UserRole] = Query(None, description="Filter by role"),
    department: Optional[int] = Query(None, ge=0, le=4, description="Filter by department"),
    district_id: Optional[int] = Query(None, description="Filter by district"),
    municipality_id: Optional[int] = Query(None, description="Filter by municipality"),
    ward_id: Optional[int] = Query(None, description="Filter by ward"),
    db: Session = Depends(get_db),
):
    query = db.query(User)

    if role:
        query = query.filter(User.role == role)
    if department is not None:
        query = query.filter(User.department == department)
    if district_id is not None:
        query = query.filter(User.district_id == district_id)
    if municipality_id is not None:
        query = query.filter(User.municipality_id == municipality_id)
    if ward_id is not None:
        query = query.filter(User.ward_id == ward_id)

    users = query.all()
    return users


# Get user by ID
@router.get("/{user_id}", response_model=UserRead)
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
