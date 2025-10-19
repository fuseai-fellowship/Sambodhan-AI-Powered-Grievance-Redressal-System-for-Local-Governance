from sqlalchemy import Column, Integer, ForeignKey, SmallInteger, DateTime, func, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class ComplaintHistory(Base):
    __tablename__ = "complaint_history"

    history_id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.complaint_id", ondelete="CASCADE"))
    status = Column(SmallInteger, CheckConstraint("status BETWEEN 0 AND 3"))
    changed_at = Column(DateTime, server_default=func.now())
    changed_by = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"))

    complaint = relationship("Complaint", back_populates="history")
    changed_by_user = relationship("User", back_populates="history_actions")

    def __repr__(self):
        return f"<ComplaintHistory(complaint_id={self.complaint_id}, status={self.status})>"
