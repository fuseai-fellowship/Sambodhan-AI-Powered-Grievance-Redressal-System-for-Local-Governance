from sqlalchemy import Column, Integer, Text, SmallInteger, ForeignKey, DateTime, func, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    complaint_id = Column(Integer, primary_key=True, index=True)
    citizen_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"))
    message = Column(Text, nullable=False)
    date_submitted = Column(DateTime, server_default=func.now())
    department = Column(SmallInteger, CheckConstraint("department BETWEEN 0 AND 3"))
    urgency = Column(SmallInteger, CheckConstraint("urgency BETWEEN 0 AND 2"))
    current_status = Column(SmallInteger, CheckConstraint("current_status BETWEEN 0 AND 3"), default=0)
    location = Column(Text)
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())
    location_id = Column(Integer, ForeignKey("locations.location_id", ondelete="SET NULL"))

    # Relationships
    citizen = relationship("User", back_populates="complaints")
    history = relationship("ComplaintHistory", back_populates="complaint", cascade="all, delete")
    misclassifications = relationship("MisclassifiedComplaint", back_populates="complaint", cascade="all, delete")

    def __repr__(self):
        return f"<Complaint(id={self.complaint_id}, dept={self.department}, status={self.current_status})>"
