from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    municipalities = relationship("Municipality", back_populates="district")


class Municipality(Base):
    __tablename__ = "municipalities"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    district = relationship("District", back_populates="municipalities")
    wards = relationship("Ward", back_populates="municipality")


class Ward(Base):
    __tablename__ = "wards"

    id = Column(Integer, primary_key=True)
    ward_number = Column(Integer, nullable=False)
    municipality_id = Column(Integer, ForeignKey("municipalities.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    municipality = relationship("Municipality", back_populates="wards")
