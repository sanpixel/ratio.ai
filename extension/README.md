# ratio.ai Chrome Extension

Transform any recipe website into instant, clean ratios with one click. The ratio.ai Chrome Extension brings the power of recipe analysis directly to your browsing experience.

## Features

### 🎯 Smart Recipe Detection
- Automatically detects recipe content on popular cooking sites
- Uses multiple detection methods: JSON-LD, Microdata, URL patterns, and content analysis
- Supports 50+ major recipe websites including AllRecipes, Food Network, Bon Appétit, and more

### 📊 One-Click Extraction
- Floating "Get Ratios" button appears on detected recipe pages
- Extracts ingredients and calculates ratios using the same backend as ratio.ai
- Results open in new tab with full ratio.ai interface

### 🔗 Multiple Ways to Extract
- **Floating Button**: Appears automatically on recipe pages
- **Extension Popup**: Extract from current page via toolbar
- **Right-Click Menu**: Context menu for any recipe page or link
- **Manual URLs**: Try extraction on any webpage

### 📱 Smart Interface
- Compact popup dashboard accessible from Chrome toolbar
- Recent extractions stored locally for quick access
- User account integration with Google OAuth
- Animal handles for privacy-safe identification

### 🔄 Seamless Integration
- Uses existing ratio.ai backend and authentication
- Auto-saves recipes to your ratio.ai account when logged in
- Syncs with web app data and global recipe feed

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "ratio.ai Recipe Extractor"
3. Click "Add to Chrome"
4. Grant necessary permissions

### Manual Installation (Development)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `extension` folder
5. The ratio.ai icon should appear in your extensions toolbar

## Usage

### First-Time Setup
1. Click the ratio.ai extension icon in your toolbar
2. Sign in with Google (same account as ratio.ai web app)
3. Grant permissions for recipe detection
4. You're ready to extract ratios!

### Extracting Recipes

#### Method 1: Floating Button
1. Visit any recipe website (AllRecipes, Food Network, etc.)
2. Look for the floating "📊 Get Ratios" button (top-right corner)
3. Click the button to extract ratios
4. Results open in new ratio.ai tab

#### Method 2: Extension Popup
1. Click the ratio.ai icon in your toolbar while on any webpage
2. Click "📊 Extract Ratios" button
3. Works on any page, with or without auto-detection

#### Method 3: Right-Click Menu
1. Right-click anywhere on a recipe page
2. Select "Extract ratios from this recipe"
3. Or right-click any recipe link and select "Extract ratios from this link"

### Managing Extractions
- **Recent List**: View your last 10 extractions in the popup
- **Account Sync**: Logged-in extractions automatically save to your ratio.ai account
- **Quick Access**: Click any recent recipe to revisit the original page

## Supported Websites

### Tier 1 (Fully Supported)
- AllRecipes.com
- Food Network
- Bon Appétit
- NYTimes Cooking
- Epicurious
- Serious Eats

### Tier 2 (Well Supported)
- Food & Wine
- Recipe Tin Eats
- Delish
- Taste of Home
- King Arthur Baking
- Pillsbury

### Universal Support
The extension attempts extraction on any website - even if not specifically supported, it may work!

## Privacy & Security

- **Minimal Permissions**: Only requests necessary permissions
- **Local Storage**: Recent extractions stored locally on your device
- **Same Privacy Model**: Uses ratio.ai's animal handle system
- **No Tracking**: Extension doesn't track your browsing behavior
- **Secure Auth**: Uses same Google OAuth as ratio.ai web app

## Technical Details

### Architecture
- **Manifest v3**: Uses latest Chrome extension standard
- **Content Scripts**: Injected for recipe detection and UI
- **Service Worker**: Handles API calls and data management
- **Chrome Storage**: Local storage for recent extractions and settings

### API Integration
- Uses existing ratio.ai backend at `https://ratio.ai`
- Same endpoints as web app: `/api/process-recipe`, `/api/save-recipe`, etc.
- Full authentication integration with Google OAuth

### Detection Methods
1. **JSON-LD Structured Data** (Primary): Most reliable, covers 80%+ of sites
2. **HTML Microdata** (Secondary): schema.org Recipe markup
3. **URL Pattern Matching** (Fallback): Known recipe site patterns
4. **Content Analysis** (Heuristic): CSS selectors for recipe elements

## Development

### File Structure
```
extension/
├── manifest.json          # Extension configuration
├── popup.html            # Popup interface
├── popup.js              # Popup logic
├── content.js            # Content script for page injection
├── background.js         # Service worker
├── overlay.css           # Styles for overlays
└── README.md            # This file
```

### Local Development
1. Make changes to extension files
2. Go to `chrome://extensions/`
3. Click "Reload" on the ratio.ai extension
4. Test changes on recipe websites

### Building for Production
1. Update version in `manifest.json`
2. Test on multiple recipe sites
3. Create ZIP file of extension folder
4. Submit to Chrome Web Store

## Troubleshooting

### Extension Not Detecting Recipes
- Try refreshing the page
- Check if the site uses structured data (view page source)
- Use manual extraction from popup if auto-detection fails

### Authentication Issues
- Make sure you're signed in to ratio.ai web app
- Try signing out and back in from the extension popup
- Check that popup blockers aren't blocking the login window

### API Errors
- Check your internet connection
- Verify ratio.ai website is accessible
- Try again in a few moments if servers are busy

### Performance Issues
- Extension only activates on recipe pages
- Clear recent extractions if popup feels slow
- Restart Chrome if extension becomes unresponsive

## Support

- **Website**: https://ratio.ai
- **Issues**: Use the feedback form on ratio.ai
- **Updates**: Extension auto-updates from Chrome Web Store

## Version History

### v1.0.0 (Current)
- Initial MVP release
- Smart recipe detection
- One-click extraction
- Popup interface
- Right-click context menus
- Account integration
- Local storage for recent extractions

### Planned Features
- Batch processing multiple recipes
- Recipe collections and tagging
- Offline mode for cached extractions
- Advanced detection algorithms
- Custom site configuration

---

**ratio.ai Chrome Extension** - Transform bloated recipes into clean, memorable ratios with one click.
