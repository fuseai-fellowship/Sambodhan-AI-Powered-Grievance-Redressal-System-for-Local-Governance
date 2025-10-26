from sqlalchemy import (
    Column,
    SmallInteger,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    func,
    Boolean,
    CheckConstraint
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.location import Ward




class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True)
    citizen_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    
    # Department stored as string label
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

    message = Column(Text, nullable=False)
    message_processed = Column(Text)

    # Urgency stored as string label
    urgency = Column(
        String(20),
        CheckConstraint(
            "urgency IN ('NORMAL', 'URGENT', 'HIGHLY URGENT')"
        ),
        nullable=True
    )

    current_status = Column(
        String(20),
        CheckConstraint(
            "current_status IN ('PENDING', 'IN PROCESS', 'RESOLVED', 'REJECTED')"
        ),
        default="PENDING",
    )
    date_submitted = Column(DateTime(timezone=True), server_default=func.now())
    ward_id = Column(Integer, ForeignKey("wards.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    citizen = relationship("User", back_populates="complaints")
    history = relationship("ComplaintStatusHistory", back_populates="complaint", cascade="all, delete-orphan")
    misclassifications = relationship("MisclassifiedComplaint", back_populates="complaint", cascade="all, delete-orphan")
    ward = relationship("Ward", back_populates="complaints")

class ComplaintStatusHistory(Base):
    __tablename__ = "complaint_status_history"

    id = Column(Integer, primary_key=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    status = Column(SmallInteger, CheckConstraint("status BETWEEN 0 AND 3"), nullable=False)
    changed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    comment = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    complaint = relationship("Complaint", back_populates="history")
    changed_by_user = relationship("User", back_populates="status_changes")


class MisclassifiedComplaint(Base):
    __tablename__ = "misclassified_complaints"

    id = Column(Integer, primary_key=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)

    # Predicted labels as strings
    model_predicted_department = Column(
        String(100),
        CheckConstraint(
            "model_predicted_department IN ("
            "'Municipal Governance & Community Services', "
            "'Education, Health & Social Welfare', "
            "'Infrastructure, Utilities & Natural Resources', "
            "'Security & Law Enforcement'"
            ")"
        ),
        nullable=True
    )

    model_predicted_urgency = Column(
        String(20),
        CheckConstraint(
            "model_predicted_urgency IN ('NORMAL', 'URGENT', 'HIGHLY URGENT')"
        ),
        nullable=True
    )

    # Corrected labels as strings
    correct_department = Column(
        String(100),
        CheckConstraint(
            "correct_department IN ("
            "'Municipal Governance & Community Services', "
            "'Education, Health & Social Welfare', "
            "'Infrastructure, Utilities & Natural Resources', "
            "'Security & Law Enforcement'"
            ")"
        ),
        nullable=True
    )

    correct_urgency = Column(
        String(20),
        CheckConstraint(
            "correct_urgency IN ('NORMAL', 'URGENT', 'HIGHLY URGENT')"
        ),
        nullable=True
    )

    reported_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    reviewed = Column(Boolean, default=False)
    reviewed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    complaint = relationship("Complaint", back_populates="misclassifications")
    reported_by_user = relationship("User", back_populates="misclassifications_reported")
    

