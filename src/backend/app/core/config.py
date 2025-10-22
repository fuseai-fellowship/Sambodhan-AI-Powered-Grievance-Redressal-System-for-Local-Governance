import os
from dotenv import load_dotenv
from pathlib import Path

# Get the directory containing this file
current_dir = Path(__file__).resolve().parent
# Navigate to backend directory (two levels up from app/core)
backend_dir = current_dir.parent.parent
# Load .env from backend directory
load_dotenv(backend_dir / ".env")

class Settings:
    PROJECT_NAME = "Sambodhan API"
    DATABASE_URL = os.getenv("DATABASE_URL")

settings = Settings()
