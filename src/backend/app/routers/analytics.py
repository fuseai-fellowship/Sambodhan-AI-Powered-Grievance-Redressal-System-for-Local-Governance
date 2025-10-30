# app/routers/analytics.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.core.database import get_db
from app.services import analytics_service
from fastapi import Request

def get_filters(request: Request):
    ward_id = request.query_params.get("ward_id")
    department = request.query_params.get("department")
    municipality_id = request.query_params.get("municipality_id")
    filters = {}
    if ward_id:
        filters["ward_id"] = int(ward_id)
    if department:
        filters["department"] = department
    if municipality_id:
        filters["municipality_id"] = int(municipality_id)
    return filters

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/summary", response_model=Dict[str, Any])
async def api_summary(request: Request, db: Session = Depends(get_db)):
    """
    Aggregated counts summary (total, by_urgency, by_department, by_status, by_district).
    Returns cached JSON if available.
    """
    try:
        filters = get_filters(request)
        return analytics_service.get_cached_or_compute(db, "summary", **filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-urgency", response_model=Dict[str, Any])
async def api_by_urgency(request: Request, db: Session = Depends(get_db)):
    try:
        filters = get_filters(request)
        return analytics_service.get_cached_or_compute(db, "by_urgency", **filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-department", response_model=Dict[str, Any])
async def api_by_department(request: Request, db: Session = Depends(get_db)):
    try:
        filters = get_filters(request)
        return analytics_service.get_cached_or_compute(db, "by_department", **filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-status", response_model=Dict[str, Any])
async def api_by_status(request: Request, db: Session = Depends(get_db)):
    try:
        filters = get_filters(request)
        return analytics_service.get_cached_or_compute(db, "by_status", **filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-district", response_model=Dict[str, Any])
async def api_by_district(request: Request, db: Session = Depends(get_db)):
    try:
        filters = get_filters(request)
        return analytics_service.get_cached_or_compute(db, "by_district", **filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------
# Trends endpoints
# -------------------------


@router.get("/trends/daily", response_model=Dict[str, Any])
@router.get("/trends/daily", response_model=Dict[str, Any])
async def api_trends_daily(
    request: Request,
    days: int = Query(30, ge=1, le=365, description="Number of past days (default 30)"),
    db: Session = Depends(get_db),
):
    try:
        filters = get_filters(request)
        if days == 30:
            return analytics_service.get_cached_or_compute(db, "trends_daily", days=days, **filters)
        computed = analytics_service.trends_daily(db, days=days, **filters)
        return {"data": computed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends/weekly", response_model=Dict[str, Any])
@router.get("/trends/weekly", response_model=Dict[str, Any])
async def api_trends_weekly(
    request: Request,
    weeks: int = Query(12, ge=1, le=52, description="Number of past weeks (default 12)"),
    db: Session = Depends(get_db),
):
    try:
        filters = get_filters(request)
        if weeks == 12:
            return analytics_service.get_cached_or_compute(db, "trends_weekly", weeks=weeks, **filters)
        computed = analytics_service.trends_weekly(db, weeks=weeks, **filters)
        return {"data": computed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends/monthly", response_model=Dict[str, Any])
@router.get("/trends/monthly", response_model=Dict[str, Any])
async def api_trends_monthly(
    request: Request,
    months: int = Query(12, ge=1, le=60, description="Number of past months (default 12)"),
    db: Session = Depends(get_db),
):
    try:
        filters = get_filters(request)
        if months == 12:
            return analytics_service.get_cached_or_compute(db, "trends_monthly", months=months, **filters)
        computed = analytics_service.trends_monthly(db, months=months, **filters)
        return {"data": computed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recompute", response_model=Dict[str, str])
def api_recompute_all(
    days: int = Query(30, ge=1, le=365),
    weeks: int = Query(12, ge=1, le=52),
    months: int = Query(12, ge=1, le=60),
    db: Session = Depends(get_db),
):
    """
    Manually trigger recomputation and cache write. Public endpoint per your instruction.
    Returns a mapping analytic_name -> filepath.
    """
    try:
        out = analytics_service.recompute_all(db, days=days, weeks=weeks, months=months)
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
