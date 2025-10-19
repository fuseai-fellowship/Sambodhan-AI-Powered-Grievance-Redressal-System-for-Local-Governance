from app.core.database import Base, engine
from app.models import *

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("✅ All tables created successfully.")
