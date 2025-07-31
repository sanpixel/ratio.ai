from typing import List, Dict, Any
import math
from fractions import Fraction
import logging

logger = logging.getLogger(__name__)

class RatioCalculator:
    def __init__(self):
        # Define common cooking units and their conversions to base units
        self.volume_units = {
            'cup': 1.0, 'cups': 1.0,
            'tablespoon': 1/16, 'tablespoons': 1/16, 'tbsp': 1/16,
            'teaspoon': 1/48, 'teaspoons': 1/48, 'tsp': 1/48,
            'ml': 1/240, 'milliliter': 1/240, 'milliliters': 1/240
        }
        self.weight_units = {
            'gram': 1.0, 'grams': 1.0, 'g': 1.0,
            'ounce': 28.35, 'ounces': 28.35, 'oz': 28.35,
            'pound': 453.6, 'pounds': 453.6, 'lb': 453.6, 'lbs': 453.6,
            'kilogram': 1000, 'kilograms': 1000, 'kg': 1000
        }
    
    def calculate_ratios(self, ingredients: List[Dict]) -> Dict[str, Any]:
        """
        Calculate ratios between ingredients after normalizing units.
        Returns dict with ratio information.
        """
        try:
            # Group ingredients by type (volume, weight, count)
            grouped = self._group_ingredients_by_unit_type(ingredients)
            
            ratios = {}
            
            # Calculate ratios for each group
            for group_name, group_ingredients in grouped.items():
                if len(group_ingredients) >= 2:  # Need at least 2 ingredients for ratio
                    group_ratios = self._calculate_group_ratios(group_ingredients, group_name)
                    if group_ratios:
                        ratios[group_name] = group_ratios
            
            return ratios
            
        except Exception as e:
            logger.error(f"Error calculating ratios: {str(e)}")
            return {}
    
    def _group_ingredients_by_unit_type(self, ingredients: List[Dict]) -> Dict[str, List[Dict]]:
        """
        Group ingredients by unit type (volume, weight, count).
        """
        groups = {
            'volume': [],
            'weight': [],
            'count': []
        }
        
        for ingredient in ingredients:
            unit = ingredient['unit'].lower() if ingredient['unit'] else ''
            
            if unit in self.volume_units:
                groups['volume'].append(ingredient)
            elif unit in self.weight_units:
                groups['weight'].append(ingredient)
            elif not unit or unit in ['', 'whole', 'piece', 'pieces']:
                groups['count'].append(ingredient)
            else:
                # Unknown units go to count group
                groups['count'].append(ingredient)
        
        return groups
    
    def _calculate_group_ratios(self, ingredients: List[Dict], group_type: str) -> Dict[str, Any]:
        """
        Calculate ratios for a group of ingredients with similar unit types.
        """
        try:
            if group_type == 'count':
                return self._calculate_count_ratios(ingredients)
            else:
                return self._calculate_measurement_ratios(ingredients, group_type)
                
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
