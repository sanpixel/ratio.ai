from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl
from typing import List, Dict, Any
import logging
import re
import os
from pathlib import Path

from scraper import RecipeScraper
from parser import RecipeParser
from ratios import RatioCalculator

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ratio.ai API", version="1.0.0")

# Enable CORS for frontend - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Must be False when using allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (built React app)
static_dir = Path(__file__).parent.parent / "frontend" / "build"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir / "static")), name="static")
    
    # Serve React app for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # If it's an API route, let it pass through to the API handlers
        if full_path.startswith("api/") or full_path in ["health", "docs", "redoc", "openapi.json"]:
            # This won't actually be called for API routes due to route precedence
            pass
        
        # For all other routes, serve the React index.html
        index_file = static_dir / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        else:
            return {"message": "React build not found. Run 'npm run build' in frontend directory."}
else:
    logger.warning("Frontend build directory not found. API-only mode.")

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

@app.get("/")
async def root():
    return {"message": "Welcome to ratio.ai API"}

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

if __name__ == "__main__":
    import uvicorn
    # Use PORT environment variable for Cloud Run, fallback to 8000 for local development
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
