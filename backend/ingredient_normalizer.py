# Improved ingredient normalizer with compound ingredient handling
import re

# Define compound ingredients and their normalized forms
COMPOUND_INGREDIENTS = {
    'olive oil': 'olive oil',
    'extra virgin olive oil': 'olive oil', 
    'extra-virgin olive oil': 'olive oil',
    'salted butter': 'salted butter',
    'unsalted butter': 'unsalted butter',
    'all purpose flour': 'flour',
    'all-purpose flour': 'flour',
    'white sugar': 'white sugar',
    'brown sugar': 'brown sugar',
    'cane sugar': 'cane sugar',
    'light brown sugar': 'light brown sugar',
    'dark brown sugar': 'dark brown sugar',
    'packed brown sugar': 'brown sugar',
    'packed light brown sugar': 'light brown sugar',
    'packed dark brown sugar': 'dark brown sugar',
    'granulated sugar': 'white sugar',
    'confectioners sugar': 'powdered sugar',
    'powdered sugar': 'powdered sugar',
    'coconut sugar': 'coconut sugar',
    'maple sugar': 'maple sugar',
    'chocolate chips': 'chocolate chips',
    'baking soda': 'baking soda',
    'garlic powder': 'garlic',
    'smoked paprika': 'paprika',
    'sea salt': 'salt',
    'cooking salt': 'salt',
    'kosher salt': 'salt',
    'flaky sea salt': 'salt',
    'black pepper': 'pepper',
    'active dry yeast': 'yeast',
    'cream cheese': 'cheese',
    'parmesan cheese': 'cheese',
    'jumbo shrimp': 'shrimp',
    'fusilli pasta': 'pasta',
    'corn cobs': 'corn',
    'whole corn cobs': 'corn',
    'fresh rosemary': 'rosemary',
    'chopped fresh rosemary': 'rosemary',
    'italian seasoning': 'seasoning',
    'vanilla extract': 'vanilla'
}

# Simple single-word ingredients
SIMPLE_INGREDIENTS = ['corn', 'parsley', 'garlic', 'paprika', 'salt', 'pepper', 'butter', 'pasta', 'broccoli', 'shrimp', 'flour', 'milk', 'cheese', 'water', 'sugar', 'yeast', 'rosemary', 'vanilla', 'egg']

# Ingredient categories for meaningful ratio calculations
INGREDIENT_CATEGORIES = {
    # FLOUR/STARCH - the structure base
    'flour': 'flour',
    'pasta': 'flour',
    'bread': 'flour', 
    'cornstarch': 'flour',
    'starch': 'flour',
    
    # LIQUID - hydration
    'water': 'liquid',
    'milk': 'liquid',
    'cream': 'liquid',
    'stock': 'liquid',
    'broth': 'liquid',
    'wine': 'liquid',
    'beer': 'liquid',
    'juice': 'liquid',
    
    # EGG - its own category
    'egg': 'egg',
    'eggs': 'egg',
    
    # FAT - richness and texture
    'butter': 'fat',
    'salted butter': 'fat',
    'unsalted butter': 'fat',
    'olive oil': 'fat',
    'oil': 'fat',
    'coconut oil': 'fat',
    'vegetable oil': 'fat',
    'lard': 'fat',
    'shortening': 'fat',
    'cheese': 'fat',  # cheese is primarily fat for ratio purposes
    
    # SUGAR - sweetness (often grouped with flour for baking ratios)
    'sugar': 'sugar',
    'honey': 'sugar',
    'maple syrup': 'sugar',
    'brown sugar': 'sugar',
    'white sugar': 'sugar',
    'cane sugar': 'sugar',
    'light brown sugar': 'sugar',
    'dark brown sugar': 'sugar',
    'powdered sugar': 'sugar',
    'confectioners sugar': 'sugar',
    'coconut sugar': 'sugar',
    'maple sugar': 'sugar',
    
    # LEAVENING - rise and texture
    'yeast': 'leavening',
    'baking soda': 'leavening',
    'baking powder': 'leavening',
    
    # SPICES/SEASONINGS - flavor (don't include in main ratios)
    'salt': 'seasoning',
    'pepper': 'seasoning',
    'paprika': 'seasoning',
    'garlic': 'seasoning',
    'seasoning': 'seasoning',
    'rosemary': 'seasoning',
    'parsley': 'seasoning',
    'herbs': 'seasoning',
    'spice': 'seasoning',
    'vanilla': 'seasoning',  # vanilla extract is a flavoring
    
    # PROTEINS - main ingredients (separate category)
    'chicken': 'protein',
    'beef': 'protein',
    'pork': 'protein',
    'fish': 'protein',
    'shrimp': 'protein',
    'salmon': 'protein',
    
    # VEGETABLES - main ingredients (separate category)
    'corn': 'vegetable',
    'broccoli': 'vegetable',
    'onion': 'vegetable',
    'carrot': 'vegetable',
    'potato': 'vegetable',
    
    # MIX-INS - additions (like chocolate chips, nuts)
    'chocolate chips': 'mix-in',
    'nuts': 'mix-in',
    'raisins': 'mix-in'
}

def get_ingredient_category(normalized_name):
    """Get the cooking category for an ingredient (flour, liquid, fat, egg, etc.)"""
    return INGREDIENT_CATEGORIES.get(normalized_name.lower(), 'other')


def normalize_ingredient(text):
    """Normalize ingredient names with compound ingredient handling"""
    text_lower = text.lower().strip()
    
    # Remove common prefixes and suffixes that don't affect the ingredient type
    cleaned_text = text_lower
    prefixes_to_remove = ['▢ ', '▢', 'of ', 'the ', 'a ', 'an ']
    suffixes_to_remove = [' (optional)', ' optional', ' (plus more for serving)', ' plus more for serving', 
                         ' (plus more for your hands)', ' plus more for your hands',
                         ' (but i always add a little extra)', ' but i always add a little extra',
                         ' (i like to use raw cane sugar with a coarser texture)', 
                         ' (i use a combination of chocolate chips and chocolate chunks)',
                         ' (6.75 ounces)', ' (4 cups)', ' (2¼ teaspoons)', ' (¼-ounce) package',
                         ' (105° to 115°f)', ' peeled/deveined/tails off', ' cut into small florets',
                         ' divided', ' minced', ' finely minced', ' roughly chopped']
    
    for prefix in prefixes_to_remove:
        if cleaned_text.startswith(prefix):
            cleaned_text = cleaned_text[len(prefix):]
            
    for suffix in suffixes_to_remove:
        if cleaned_text.endswith(suffix):
            cleaned_text = cleaned_text[:-len(suffix)]
    
    # Clean up parenthetical information
    cleaned_text = re.sub(r'\([^)]*\)', '', cleaned_text).strip()
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text)  # normalize whitespace
    
    # Check compound ingredients first (sorted by length descending)
    for compound, normalized in sorted(COMPOUND_INGREDIENTS.items(), key=lambda x: len(x[0]), reverse=True):
        if compound in cleaned_text:
            return normalized
    
    # Check simple ingredients
    for ingredient in SIMPLE_INGREDIENTS:
        if ingredient in cleaned_text:
            return ingredient
    
    # Fallback: return the first meaningful word
    words = cleaned_text.split()
    if words:
        return words[0]
    
    return text.strip()
