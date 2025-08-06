import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

# Database URL - use PostgreSQL for Cloud Run, file-based SQLite for local development
# Check if running in Cloud Run (has PORT env var) and use PostgreSQL
if os.getenv("PORT"):
    # Running in Cloud Run - use PostgreSQL (Supabase)
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is required for Cloud Run deployment")
else:
    # Running locally - use file-based SQLite for development
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ratio_ai.db")

# Create engine with appropriate settings
if DATABASE_URL.startswith("sqlite"):
    # SQLite configuration
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False}  # Only needed for SQLite
    )
else:
    # PostgreSQL configuration
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True  # Verify connections before use
    )

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
