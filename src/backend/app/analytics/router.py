# app/analytics/router.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.core.database import get_db
from app.analytics import service

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/by-urgency", response_model=Dict[str, Any])
def api_by_urgency(db: Session = Depends(get_db)):
    """
    Returns counts grouped by urgency label.
    If cache exists, returns cached JSON with last_updated metadata.
    """
    try:
        data = service.get_cached_or_compute(db, "by_urgency")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-department", response_model=Dict[str, Any])
def api_by_department(db: Session = Depends(get_db)):
    try:
        data = service.get_cached_or_compute(db, "by_department")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-status", response_model=Dict[str, Any])
def api_by_status(db: Session = Depends(get_db)):
    try:
        data = service.get_cached_or_compute(db, "by_status")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-district", response_model=Dict[str, Any])
def api_by_district(db: Session = Depends(get_db)):
    try:
        data = service.get_cached_or_compute(db, "by_district")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends/weekly", response_model=Dict[str, Any])
def api_weekly_trends(
    weeks: int = Query(12, ge=1, le=52, description="Number of weeks to include (default 12)"),
    db: Session = Depends(get_db),
):
    try:
        # Check cache first (cache does not parameterize by weeks currently)
        if weeks == 12:
            data = service.get_cached_or_compute(db, "weekly_trends", weeks=weeks)
            return data
        # For custom weeks, compute on the fly
        computed = service.trends_weekly(db, weeks=weeks)
        return {"data": computed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recompute", response_model=Dict[str, str])
def api_recompute_all(weeks: int = Query(12, ge=1, le=52), db: Session = Depends(get_db)):
    """
    Manually trigger recomputation of all analytics and write JSON files to app/analytics/cache/.
    Returns file paths for created caches.
    Public endpoint (no auth) per your requirement — consider adding auth for production.
    """
    try:
        result = service.recompute_all(db, weeks=weeks)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
