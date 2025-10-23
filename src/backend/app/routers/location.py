from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
import json


from app.core.database import get_db
from app.models.location import District, Municipality, Ward
from app.schemas.location import (
    DistrictCreate, DistrictRead,
    MunicipalityCreate, MunicipalityRead,
    WardCreate, WardRead,
)

router = APIRouter(prefix="/api/locations", tags=["Locations"])


# -------------------- District --------------------
@router.post("/districts/", response_model=DistrictRead)
def create_district(district_in: DistrictCreate, db: Session = Depends(get_db)):
    district = District(name=district_in.name)
    db.add(district)
    db.commit()
    db.refresh(district)
    return district


@router.get("/districts/", response_model=List[DistrictRead])
def read_districts(
    skip: int = 0,
    limit: int = 100,
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(District).filter(District.is_active == is_active)
    return query.offset(skip).limit(limit).all()


@router.get("/districts/{district_id}", response_model=DistrictRead)
def read_district(district_id: int, db: Session = Depends(get_db)):
    district = db.query(District).filter(District.id == district_id).first()
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    return district


@router.put("/districts/{district_id}", response_model=DistrictRead)
def update_district(district_id: int, district_in: DistrictCreate, db: Session = Depends(get_db)):
    district = db.query(District).filter(District.id == district_id).first()
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    district.name = district_in.name
    db.commit()
    db.refresh(district)
    return district


@router.delete("/districts/{district_id}", response_model=DistrictRead)
def delete_district(district_id: int, db: Session = Depends(get_db)):
    district = db.query(District).filter(District.id == district_id).first()
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    district.is_active = False
    db.commit()
    db.refresh(district)
    return district


# -------------------- Municipality --------------------
@router.post("/municipalities/", response_model=MunicipalityRead)
def create_municipality(municipality_in: MunicipalityCreate, db: Session = Depends(get_db)):
    municipality = Municipality(name=municipality_in.name, district_id=municipality_in.district_id)
    db.add(municipality)
    db.commit()
    db.refresh(municipality)
    return municipality


@router.get("/municipalities/", response_model=List[MunicipalityRead])
def read_municipalities(
    district_id: int | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(Municipality).filter(Municipality.is_active == is_active)
    if district_id:
        query = query.filter(Municipality.district_id == district_id)
    return query.offset(skip).limit(limit).all()


@router.get("/municipalities/{municipality_id}", response_model=MunicipalityRead)
def read_municipality(municipality_id: int, db: Session = Depends(get_db)):
    municipality = db.query(Municipality).filter(Municipality.id == municipality_id).first()
    if not municipality:
        raise HTTPException(status_code=404, detail="Municipality not found")
    return municipality


@router.put("/municipalities/{municipality_id}", response_model=MunicipalityRead)
def update_municipality(municipality_id: int, municipality_in: MunicipalityCreate, db: Session = Depends(get_db)):
    municipality = db.query(Municipality).filter(Municipality.id == municipality_id).first()
    if not municipality:
        raise HTTPException(status_code=404, detail="Municipality not found")
    municipality.name = municipality_in.name
    municipality.district_id = municipality_in.district_id
    db.commit()
    db.refresh(municipality)
    return municipality


@router.delete("/municipalities/{municipality_id}", response_model=MunicipalityRead)
def delete_municipality(municipality_id: int, db: Session = Depends(get_db)):
    municipality = db.query(Municipality).filter(Municipality.id == municipality_id).first()
    if not municipality:
        raise HTTPException(status_code=404, detail="Municipality not found")
    municipality.is_active = False
    db.commit()
    db.refresh(municipality)
    return municipality


# -------------------- Ward --------------------
@router.post("/wards/", response_model=WardRead)
def create_ward(ward_in: WardCreate, db: Session = Depends(get_db)):
    ward = Ward(ward_number=ward_in.ward_number, municipality_id=ward_in.municipality_id)
    db.add(ward)
    db.commit()
    db.refresh(ward)
    return ward


@router.get("/wards/", response_model=List[WardRead])
def read_wards(
    municipality_id: int | None = Query(None),
    skip: int = 0,
    limit: int = 100,
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(Ward).filter(Ward.is_active == is_active)
    if municipality_id:
        query = query.filter(Ward.municipality_id == municipality_id)
    return query.offset(skip).limit(limit).all()


@router.get("/wards/{ward_id}", response_model=WardRead)
def read_ward(ward_id: int, db: Session = Depends(get_db)):
    ward = db.query(Ward).filter(Ward.id == ward_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found")
    return ward


@router.put("/wards/{ward_id}", response_model=WardRead)
def update_ward(ward_id: int, ward_in: WardCreate, db: Session = Depends(get_db)):
    ward = db.query(Ward).filter(Ward.id == ward_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found")
    ward.ward_number = ward_in.ward_number
    ward.municipality_id = ward_in.municipality_id
    db.commit()
    db.refresh(ward)
    return ward


@router.delete("/wards/{ward_id}", response_model=WardRead)
def delete_ward(ward_id: int, db: Session = Depends(get_db)):
    ward = db.query(Ward).filter(Ward.id == ward_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found")
    ward.is_active = False
    db.commit()
    db.refresh(ward)
    return ward



# @router.get("/hierarchy/", response_model=List[HeiarchyLocationRead])
# def read_location_hierarchy(
#     db: Session = Depends(get_db),
#     include_inactive: bool = Query(False, description="Include inactive districts, municipalities, wards")
# ):
#     # Filter for active only unless include_inactive=True
#     district_query = db.query(District)
#     if not include_inactive:
#         district_query = district_query.filter(District.is_active)
    
#     districts = district_query.all()

#     # Preload nested relationships
#     for district in districts:
#         # Municipalities
#         if not include_inactive:
#             district.municipalities = [m for m in district.municipalities if m.is_active]
#             for m in district.municipalities:
#                 m.wards = [w for w in m.wards if w.is_active]
#         else:
#             # include all municipalities and wards
#             for m in district.municipalities:
#                 m.wards = m.wards

#     return districts


BASE_DIR = Path(__file__).resolve().parent.parent.parent / "data"
with open(BASE_DIR / "location_id.json", "r", encoding="utf-8") as f:
    location_data = json.load(f)

@router.get("/location-ids")
def get_location_ids(
    district: Optional[str] = Query(None, description="District name"),
    municipality: Optional[str] = Query(None, description="Municipality name"),
    ward: Optional[int] = Query(None, description="Ward number")
):
    def normalize(s): return s.strip().lower() if isinstance(s, str) else s

    district_n = normalize(district)
    municipality_n = normalize(municipality)

    matches = []
    for item in location_data:
        if district_n and normalize(item["district"]) != district_n:
            continue
        if municipality_n and normalize(item["municipality"]) != municipality_n:
            continue
        if ward and item["ward"] != ward:
            continue
        matches.append(item)

    if not matches:
        raise HTTPException(status_code=404, detail="No matching location found")

    result = matches[0]
    response = {}
    if district:
        response["district_id"] = result["district_id"]
    if municipality:
        response["municipality_id"] = result["municipality_id"]
    if ward:
        response["ward_id"] = result["ward_id"]

    return response