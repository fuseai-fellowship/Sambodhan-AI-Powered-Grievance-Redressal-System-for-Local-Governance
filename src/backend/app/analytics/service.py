# app/analytics/service.py
import os
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from collections import defaultdict, Counter
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models

CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
os.makedirs(CACHE_DIR, exist_ok=True)


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def _week_key(dt: datetime) -> str:
    """
    Return a YYYY-WW string for week buckets. Week starts Monday (ISO week).
    Use isocalendar to avoid DB-specific date_trunc functions.
    """
    y, w, _ = dt.isocalendar()
    return f"{y}-W{w:02d}"


def _save_cache(name: str, data: Dict[str, Any]) -> str:
    path = os.path.join(CACHE_DIR, f"{name}.json")
    # add last_updated
    data_with_meta = {"last_updated": datetime.now(timezone.utc).isoformat(), "data": data}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data_with_meta, f, ensure_ascii=False, indent=2)
    return path


def _load_cache(name: str) -> Dict[str, Any] | None:
    path = os.path.join(CACHE_DIR, f"{name}.json")
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ----------------------
# Aggregation functions
# ----------------------


def counts_by_urgency(db: Session) -> Dict[str, int]:
    """
    Returns counts grouped by urgency label (STRING stored in DB).
    """
    rows = db.query(models.Complaint.urgency, func.count(models.Complaint.id))\
             .group_by(models.Complaint.urgency).all()
    result = {}
    for urgency, cnt in rows:
        key = urgency if urgency is not None else "Unspecified"
        result[key] = int(cnt)
    return result


def counts_by_department(db: Session) -> Dict[str, int]:
    rows = db.query(models.Complaint.department, func.count(models.Complaint.id))\
             .group_by(models.Complaint.department).all()
    result = {}
    for dept, cnt in rows:
        key = dept if dept is not None else "Unspecified"
        result[key] = int(cnt)
    return result


def counts_by_status(db: Session) -> Dict[str, int]:
    rows = db.query(models.Complaint.current_status, func.count(models.Complaint.id))\
             .group_by(models.Complaint.current_status).all()
    result = {}
    for status, cnt in rows:
        key = status if status is not None else "Unspecified"
        result[key] = int(cnt)
    return result


def counts_by_district(db: Session) -> Dict[str, int]:
    """
    Join Complaint -> Ward -> Municipality -> District and count by district name.
    Falls back to 'Unspecified' if district is null.
    """
    # Left join path: Complaint.ward -> Ward.municipality -> Municipality.district
    # Use ORM relationships; querying raw columns to avoid loading too many objects.
    q = (
        db.query(func.coalesce(models.District.name, "Unspecified"), func.count(models.Complaint.id))
        .select_from(models.Complaint)
        .join(models.Ward, models.Complaint.ward_id == models.Ward.id, isouter=True)
        .join(models.Municipality, models.Ward.municipality_id == models.Municipality.id, isouter=True)
        .join(models.District, models.Municipality.district_id == models.District.id, isouter=True)
        .group_by(func.coalesce(models.District.name, "Unspecified"))
    )
    rows = q.all()
    return {name: int(cnt) for name, cnt in rows}


def trends_weekly(db: Session, weeks: int = 12) -> Dict[str, Any]:
    """
    Return weekly time-series counts based on date_submitted.
    - weeks: number of past weeks to include (including current week).
    Output example:
    {
      "weeks": ["2025-W40", "2025-W41", ...],
      "total_by_week": {"2025-W40": 5, ...},
      "by_urgency": {"NORMAL": {"2025-W40": 2, ...}, "URGENT": {...}},
      "by_department": { "Education, ...": { ... } }
    }
    """
    # Fetch relevant rows (date_submitted and categorical fields)
    cutoff = datetime.now(timezone.utc) - timedelta(weeks=weeks)
    rows = db.query(models.Complaint.id, models.Complaint.date_submitted,
                    models.Complaint.urgency, models.Complaint.department).\
        filter(models.Complaint.date_submitted >= cutoff).all()

    # Build week list from oldest to newest
    now = datetime.now(timezone.utc)
    # compute week keys for the last `weeks` weeks (including current)
    week_keys = []
    # compute Monday of current week and go back
    # We'll use ISO weeks to label
    for i in range(weeks - 1, -1, -1):
        wk_dt = now - timedelta(weeks=i)
        week_keys.append(_week_key(wk_dt))

    # initialize counters
    total_by_week = {wk: 0 for wk in week_keys}
    by_urgency = defaultdict(lambda: {wk: 0 for wk in week_keys})
    by_department = defaultdict(lambda: {wk: 0 for wk in week_keys})

    for _id, dt, urg, dept in rows:
        if dt is None:
            continue
        key = _week_key(dt)
        if key not in total_by_week:
            # skip events older than range
            continue
        total_by_week[key] += 1
        urg_key = urg if urg is not None else "Unspecified"
        dept_key = dept if dept is not None else "Unspecified"
        by_urgency[urg_key][key] += 1
        by_department[dept_key][key] += 1

    return {
        "weeks": week_keys,
        "total_by_week": total_by_week,
        "by_urgency": dict(by_urgency),
        "by_department": dict(by_department),
    }


# ----------------------
# Top-level recompute and cache helpers
# ----------------------


def recompute_all(db: Session, weeks: int = 12) -> Dict[str, str]:
    """
    Compute all analytics and save JSON caches. Returns dict of file paths.
    """
    outputs = {}

    # counts
    outputs["by_urgency"] = _save_cache("by_urgency", counts_by_urgency(db))
    outputs["by_department"] = _save_cache("by_department", counts_by_department(db))
    outputs["by_status"] = _save_cache("by_status", counts_by_status(db))
    outputs["by_district"] = _save_cache("by_district", counts_by_district(db))
    outputs["weekly_trends"] = _save_cache("weekly_trends", trends_weekly(db, weeks=weeks))

    return outputs


def get_cached_or_compute(db: Session, name: str, weeks: int = 12) -> Dict[str, Any]:
    """
    Load a named cache file if present; otherwise compute it on the fly.
    Supported names: 'by_urgency', 'by_department', 'by_status', 'by_district', 'weekly_trends'
    """
    cached = _load_cache(name)
    if cached:
        return cached

    # Not cached: compute and return structure similar to saved file (with last_updated omitted)
    if name == "by_urgency":
        return {"data": counts_by_urgency(db)}
    if name == "by_department":
        return {"data": counts_by_department(db)}
    if name == "by_status":
        return {"data": counts_by_status(db)}
    if name == "by_district":
        return {"data": counts_by_district(db)}
    if name == "weekly_trends":
        return {"data": trends_weekly(db, weeks=weeks)}

    raise ValueError(f"Unknown analytics name: {name}")
