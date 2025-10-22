from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os
from pathlib import Path

# Get the directory containing this file
current_dir = Path(__file__).resolve().parent
# Navigate to backend directory (two levels up from app/core)
backend_dir = current_dir.parent.parent
# Load .env from backend directory
load_dotenv(backend_dir / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
