import random
from datetime import datetime
from app.core.database import SessionLocal
from app.models.complaint import Complaint
from app.models.location import Ward

# Configuration

# Configuration
NUM_COMPLAINTS = 100
DEPARTMENTS = [
    "Municipal Governance & Community Services",
    "Education, Health & Social Welfare",
    "Infrastructure, Utilities & Natural Resources",
    "Security & Law Enforcement"
]
MUNICIPALITY_IDS = [1, 3, 7, 12]
URGENCIES = ["NORMAL", "URGENT", "HIGHLY URGENT"]
STATUS = ["PENDING", "IN PROCESS", "RESOLVED"]

session = SessionLocal()
complaints_created = 0

for muni_id in MUNICIPALITY_IDS:
    wards = session.query(Ward).filter(Ward.municipality_id == muni_id).all()
    ward_ids = [w.id for w in wards]
    for dept in DEPARTMENTS:
        for i in range(NUM_COMPLAINTS // (len(MUNICIPALITY_IDS) * len(DEPARTMENTS))):
            complaint = Complaint(
                citizen_id=1,  # Use a valid citizen_id from your DB
                department=dept,
                message=f"Test complaint {complaints_created+1}",
                urgency=random.choice(URGENCIES),
                current_status=random.choice(STATUS),
                date_submitted=datetime.now(),
                ward_id=random.choice(ward_ids) if ward_ids else None,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            session.add(complaint)
            complaints_created += 1

session.commit()
session.close()
print(f"Created {complaints_created} test complaints across departments {DEPARTMENTS} and municipalities {MUNICIPALITY_IDS}.")
