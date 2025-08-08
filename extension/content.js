// content.js - Content script for recipe detection and UI injection
console.log('ratio.ai content script loaded');

let isRecipeDetected = false;
let floatingButton = null;

// Initialize content script
function init() {
  // Only run on non-extension pages
  if (window.location.protocol === 'chrome-extension:') return;
  
  // Check if this page has recipe content
  checkForRecipe();
  
  // Create floating button if recipe detected
  if (isRecipeDetected) {
    createFloatingButton();
  }
  
  // Listen for page changes (SPA navigation)
  observePageChanges();
}

// Detect recipe content on page
function checkForRecipe() {
  console.log('Checking for recipe content...');
  
  // Method 1: JSON-LD Structured Data (most reliable)
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (let script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      if (data['@type'] === 'Recipe' || 
          (Array.isArray(data['@graph']) && data['@graph'].some(item => item['@type'] === 'Recipe'))) {
        console.log('Recipe detected via JSON-LD');
        isRecipeDetected = true;
        return;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  // Method 2: HTML Microdata
  if (document.querySelector('[itemtype*="schema.org/Recipe"]')) {
    console.log('Recipe detected via Microdata');
    isRecipeDetected = true;
    return;
  }
  
  // Method 3: URL Pattern Matching
  const recipeHosts = [
    'allrecipes.com', 'food.com', 'epicurious.com',
    'bonappetit.com', 'foodnetwork.com', 'recipetineats.com',
    'seriouseats.com', 'foodandwine.com', 'delish.com',
    'tasteofhome.com', 'pillsbury.com', 'kingarthurbaking.com'
  ];
  const recipePatterns = [/\/recipe\//, /\/recipes\//];
  
  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  
  if (recipeHosts.some(host => hostname.includes(host)) ||
      recipePatterns.some(pattern => pattern.test(pathname))) {
    console.log('Recipe detected via URL pattern');
    isRecipeDetected = true;
    return;
  }
  
  // Method 4: Content Analysis
  const recipeSelectors = [
    '.recipe', '.recipe-card', '[class*="ingredient"]',
    '[class*="instruction"]', '.recipe-ingredients',
    '.recipe-directions', '.recipe-method'
  ];
  
  if (document.querySelector(recipeSelectors.join(', '))) {
    console.log('Recipe detected via content analysis');
    isRecipeDetected = true;
    return;
  }
  
  console.log('No recipe content detected');
}

// Create floating extract button
function createFloatingButton() {
  // Don't create multiple buttons
  if (floatingButton) return;
  
  floatingButton = document.createElement('div');
  floatingButton.id = 'ratio-ai-floating-btn';
  floatingButton.innerHTML = `
    <div class="ratio-ai-btn-content">
      <span class="ratio-ai-icon">📊</span>
      <span class="ratio-ai-text">Get Ratios</span>
    </div>
  `;
  
  // Add styles
  floatingButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    background: linear-gradient(135deg, #4A9EFF, #22c55e);
    color: white;
    border: none;
    border-radius: 50px;
    padding: 12px 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(74, 158, 255, 0.3);
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    user-select: none;
  `;
  
  // Add hover effects
  floatingButton.addEventListener('mouseenter', () => {
    floatingButton.style.transform = 'translateY(-2px)';
    floatingButton.style.boxShadow = '0 6px 25px rgba(74, 158, 255, 0.4)';
  });
  
  floatingButton.addEventListener('mouseleave', () => {
    floatingButton.style.transform = 'translateY(0)';
    floatingButton.style.boxShadow = '0 4px 20px rgba(74, 158, 255, 0.3)';
  });
  
  // Add click handler
  floatingButton.addEventListener('click', handleExtractClick);
  
  // Insert into page
  document.body.appendChild(floatingButton);
  
  console.log('Floating button created');
}

// Handle extract button click
async function handleExtractClick() {
  try {
    // Update button to loading state
    floatingButton.innerHTML = `
      <div class="ratio-ai-btn-content">
        <span class="ratio-ai-icon">⏳</span>
        <span class="ratio-ai-text">Extracting...</span>
      </div>
    `;
    floatingButton.style.pointerEvents = 'none';
    
    // Send message to background script to extract recipe
    const response = await chrome.runtime.sendMessage({
      action: 'extractRecipe',
      url: window.location.href,
      title: document.title
    });
    
    if (response.success) {
      // Show success state
      floatingButton.innerHTML = `
        <div class="ratio-ai-btn-content">
          <span class="ratio-ai-icon">✅</span>
          <span class="ratio-ai-text">Extracted!</span>
        </div>
      `;
      
      // Reset after delay
      setTimeout(() => {
        floatingButton.innerHTML = `
          <div class="ratio-ai-btn-content">
            <span class="ratio-ai-icon">📊</span>
            <span class="ratio-ai-text">Get Ratios</span>
          </div>
        `;
        floatingButton.style.pointerEvents = 'auto';
      }, 2000);
      
    } else {
      throw new Error(response.error || 'Extraction failed');
    }
    
  } catch (error) {
    console.error('Error extracting recipe:', error);
    
    // Show error state
    floatingButton.innerHTML = `
      <div class="ratio-ai-btn-content">
        <span class="ratio-ai-icon">❌</span>
        <span class="ratio-ai-text">Error</span>
      </div>
    `;
    
    // Reset after delay
    setTimeout(() => {
      floatingButton.innerHTML = `
        <div class="ratio-ai-btn-content">
          <span class="ratio-ai-icon">📊</span>
          <span class="ratio-ai-text">Get Ratios</span>
        </div>
      `;
      floatingButton.style.pointerEvents = 'auto';
    }, 3000);
  }
}

// Observe page changes for SPAs
function observePageChanges() {
  let lastUrl = location.href;
  
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('Page changed, re-checking for recipes');
      
      // Remove old button
      if (floatingButton) {
        floatingButton.remove();
        floatingButton = null;
      }
      
      // Re-check for recipes
      setTimeout(() => {
        isRecipeDetected = false;
        checkForRecipe();
        
        if (isRecipeDetected) {
          createFloatingButton();
        }
      }, 1000);
    }
  }).observe(document, { subtree: true, childList: true });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
