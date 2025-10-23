from datetime import datetime
from pydantic import BaseModel


# -------- District --------
class DistrictBase(BaseModel):
    name: str


class DistrictCreate(DistrictBase):
    pass


class DistrictRead(DistrictBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


# -------- Municipality --------
class MunicipalityBase(BaseModel):
    name: str
    district_id: int


class MunicipalityCreate(MunicipalityBase):
    pass


class MunicipalityRead(MunicipalityBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    district: DistrictRead | None = None  # optional nested read

    class Config:
        orm_mode = True


# -------- Ward --------
class WardBase(BaseModel):
    ward_number: int
    municipality_id: int


class WardCreate(WardBase):
    pass


class WardRead(WardBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    municipality: MunicipalityRead | None = None  # optional nested read

    class Config:
        orm_mode = True

# class HeiarchyLocationRead(BaseModel):
#     district: DistrictRead
#     municipality: MunicipalityRead
#     ward: WardRead

#     class Config:
#         orm_mode = True
# -------- End of Location Schemas --------