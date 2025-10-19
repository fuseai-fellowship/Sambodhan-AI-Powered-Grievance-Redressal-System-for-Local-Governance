from sqlalchemy import Column, Integer, String, SmallInteger, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    phone = Column(String(15))
    location = Column(String)
    role = Column(SmallInteger, CheckConstraint("role BETWEEN 0 AND 3"), nullable=False)
    assigned_department = Column(SmallInteger, CheckConstraint("assigned_department BETWEEN 0 AND 3"))

    # Relationships
    complaints = relationship("Complaint", back_populates="citizen", cascade="all, delete")
    history_actions = relationship("ComplaintHistory", back_populates="changed_by_user")

    def __repr__(self):
        return f"<User(name={self.name}, role={self.role})>"
