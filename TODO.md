# ratio.ai TODO

## Phase 3: Advanced Features (Current Focus)

### Flippable Recipe Card
- [ ] **Card Component Structure**
  - Design flippable card component with CSS transforms
  - Create front/back card layouts with consistent styling
  - Implement smooth flip animation with proper z-indexing
  - Test card responsiveness across mobile/desktop

- [ ] **Back Side Implementation**
  - Extract cooking instructions from original recipe URLs
  - Create editable textarea for instruction editing
  - Implement instruction parsing and formatting
  - Add character count/word limit for concise instructions

- [ ] **Card Controls**
  - Add flip toggle button with appropriate icon
  - Implement print button functionality for offline use
  - Add CSS print styles for clean physical recipe cards
  - Create keyboard shortcuts for card navigation

- [ ] **Integration & Testing**
  - Integrate flippable card with existing recipe processing pipeline
  - Test card behavior with various recipe types and lengths
  - Ensure card maintains data consistency during flips
  - Validate print functionality across browsers

### Recipe Library System
- [ ] **Database Schema**
  - Design tables for saved recipes, tags, ratings
  - Create user-recipe relationship models
  - Set up recipe categorization system
  - Implement recipe versioning for edits

- [ ] **Library Interface**
  - Create "My Recipes" dashboard page
  - Design recipe grid/list view with filtering
  - Implement search functionality across saved recipes
  - Add tag management and assignment interface

- [ ] **Recipe Management**
  - Add save/unsave recipe functionality to recipe cards
  - Implement recipe rating system (1-5 stars)
  - Create recipe editing capabilities
  - Add recipe deletion with confirmation

- [ ] **Organization Features**
  - Tag system for cuisine types (Italian, Mexican, etc.)
  - Difficulty level tagging (Easy, Medium, Hard)
  - Meal type categories (Breakfast, Lunch, Dinner, Dessert)
  - Custom user-defined tags

## Phase 4: Future Vision

### Premium Site Access
- [ ] **Login-Required Sites**
  - Research NYT Cooking authentication requirements
  - Implement user credential storage (secure)
  - Create proxy system for authenticated recipe fetching
  - Handle subscription-based recipe sites

- [ ] **Site Compatibility**
  - Expand recipe scraping to handle more complex sites
  - Add support for PDF recipe extraction
  - Implement fallback parsing methods
  - Create site-specific parsers for popular platforms

### YouTube Recipe Processing
- [ ] **Video Integration**
  - Research YouTube API for transcript access
  - Implement video URL detection and validation
  - Create transcript parsing for spoken ingredients
  - Handle cooking channel variations and formats

- [ ] **Audio Processing**
  - Parse timestamps for ingredient mentions
  - Extract quantities and measurements from speech
  - Handle cooking terminology and abbreviations
  - Convert spoken instructions to text format

### Social & Learning Features
- [ ] **Ratio Learning System**
  - Identify common ratios across similar dishes
  - Create ratio memorization games/quizzes
  - Track user progress on ratio mastery
  - Suggest similar recipes based on ratios

- [ ] **Social Sharing**
  - Allow users to share favorite recipe ratios
  - Create public recipe collections
  - Implement recipe commenting system
  - Add recipe recommendation engine

## Technical Improvements

### Performance Optimization
- [ ] **Caching Strategy**
  - Implement Redis caching for frequently accessed recipes
  - Cache parsed recipe data to avoid re-processing
  - Optimize database queries with proper indexing
  - Add CDN for static assets

### User Experience
- [ ] **Mobile Enhancements**
  - Optimize card flip animations for touch devices
  - Improve mobile recipe input experience
  - Add gesture support for card navigation
  - Test performance on low-end devices

### Analytics & Monitoring
- [ ] **User Analytics**
  - Track recipe processing success rates
  - Monitor user engagement with saved recipes
  - Analyze popular recipe sources
  - Measure card flip usage and print actions

- [ ] **Error Handling**
  - Improve recipe parsing error messages
  - Add fallback options for failed scrapes
  - Implement retry logic for network timeouts
  - Create admin dashboard for monitoring failures

## Bug Fixes & Polish

### Known Issues
- [ ] Fix unicode handling in ingredient names
- [ ] Improve ratio calculation edge cases
- [ ] Handle recipes with no clear ingredient structure
- [ ] Fix mobile layout issues with long recipe titles

### Quality Improvements
- [ ] Add comprehensive unit tests for ratio calculations
- [ ] Implement integration tests for recipe processing pipeline
- [ ] Add accessibility improvements (ARIA labels, keyboard nav)
- [ ] Optimize bundle size and loading performance

## Questions to Research
- [ ] Which recipe sites should we prioritize for Phase 4?
- [ ] How to handle complex preparation steps in ingredients?
- [ ] Should we support metric/imperial unit preferences?
- [ ] What's the optimal instruction length for recipe cards?
- [ ] How to handle edge cases (video recipes, PDFs, etc.)?

## Completed ✅
- [x] URL Input interface
- [x] Ingredient extraction from recipe sites
- [x] Ratio optimization and calculation
- [x] Clean table display with editing
- [x] Google OAuth integration
- [x] PostgreSQL database setup
- [x] Automatic recipe saving
- [x] Community recent recipes feed
- [x] Dark/light theme toggle
- [x] Mobile-responsive design
