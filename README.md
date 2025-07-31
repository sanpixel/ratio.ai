# ratio.ai

Transform bloated recipes into clean, memorable ratios.

## Project Structure

```
ratio.ai/
├── backend/          # Python FastAPI server
├── frontend/         # React TypeScript app
├── PRD.md           # Product Requirements Document
└── README.md        # This file
```

## Quick Start

### Prerequisites

You'll need to install:
- **Python 3.8+** - for the backend
- **Node.js 16+** and **npm** - for the frontend

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   ```bash
   # On Windows
   venv\Scripts\activate
   
   # On Mac/Linux
   source venv/bin/activate
   ```

4. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Start the backend server:
   ```bash
   python main.py
   ```

The API will be running at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```

The frontend will be running at `http://localhost:3000`

## Features

### Recipe Processing
- **Smart Web Scraping:** Supports JSON-LD structured data and HTML fallback parsing
- **Unicode Support:** Handles special characters (▢, •) and unicode fractions (½, ¼, ¾)
- **Ingredient Deduplication:** Automatically removes duplicate ingredients from multi-section recipes
- **Advanced Parsing:** Custom regex-based ingredient parsing with quantity, unit, and name extraction

### Ingredient Intelligence
- **Category Recognition:** Automatically categorizes ingredients (flour, liquid, egg, fat, sugar, etc.)
- **Specific Sugar Types:** Preserves distinctions between brown sugar, white sugar, powdered sugar, etc.
- **Unit Normalization:** Converts "tablespoons" to "tbls" while preserving "teaspoons" as "tsps"
- **Density Conversion:** Accurate gram conversions using ingredient-specific densities

### Ratio Calculation
- **Single-Digit Ratios:** Clean, memorable ratios like 5:1:3 based on percentage rounding
- **Four-Ingredient Focus:** Always displays flour:liquid:egg:fat in consistent order
- **Smart Filtering:** Excludes seasonings and very small quantities (<20g) from main ratios
- **Real-time Updates:** Ratios recalculate instantly when ingredients are edited

### User Interface
- **Editable Table:** All ingredient values can be modified directly in the interface
- **Debug Column:** Shows original recipe text alongside normalized ingredients
- **Color Coding:** Visual categorization with colors (green=flour, blue=liquid, orange=fat, pink=sugar)
- **Bold Highlighting:** Normalized ingredients appear in bold to indicate processing
- **Clean Display:** Large, prominent ratio display with category labels underneath

## Current Status

✅ **Phase 1 MVP - COMPLETE:**
- ✅ Project structure created
- ✅ FastAPI backend with full recipe processing pipeline
- ✅ Web scraping with JSON-LD and HTML fallback parsing
- ✅ Ingredient parsing using custom regex-based NLP
- ✅ Smart ratio calculation with unit conversion
- ✅ React frontend with URL input and recipe cards
- ✅ Editable ingredient fields with real-time ratio recalculation
- ✅ Clean ratio display with intuitive presentation (e.g. 5:1:3)
- ✅ Error handling and loading states
- ✅ Test script for verifying functionality

🎯 **Ready to Test:**
- Full end-to-end pipeline: URL → Scrape → Parse → Calculate → Display
- Real-time ingredient editing with ratio updates
- Support for our 4 test recipe URLs

## Testing

### Test Recipe URLs
These URLs are verified to work with ratio.ai:
- https://www.recipetineats.com/corn-ribs/
- https://feelgoodfoodie.net/recipe/skinny-broccoli-shrimp-pasta-alfredo/
- https://www.loveandlemons.com/focaccia/
- https://pinchofyum.com/the-best-soft-chocolate-chip-cookies

### Backend Testing
Run the test script to verify scraping and parsing:
```bash
cd backend
python test_scraper.py
```

### Manual Testing
1. Start both backend and frontend servers
2. Open http://localhost:3000 in your browser
3. Paste any of the test URLs above
4. Click "Extract Ratios"
5. Edit ingredient quantities to see real-time ratio updates

## Development Workflow

1. Start both servers (backend on :8000, frontend on :3000)
2. Make changes to code
3. Both servers auto-reload on file changes
4. Test in browser at `http://localhost:3000`

## Architecture

- **Backend:** FastAPI + BeautifulSoup + custom regex patterns
- **Frontend:** React + TypeScript + Tailwind CSS
- **Communication:** REST API calls from frontend to backend

---

See `PRD.md` for complete product requirements and roadmap.
