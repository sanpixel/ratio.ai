# ratio.ai Chrome Extension PRD

## Overview
The ratio.ai Chrome Extension transforms the web app into a seamless, context-aware browser experience. Users can extract recipe ratios directly from any recipe page without copy-pasting URLs, creating a frictionless workflow for discovering and analyzing recipes while browsing the web.

## Core Extension Functionality

### 1. Auto-Detection of Recipe Pages
- **Smart Page Recognition**: Automatically detects recipe content on popular cooking sites (AllRecipes, Food Network, Bon Appétit, NYTimes Cooking, etc.)
- **Recipe Content Parsing**: Identifies recipe title, ingredients, and instructions on the page
- **Visual Indicators**: Shows subtle notification when recipe content is detected

#### Recipe Detection Methods

**Method 1: JSON-LD Structured Data (Primary)**
Most recipe sites use structured data for SEO - this is the most reliable method:
```javascript
function hasRecipeJsonLD() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (let script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      if (data['@type'] === 'Recipe' || 
          data['@graph']?.some(item => item['@type'] === 'Recipe')) {
        return true;
      }
    } catch (e) {}
  }
  return false;
}
```

**Method 2: HTML Microdata (Secondary)**
```javascript
function hasRecipeMicrodata() {
  return document.querySelector('[itemtype*="schema.org/Recipe"]') !== null;
}
```

**Method 3: URL Pattern Matching (Fallback)**
```javascript
function hasRecipeURL() {
  const recipeHosts = [
    'allrecipes.com', 'food.com', 'epicurious.com',
    'bonappetit.com', 'foodnetwork.com', 'recipetineats.com'
  ];
  const recipePatterns = [/\/recipe\//, /\/recipes\//];
  
  return recipeHosts.some(host => window.location.hostname.includes(host)) ||
         recipePatterns.some(pattern => pattern.test(window.location.pathname));
}
```

**Method 4: Content Analysis (Advanced)**
```javascript
function hasRecipeContent() {
  const recipeSelectors = [
    '.recipe', '.recipe-card', '[class*="ingredient"]',
    '[class*="instruction"]', '.recipe-ingredients'
  ];
  return document.querySelector(recipeSelectors.join(', ')) !== null;
}
```

#### Progressive Detection Strategy

**MVP Implementation (V1):**
- Use only JSON-LD structured data detection
- Covers 80%+ of major recipe sites
- Fast, reliable, lightweight

**Enhanced Implementation (V2):**
```javascript
function detectRecipe() {
  let confidence = 0;
  
  // JSON-LD = high confidence (50 points)
  if (hasRecipeJsonLD()) confidence += 50;
  
  // Microdata = medium confidence (30 points)
  if (hasRecipeMicrodata()) confidence += 30;
  
  // URL patterns = low confidence (20 points)
  if (hasRecipeURL()) confidence += 20;
  
  // Content selectors = low confidence (15 points)
  if (hasRecipeContent()) confidence += 15;
  
  return confidence >= 40; // Show extraction button if confident enough
}
```

**Site Coverage Priority:**
1. **Tier 1 (MVP)**: AllRecipes, Food Network, Bon Appétit, NYTimes Cooking
2. **Tier 2 (V2)**: Epicurious, Serious Eats, Food & Wine, Recipe Tin Eats
3. **Tier 3 (V3)**: Smaller recipe blogs and niche cooking sites

### 2. One-Click Recipe Extraction
- **Floating Action Button**: Displays "📊 Get Ratios" button overlay on detected recipe pages
- **Instant Processing**: Sends current page URL to existing `/api/process-recipe` endpoint
- **Loading States**: Shows extraction progress with animated indicators
- **Error Handling**: Graceful fallback for unsupported sites with manual URL input option

### 3. Popup Interface
- **Compact Dashboard**: Lightweight version of ratio.ai accessible from Chrome toolbar
- **Recent Extractions**: Quick access to last 5-10 processed recipes
- **Search Functionality**: Find previously saved recipes
- **Account Status**: Shows login state and user's animal handle

### 4. Right-Click Context Menu
- **Context-Aware Actions**: "Extract ratios from this recipe" option when right-clicking on recipe pages
- **Link Processing**: "Get ratios from this link" when right-clicking recipe URLs
- **Text Selection**: Process selected recipe content directly

## Technical Architecture

### Extension Components

#### 1. Content Script (`content.js`)
```javascript
// Injected into recipe pages
- detectRecipeContent()
- showFloatingButton()
- overlayResults()
- handlePageChanges()
```

#### 2. Background Service Worker (`background.js`)
```javascript
// Handles API communication
- processRecipeAPI()
- manageAuthentication()
- cacheResults()
- syncWithBackend()
```

#### 3. Popup Interface (`popup.html` + `popup.js`)
```javascript
// Toolbar popup UI
- showRecentRecipes()
- displayUserAccount()
- quickSearch()
- settingsPanel()
```

#### 4. Chrome Storage API
```javascript
// Local data persistence
- recentExtractions (last 10 recipes)
- userPreferences (auto-detect settings)
- authTokens (encrypted)
- offlineCache (recipe data)
```

### Manifest v3 Configuration
```json
{
  "manifest_version": 3,
  "name": "ratio.ai Recipe Extractor",
  "version": "1.0",
  "permissions": [
    "activeTab",
    "storage",
    "contextMenus",
    "identity"
  ],
  "host_permissions": [
    "https://ratio.ai/*",
    "*://*/*"
  ],
  "content_scripts": [{
    "matches": ["*://*/*"],
    "js": ["content.js"],
    "css": ["overlay.css"]
  }],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "ratio.ai"
  }
}
```

## Integration with Existing Backend

### API Endpoints
- **Same Backend**: Uses existing FastAPI backend at ratio.ai
- **Authentication**: Integrates with current Google OAuth system
- **Data Sync**: Saved recipes sync with web app account
- **Recipe Processing**: Leverages existing scraping and parsing logic

### API Calls
```javascript
// Extension makes same API calls as web app
POST /api/process-recipe
GET /api/saved-recipes
POST /api/save-recipe
GET /api/user
```

### Cross-Origin Considerations
- **CORS Configuration**: Update backend to allow chrome-extension:// origins
- **Content Security Policy**: Configure CSP headers for extension context
- **Authentication Flow**: Adapt Google OAuth for extension environment

## User Experience Flow

### First-Time Setup
1. Install extension from Chrome Web Store
2. Click extension icon in toolbar
3. Sign in with Google (same account as web app)
4. Grant permissions for recipe detection
5. Extension ready for use

### Daily Usage Flow
1. **Browse Recipe Sites**: User visits AllRecipes, Food Network, etc.
2. **Auto-Detection**: Extension detects recipe content, shows subtle indicator
3. **One-Click Extract**: User clicks floating "📊 Get Ratios" button
4. **Processing**: Extension sends URL to ratio.ai backend
5. **Results Display**: Ratios shown in overlay on current page
6. **Save Option**: One-click save to ratio.ai account
7. **Quick Access**: View recent extractions from toolbar popup

### Offline Capabilities
- **Cache Recent Results**: Store last 10 extractions locally
- **Offline Viewing**: Access cached ratios without internet
- **Sync When Online**: Upload cached saves when connection restored

## Features & Benefits

### Core Advantages
- **Friction-Free**: No more copy-pasting URLs
- **Context-Aware**: Works while actively browsing recipes
- **Universal**: Compatible with any recipe website
- **Integrated**: Seamless sync with ratio.ai account

### Advanced Features
- **Batch Processing**: Queue multiple recipes for extraction
- **Smart Notifications**: Alert when visiting previously processed recipes
- **Recipe Collections**: Group related recipes (e.g., "Thanksgiving Menu")
- **Sharing**: Quick share extracted ratios to social media

### Privacy & Security
- **Minimal Permissions**: Only requests necessary permissions
- **Encrypted Storage**: Secure local storage of auth tokens
- **Same Privacy**: Inherits web app's privacy model (animal handles)
- **No Tracking**: Extension doesn't track browsing behavior

## Development Phases

### Phase 1: MVP (2-3 weeks)
- Basic recipe detection for top 10 cooking sites
- Floating button with recipe extraction
- Simple popup showing recent results
- Google authentication integration

### Phase 2: Enhanced UX (2 weeks)
- Right-click context menus
- Improved recipe detection algorithm
- Offline caching and sync
- Settings panel for customization

### Phase 3: Advanced Features (3-4 weeks)
- Batch processing capabilities
- Recipe collections and tagging
- Smart notifications and suggestions
- Performance optimizations

### Phase 4: Polish & Launch (1-2 weeks)
- Chrome Web Store submission
- Documentation and help content
- User feedback integration
- Marketing and launch strategy

## Technical Considerations

### Performance
- **Lazy Loading**: Only activate on recipe pages
- **Debounced Detection**: Avoid excessive DOM scanning
- **Memory Management**: Clean up unused content scripts
- **Background Efficiency**: Minimize service worker resource usage

### Compatibility
- **Site Coverage**: Support top 50 recipe websites initially
- **Browser Support**: Chrome 88+ (Manifest v3 requirement)
- **Mobile**: Chrome Android compatibility
- **Fallback Handling**: Graceful degradation for unsupported sites

### Security
- **Content Security Policy**: Strict CSP for extension security
- **API Security**: Same authentication as web app
- **Input Sanitization**: Secure handling of scraped content
- **Permission Minimization**: Request only necessary permissions

## Success Metrics

### Adoption Metrics
- Chrome Web Store installs
- Daily/monthly active users
- User retention rates
- Recipe extraction frequency

### Engagement Metrics
- Recipes processed per user
- Save-to-account conversion rate
- Time spent in extension popup
- Feature usage distribution

### Quality Metrics
- Recipe detection accuracy
- Extraction success rate
- User satisfaction scores
- Support ticket volume

## Future Enhancements

### Advanced AI Features
- **Recipe Recommendations**: Suggest similar recipes while browsing
- **Nutritional Analysis**: Add calorie/macro information to ratios
- **Dietary Filtering**: Highlight recipes matching dietary preferences
- **Shopping Lists**: Generate ingredient lists from saved ratios

### Social Features
- **Recipe Sharing**: Share ratios directly from extension
- **Community Integration**: Access global recipe feed from popup
- **Collaborative Collections**: Shared recipe collections with friends

### Platform Expansion
- **Firefox Extension**: Mozilla Add-on version
- **Safari Extension**: macOS/iOS compatibility
- **Edge Extension**: Microsoft Store distribution

## Conclusion
The ratio.ai Chrome Extension transforms recipe discovery from a deliberate action into a seamless part of web browsing. By integrating directly into the user's browsing workflow, it removes friction while maintaining the full power and accuracy of the ratio.ai web application. This creates a comprehensive recipe analysis ecosystem spanning both dedicated exploration (web app) and opportunistic discovery (extension).
