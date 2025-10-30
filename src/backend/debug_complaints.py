# debug_complaints.py
from app import models
from app.core.database import SessionLocal

def print_complaints_for_department(department_name):
    db = SessionLocal()
    complaints = db.query(models.Complaint).filter(models.Complaint.department == department_name).all()
    print(f"Complaints for department '{department_name}': {len(complaints)}")
    for c in complaints:
        ward_id = c.ward_id
        ward = db.query(models.Ward).filter(models.Ward.id == ward_id).first() if ward_id else None
        municipality_id = ward.municipality_id if ward else None
        print(f"ID: {c.id}, Status: {c.current_status}, Ward: {ward_id}, Municipality: {municipality_id}, Message: {c.message}")
    db.close()

if __name__ == "__main__":
    department = "Municipal Governance & Community Services"
    print_complaints_for_department(department)
