import csv
from pathlib import Path
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.location import District, Municipality, Ward

# Uncomment if tables might be empty
# Base.metadata.create_all(bind=engine)

def load_locations(csv_file: str):
    db: Session = SessionLocal()
    district_cache = {}
    municipality_cache = {}

    total_districts = total_municipalities = total_wards = 0
    skipped_districts = skipped_municipalities = skipped_wards = 0

    print(f"📂 Loading locations from: {csv_file}\n")

    with open(csv_file, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        # rows = list(reader)
        # print(f"🧾 Total rows read: {len(rows)}")
        # for row in rows:
        #     print(row)
        #     break  # show only the first one for check
        for row in reader:
            district_name = row["District"].strip()
            municipality_name = row["Name of Municipalities"].strip()

            try:
                num_wards = int(row["Numbers of Wards"])
            except (KeyError, ValueError):
                print(f"⚠️ Skipping invalid row: {row}")
                continue

            # ─── District ───────────────────────────────────────────────
            if district_name not in district_cache:
                district = db.query(District).filter_by(name=district_name).first()
                if not district:
                    district = District(name=district_name)
                    db.add(district)
                    db.commit()
                    db.refresh(district)
                    print(f"🆕 Added District: {district_name}")
                    total_districts += 1
                else:
                    skipped_districts += 1
                district_cache[district_name] = district
            else:
                district = district_cache[district_name]

            # ─── Municipality ───────────────────────────────────────────
            key = (district.id, municipality_name)
            if key not in municipality_cache:
                municipality = db.query(Municipality).filter_by(
                    name=municipality_name, district_id=district.id
                ).first()
                if not municipality:
                    municipality = Municipality(name=municipality_name, district_id=district.id)
                    db.add(municipality)
                    db.commit()
                    db.refresh(municipality)
                    print(f"   🏙️ Added Municipality: {municipality_name} (in {district_name})")
                    total_municipalities += 1
                else:
                    skipped_municipalities += 1
                municipality_cache[key] = municipality
            else:
                municipality = municipality_cache[key]

            # ─── Wards ─────────────────────────────────────────────────
            new_wards = 0
            for ward_number in range(1, num_wards + 1):
                exists = db.query(Ward).filter_by(
                    ward_number=ward_number, municipality_id=municipality.id
                ).first()
                if not exists:
                    db.add(Ward(ward_number=ward_number, municipality_id=municipality.id))
                    new_wards += 1
                else:
                    skipped_wards += 1
            if new_wards > 0:
                db.commit()
                total_wards += new_wards
                print(f"      🏘️ Added {new_wards} new wards for {municipality_name}")

    db.close()

    print("\n✅ Load complete!")
    print("────────────────────────────")
    print(f"🌍 Districts added: {total_districts} (skipped {skipped_districts})")
    print(f"🏙️ Municipalities added: {total_municipalities} (skipped {skipped_municipalities})")
    print(f"🏘️ Wards added: {total_wards} (skipped {skipped_wards})")
    print("────────────────────────────")

if __name__ == "__main__":
    csv_path = Path(__file__).resolve().parents[4] / "data/raw/location.csv"
    load_locations(csv_path)
