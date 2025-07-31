import re
from typing import List, Dict
import logging
from fractions import Fraction
from ingredient_normalizer import normalize_ingredient

logger = logging.getLogger(__name__)

class RecipeParser:
    @staticmethod
    def parse_ingredient(ingredient_text: str) -> Dict:
        """
        Simple regex-based parser to extract quantity, unit, and name.
        Handles dual measurements like "50g/3 tbsp" by preferring the second measurement.
        """
        # Check for dual measurements first (e.g., "50g/3 tbsp")
        dual_measurement = re.search(r'(\d+(?:\.\d+)?)\s*([a-z]+)\s*/\s*(\d+(?:\.\d+)?(?:\s+\d+/\d+|\d+/\d+)?)\s*([a-z]+)', ingredient_text, re.IGNORECASE)
        
        if dual_measurement:
            # For dual measurements, prefer the second measurement (usually more practical)
            quantity_str = dual_measurement.group(3)
            unit = dual_measurement.group(4)
        else:
            # Regular single measurement parsing
            # Match quantities including mixed numbers like "1 1/2" or "8" or "1/2"
            quantity_match = re.match(r'^(\d+\s+\d+/\d+|\d+/\d+|\d*\.?\d+)', ingredient_text.strip())
            unit_match = re.search(r'\b(tablespoons?|tbsp|teaspoons?|tsp|cups?|grams?|g\b|ounces?|oz|pounds?|lb|lbs?|millilitres?|ml|litres?|l\b|head|cloves?|package)', ingredient_text, re.IGNORECASE)
            
            quantity_str = quantity_match.group() if quantity_match else None
            unit = unit_match.group() if unit_match else ''
        
        # Parse quantity (including fractions like 1 1/2)
        if quantity_str:
            # Handle mixed numbers like "1 1/2"
            parts = quantity_str.strip().split()
            quantity = 0
            for part in parts:
                if '/' in part:
                    quantity += float(Fraction(part))
                else:
                    quantity += float(part)
            quantity = round(quantity, 2)
        else:
            quantity = 1.0
        
        # Extract ingredient name (everything after quantity and unit)
        if dual_measurement:
            # For dual measurements, extract name after the second measurement
            name_pattern = r'\d+(?:\.\d+)?\s*[a-z]+\s*/\s*\d+(?:\.\d+)?(?:\s+\d+/\d+|\d+/\d+)?\s*[a-z]+\s*(.*)'
            name_match = re.search(name_pattern, ingredient_text, re.IGNORECASE)
        else:
            # Regular pattern for single measurements
            pattern = r'^(?:\d+\s+\d+/\d+|\d+/\d+|\d*\.?\d+)?\s*(?:tablespoons?|tbsp|teaspoons?|tsp|cups?|grams?|g\b|ounces?|oz|pounds?|lb|lbs?|millilitres?|ml|litres?|l\b|head|cloves?|package)?\s*(.*)'
            name_match = re.search(pattern, ingredient_text, re.IGNORECASE)
        
        raw_name = name_match.group(1).strip() if name_match and name_match.group(1) else ingredient_text
        
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
