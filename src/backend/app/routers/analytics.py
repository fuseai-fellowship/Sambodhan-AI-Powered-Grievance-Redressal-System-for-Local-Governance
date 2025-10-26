# app/routers/analytics.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.core.database import get_db
from app.services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/summary", response_model=Dict[str, Any])
def api_summary(db: Session = Depends(get_db)):
    """
    Aggregated counts summary (total, by_urgency, by_department, by_status, by_district).
    Returns cached JSON if available.
    """
    try:
        return analytics_service.get_cached_or_compute(db, "summary")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-urgency", response_model=Dict[str, Any])
def api_by_urgency(db: Session = Depends(get_db)):
    try:
        return analytics_service.get_cached_or_compute(db, "by_urgency")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-department", response_model=Dict[str, Any])
def api_by_department(db: Session = Depends(get_db)):
    try:
        return analytics_service.get_cached_or_compute(db, "by_department")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-status", response_model=Dict[str, Any])
def api_by_status(db: Session = Depends(get_db)):
    try:
        return analytics_service.get_cached_or_compute(db, "by_status")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-district", response_model=Dict[str, Any])
def api_by_district(db: Session = Depends(get_db)):
    try:
        return analytics_service.get_cached_or_compute(db, "by_district")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------
# Trends endpoints
# -------------------------


@router.get("/trends/daily", response_model=Dict[str, Any])
def api_trends_daily(
    days: int = Query(30, ge=1, le=365, description="Number of past days (default 30)"),
    db: Session = Depends(get_db),
):
    try:
        # If default days and cached present, return cached; otherwise compute
        if days == 30:
            return analytics_service.get_cached_or_compute(db, "trends_daily", days=days)
        computed = analytics_service.trends_daily(db, days=days)
        return {"data": computed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends/weekly", response_model=Dict[str, Any])
def api_trends_weekly(
    weeks: int = Query(12, ge=1, le=52, description="Number of past weeks (default 12)"),
    db: Session = Depends(get_db),
):
    try:
        if weeks == 12:
            return analytics_service.get_cached_or_compute(db, "trends_weekly", weeks=weeks)
        computed = analytics_service.trends_weekly(db, weeks=weeks)
        return {"data": computed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends/monthly", response_model=Dict[str, Any])
def api_trends_monthly(
    months: int = Query(12, ge=1, le=60, description="Number of past months (default 12)"),
    db: Session = Depends(get_db),
):
    try:
        if months == 12:
            return analytics_service.get_cached_or_compute(db, "trends_monthly", months=months)
        computed = analytics_service.trends_monthly(db, months=months)
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
