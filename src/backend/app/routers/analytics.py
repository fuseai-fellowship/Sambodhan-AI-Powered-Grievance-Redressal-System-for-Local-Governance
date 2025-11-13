from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from app.core.database import get_db
from app.services import analytics_service
from sqlalchemy import func, case
from app import models

# Single router definition
router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

# Utility function
def get_filters(request: Request):
    ward_id = request.query_params.get("ward_id")
    department = request.query_params.get("department")
    municipality_id = request.query_params.get("municipality_id")
    district_id = request.query_params.get("district_id")
    filters = {}
    if ward_id:
        filters["ward_id"] = int(ward_id)
    if department:
        filters["department"] = department
    if municipality_id:
        filters["municipality_id"] = int(municipality_id)
    if district_id:
        filters["district_id"] = int(district_id)
    return filters

# Test endpoint
@router.get("/test-alive", summary="Test if analytics router is loaded")
def test_alive():
    return {"status": "alive", "version": "2.0"}  # Changed version to force reload

# Dashboard endpoints
@router.get("/summary", response_model=Dict[str, Any])
async def api_summary(request: Request, db: Session = Depends(get_db)):
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


# Custom visualization endpoints
@router.get("/location-hotspots")
async def api_location_hotspots(request: Request, db: Session = Depends(get_db)):
    """Get complaint counts by district (simplified for stability)"""
    try:
        filters = get_filters(request)
        
        # Get by-department data which we know works
        dept_data = analytics_service.get_cached_or_compute(db, "by_department", **filters)
        
        # Handle nested data structure
        if isinstance(dept_data, dict) and "data" in dept_data:
            data = dept_data["data"]
        else:
            data = dept_data
        
        # Ensure data is a dict before iterating
        if not isinstance(data, dict):
            return []
        
        # Transform to location hotspots format (using departments as "locations")
        result = []
        for dept_name, stats in data.items():
            if isinstance(stats, dict):
                result.append({
                    "location": dept_name,
                    "count": stats.get("total", 0)
                })
        
        # Sort by count descending
        result.sort(key=lambda x: x["count"], reverse=True)
        
        return result[:10]  # Top 10
    except Exception as e:
        import traceback
        print(f"Error in location-hotspots: {str(e)}")
        print(traceback.format_exc())
        return []


@router.get("/quality-metrics")
async def api_quality_metrics(request: Request, db: Session = Depends(get_db)):
    """Get quality metrics over time (monthly trend)"""
    try:
        filters = get_filters(request)
        print(f"[Quality Metrics] Filters: {filters}")
        trend_result = analytics_service.get_cached_or_compute(db, "trends_monthly", months=12, **filters)
        
        # Handle nested data structure
        if isinstance(trend_result, dict) and "data" in trend_result:
            trend = trend_result["data"]
        else:
            trend = trend_result
        
        # Ensure trend is a dict
        if not isinstance(trend, dict):
            print("[Quality Metrics] Trend is not a dict, returning empty array")
            return []
        
        # Transform to chart format
        chart = []
        if "periods" in trend and "total_by_period" in trend:
            for month in trend["periods"]:
                total = trend.get("total_by_period", {}).get(month, 0)
                chart.append({"month": month, "value": total})
        
        print(f"[Quality Metrics] Returning {len(chart)} data points")
        return chart
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[Quality Metrics] Error: {str(e)}")
        print(error_trace)
        raise HTTPException(status_code=500, detail=f"Quality metrics error: {str(e)}")


@router.get("/performance")
async def api_performance(request: Request, db: Session = Depends(get_db)):
    """Get performance metrics comparing department vs city averages"""
    try:
        filters = get_filters(request)
        print(f"[Performance] Filters: {filters}")
        summary = analytics_service.get_cached_or_compute(db, "summary", **filters)
        
        # Calculate basic performance metrics
        data = summary.get("data", summary)
        total = data.get("total_complaints", 0) or data.get("total", 0)
        resolved = data.get("by_status", {}).get("Resolved", 0)
        
        performance = {
            "avgResponseTime": 0,  # Placeholder - implement if you have response time data
            "cityAvgResponseTime": 0,
            "resolutionRate": round((resolved / total * 100) if total > 0 else 0, 1),
            "cityResolutionRate": 0,  # Placeholder - requires city-wide data
            "citizenSatisfaction": 0,  # Placeholder - implement if you have feedback data
            "cityCitizenSatisfaction": 0,
            "firstTimeResolution": 0,  # Placeholder
            "cityFirstTimeResolution": 0,
        }
        print(f"[Performance] Returning metrics: {performance}")
        return performance
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[Performance] Error: {str(e)}")
        print(error_trace)
        raise HTTPException(status_code=500, detail=f"Performance metrics error: {str(e)}")


# Trends endpoints
@router.get("/trends/daily", response_model=Dict[str, Any])
async def api_trends_daily(
    request: Request,
    days: int = Query(30, ge=1, le=365, description="Number of past days (default 30)"),
    db: Session = Depends(get_db),
):
    try:
        filters = get_filters(request)
        print(f"[Trends Daily] Filters: {filters}, Days: {days}")
        if days == 30:
            result = analytics_service.get_cached_or_compute(db, "trends_daily", days=days, **filters)
        else:
            computed = analytics_service.trends_daily(db, days=days, **filters)
            result = {"data": computed}
        print(f"[Trends Daily] Returning {len(result.get('data', []))} data points")
        return result
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[Trends Daily] Error: {str(e)}")
        print(error_trace)
        raise HTTPException(status_code=500, detail=f"Daily trends error: {str(e)}")

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
    try:
        print(f"[Recompute] Starting recompute with days={days}, weeks={weeks}, months={months}")
        out = analytics_service.recompute_all(db, days=days, weeks=weeks, months=months)
        print(f"[Recompute] Success: {out}")
        return out
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[Recompute] Error: {str(e)}")
        print(error_trace)
        raise HTTPException(status_code=500, detail=f"Recompute error: {str(e)}")


@router.get("/export")
async def api_export_analytics(request: Request, db: Session = Depends(get_db)):
    """Export analytics data as CSV file"""
    try:
        from fastapi.responses import StreamingResponse
        import io
        import csv
        from datetime import datetime
        
        filters = get_filters(request)
        
        # Fetch all analytics data
        summary = analytics_service.get_cached_or_compute(db, "summary", **filters)
        data = summary.get("data", summary)
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header with metadata
        writer.writerow(["Sambodhan Analytics Export"])
        writer.writerow(["Generated on:", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
        
        if filters.get("department"):
            writer.writerow(["Department:", filters["department"]])
        if filters.get("municipality_id"):
            writer.writerow(["Municipality ID:", filters["municipality_id"]])
        if filters.get("ward_id"):
            writer.writerow(["Ward ID:", filters["ward_id"]])
        
        writer.writerow([])  # Empty row
        
        # Summary Statistics
        writer.writerow(["Summary Statistics"])
        writer.writerow(["Total Complaints:", data.get("total_complaints", 0)])
        writer.writerow([])
        
        # By Status
        writer.writerow(["Status Breakdown"])
        writer.writerow(["Status", "Count"])
        for status, count in data.get("by_status", {}).items():
            writer.writerow([status, count])
        writer.writerow([])
        
        # By Urgency
        writer.writerow(["Urgency Breakdown"])
        writer.writerow(["Urgency", "Count"])
        for urgency, count in data.get("by_urgency", {}).items():
            writer.writerow([urgency, count])
        writer.writerow([])
        
        # By Department
        writer.writerow(["Department Breakdown"])
        writer.writerow(["Department", "Total", "Resolved", "Resolution Rate (%)"])
        for dept, stats in data.get("by_department", {}).items():
            writer.writerow([
                dept, 
                stats.get("total", 0), 
                stats.get("resolved", 0),
                round(stats.get("rate", 0), 2) if stats.get("rate") else 0
            ])
        writer.writerow([])
        
        # By District
        writer.writerow(["District Breakdown"])
        writer.writerow(["District", "Count"])
        for district, count in data.get("by_district", {}).items():
            writer.writerow([district, count])
        
        # Prepare file for download
        output.seek(0)
        
        # Generate filename with timestamp
        filename = f"analytics_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        import traceback
        print(f"Error in export: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

