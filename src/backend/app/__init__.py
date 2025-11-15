"""Backend app package."""

# Load .env at package import so all modules see environment variables
from dotenv import load_dotenv
from pathlib import Path
import os

backend_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(str(backend_env_path))
