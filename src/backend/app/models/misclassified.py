from sqlalchemy import Column, Integer, SmallInteger, DateTime, Boolean, ForeignKey, func, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class MisclassifiedComplaint(Base):
    __tablename__ = "misclassified_complaints"

    mis_id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.complaint_id", ondelete="CASCADE"))
    predicted_department = Column(SmallInteger, CheckConstraint("predicted_department BETWEEN 0 AND 3"))
    predicted_urgency = Column(SmallInteger, CheckConstraint("predicted_urgency BETWEEN 0 AND 2"))
    actual_department = Column(SmallInteger, CheckConstraint("actual_department BETWEEN 0 AND 3"))
    actual_urgency = Column(SmallInteger, CheckConstraint("actual_urgency BETWEEN 0 AND 2"))
    flagged_at = Column(DateTime, server_default=func.now())
    reviewed = Column(Boolean, default=False)

    complaint = relationship("Complaint", back_populates="misclassifications")

    def __repr__(self):
        return f"<MisclassifiedComplaint(id={self.mis_id}, reviewed={self.reviewed})>"
