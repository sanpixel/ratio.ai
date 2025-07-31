from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import List, Dict, Any
import logging
import re

from scraper import RecipeScraper
from parser import RecipeParser
from ratios import RatioCalculator

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ratio.ai API", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.post("/process-recipe", response_model=RecipeResponse)
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

@app.post("/recalculate-ratios")
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

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
