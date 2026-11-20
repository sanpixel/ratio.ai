from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy import JSON
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    picture = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to saved recipes
    saved_recipes = relationship("SavedRecipe", back_populates="user", cascade="all, delete-orphan")

class RecipeNote(Base):
    """Shared notes written on a recipe's card. One per recipe page, no owner: anyone can edit."""
    __tablename__ = "recipe_notes"

    url = Column(String, primary_key=True)
    notes = Column(Text, nullable=False, default='')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SavedRecipe(Base):
    __tablename__ = "saved_recipes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    ingredients = Column(JSON, nullable=False)  # Store the full ingredients array
    ratios = Column(JSON, nullable=False)  # Store the calculated ratios
    instructions = Column(JSON, nullable=True)  # Directions, one string per step
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign key relationship
    user = relationship("User", back_populates="saved_recipes")
