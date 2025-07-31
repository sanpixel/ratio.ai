import requests
from bs4 import BeautifulSoup
import json
import re
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class RecipeScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def scrape_recipe(self, url: str) -> Optional[Dict]:
        """
        Scrape recipe data from a URL.
        Returns dict with title, ingredients, and instructions.
        """
        try:
            logger.info(f"Scraping recipe from: {url}")
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Try to extract structured data first (JSON-LD)
            recipe_data = self._extract_json_ld(soup)
            if recipe_data:
                return recipe_data
            
            # Fallback to HTML parsing for specific sites
            recipe_data = self._extract_from_html(soup, url)
            if recipe_data:
                return recipe_data
            
            logger.warning(f"Could not extract recipe data from {url}")
            return None
            
        except Exception as e:
            logger.error(f"Error scraping {url}: {str(e)}")
            return None
    
    def _extract_json_ld(self, soup: BeautifulSoup) -> Optional[Dict]:
        """
        Extract recipe data from JSON-LD structured data.
        Most modern recipe sites use this format.
        """
        try:
            # Find all JSON-LD scripts
            json_scripts = soup.find_all('script', type='application/ld+json')
            
            for script in json_scripts:
                try:
                    data = json.loads(script.string)
                    
                    # Handle both single objects and arrays
                    if isinstance(data, list):
                        data = data[0]
                    
                    # Look for Recipe schema
                    if self._is_recipe_schema(data):
                        return self._parse_recipe_schema(data)
                    
                    # Sometimes recipe is nested in other schema
                    if '@graph' in data:
                        for item in data['@graph']:
                            if self._is_recipe_schema(item):
                                return self._parse_recipe_schema(item)
                                
                except json.JSONDecodeError:
                    continue
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting JSON-LD: {str(e)}")
            return None
    
    def _is_recipe_schema(self, data: Dict) -> bool:
        """Check if data contains Recipe schema."""
        schema_type = data.get('@type', '').lower()
        return 'recipe' in schema_type
    
    def _parse_recipe_schema(self, data: Dict) -> Dict:
        """Parse Recipe schema data into our format."""
        # Extract title
        title = data.get('name', 'Untitled Recipe')
        
        # Extract ingredients
        ingredients = []
        recipe_ingredients = data.get('recipeIngredient', [])
        
        for ingredient in recipe_ingredients:
            if isinstance(ingredient, str):
                ingredients.append(ingredient.strip())
            elif isinstance(ingredient, dict):
                # Sometimes ingredients are objects
                text = ingredient.get('text', str(ingredient))
                ingredients.append(text.strip())
        
        # Extract instructions (optional for now)
        instructions = []
        recipe_instructions = data.get('recipeInstructions', [])
        
        for instruction in recipe_instructions:
            if isinstance(instruction, str):
                instructions.append(instruction.strip())
            elif isinstance(instruction, dict):
                text = instruction.get('text', str(instruction))
                instructions.append(text.strip())
        
        return {
            'title': title,
            'ingredients': ingredients,
            'instructions': instructions
        }
    
    def _extract_from_html(self, soup: BeautifulSoup, url: str) -> Optional[Dict]:
        """
        Fallback HTML parsing for sites without proper structured data.
        """
        try:
            # Try common HTML patterns
            title = self._extract_title(soup)
            ingredients = self._extract_ingredients_html(soup)
            
            if not ingredients:
                return None
            
            return {
                'title': title,
                'ingredients': ingredients,
                'instructions': []
            }
            
        except Exception as e:
            logger.error(f"Error parsing HTML: {str(e)}")
            return None
    
    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract recipe title from various HTML patterns."""
        # Try common title selectors
        selectors = [
            'h1.recipe-title',
            'h1.entry-title', 
            '.recipe-header h1',
            '.recipe-title',
            'h1',
            'title'
        ]
        
        for selector in selectors:
            element = soup.select_one(selector)
            if element and element.get_text().strip():
                return element.get_text().strip()
        
        return 'Untitled Recipe'
    
    def _extract_ingredients_html(self, soup: BeautifulSoup) -> List[str]:
        """Extract ingredients from various HTML patterns."""
        ingredients = []
        
        # Try common ingredient selectors
        selectors = [
            '.recipe-ingredients li',
            '.ingredients li',
            '.recipe-ingredient',
            'ul.ingredients li',
            '.ingredient-list li',
            '[class*="ingredient"] li'
        ]
        
        for selector in selectors:
            elements = soup.select(selector)
            if elements:
                for element in elements:
                    text = element.get_text().strip()
                    if text and len(text) > 3:  # Filter out empty or very short items
                        ingredients.append(text)
                
                if ingredients:
                    break  # Use first successful extraction
        
        return ingredients
