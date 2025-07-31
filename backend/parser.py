import re
from typing import List, Dict
import logging
from ingredient_normalizer import normalize_ingredient

logger = logging.getLogger(__name__)

class RecipeParser:
    @staticmethod
    def parse_ingredient(ingredient_text: str) -> Dict:
        """
        Simple regex-based parser to extract quantity, unit, and name.
        """
        # Regex patterns for extraction
        quantity_match = re.match(r'^(\d*\.?\d+)', ingredient_text)
        unit_match = re.search(r'(cup|tablespoon|teaspoon|gram|ounce|ml|g|oz)', ingredient_text)
        name_match = re.search(r'(of\s)?(.*)', ingredient_text)

        quantity = float(quantity_match.group()) if quantity_match else 1.0
        unit = unit_match.group() if unit_match else ''
        raw_name = name_match.group(2).strip() if name_match else ingredient_text
        
        # Normalize the ingredient name to simplified form
        normalized_name = normalize_ingredient(raw_name)
        
        # Check if ingredient was normalized (simplified)
        was_normalized = normalized_name.lower() != raw_name.lower().strip()

        return {
            'name': normalized_name,
            'quantity': quantity,
            'unit': unit,
            'original_text': ingredient_text.strip(),
            'was_normalized': was_normalized
        }

    def parse_ingredients(self, ingredients: List[str]) -> List[Dict]:
        """
        Parse list of ingredient strings into structured data.
        """
        parsed_ingredients = []

        for ingredient_text in ingredients:
            try:
                logger.info(f"Parsing ingredient: {ingredient_text}")
                parsed_ingredient = self.parse_ingredient(ingredient_text)
                if parsed_ingredient['name']:
                    parsed_ingredients.append(parsed_ingredient)
                else:
                    logger.warning(f"No valid name found: {ingredient_text}")
            except Exception as e:
                logger.error(f"Error parsing ingredient '{ingredient_text}': {str(e)}")
                # Fallback to original text if an error occurs
                parsed_ingredients.append({'name': ingredient_text, 'quantity': 1.0, 'unit': '', 'original_text': ingredient_text})

        return parsed_ingredients
