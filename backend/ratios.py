from typing import List, Dict, Any
import math
from fractions import Fraction
import logging
from ingredient_normalizer import get_ingredient_category

logger = logging.getLogger(__name__)

class RatioCalculator:
    def __init__(self):
        # Define common cooking units and their conversions to base units
        self.volume_units = {
            'cup': 1.0, 'cups': 1.0,
            'tablespoon': 1/16, 'tablespoons': 1/16, 'tbsp': 1/16, 'tbls': 1/16,
            'teaspoon': 1/48, 'teaspoons': 1/48, 'tsp': 1/48, 'tsps': 1/48,
            'ml': 1/240, 'milliliter': 1/240, 'milliliters': 1/240
        }
        self.weight_units = {
            'gram': 1.0, 'grams': 1.0, 'g': 1.0,
            'ounce': 28.35, 'ounces': 28.35, 'oz': 28.35,
            'pound': 453.6, 'pounds': 453.6, 'lb': 453.6, 'lbs': 453.6,
            'kilogram': 1000, 'kilograms': 1000, 'kg': 1000
        }
        
        # Ingredient density conversions to grams (approximate cooking densities)
        self.ingredient_densities = {
            # FLOUR/STARCH
            'flour': 120,  # grams per cup
            'pasta': 100,  # grams per cup (dry)
            'cornstarch': 128,  # grams per cup
            
            # FAT
            'butter': 227,  # grams per cup
            'salted butter': 227,  # grams per cup
            'unsalted butter': 227,  # grams per cup
            'olive oil': 216,  # grams per cup
            'oil': 216,  # grams per cup
            'coconut oil': 218,  # grams per cup
            'vegetable oil': 216,  # grams per cup
            
            # LIQUID
            'water': 240,  # grams per cup
            'milk': 245,  # grams per cup
            'cream': 240,  # grams per cup
            'vanilla': 240,  # grams per cup (extract density)
            
            # SUGAR
            'sugar': 200,  # grams per cup
            'brown sugar': 213,  # grams per cup (packed)
            'white sugar': 200,  # grams per cup
            'cane sugar': 200,  # grams per cup
            'light brown sugar': 213,  # grams per cup (packed)
            'dark brown sugar': 220,  # grams per cup (packed)
            'powdered sugar': 120,  # grams per cup (much lighter)
            'confectioners sugar': 120,  # grams per cup
            'coconut sugar': 160,  # grams per cup
            'maple sugar': 180,  # grams per cup
            'honey': 340,  # grams per cup
            'maple syrup': 320,  # grams per cup
            
            # CHEESE
            'cheese': 113,  # grams per cup (shredded)
            
            # MIX-INS
            'chocolate chips': 175,  # grams per cup
            'nuts': 140,  # grams per cup (average)
        }

    def _convert_to_grams(self, ingredient: Dict) -> float:
        """
        Convert an ingredient quantity to grams for consistent comparison.
        """
        try:
            name = ingredient['name'].lower()
            unit = ingredient['unit'].lower()
            quantity = ingredient['quantity']
            
            # Handle eggs and other count ingredients - approximate weight
            if name == 'egg' and (unit == '' or unit == 'count' or unit == 'egg'):
                return quantity * 50  # Average large egg is ~50g
            
            # Check for density-based conversion
            if name in self.ingredient_densities:
                density_per_cup = self.ingredient_densities[name]
                if unit in self.volume_units:
                    # Convert volume to cups
                    volume_in_cups = quantity * self.volume_units[unit]
                    return volume_in_cups * density_per_cup
                elif unit in self.weight_units:
                    # Already in weight, convert to grams
                    weight_in_grams = quantity * self.weight_units[unit]
                    return weight_in_grams
            
            logger.warning(f"Missing density or unknown unit for {ingredient['name']}")
            return 0
        except Exception as e:
            logger.error(f"Error converting ingredient to grams: {str(e)}")
            return 0
    
    def calculate_ratios(self, ingredients: List[Dict]) -> Dict[str, Any]:
        """
        Calculate meaningful cooking ratios between ingredient categories.
        Returns dict with ratio information.
        """
        try:
            # Group ingredients by cooking category (flour, liquid, fat, egg)
            grouped = self._group_ingredients_by_category(ingredients)
            
            ratios = {}
            
            # Calculate main baking ratio (flour:liquid:egg:fat) if we have the core ingredients
            # Note: seasoning ingredients are automatically excluded from main ratios
            core_ingredients = ['flour', 'liquid', 'egg', 'fat']
            core_groups = {cat: grouped.get(cat, []) for cat in core_ingredients if grouped.get(cat)}
            
            main_ratio = self._calculate_main_baking_ratio(core_groups)
            if main_ratio:
                ratios['Main Ratio'] = main_ratio
            
            return ratios
            
        except Exception as e:
            logger.error(f"Error calculating ratios: {str(e)}")
            return {}
    def _group_ingredients_by_category(self, ingredients: List[Dict]) -> Dict[str, List[Dict]]:
        """
        Group ingredients by cooking categories (flour, liquid, fat, egg, etc.).
        """
        grouped = {}

        for ingredient in ingredients:
            normalized_name = ingredient.get('name', '').lower()
            category = get_ingredient_category(normalized_name)
            
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(ingredient)

        return grouped
    
    def _calculate_main_baking_ratio(self, grouped: Dict[str, List[Dict]]) -> Dict[str, Any]:
        """
        Calculate main ratios like flour:liquid:fat:egg for baking.
        """
        categories = ['flour', 'liquid', 'egg', 'fat']

        # Convert all ingredients to grams for consistent comparison
        gram_quantities = []
        for category in categories:
            category_ingredients = grouped.get(category, [])
            total_grams = 0
            for ingredient in category_ingredients:
                grams = self._convert_to_grams(ingredient)
                total_grams += grams
            gram_quantities.append(total_grams)
        
        # Filter out categories with very small amounts (< 20g) or 0 grams
        # Small amounts like vanilla extract shouldn't dominate ratios
        filtered_categories = []
        filtered_quantities = []
        for i, quantity in enumerate(gram_quantities):
            if quantity >= 20:  # Only include ingredients >= 20g
                filtered_categories.append(categories[i])
                filtered_quantities.append(quantity)
        
        # Calculate percentage-based ratios with clean numbers
        simplified_ratios = self._calculate_percentage_ratios(filtered_quantities)

        return {
            'categories': filtered_categories,
            'quantities': filtered_quantities,
            'ratio': simplified_ratios,
            'ratio_string': ':'.join(map(str, simplified_ratios))
        }
    
    def _calculate_category_ratios(self, grouped: Dict[str, List[Dict]]) -> Dict[str, Any]:
        """
        Calculate ratios for arbitrary ingredient categories (like protein:vegetable).
        """
        categories = list(grouped.keys())

        # Convert all ingredients to grams for consistent comparison
        gram_quantities = []
        for category in categories:
            category_ingredients = grouped[category]
            total_grams = 0
            for ingredient in category_ingredients:
                grams = self._convert_to_grams(ingredient)
                total_grams += grams
            gram_quantities.append(total_grams)
        
        # Filter out categories with 0 grams
        filtered_categories = []
        filtered_quantities = []
        for i, quantity in enumerate(gram_quantities):
            if quantity > 0:
                filtered_categories.append(categories[i])
                filtered_quantities.append(quantity)

        # Simplify ratios using fractions
        simplified_ratios = self._simplify_ratios(filtered_quantities)

        return {
            'categories': filtered_categories,
            'quantities': filtered_quantities,
            'ratio': simplified_ratios,
            'ratio_string': ':'.join(map(str, simplified_ratios))
        }
    
    
    def _calculate_group_ratios(self, ingredients: List[Dict], group_type: str) -> Dict[str, Any]:
        """
        Calculate ratios for a group of ingredients with similar unit types.
        """
        try:
            if group_type == 'Count':
                return self._calculate_count_ratios(ingredients)
            else:
                return self._calculate_measurement_ratios(ingredients, group_type.lower())
                
        except Exception as e:
            logger.error(f"Error calculating ratios for group {group_type}: {str(e)}")
            return {}
    
    def _calculate_count_ratios(self, ingredients: List[Dict]) -> Dict[str, Any]:
        """
        Calculate ratios for countable ingredients (eggs, cloves, etc.).
        """
        quantities = [ingredient['quantity'] for ingredient in ingredients]
        names = [ingredient['name'] for ingredient in ingredients]
        
        # Find GCD to simplify ratios
        gcd = self._find_gcd(quantities)
        simplified_ratios = [int(q / gcd) for q in quantities]
        
        return {
            'type': 'count',
            'ingredients': names,
            'quantities': quantities,
            'ratio': simplified_ratios,
            'ratio_string': ':'.join(map(str, simplified_ratios))
        }
    
    def _calculate_measurement_ratios(self, ingredients: List[Dict], group_type: str) -> Dict[str, Any]:
        """
        Calculate ratios for measured ingredients (volume/weight).
        """
        # Convert all to common unit
        if group_type == 'volume':
            common_unit = 'cup'
            converted = self._convert_to_common_unit(ingredients, common_unit)
        else:  # weight
            common_unit = 'gram'
            converted = self._convert_to_common_unit(ingredients, common_unit)
        
        if not converted:
            return {}
        
        quantities = [item['converted_quantity'] for item in converted]
        names = [item['name'] for item in converted]
        
        # Simplify ratios using fractions
        simplified_ratios = self._simplify_ratios(quantities)
        
        return {
            'type': group_type,
            'common_unit': common_unit,
            'ingredients': names,
            'original_quantities': [item['quantity'] for item in ingredients],
            'original_units': [item['unit'] for item in ingredients],
            'converted_quantities': quantities,
            'ratio': simplified_ratios,
            'ratio_string': ':'.join(map(str, simplified_ratios))
        }
    
    def _convert_to_common_unit(self, ingredients: List[Dict], target_unit: str) -> List[Dict]:
        """
        Convert all ingredients to a common unit for ratio calculation.
        """
        converted = []
        
        for ingredient in ingredients:
            try:
                if not ingredient['unit'] or ingredient['quantity'] == 0:
                    continue
                
                unit = ingredient['unit'].lower()
                quantity = ingredient['quantity']
                
                # Manual unit conversion
                if target_unit == 'cup':
                    if unit in self.volume_units:
                        conversion_factor = self.volume_units[unit]
                        converted_quantity = quantity * conversion_factor
                    else:
                        continue  # Skip unknown volume units
                elif target_unit == 'gram':
                    if unit in self.weight_units:
                        conversion_factor = self.weight_units[unit]
                        converted_quantity = quantity * conversion_factor
                    else:
                        continue  # Skip unknown weight units
                else:
                    continue
                
                converted.append({
                    'name': ingredient['name'],
                    'quantity': ingredient['quantity'],
                    'unit': ingredient['unit'],
                    'converted_quantity': converted_quantity,
                    'converted_unit': target_unit
                })
                
            except Exception as e:
                logger.warning(f"Could not convert {ingredient['unit']} to {target_unit}: {str(e)}")
                continue
        
        return converted
    
    def _simplify_ratios(self, quantities: List[float]) -> List[int]:
        """
        Simplify decimal ratios to nice integer ratios.
        """
        if not quantities:
            return []
        
        # Find a common denominator by converting to fractions
        fractions = [Fraction(q).limit_denominator(100) for q in quantities]
        
        # Find LCM of denominators
        denominators = [f.denominator for f in fractions]
        lcm = denominators[0]
        for d in denominators[1:]:
            lcm = lcm * d // math.gcd(lcm, d)
        
        # Convert to integers
        integers = [int(f * lcm) for f in fractions]
        
        # Find GCD to simplify
        gcd = self._find_gcd(integers)
        simplified = [int(i / gcd) for i in integers]
        
        return simplified
    
    def _find_gcd(self, numbers: List[float]) -> float:
        """
        Find GCD of a list of numbers.
        """
        if not numbers:
            return 1
        
        # Convert to integers by multiplying by 1000 (handle decimals)
        integers = [int(n * 1000) for n in numbers]
        
        result = integers[0]
        for i in integers[1:]:
            result = math.gcd(result, i)
        
        return result / 1000
    
    def _calculate_percentage_ratios(self, quantities: List[float]) -> List[int]:
        """
        Calculate clean single digit ratios based on percentages.
        """
        if not quantities:
            return []
        
        total = sum(quantities)
        if total == 0:
            return []
        
        # Calculate percentages
        percentages = [q / total * 100 for q in quantities]
        
        # Round percentages to single digits (divide by 10 and round)
        single_digit_ratios = []
        for percentage in percentages:
            # Convert percentage to single digit (e.g., 52% -> 5, 33% -> 3, 15% -> 1)
            single_digit = round(percentage / 10)
            if single_digit == 0:
                single_digit = 1  # Minimum ratio of 1
            single_digit_ratios.append(single_digit)
        
        return single_digit_ratios
