from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Boolean, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    municipalities = relationship("Municipality", back_populates="district", cascade="all, delete-orphan")


class Municipality(Base):
    __tablename__ = "municipalities"
    __table_args__ = (
        UniqueConstraint("name", "district_id", name="uq_municipality_name_per_district"),
        Index("ix_municipality_district_id", "district_id"),
    )

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id", ondelete="CASCADE"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    district = relationship("District", back_populates="municipalities")
    wards = relationship("Ward", back_populates="municipality", cascade="all, delete-orphan")


class Ward(Base):
    __tablename__ = "wards"
    __table_args__ = (
        UniqueConstraint("ward_number", "municipality_id", name="uq_ward_number_per_municipality"),
        Index("ix_ward_municipality_id", "municipality_id"),
    )

    id = Column(Integer, primary_key=True)
    ward_number = Column(Integer, nullable=False)
    municipality_id = Column(Integer, ForeignKey("municipalities.id", ondelete="CASCADE"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    municipality = relationship("Municipality", back_populates="wards")
    users = relationship("User", back_populates="ward")
    complaints = relationship("Complaint", back_populates="ward")
