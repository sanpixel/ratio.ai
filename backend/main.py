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
import hashlib
import random

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Animal handle generation
def generate_animal_handle(email: str) -> str:
    """Generate consistent animal handle from email using hash"""
    # Animal names
    animals = [
        "Aardvark", "Albatross", "Alligator", "Alpaca", "Ant", "Anteater", "Antelope", "Ape",
        "Armadillo", "Baboon", "Badger", "Barracuda", "Bat", "Bear", "Beaver", "Bee",
        "Beetle", "Bison", "Boar", "Buffalo", "Butterfly", "Camel", "Capybara", "Cardinal",
        "Caribou", "Cassowary", "Cat", "Caterpillar", "Cattle", "Chameleon", "Cheetah", "Chicken",
        "Chimpanzee", "Chinchilla", "Chipmunk", "Clam", "Cobra", "Cockroach", "Cod", "Condor",
        "Cougar", "Cow", "Coyote", "Crab", "Crane", "Cricket", "Crocodile", "Crow", "Deer",
        "Dinosaur", "Dog", "Dolphin", "Donkey", "Dove", "Dragon", "Dragonfly", "Duck", "Eagle",
        "Elephant", "Elk", "Emu", "Falcon", "Ferret", "Finch", "Fish", "Flamingo", "Fly",
        "Fox", "Frog", "Gazelle", "Gecko", "Gerbil", "Giraffe", "Goat", "Goldfish", "Goose",
        "Gorilla", "Grasshopper", "Hamster", "Hare", "Hawk", "Hedgehog", "Heron", "Hippo",
        "Horse", "Hummingbird", "Hyena", "Iguana", "Jackal", "Jaguar", "Jellyfish", "Kangaroo",
        "Koala", "Ladybug", "Lamb", "Lemur", "Leopard", "Lion", "Lizard", "Llama", "Lobster",
        "Lynx", "Macaw", "Magpie", "Manatee", "Meerkat", "Mole", "Monkey", "Moose", "Mosquito",
        "Mouse", "Mule", "Narwhal", "Newt", "Nightingale", "Octopus", "Opossum", "Orangutan",
        "Ostrich", "Otter", "Owl", "Panda", "Panther", "Parrot", "Peacock", "Pelican",
        "Penguin", "Pig", "Pigeon", "Platypus", "Porcupine", "Puma", "Python", "Quail",
        "Rabbit", "Raccoon", "Rat", "Raven", "Reindeer", "Rhino", "Robin", "Rooster", "Salamander",
        "Salmon", "Seal", "Shark", "Sheep", "Shrimp", "Skunk", "Sloth", "Snail", "Snake",
        "Sparrow", "Spider", "Squid", "Squirrel", "Stingray", "Swan", "Tiger", "Toad",
        "Tortoise", "Turkey", "Turtle", "Walrus", "Wasp", "Whale", "Wolf", "Wombat", "Zebra"
    ]
    
    # Adjectives
    adjectives = [
        "Adorable", "Adventurous", "Agile", "Alert", "Ambitious", "Amusing", "Brave", "Bright",
        "Brilliant", "Calm", "Careful", "Charming", "Cheerful", "Clever", "Colorful", "Cool",
        "Creative", "Curious", "Daring", "Dazzling", "Determined", "Dynamic", "Eager", "Elegant",
        "Energetic", "Enthusiastic", "Fearless", "Fierce", "Friendly", "Funny", "Gentle", "Graceful",
        "Happy", "Helpful", "Hopeful", "Humble", "Imaginative", "Independent", "Intelligent", "Jolly",
        "Joyful", "Kind", "Lively", "Lucky", "Magnificent", "Majestic", "Merry", "Mighty",
        "Noble", "Optimistic", "Patient", "Peaceful", "Playful", "Pleasant", "Polite", "Proud",
        "Quick", "Quiet", "Radiant", "Reliable", "Respectful", "Skillful", "Smart", "Spectacular",
        "Spirited", "Strong", "Successful", "Swift", "Thoughtful", "Vibrant", "Wise", "Wonderful"
    ]
    
    # Use email hash to consistently select adjective and animal
    email_hash = hashlib.sha256(email.encode()).hexdigest()
    adj_index = int(email_hash[:8], 16) % len(adjectives)
    animal_index = int(email_hash[8:16], 16) % len(animals)
    
    return f"{adjectives[adj_index]}{animals[animal_index]}"

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
    recipe: Dict[str, Any],
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save a processed recipe for the authenticated user"""
    try:
        logger.info(f"Attempting to save recipe: {recipe.get('title', 'Unknown')} for user: {user.email}")
        logger.info(f"Recipe data keys: {list(recipe.keys())}")
        logger.info(f"Recipe success: {recipe.get('success')}, ingredients_count: {len(recipe.get('ingredients', []))}")
        
        # Extract data from the dict
        title = recipe.get('title', '')
        url = recipe.get('url', '')
        ingredients = recipe.get('ingredients', [])
        ratios = recipe.get('ratios', {})
        
        # Convert ingredients to plain dicts if they're objects
        ingredients_data = []
        for ingredient in ingredients:
            if hasattr(ingredient, 'dict'):
                # It's a Pydantic model
                ingredients_data.append(ingredient.dict())
            else:
                # It's already a plain dict/object
                ingredients_data.append(ingredient)
        
        saved_recipe = SavedRecipe(
            user_id=user.id,
            title=title,
            url=url,
            ingredients=ingredients_data,
            ratios=ratios
        )
        db.add(saved_recipe)
        db.commit()
        logger.info(f"Recipe saved successfully with ID: {saved_recipe.id}")
        return {"message": "Recipe saved successfully"}
        
    except Exception as e:
        logger.error(f"Error saving recipe: {str(e)}")
        logger.error(f"Recipe data that failed: {recipe}")
        raise HTTPException(status_code=500, detail=f"Failed to save recipe: {str(e)}")

@app.delete("/api/delete-recipe/{recipe_id}")
async def delete_recipe(recipe_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a saved recipe"""
    recipe = db.query(SavedRecipe).filter(SavedRecipe.id == recipe_id, SavedRecipe.user_id == user.id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    db.delete(recipe)
    db.commit()
    return {"message": "Recipe deleted successfully"}

@app.get("/api/user")
async def get_user(user: User = Depends(get_current_user)):
    """Get current authenticated user info"""
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "picture": user.picture,
        "animal_handle": generate_animal_handle(user.email)
    }

@app.get("/api/saved-recipes")
async def get_saved_recipes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get global recent recipes from all users (limited to 12) with privacy-safe user info"""
    # Get 12 most recent recipes from all users with user data, ordered by creation date
    recipes_with_users = db.query(SavedRecipe, User).join(User, SavedRecipe.user_id == User.id).order_by(SavedRecipe.created_at.desc()).limit(12).all()
    
    # Format response with animal handle generated on backend (email stays private)
    result = []
    for recipe, recipe_user in recipes_with_users:
        # Generate animal handle on backend using email as seed - email never leaves server
        animal_handle = generate_animal_handle(recipe_user.email)
        
        recipe_dict = {
            "id": recipe.id,
            "title": recipe.title,
            "url": recipe.url,
            "ingredients": recipe.ingredients,
            "ratios": recipe.ratios,
            "created_at": recipe.created_at,
            "user_handle": animal_handle,  # Send generated handle instead of email
            "user_picture": recipe_user.picture
        }
        result.append(recipe_dict)
    
    return result
@app.get("/api/my-recipes")
async def get_my_recipes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get only the current user's saved recipes"""
    recipes = db.query(SavedRecipe).filter(SavedRecipe.user_id == user.id).order_by(SavedRecipe.created_at.desc()).all()
    
    result = []
    for recipe in recipes:
        recipe_dict = {
            "id": recipe.id,
            "title": recipe.title,
            "url": recipe.url,
            "ingredients": recipe.ingredients,
            "ratios": recipe.ratios,
            "created_at": recipe.created_at
        }
        result.append(recipe_dict)
    
    return result

@app.get("/ext")
async def extension_stats(db: Session = Depends(get_db)):
    """Show domain statistics for extension coverage"""
    from urllib.parse import urlparse
    from collections import defaultdict
    
    # Get all saved recipes
    recipes = db.query(SavedRecipe).all()
    
    # Count recipes per domain
    domain_counts = defaultdict(int)
    for recipe in recipes:
        try:
            parsed = urlparse(recipe.url)
            domain = parsed.netloc.replace('www.', '')
            domain_counts[domain] += 1
        except:
            continue
    
    # Sort by count
    sorted_domains = sorted(domain_counts.items(), key=lambda x: x[1], reverse=True)
    
    # Extension supported domains (from manifest.json)
    supported_domains = [
        'allrecipes.com', 'foodnetwork.com', 'recipetineats.com', 'tasteofhome.com',
        'epicurious.com', 'simplyrecipes.com', 'seriouseats.com', 'bonappetit.com',
        'foodandwine.com', 'delish.com', 'cookinglight.com', 'myrecipes.com',
        'pinchofyum.com', 'loveandlemons.com', 'minimalistbaker.com', 'budgetbytes.com',
        'thekitchn.com', 'feelgoodfoodie.net', 'food.com', 'yummly.com',
        'cooking.nytimes.com', 'skinnytaste.com', 'damndelicious.net', 'gimmesomeoven.com',
        'onceuponachef.com', 'sallysbakingaddiction.com', 'kingarthurbaking.com',
        'thespruceeats.com', 'eatingwell.com', 'recipegirl.com', 'wholefoodsmarket.com',
        'southernliving.com', 'bhg.com', 'marthastewart.com', 'food52.com',
        'jamieoliver.com', 'gordonramsay.com'
    ]
    
    # Build HTML response
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Extension Domain Coverage</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 1200px; margin: 40px auto; padding: 20px; background: #1a1a1a; color: #f0f0f0; }
            h1 { color: #4A9EFF; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #404040; }
            th { background: #2a2a2a; font-weight: bold; }
            tr:hover { background: #2a2a2a; }
            .supported { color: #4ade80; }
            .missing { color: #f87171; font-weight: bold; }
            .stats { background: #2a2a2a; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .stat-item { display: inline-block; margin-right: 30px; }
        </style>
    </head>
    <body>
        <h1>🔌 Extension Domain Coverage</h1>
        <div class="stats">
            <div class="stat-item"><strong>Total Recipes:</strong> {total_recipes}</div>
            <div class="stat-item"><strong>Unique Domains:</strong> {unique_domains}</div>
            <div class="stat-item"><strong>Supported Domains:</strong> {supported_count}</div>
            <div class="stat-item"><strong>Missing Domains:</strong> {missing_count}</div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Domain</th>
                    <th>Recipe Count</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    """
    
    total_recipes = sum(domain_counts.values())
    unique_domains = len(domain_counts)
    supported_count = sum(1 for d, _ in sorted_domains if d in supported_domains)
    missing_count = unique_domains - supported_count
    
    html = html.format(
        total_recipes=total_recipes,
        unique_domains=unique_domains,
        supported_count=supported_count,
        missing_count=missing_count
    )
    
    for domain, count in sorted_domains:
        is_supported = domain in supported_domains
        status_class = "supported" if is_supported else "missing"
        status_text = "✅ Supported" if is_supported else "❌ Missing"
        
        html += f"""
                <tr>
                    <td>{domain}</td>
                    <td>{count}</td>
                    <td class="{status_class}">{status_text}</td>
                </tr>
        """
    
    html += """
            </tbody>
        </table>
    </body>
    </html>
    """
    
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)

@app.get("/api/ext-stats")
async def extension_stats_json(db: Session = Depends(get_db)):
    """Get domain statistics as JSON for programmatic access"""
    from urllib.parse import urlparse
    from collections import defaultdict
    
    # Get all saved recipes
    recipes = db.query(SavedRecipe).all()
    
    # Count recipes per domain
    domain_counts = defaultdict(int)
    for recipe in recipes:
        try:
            parsed = urlparse(recipe.url)
            domain = parsed.netloc.replace('www.', '')
            domain_counts[domain] += 1
        except:
            continue
    
    # Sort by count
    sorted_domains = sorted(domain_counts.items(), key=lambda x: x[1], reverse=True)
    
    # Extension supported domains (from manifest.json)
    supported_domains = [
        'allrecipes.com', 'foodnetwork.com', 'recipetineats.com', 'tasteofhome.com',
        'epicurious.com', 'simplyrecipes.com', 'seriouseats.com', 'bonappetit.com',
        'foodandwine.com', 'delish.com', 'cookinglight.com', 'myrecipes.com',
        'pinchofyum.com', 'loveandlemons.com', 'minimalistbaker.com', 'budgetbytes.com',
        'thekitchn.com', 'feelgoodfoodie.net', 'food.com', 'yummly.com',
        'cooking.nytimes.com', 'skinnytaste.com', 'damndelicious.net', 'gimmesomeoven.com',
        'onceuponachef.com', 'sallysbakingaddiction.com', 'kingarthurbaking.com',
        'thespruceeats.com', 'eatingwell.com', 'recipegirl.com', 'wholefoodsmarket.com',
        'southernliving.com', 'bhg.com', 'marthastewart.com', 'food52.com',
        'jamieoliver.com', 'gordonramsay.com'
    ]
    
    # Build domain list with status
    domains = []
    missing_domains = []
    for domain, count in sorted_domains:
        is_supported = domain in supported_domains
        domains.append({
            "domain": domain,
            "count": count,
            "supported": is_supported
        })
        if not is_supported:
            missing_domains.append(domain)
    
    return {
        "total_recipes": sum(domain_counts.values()),
        "unique_domains": len(domain_counts),
        "supported_count": sum(1 for d in domains if d["supported"]),
        "missing_count": len(missing_domains),
        "domains": domains,
        "missing_domains": missing_domains
    }

    result = []
    for recipe in recipes:
        recipe_dict = {
            "id": recipe.id,
            "title": recipe.title,
            "url": recipe.url,
            "ingredients": recipe.ingredients,
            "ratios": recipe.ratios,
            "created_at": recipe.created_at
        }
        result.append(recipe_dict)

    return result

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

# Serve privacy policy as static HTML file
if static_dir.exists():
    @app.get("/privacy-policy.html")
    async def serve_privacy_policy():
        privacy_policy_file = static_dir / "privacy-policy.html"
        if privacy_policy_file.exists():
            return FileResponse(str(privacy_policy_file), media_type="text/html")
        else:
            return {"error": "Privacy policy not found"}

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
