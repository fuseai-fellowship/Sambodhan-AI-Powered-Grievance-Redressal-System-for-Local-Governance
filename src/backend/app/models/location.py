from sqlalchemy import Column, Integer, SmallInteger, String
from app.core.database import Base


class Location(Base):
    __tablename__ = "locations"

    location_id = Column(Integer, primary_key=True, index=True)
    district = Column(String, nullable=False)
    municipality = Column(String, nullable=False)
    ward = Column(SmallInteger, nullable=False)

    def __repr__(self):
        return f"<Location({self.district}-{self.municipality}, ward={self.ward})>"
