// background.js - Service worker for Chrome extension
console.log('ratio.ai background service worker loaded');

// API Base URL
const API_BASE = 'https://ratio-ai-kbrobedkgq-uc.a.run.app';

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('ratio.ai extension installed');
  
  // Create context menus
  createContextMenus();
});

// Create right-click context menus
function createContextMenus() {
  try {
    // Context menu for recipe pages
    chrome.contextMenus.create({
      id: 'extract-recipe',
      title: 'Extract ratios from this recipe',
      contexts: ['page'],
      documentUrlPatterns: ['*://*/*']
    });
    
    // Context menu for recipe links
    chrome.contextMenus.create({
      id: 'extract-recipe-link',
      title: 'Extract ratios from this link',
      contexts: ['link'],
      targetUrlPatterns: ['*://*/*']
    });
    
    console.log('Context menus created');
  } catch (error) {
    console.error('Error creating context menus:', error);
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);
  
  try {
    if (info.menuItemId === 'extract-recipe') {
      // Extract from current page
      await extractRecipeFromUrl(tab.url, tab.title, tab.id);
    } else if (info.menuItemId === 'extract-recipe-link') {
      // Extract from linked URL
      await extractRecipeFromUrl(info.linkUrl, info.linkUrl, tab.id);
    }
  } catch (error) {
    console.error('Error handling context menu:', error);
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'extractRecipe') {
    handleExtractRecipe(request, sender, sendResponse);
    return true; // Keep message channel open for async response
  }
  
  return false;
});

// Handle recipe extraction request
async function handleExtractRecipe(request, sender, sendResponse) {
  try {
    const result = await extractRecipeFromUrl(request.url, request.title, sender.tab?.id);
    sendResponse(result);
  } catch (error) {
    console.error('Error in handleExtractRecipe:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Extract recipe from URL
async function extractRecipeFromUrl(url, title, tabId) {
  try {
    console.log('Extracting recipe from:', url);
    
    // Call ratio.ai API
    const response = await fetch(`${API_BASE}/api/process-recipe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const recipeData = await response.json();
    console.log('Recipe extraction result:', recipeData);
    
    if (recipeData.success) {
      // Save to recent recipes
      await saveRecentRecipe({
        title: recipeData.title,
        url: url,
        timestamp: Date.now()
      });
      
      // Try to auto-save for logged-in users
      await autoSaveRecipe(recipeData);
      
      // Open results in new tab
      await openRecipeResults(recipeData);
      
      return { success: true, data: recipeData };
    } else {
      throw new Error(recipeData.error || 'Recipe extraction failed');
    }
    
  } catch (error) {
    console.error('Error extracting recipe:', error);
    return { success: false, error: error.message };
  }
}

// Save recipe to user account if logged in
async function autoSaveRecipe(recipeData) {
  try {
    const result = await chrome.storage.local.get(['accessToken']);
    const token = result.accessToken;
    
    if (!token) {
      console.log('No access token, skipping auto-save');
      return;
    }
    
    const response = await fetch(`${API_BASE}/api/save-recipe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recipeData)
    });
    
    if (response.ok) {
      console.log('Recipe auto-saved to account');
    } else {
      console.log('Failed to auto-save recipe');
    }
    
  } catch (error) {
    console.error('Error auto-saving recipe:', error);
  }
}

// Save recipe to recent recipes storage
async function saveRecentRecipe(recipeInfo) {
  try {
    const result = await chrome.storage.local.get(['recentRecipes']);
    let recentRecipes = result.recentRecipes || [];
    
    // Remove duplicates and add new recipe to front
    recentRecipes = recentRecipes.filter(r => r.url !== recipeInfo.url);
    recentRecipes.unshift(recipeInfo);
    
    // Keep only last 10 recipes
    recentRecipes = recentRecipes.slice(0, 10);
    
    await chrome.storage.local.set({ recentRecipes });
    console.log('Recipe saved to recent list');
    
  } catch (error) {
    console.error('Error saving recent recipe:', error);
  }
}

// Open recipe results in new tab
async function openRecipeResults(recipeData) {
  try {
    // Create URL with recipe data
    const dataParam = encodeURIComponent(JSON.stringify({
      title: recipeData.title,
      url: recipeData.url,
      fromExtension: true
    }));
    
    const resultUrl = `${API_BASE}?recipe=${dataParam}`;
    
    // Open in new tab
    await chrome.tabs.create({ url: resultUrl });
    
    console.log('Opened recipe results in new tab');
    
  } catch (error) {
    console.error('Error opening recipe results:', error);
  }
}

// Handle tab updates to detect recipe pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process when page is fully loaded
  if (changeInfo.status !== 'complete') return;
  
  // Skip non-http pages
  if (!tab.url?.startsWith('http')) return;
  
  // Skip ratio.ai pages
  if (tab.url?.includes('ratio.ai')) return;
  
  console.log('Tab updated:', tab.url);
  
  // Could add badge or icon updates here based on recipe detection
});

// Clean up old data periodically
setInterval(async () => {
  try {
    const result = await chrome.storage.local.get(['recentRecipes']);
    const recentRecipes = result.recentRecipes || [];
    
    // Remove recipes older than 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filteredRecipes = recentRecipes.filter(recipe => 
      recipe.timestamp > thirtyDaysAgo
    );
    
    if (filteredRecipes.length !== recentRecipes.length) {
      await chrome.storage.local.set({ recentRecipes: filteredRecipes });
      console.log('Cleaned up old recent recipes');
    }
    
  } catch (error) {
    console.error('Error cleaning up old data:', error);
  }
}, 60 * 60 * 1000); // Run every hour
