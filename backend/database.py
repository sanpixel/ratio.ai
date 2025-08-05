import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

# Database URL - use in-memory SQLite for Cloud Run, file-based for local development
# Check if running in Cloud Run (has PORT env var) and use in-memory SQLite
if os.getenv("PORT"):
    # Running in Cloud Run - use in-memory SQLite due to read-only filesystem
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///:memory:")
else:
    # Running locally - use file-based SQLite
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ratio_ai.db")

# For SQLite, we need to handle some connection parameters
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False}  # Only needed for SQLite
    )
else:
    # For PostgreSQL
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    """Create all tables in the database"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
