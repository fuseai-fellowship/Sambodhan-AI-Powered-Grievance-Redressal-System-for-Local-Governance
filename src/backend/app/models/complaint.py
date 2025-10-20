from sqlalchemy import (
    Column,
    Integer,
    SmallInteger,
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


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True)
    citizen_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    department = Column(SmallInteger, CheckConstraint("department BETWEEN 0 AND 3"), nullable=False)
    message = Column(Text, nullable=False)
    message_processed = Column(Text)
    urgency = Column(SmallInteger, CheckConstraint("urgency BETWEEN 0 AND 2"), default=0)
    current_status = Column(SmallInteger, CheckConstraint("current_status BETWEEN 0 AND 3"), default=0)
    date_submitted = Column(DateTime(timezone=True), server_default=func.now())
    district_id = Column(Integer, ForeignKey("districts.id"))
    municipality_id = Column(Integer, ForeignKey("municipalities.id"))
    ward_id = Column(Integer, ForeignKey("wards.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    citizen = relationship("User", back_populates="complaints")
    history = relationship("ComplaintStatusHistory", back_populates="complaint", cascade="all, delete-orphan")
    misclassifications = relationship("MisclassifiedComplaint", back_populates="complaint", cascade="all, delete-orphan")


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
    model_predicted_department = Column(SmallInteger, CheckConstraint("model_predicted_department BETWEEN 0 AND 3"))
    model_predicted_urgency = Column(SmallInteger, CheckConstraint("model_predicted_urgency BETWEEN 0 AND 2"))
    correct_department = Column(SmallInteger, CheckConstraint("correct_department BETWEEN 0 AND 3"))
    correct_urgency = Column(SmallInteger, CheckConstraint("correct_urgency BETWEEN 0 AND 2"))
    reported_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    reviewed = Column(Boolean, default=False)
    reviewed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    complaint = relationship("Complaint", back_populates="misclassifications")
    reported_by_user = relationship("User", back_populates="misclassifications_reported")
