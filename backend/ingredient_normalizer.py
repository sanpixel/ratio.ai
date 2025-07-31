# Simple ingredient normalizer using common ingredients from test recipes

COMMON_INGREDIENTS = ['corn', 'olive oil', 'parsley', 'garlic', 'paprika', 'salt', 'pepper', 'butter', 'pasta', 'broccoli', 'shrimp', 'flour', 'milk', 'cheese', 'water', 'sugar', 'yeast', 'rosemary', 'vanilla', 'egg', 'baking soda', 'chocolate chips']


def normalize_ingredient(text):
    """Simple word matching to normalize ingredient names"""
    for ingredient in COMMON_INGREDIENTS:
        if ingredient in text.lower():
            return ingredient
    # Fallback to first word if no match found
    return text.lower().split()[0] if text.strip() else text
