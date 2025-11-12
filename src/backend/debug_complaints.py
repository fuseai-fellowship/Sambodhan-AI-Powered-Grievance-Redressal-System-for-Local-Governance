STATUS_LABEL_MAP = {
    0: "PENDING",
    1: "IN PROCESS",
    2: "RESOLVED",
    3: "REJECTED"
}
URGENCY_LABEL_MAP = {
    0: "NORMAL",
    1: "URGENT",
    2: "HIGHLY URGENT"
}

def label_status(val):
    if isinstance(val, int):
        return STATUS_LABEL_MAP.get(val, str(val))
    if isinstance(val, str) and val.isdigit():
        return STATUS_LABEL_MAP.get(int(val), val)
    return val

def label_urgency(val):
    if isinstance(val, int):
        return URGENCY_LABEL_MAP.get(val, str(val))
    if isinstance(val, str) and val.isdigit():
        return URGENCY_LABEL_MAP.get(int(val), val)
    return val
# debug_complaints.py
from app import models
from app.core.database import SessionLocal


def print_department_analytics(department_name):
    db = SessionLocal()
    complaints = db.query(models.Complaint).filter(models.Complaint.department == department_name).all()
    print(f"\nAnalytics for department: {department_name}")
    print(f"Total complaints: {len(complaints)}")

    # Status breakdown
    status_counts = {}
    urgency_counts = {}
    resolved_count = 0
    total_response_time = 0
    response_time_count = 0

    for c in complaints:
        status = label_status(c.current_status) or "Unspecified"
        status_counts[status] = status_counts.get(status, 0) + 1
        urgency = label_urgency(c.urgency) or "Unspecified"
        urgency_counts[urgency] = urgency_counts.get(urgency, 0) + 1
        if status == "RESOLVED":
            resolved_count += 1
        # Example: Calculate response time if resolved
        if status == "RESOLVED" and c.created_at is not None and c.updated_at is not None:
            rt_hours = (c.updated_at - c.created_at).total_seconds() / 3600.0
            total_response_time += rt_hours
            response_time_count += 1

    print("\nStatus Breakdown:")
    for status, count in status_counts.items():
        print(f"  {status}: {count}")

    print("\nUrgency Breakdown:")
    for urgency, count in urgency_counts.items():
        print(f"  {urgency}: {count}")

    resolution_rate = (resolved_count / len(complaints) * 100) if complaints else 0
    avg_response_time = (total_response_time / response_time_count) if response_time_count else 0
    print(f"\nResolution Rate: {resolution_rate:.1f}%")
    print(f"Average Response Time (resolved): {avg_response_time:.2f} hours")

    print("\nSample Complaints:")
    for c in complaints[:10]:
        ward_id = c.ward_id
        ward = db.query(models.Ward).filter(models.Ward.id == ward_id).first() if ward_id is not None else None
        municipality_id = ward.municipality_id if ward else None
        print(f"ID: {c.id}, Status: {label_status(c.current_status)}, Urgency: {label_urgency(c.urgency)}, Ward: {ward_id}, Municipality: {municipality_id}, Message: {c.message}")
    db.close()

if __name__ == "__main__":
    department = "Municipal Governance & Community Services"
    print_department_analytics(department)
