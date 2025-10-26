# app/services/analytics_service.py
import os
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Tuple, Optional
from collections import defaultdict

from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app import models

# Cache directory (user requested path)
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)


def _save_cache(name: str, payload: Dict[str, Any]) -> str:
    path = os.path.join(DATA_DIR, f"analytics_{name}.json")
    meta = {"last_updated": datetime.now(timezone.utc).isoformat(), "data": payload}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    return path


def _load_cache(name: str) -> Optional[Dict[str, Any]]:
    path = os.path.join(DATA_DIR, f"analytics_{name}.json")
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# -------------------------
# Simple aggregate endpoints
# -------------------------
def summary_counts(db: Session) -> Dict[str, Any]:
    """
    Returns aggregated counts:
      - total_complaints
      - by_urgency (string labels)
      - by_department (string labels)
      - by_status (string labels)
      - by_district (uses join: complaint -> ward -> municipality -> district)
    """
    total = db.query(func.count(models.Complaint.id)).scalar() or 0

    # by urgency
    urg_rows = (
        db.query(models.Complaint.urgency, func.count(models.Complaint.id))
        .group_by(models.Complaint.urgency)
        .all()
    )
    by_urgency = {u if u is not None else "Unspecified": int(c) for u, c in urg_rows}

    # by department
    dept_rows = (
        db.query(models.Complaint.department, func.count(models.Complaint.id))
        .group_by(models.Complaint.department)
        .all()
    )
    by_department = {d if d is not None else "Unspecified": int(c) for d, c in dept_rows}

    # by status
    status_rows = (
        db.query(models.Complaint.current_status, func.count(models.Complaint.id))
        .group_by(models.Complaint.current_status)
        .all()
    )
    by_status = {s if s is not None else "Unspecified": int(c) for s, c in status_rows}

    # by district (left joins)
    q = (
        db.query(func.coalesce(models.District.name, "Unspecified"), func.count(models.Complaint.id))
        .select_from(models.Complaint)
        .join(models.Ward, models.Complaint.ward_id == models.Ward.id, isouter=True)
        .join(models.Municipality, models.Ward.municipality_id == models.Municipality.id, isouter=True)
        .join(models.District, models.Municipality.district_id == models.District.id, isouter=True)
        .group_by(func.coalesce(models.District.name, "Unspecified"))
    )
    dist_rows = q.all()
    by_district = {name: int(cnt) for name, cnt in dist_rows}

    return {
        "total_complaints": int(total),
        "by_urgency": by_urgency,
        "by_department": by_department,
        "by_status": by_status,
        "by_district": by_district,
    }


# -------------------------
# Trend helpers using Postgres date_trunc
# -------------------------
def _period_labels_for_days(days: int) -> List[str]:
    """
    Returns list of ISO date strings (YYYY-MM-DD) for the past `days` days
    oldest -> newest.
    """
    today = datetime.now(timezone.utc).date()
    labels = []
    for i in range(days - 1, -1, -1):
        dt = today - timedelta(days=i)
        labels.append(dt.isoformat())
    return labels


def _period_labels_for_weeks(weeks: int) -> List[str]:
    """
    Returns list of week labels 'YYYY-Www' for the past `weeks` weeks (ISO week)
    oldest -> newest.
    """
    now = datetime.now(timezone.utc).date()
    labels = []
    for i in range(weeks - 1, -1, -1):
        dt = now - timedelta(weeks=i)
        y, w, _ = dt.isocalendar()
        labels.append(f"{y}-W{w:02d}")
    return labels


def _period_labels_for_months(months: int) -> List[str]:
    """
    Returns list of month labels 'YYYY-MM' for the past `months` months
    oldest -> newest.
    """
    now = datetime.now(timezone.utc)
    labels = []
    # go back months-1 .. 0
    for i in range(months - 1, -1, -1):
        year = now.year
        month = now.month - i
        # normalize
        while month <= 0:
            month += 12
            year -= 1
        labels.append(f"{year}-{month:02d}")
    return labels


def _grouped_trend(
    db: Session,
    trunc: str,
    period_label_func,
    period_column_name: str,
    lookback_value: int,
) -> Dict[str, Any]:
    """
    Generic trend aggregator using date_trunc(trunc, date_submitted).
    - trunc: 'day' | 'week' | 'month'
    - period_label_func: function that returns ordered labels for the lookback (e.g. days/weeks/months)
    - period_column_name is used only for clarity in debug (not needed)
    """
    # Build SQLAlchemy query grouping by truncated date + urgency + department
    # We'll select truncated_date, urgency, department, count
    truncated = func.date_trunc(trunc, models.Complaint.date_submitted).label("period_start")

    rows = (
        db.query(truncated, models.Complaint.urgency, models.Complaint.department, func.count(models.Complaint.id))
        .filter(models.Complaint.date_submitted.isnot(None))
        .group_by(truncated, models.Complaint.urgency, models.Complaint.department)
        .order_by(truncated)
        .all()
    )

    # Build mapping from period label -> totals and by categories
    labels = period_label_func(lookback_value)
    total_by_period = {lbl: 0 for lbl in labels}
    by_urgency = defaultdict(lambda: {lbl: 0 for lbl in labels})
    by_department = defaultdict(lambda: {lbl: 0 for lbl in labels})

    def label_from_truncated(dt: datetime) -> str:
        if trunc == "day":
            return dt.date().isoformat()
        if trunc == "week":
            y, w, _ = dt.isocalendar()
            return f"{y}-W{w:02d}"
        if trunc == "month":
            return f"{dt.year}-{dt.month:02d}"
        # fallback
        return dt.isoformat()

    for period_dt, urg, dept, cnt in rows:
        # convert to label
        if period_dt is None:
            continue
        lbl = label_from_truncated(period_dt)
        if lbl not in total_by_period:
            # skip periods outside requested range
            continue
        total_by_period[lbl] += int(cnt)
        urg_key = urg if urg is not None else "Unspecified"
        dept_key = dept if dept is not None else "Unspecified"
        by_urgency[urg_key][lbl] += int(cnt)
        by_department[dept_key][lbl] += int(cnt)

    return {
        "periods": labels,
        "total_by_period": total_by_period,
        "by_urgency": dict(by_urgency),
        "by_department": dict(by_department),
    }


def trends_daily(db: Session, days: int = 30) -> Dict[str, Any]:
    return _grouped_trend(db, "day", _period_labels_for_days, "date", days)


def trends_weekly(db: Session, weeks: int = 12) -> Dict[str, Any]:
    return _grouped_trend(db, "week", _period_labels_for_weeks, "week", weeks)


def trends_monthly(db: Session, months: int = 12) -> Dict[str, Any]:
    return _grouped_trend(db, "month", _period_labels_for_months, "month", months)


# -------------------------
# Recompute / cache orchestration
# -------------------------
def recompute_all(db: Session, days: int = 30, weeks: int = 12, months: int = 12) -> Dict[str, str]:
    """
    Recompute all analytics and write cache files to app/data/.
    Returns a dict mapping analytic name -> filepath created.
    """
    out = {}
    # summary
    out["summary"] = _save_cache("summary", summary_counts(db))
    # simple counts
    out["by_urgency"] = _save_cache("by_urgency", summary_counts(db).get("by_urgency", {}))
    out["by_department"] = _save_cache("by_department", summary_counts(db).get("by_department", {}))
    out["by_status"] = _save_cache("by_status", summary_counts(db).get("by_status", {}))
    out["by_district"] = _save_cache("by_district", summary_counts(db).get("by_district", {}))

    # trends
    out["trends_daily"] = _save_cache("trends_daily", trends_daily(db, days=days))
    out["trends_weekly"] = _save_cache("trends_weekly", trends_weekly(db, weeks=weeks))
    out["trends_monthly"] = _save_cache("trends_monthly", trends_monthly(db, months=months))

    return out


def get_cached_or_compute(db: Session, name: str, days: int = 30, weeks: int = 12, months: int = 12) -> Dict[str, Any]:
    """
    Load cached JSON if present; otherwise compute.
    Supported names: summary, by_urgency, by_department, by_status, by_district, trends_daily, trends_weekly, trends_monthly
    """
    cached = _load_cache(name)
    if cached:
        return cached

    if name == "summary":
        return {"data": summary_counts(db)}
    if name == "by_urgency":
        return {"data": summary_counts(db).get("by_urgency", {})}
    if name == "by_department":
        return {"data": summary_counts(db).get("by_department", {})}
    if name == "by_status":
        return {"data": summary_counts(db).get("by_status", {})}
    if name == "by_district":
        return {"data": summary_counts(db).get("by_district", {})}
    if name == "trends_daily":
        return {"data": trends_daily(db, days=days)}
    if name == "trends_weekly":
        return {"data": trends_weekly(db, weeks=weeks)}
    if name == "trends_monthly":
        return {"data": trends_monthly(db, months=months)}

    raise ValueError(f"Unknown analytics name: {name}")
