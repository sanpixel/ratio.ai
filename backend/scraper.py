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
        # Why the last scrape failed, in plain words, for the person to see.
        self.last_error = ''
    
    def scrape_recipe(self, url: str) -> Optional[Dict]:
        """
        Scrape recipe data from a URL.
        Returns dict with title, ingredients, and instructions.
        """
        try:
            logger.info(f"Scraping recipe from: {url}")
            self.last_error = ''
            response = self.session.get(url, timeout=10)
            if response.status_code != 200:
                blocked = response.headers.get('cf-mitigated') == 'challenge'
                self.last_error = (f"The site refused the request (HTTP {response.status_code}"
                                   + (", a Cloudflare bot check" if blocked else "") + ").")
                return None
            
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
            self.last_error = "The page loaded, but no recipe was found on it."
            return None
            
        except Exception as e:
            logger.error(f"Error scraping {url}: {str(e)}")
            self.last_error = f"Reading the page failed: {type(e).__name__}."
            return None
    
    def _extract_json_ld(self, soup: BeautifulSoup) -> Optional[Dict]:
        """
        Extract recipe data from JSON-LD structured data.
        Looks through every block, arrays and @graph included, for a node whose @type
        (a string or a list) includes Recipe. One bad block no longer stops the search.
        """
        def nodes(x):
            if isinstance(x, list):
                for y in x:
                    yield from nodes(y)
            elif isinstance(x, dict):
                yield x
                if '@graph' in x:
                    yield from nodes(x['@graph'])

        for script in soup.find_all('script', type='application/ld+json'):
            try:
                data = json.loads(script.string or script.get_text() or '')
            except (json.JSONDecodeError, TypeError):
                continue
            for node in nodes(data):
                try:
                    if self._is_recipe_schema(node) and node.get('recipeIngredient'):
                        return self._parse_recipe_schema(node)
                except Exception as e:
                    logger.error(f"Error reading a JSON-LD recipe node: {str(e)}")
        return None

    def _is_recipe_schema(self, data: Dict) -> bool:
        """Check if data contains Recipe schema; @type may be a string or a list."""
        t = data.get('@type', '')
        types = t if isinstance(t, list) else [t]
        return any(isinstance(x, str) and x.lower() == 'recipe' for x in types)

    def _parse_recipe_schema(self, data: Dict) -> Dict:
        """Parse Recipe schema data into our format."""
        # Extract title
        title = data.get('name', 'Untitled Recipe')
        
        # Extract ingredients
        ingredients = []
        recipe_ingredients = data.get('recipeIngredient', [])

        # Detect ingredient sections or groups
        ingredient_sections = []
        current_section = []

        # Parse ingredients considering sections
        for ingredient in recipe_ingredients:
            if isinstance(ingredient, str):
                stripped_ingredient = ingredient.strip()
                # Check for section headers (simple heuristic for demonstration purposes)
                if stripped_ingredient.endswith(':'):
                    # Save previous section
                    if current_section:
                        ingredient_sections.append(current_section)
                        current_section = []
                else:
                    current_section.append(stripped_ingredient)
            elif isinstance(ingredient, dict):
                # Sometimes ingredients are objects
                text = ingredient.get('text', str(ingredient)).strip()
                current_section.append(text)

        # Add last section if not empty
        if current_section:
            ingredient_sections.append(current_section)

        # Extract instructions (optional for now)
        instructions = []
        recipe_instructions = data.get('recipeInstructions', [])
        
        if isinstance(recipe_instructions, str):
            recipe_instructions = [recipe_instructions]
        for instruction in recipe_instructions:
            if isinstance(instruction, str):
                instructions.append(instruction.strip())
            elif isinstance(instruction, dict):
                # keep sections whole (HowToSection holds its steps in itemListElement); main.py flattens them
                instructions.append(instruction)
                
        # If we detected sections, return them; otherwise return as single section
        if ingredient_sections and len(ingredient_sections) > 1:
            return {
                'title': title,
                'ingredient_sections': ingredient_sections,
                'ingredients': [item for section in ingredient_sections for item in section],  # Flat list for compatibility
                'instructions': instructions
            }
        else:
            # Single section or no sections detected
            all_ingredients = [item for section in ingredient_sections for item in section] if ingredient_sections else ingredients
            return {
                'title': title,
                'ingredient_sections': [all_ingredients] if all_ingredients else [],
                'ingredients': all_ingredients,
                'instructions': instructions
            }
    
    def _extract_from_html(self, soup: BeautifulSoup, url: str) -> Optional[Dict]:
        """
        Fallback HTML parsing for sites without proper structured data.
        Enhanced to detect ingredient sections.
        """
        try:
            # Try common HTML patterns
            title = self._extract_title(soup)
            ingredient_sections = self._extract_ingredient_sections_html(soup)
            
            if not ingredient_sections:
                return None
            
            # Flatten for backward compatibility
            all_ingredients = [item for section in ingredient_sections for item in section]
            
            return {
                'title': title,
                'ingredient_sections': ingredient_sections,
                'ingredients': all_ingredients,
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
    
    def _extract_ingredient_sections_html(self, soup: BeautifulSoup) -> List[List[str]]:
        """Extract ingredients with section detection from HTML."""
        ingredient_sections = []
        current_section = []
        
        # Try to find ingredient sections by looking for headers followed by lists
        # Look for common patterns like h3/h4 headers followed by ul/li elements
        ingredient_containers = soup.select('.recipe-ingredients, .ingredients, .ingredient-list, [class*="ingredient"]')
        
        for container in ingredient_containers:
            # Look for section headers (h2, h3, h4, strong, etc.) within the container
            elements = container.find_all(['h2', 'h3', 'h4', 'h5', 'strong', 'b', 'li', 'p'])
            
            for element in elements:
                text = element.get_text().strip()
                
                # Skip empty elements
                if not text or len(text) < 3:
                    continue
                
                # Check if this looks like a section header
                is_header = (
                    element.name in ['h2', 'h3', 'h4', 'h5'] or
                    element.name in ['strong', 'b'] or
                    text.endswith(':') or
                    (len(text.split()) <= 3 and text.lower() in ['seasoning', 'sauce', 'garlic butter', 'topping', 'dressing', 'marinade'])
                )
                
                if is_header:
                    # Save current section if it has ingredients
                    if current_section:
                        ingredient_sections.append(current_section)
                        current_section = []
                else:
                    # This looks like an ingredient
                    # Additional filtering for ingredient-like text
                    if self._looks_like_ingredient(text):
                        current_section.append(text)
            
            # Save last section
            if current_section:
                ingredient_sections.append(current_section)
                current_section = []
        
        # If no sections found, try the old method as a single section
        if not ingredient_sections:
            ingredients = self._extract_ingredients_html(soup)
            if ingredients:
                ingredient_sections = [ingredients]
        
        return ingredient_sections
    
    def _looks_like_ingredient(self, text: str) -> bool:
        """Heuristic to determine if text looks like an ingredient."""
        # Skip obvious non-ingredients
        if text.lower() in ['ingredients', 'instructions', 'method', 'notes', 'tips']:
            return False
        
        # Look for quantity patterns (numbers, fractions)
        has_quantity = bool(re.search(r'\d+|½|¼|¾|⅓|⅔|⅛|⅜|⅝|⅞', text))
        
        # Look for unit patterns
        has_unit = bool(re.search(r'\b(cup|tablespoon|teaspoon|gram|ounce|pound|ml|l|tbsp|tsp|g|oz|lbs?)s?\b', text, re.IGNORECASE))
        
        # Most ingredients have quantities or units, or are short descriptive phrases
        return has_quantity or has_unit or (len(text.split()) <= 8 and len(text) > 3)
