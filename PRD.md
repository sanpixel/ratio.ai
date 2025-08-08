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

### Phase 1 (MVP) - ✅ COMPLETE
1. **URL Input**: ✅ Simple interface to paste recipe URLs
2. **Ingredient Extraction**: ✅ Parse recipe pages to extract ingredient lists
   - Supports JSON-LD structured data and HTML fallback
   - Handles unicode fractions (½, ¼) and special characters (▢, •)
   - Automatically deduplicates ingredients from multi-section recipes
3. **Ratio Optimization**: ✅ 
   - Convert measurements to memorable single-digit ratios (e.g., "5:1:3")
   - Smart percentage-based rounding for clean numbers
   - Consistent flour:liquid:egg:fat ordering
   - Excludes seasonings and small quantities from main ratios
4. **Clean Table Display**: ✅ 
   - Recipe title and link back to original source
   - Editable table with quantity, unit, grams, ingredient name, and debug columns
   - Real-time ratio recalculation as values change
   - Large, prominent ratio display with category labels
   - Color-coded ingredient categories (green=flour, orange=fat, etc.)
   - Bold highlighting for normalized ingredients

### Phase 2 (User Authentication & Recipe Persistence) - ✅ COMPLETE
1. **Google OAuth Integration**: ✅ Complete user authentication system
   - Google Sign-In/Sign-Out functionality
   - Persistent user sessions across deployments
   - User profile management
2. **Database Integration**: ✅ PostgreSQL database (Supabase)
   - Secure user data storage
   - Recipe persistence and retrieval
   - Session management
3. **Automatic Recipe Saving**: ✅ Save processed recipes automatically
   - All processed recipes saved for logged-in users
   - No manual save action required
   - Seamless integration with recipe processing pipeline
4. **Community Recent Recipes Display**: ✅ Global recipe discovery feed
   - Shows last 5 processed recipes from all users (expandable)
   - Privacy-friendly anonymous animal handles (e.g., "CuriousPenguin", "HungryBear")
   - Sort functionality: by user handle or chronological order
   - Quick-access buttons for re-processing any community recipe
   - User's own recipes highlighted/distinguished in the feed
5. **Enhanced UI/UX**: ✅ Improved user experience
   - Dark/light theme toggle
   - Mobile-responsive design
   - Loading states and user feedback
   - Clean authentication flow

### Phase 3 (Advanced)
1. **Flippable Recipe Card**: IN PROGRESS
   - Recipe processing table as a flippable card component
   - Front side: ingredient table with ratios (current view)
   - Back side: concise, editable cooking instructions
   - Flip button to toggle between ingredients and instructions
   - Print button for physical recipe reference
   - Card maintains consistent styling and mobile responsiveness
2. **Recipe Library**: Goodreads-style personal recipe collection
   - Save and organize favorite recipes
   - Tag recipes by cuisine, difficulty, meal type
   - Rate and review processed recipes
   - Search personal recipe history
3. **Premium Site Access**: Handle login-required sites (NYT Cooking, etc.)
4. **Ratio Learning**: Help users memorize common ratios across similar dishes
5. **Social Features**: Share favorite recipe ratios with friends

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
5. User can flip card to view/edit concise instructions
6. Optional: User can print recipe card for offline use

## Technical Considerations
- Web scraping capabilities for recipe sites
- Recipe parsing/NLP for ingredient extraction
- Unit conversion and ratio calculation logic
- Clean, mobile-friendly UI
- Fast processing and response times
- **Animal Handle Generation System**:
  - Deterministic generation based on user ID for consistency
  - Pool of adjectives (Curious, Hungry, Clever, etc.) + animals (Penguin, Bear, Fox, etc.)
  - Ensures unique handles per user with fallback numbering if needed
- **Community Feed Performance**:
  - Efficient database queries for recent recipes across all users
  - Pagination/lazy loading for expandable recipe lists
  - Caching strategy for frequently accessed community data

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
