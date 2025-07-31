#!/usr/bin/env python3
"""
Test script to verify that our scraper works with the collected recipe URLs.
"""

from scraper import RecipeScraper
from parser import RecipeParser
from ratios import RatioCalculator
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_recipe_pipeline(url: str):
    """Test the full pipeline on a single recipe URL."""
    print(f"\n{'='*60}")
    print(f"Testing: {url}")
    print(f"{'='*60}")
    
    try:
        # Step 1: Scrape
        scraper = RecipeScraper()
        recipe_data = scraper.scrape_recipe(url)
        
        if not recipe_data:
            print("❌ Failed to scrape recipe")
            return False
        
        print(f"✅ Title: {recipe_data['title']}")
        print(f"✅ Found {len(recipe_data['ingredients'])} ingredients")
        
        # Show first few ingredients
        for i, ingredient in enumerate(recipe_data['ingredients'][:5]):
            print(f"   {i+1}. {ingredient}")
        if len(recipe_data['ingredients']) > 5:
            print(f"   ... and {len(recipe_data['ingredients']) - 5} more")
        
        # Step 2: Parse ingredients
        parser = RecipeParser()
        parsed_ingredients = parser.parse_ingredients(recipe_data['ingredients'])
        
        print(f"✅ Parsed {len(parsed_ingredients)} ingredients successfully")
        
        # Show parsed ingredients
        for ingredient in parsed_ingredients[:3]:
            print(f"   - {ingredient['quantity']} {ingredient['unit']} {ingredient['name']}")
        
        # Step 3: Calculate ratios
        calculator = RatioCalculator()
        ratios = calculator.calculate_ratios(parsed_ingredients)
        
        print(f"✅ Calculated ratios for {len(ratios)} groups")
        
        # Show ratios
        for group_name, ratio_data in ratios.items():
            print(f"   📊 {group_name.title()}: {ratio_data['ratio_string']}")
            ingredients_list = [f"{ratio_data['ratio'][i]} {ing}" for i, ing in enumerate(ratio_data['ingredients'])]
            print(f"      ({' : '.join(ingredients_list)})")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def main():
    """Test all our recipe URLs."""
    test_urls = [
        "https://www.recipetineats.com/corn-ribs/",
        "https://feelgoodfoodie.net/recipe/skinny-broccoli-shrimp-pasta-alfredo/#wprm-recipe-container-5888",
        "https://www.loveandlemons.com/focaccia/",
        "https://pinchofyum.com/the-best-soft-chocolate-chip-cookies"
    ]
    
    print("🚀 Testing ratio.ai Recipe Pipeline")
    print("=" * 60)
    
    successful_tests = 0
    total_tests = len(test_urls)
    
    for url in test_urls:
        if test_recipe_pipeline(url):
            successful_tests += 1
    
    print(f"\n{'='*60}")
    print(f"📈 Results: {successful_tests}/{total_tests} recipes processed successfully")
    
    if successful_tests == total_tests:
        print("🎉 All tests passed! ratio.ai is ready for Phase 1!")
    else:
        print("⚠️  Some tests failed. Check the logs above for details.")

if __name__ == "__main__":
    main()
