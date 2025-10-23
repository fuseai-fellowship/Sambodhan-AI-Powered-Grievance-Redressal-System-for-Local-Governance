"""
Database session bootstrap file.
This module provides database engine and session factory for Sambodhan API.
It re-exports core database components from app.core.database for backward compatibility.
"""

from app.core.database import engine, SessionLocal, Base, get_db

__all__ = ["engine", "SessionLocal", "Base", "get_db"]
