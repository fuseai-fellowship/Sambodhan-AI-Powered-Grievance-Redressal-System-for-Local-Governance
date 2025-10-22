import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME = "Sambodhan API"
    DATABASE_URL = os.getenv("DATABASE_URL")

settings = Settings()
