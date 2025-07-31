# Product Requirements Document: ratio.ai

## Overview
**Product Name:** ratio.ai  
**Version:** 1.0  
**Date:** July 30, 2025  

## Problem Statement
Online recipes are bloated with excessive text, personal stories, and lengthy descriptions that make it difficult to quickly find and use the actual recipe information. Users waste time scrolling through paragraphs to find ingredients and measurements.

## Solution
ratio.ai is a web application that takes a recipe URL and distills it into a clean, focused ingredient card with memorable measurement ratios (like 3:2:1 flour:sugar:butter). The goal is to help users internalize cooking ratios so they can recreate dishes without constantly referring back to the original recipe.

## Target Users
- **Primary:** Home cooks who frequently use online recipes
- **Secondary:** Meal planners, cooking enthusiasts, busy professionals
- **Tertiary:** Anyone frustrated with recipe blog format

## Core Features

### Phase 1 (MVP)
1. **URL Input**: Simple interface to paste recipe URLs
2. **Ingredient Extraction**: Parse recipe pages to extract ingredient lists
3. **Ratio Optimization**: 
   - Convert measurements to memorable ratios (e.g., "2 cups flour, 1 cup sugar, 1/2 cup butter" becomes "4:2:1 ratio")
   - Group and combine similar measurements
   - Standardize units for consistency
   - Display both exact measurements and simplified ratios
4. **Clean Table Display**: 
   - Recipe title and link back to original source
   - Simple table format with editable fields for ALL data (quantity, unit, ingredient name)
   - Real-time ratio recalculation as values change
   - Clear measurements and ratios below table
   - No unnecessary styling or bloat - pure functionality

### Phase 2 (Future)
1. **Concise Instructions**: Optional very brief cooking steps
2. **Recipe Scaling**: Adjust quantities for different serving sizes
3. **Shopping List Export**: Generate clean shopping lists
4. **Recipe Saving**: Save processed recipes for later

### Phase 3 (Advanced)
1. **Recipe Library**: Goodreads-style personal recipe collection
   - Save and organize favorite recipes
   - Tag recipes by cuisine, difficulty, meal type
   - Rate and review processed recipes
   - Search personal recipe history
2. **Premium Site Access**: Handle login-required sites (NYT Cooking, etc.)
3. **Ratio Learning**: Help users memorize common ratios across similar dishes
4. **Social Features**: Share favorite recipe ratios with friends

### Phase 4 (Future Vision)
1. **YouTube Recipe Processing**: Extract and process YouTube recipe videos
   - Pull transcript/captions from YouTube videos
   - Parse spoken ingredients and measurements from transcripts
   - Convert video recipes to clean ratio cards
   - Handle cooking channels and video recipe formats

## User Flow
1. User visits ratio.ai
2. User pastes recipe URL into input field
3. App scrapes and processes the recipe
4. App displays clean ingredient card with ratios
5. Optional: User can view concise instructions

## Technical Considerations
- Web scraping capabilities for recipe sites
- Recipe parsing/NLP for ingredient extraction
- Unit conversion and ratio calculation logic
- Clean, mobile-friendly UI
- Fast processing and response times

## Success Metrics
- Time to extract ingredients < 5 seconds
- User satisfaction with ingredient clarity
- Successful parsing rate of popular recipe sites
- User retention and repeat usage

## Out of Scope (Phase 1)
- Recipe creation/editing
- Social features
- Nutritional information
- Recipe recommendations
- User accounts/authentication

## Questions for Discussion
1. Which recipe sites should we prioritize for compatibility?
2. How should we handle edge cases (video recipes, PDFs, etc.)?
3. What level of instruction detail is "concise enough"?
4. Should we support metric/imperial unit preferences?
5. How do we handle recipes with complex preparation steps in ingredients?

---

*This PRD will be updated as requirements evolve and user feedback is incorporated.*
