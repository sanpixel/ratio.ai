from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import logging
import re
import os
from pathlib import Path

from scraper import RecipeScraper
from parser import RecipeParser
from ratios import RatioCalculator
from database import get_db, create_tables
from models import User, SavedRecipe
from auth import verify_google_token, create_access_token, get_current_user

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ratio.ai API", version="1.0.0")

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    create_tables()

# Enable CORS for frontend - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Must be False when using allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (built React app)
static_dir = Path(__file__).parent / "frontend" / "build"
logger.info(f"Looking for React build at: {static_dir}")
logger.info(f"Static directory exists: {static_dir.exists()}")

if static_dir.exists():
    # Mount static assets (JS/CSS)
    static_assets_dir = static_dir / "static"
    if static_assets_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_assets_dir)), name="static")
        logger.info(f"Mounted static assets from: {static_assets_dir}")
    
    # Mount media files directly from build directory
    @app.get("/loading-video.mp4")
    async def serve_loading_video():
        video_file = static_dir / "loading-video.mp4"
        if video_file.exists():
            return FileResponse(str(video_file), media_type="video/mp4")
        return {"error": "Video not found"}
    
    @app.get("/loading-animation.gif")
    async def serve_loading_gif():
        gif_file = static_dir / "loading-animation.gif"
        if gif_file.exists():
            return FileResponse(str(gif_file), media_type="image/gif")
        return {"error": "GIF not found"}
    
else:
    logger.warning(f"Frontend build directory not found at {static_dir}. API-only mode.")
    # Fallback root endpoint when no React build is available
    @app.get("/")
    async def root():
        return {"message": "Welcome to ratio.ai API - React build not found"}

class RecipeRequest(BaseModel):
    url: HttpUrl

class IngredientData(BaseModel):
    name: str
    quantity: float
    unit: str
    grams: float = 0.0
    original_text: str
    was_normalized: bool = False

class RecipeResponse(BaseModel):
    title: str
    url: str
    ingredients: List[IngredientData]
    ratios: Dict[str, Any]
    success: bool
    error: str = None

# Root endpoint will be handled by the catch-all route below

class GoogleAuthRequest(BaseModel):
    token: str

@app.post("/api/auth/google")
async def google_login(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    user_info = await verify_google_token(request.token)
    
    # Check if user already exists
    user = db.query(User).filter(User.google_id == user_info["sub"]).first()
    
    if not user:
        # Create a new user
        user = User(
            google_id=user_info["sub"],
            email=user_info["email"],
            name=user_info.get("name", ""),
            picture=user_info.get("picture"),
        )
        db.add(user)
        db.commit()
    
    # Create a JWT token for the user
    access_token = create_access_token({"sub": str(user.id)})
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/save-recipe")
async def save_recipe(
    recipe: RecipeResponse,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save a processed recipe for the authenticated user"""
    saved_recipe = SavedRecipe(
        user_id=user.id,
        title=recipe.title,
        url=recipe.url,
        ingredients=[ingredient.dict() for ingredient in recipe.ingredients],
        ratios=recipe.ratios
    )
    db.add(saved_recipe)
    db.commit()
    return {"message": "Recipe saved successfully"}

@app.get("/api/user")
async def get_user(user: User = Depends(get_current_user)):
    """Get current authenticated user info"""
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "picture": user.picture
    }

@app.get("/api/saved-recipes")
async def get_saved_recipes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all saved recipes for the authenticated user"""
    return db.query(SavedRecipe).filter(SavedRecipe.user_id == user.id).all()

@app.post("/api/process-recipe", response_model=RecipeResponse)
async def process_recipe(request: RecipeRequest):
    """
    Process a recipe URL and return clean ingredient ratios
    """
    try:
        logger.info(f"Processing recipe: {request.url}")
        
        # Step 1: Scrape the recipe page
        scraper = RecipeScraper()
        recipe_data = scraper.scrape_recipe(str(request.url))
        
        if not recipe_data:
            raise HTTPException(status_code=400, detail="Could not scrape recipe from URL")
        
        # Step 2: Parse ingredients using NLP
        parser = RecipeParser()
        
        # Deduplicate ingredients first (in case scraper found multiple sections)
        unique_ingredients = []
        seen_ingredients = set()
        
        for ingredient_text in recipe_data["ingredients"]:
            # Normalize for comparison (remove spaces, convert to lowercase)
            normalized_for_comparison = re.sub(r'\s+', ' ', ingredient_text.lower().strip())
            if normalized_for_comparison not in seen_ingredients:
                unique_ingredients.append(ingredient_text)
                seen_ingredients.add(normalized_for_comparison)
        
        parsed_ingredients = parser.parse_ingredients(unique_ingredients)
        
        # Step 3: Calculate ratios
        calculator = RatioCalculator()
        ratios = calculator.calculate_ratios(parsed_ingredients)
        
        # Format response
        ingredients_data = []
        for ingredient in parsed_ingredients:
            # Calculate grams for display
            grams = calculator._convert_to_grams(ingredient)
            ingredients_data.append(IngredientData(
                name=ingredient["name"],
                quantity=ingredient["quantity"],
                unit=ingredient["unit"],
                grams=grams,
                original_text=ingredient["original_text"],
                was_normalized=ingredient.get("was_normalized", False)
            ))
        
        return RecipeResponse(
            title=recipe_data["title"],
            url=str(request.url),
            ingredients=ingredients_data,
            ratios=ratios,
            success=True
        )
        
    except Exception as e:
        logger.error(f"Error processing recipe: {str(e)}")
        return RecipeResponse(
            title="",
            url=str(request.url),
            ingredients=[],
            ratios={},
            success=False,
            error=str(e)
        )

class RecalculateRequest(BaseModel):
    ingredients: List[IngredientData]

@app.post("/api/recalculate-ratios")
async def recalculate_ratios(request: RecalculateRequest):
    """
    Recalculate ratios for edited ingredients without re-scraping.
    """
    try:
        # Convert IngredientData to dict format expected by calculator
        ingredient_dicts = []
        for ingredient in request.ingredients:
            ingredient_dicts.append({
                'name': ingredient.name,
                'quantity': ingredient.quantity,
                'unit': ingredient.unit,
                'original_text': ingredient.original_text
            })
        
        # Calculate new ratios
        calculator = RatioCalculator()
        ratios = calculator.calculate_ratios(ingredient_dicts)
        
        return {
            'success': True,
            'ratios': ratios
        }
        
    except Exception as e:
        logger.error(f"Error recalculating ratios: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

# Serve React app for root and all non-API routes (MUST be last!)
if static_dir.exists():
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str = ""):
        # For root route and all other routes, serve the React index.html
        index_file = static_dir / "index.html"
        logger.info(f"Serving React app for path: {full_path}")
        if index_file.exists():
            return FileResponse(str(index_file))
        else:
            return {"message": f"React build not found at {index_file}. Available files: {list(static_dir.glob('*')) if static_dir.exists() else 'Directory does not exist'}"}

if __name__ == "__main__":
    import uvicorn
    # Use PORT environment variable for Cloud Run, fallback to 8000 for local development
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
