from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func, CheckConstraint, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.location import Ward
import enum


# Define Role Enum
class UserRole(enum.Enum):
    citizen = "citizen"
    official = "official"
    mayor = "mayor"
    super_admin = "super_admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    phone = Column(String(20))
    password_hash = Column(Text, nullable=False)
    # role = Column(String(20), nullable=False, server_default="citizen") # citizen, official, mayor, super_admin
    role = Column(
        SQLAlchemyEnum(UserRole, name="user_role_enum"),
        nullable=False,
        server_default=UserRole.citizen.value
    )
    department = Column(
        String(100),
        CheckConstraint(
            "department IN ("
            "'Municipal Governance & Community Services', "
            "'Education, Health & Social Welfare', "
            "'Infrastructure, Utilities & Natural Resources', "
            "'Security & Law Enforcement'"
            ")"
        ),
        nullable=True
    )
    ward_id = Column(Integer, ForeignKey("wards.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    complaints = relationship("Complaint", back_populates="citizen")
    status_changes = relationship("ComplaintStatusHistory", back_populates="changed_by_user")
    misclassifications_reported = relationship("MisclassifiedComplaint", back_populates="reported_by_user")
    ward = relationship("Ward", back_populates="users")