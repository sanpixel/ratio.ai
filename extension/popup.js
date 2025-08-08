// popup.js - Chrome Extension Popup Logic
console.log('ratio.ai popup loaded');

// DOM Elements
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const loginSectionEl = document.getElementById('login-section');
const userSectionEl = document.getElementById('user-section');
const currentPageEl = document.getElementById('current-page');
const recentRecipesEl = document.getElementById('recent-recipes');

// User elements
const userAvatarEl = document.getElementById('user-avatar');
const userGreetingEl = document.getElementById('user-greeting');
const userEmailEl = document.getElementById('user-email');

// Page elements
const pageInfoEl = document.getElementById('page-info');
const pageTitleEl = document.getElementById('page-title');
const pageUrlEl = document.getElementById('page-url');
const extractBtnEl = document.getElementById('extract-btn');

// Recipe list
const recipesListEl = document.getElementById('recipes-list');

// Login button
const loginBtnEl = document.getElementById('login-btn');

// State
let currentUser = null;
let currentTab = null;
let isRecipeDetected = false;

// API Base URL - change this to your deployed backend URL
const API_BASE = 'https://ratio-ai-kbrobedkgq-uc.a.run.app';

// Initialize popup
async function init() {
  try {
    console.log('Initializing popup...');
    
    // Get current tab
    currentTab = await getCurrentTab();
    console.log('Current tab:', currentTab?.url);
    
    // Check if user is logged in
    const token = await getStoredToken();
    if (token) {
      await loadUserData(token);
    } else {
      showLoginSection();
    }
    
    // Check current page for recipe content
    await checkCurrentPage();
    
    // Load recent recipes
    await loadRecentRecipes();
    
    hideLoading();
    
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Failed to initialize extension');
    hideLoading();
  }
}

// Get current active tab
async function getCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  } catch (error) {
    console.error('Error getting current tab:', error);
    return null;
  }
}

// Get stored authentication token
async function getStoredToken() {
  try {
    const result = await chrome.storage.local.get(['accessToken']);
    return result.accessToken;
  } catch (error) {
    console.error('Error getting stored token:', error);
    return null;
  }
}

// Store authentication token
async function storeToken(token) {
  try {
    await chrome.storage.local.set({ accessToken: token });
  } catch (error) {
    console.error('Error storing token:', error);
  }
}

// Load user data from API
async function loadUserData(token) {
  try {
    const response = await fetch(`${API_BASE}/api/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load user data');
    }
    
    currentUser = await response.json();
    console.log('User loaded:', currentUser);
    
    showUserSection();
    
  } catch (error) {
    console.error('Error loading user:', error);
    // Clear invalid token
    await chrome.storage.local.remove(['accessToken']);
    showLoginSection();
  }
}

// Check if current page has recipe content
async function checkCurrentPage() {
  if (!currentTab) return;
  
  try {
    // Inject content script to detect recipe
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      function: detectRecipeOnPage
    });
    
    const recipeDetected = results[0]?.result;
    isRecipeDetected = recipeDetected;
    
    showCurrentPageSection();
    
  } catch (error) {
    console.error('Error checking page for recipes:', error);
    showCurrentPageSection();
  }
}

// Function injected into page to detect recipes
function detectRecipeOnPage() {
  console.log('Checking for recipe content...');
  
  // Method 1: JSON-LD Structured Data (most reliable)
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (let script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      if (data['@type'] === 'Recipe' || 
          (Array.isArray(data['@graph']) && data['@graph'].some(item => item['@type'] === 'Recipe'))) {
        console.log('Recipe detected via JSON-LD');
        return true;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  // Method 2: HTML Microdata
  if (document.querySelector('[itemtype*="schema.org/Recipe"]')) {
    console.log('Recipe detected via Microdata');
    return true;
  }
  
  // Method 3: URL Pattern Matching
  const recipeHosts = [
    'allrecipes.com', 'food.com', 'epicurious.com',
    'bonappetit.com', 'foodnetwork.com', 'recipetineats.com',
    'seriouseats.com', 'foodandwine.com', 'delish.com',
    'tasteofhome.com', 'pillsbury.com'
  ];
  const recipePatterns = [/\/recipe\//, /\/recipes\//];
  
  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  
  if (recipeHosts.some(host => hostname.includes(host)) ||
      recipePatterns.some(pattern => pattern.test(pathname))) {
    console.log('Recipe detected via URL pattern');
    return true;
  }
  
  // Method 4: Content Analysis
  const recipeSelectors = [
    '.recipe', '.recipe-card', '[class*="ingredient"]',
    '[class*="instruction"]', '.recipe-ingredients',
    '.recipe-directions', '.recipe-method'
  ];
  
  if (document.querySelector(recipeSelectors.join(', '))) {
    console.log('Recipe detected via content analysis');
    return true;
  }
  
  console.log('No recipe content detected');
  return false;
}

// Load recent recipes from storage
async function loadRecentRecipes() {
  try {
    const result = await chrome.storage.local.get(['recentRecipes']);
    const recentRecipes = result.recentRecipes || [];
    
    if (recentRecipes.length > 0) {
      displayRecentRecipes(recentRecipes);
      recentRecipesEl.classList.remove('hidden');
    }
    
  } catch (error) {
    console.error('Error loading recent recipes:', error);
  }
}

// Extract recipe ratios
async function extractRecipe() {
  if (!currentTab) return;
  
  try {
    console.log('Starting extraction for URL:', currentTab.url);
    extractBtnEl.textContent = '⏳ Extracting...';
    extractBtnEl.disabled = true;
    
    const requestBody = { url: currentTab.url };
    console.log('Request body:', requestBody);
    console.log('API endpoint:', `${API_BASE}/api/process-recipe`);
    
    const response = await fetch(`${API_BASE}/api/process-recipe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }
    
    const recipeData = await response.json();
    console.log('Recipe extracted successfully:', recipeData);
    
    if (recipeData.success) {
      // Save to recent recipes
      await saveRecentRecipe(recipeData);
      
      // Auto-save for logged-in users
      if (currentUser) {
        await saveRecipeToAccount(recipeData);
      }
      
      // Show success and open results in new tab
      await openRecipeInNewTab(recipeData);
      
      extractBtnEl.textContent = '✅ Extracted!';
      
      // Refresh recent recipes
      setTimeout(() => {
        loadRecentRecipes();
        extractBtnEl.textContent = '📊 Extract Ratios';
        extractBtnEl.disabled = false;
      }, 1500);
      
    } else {
      throw new Error(recipeData.error || 'Extraction failed');
    }
    
  } catch (error) {
    console.error('Error extracting recipe:', error);
    showError(`Failed to extract recipe: ${error.message}`);
    extractBtnEl.textContent = '📊 Extract Ratios';
    extractBtnEl.disabled = false;
  }
}

// Save recipe to user account
async function saveRecipeToAccount(recipeData) {
  try {
    const token = await getStoredToken();
    if (!token) return;
    
    const response = await fetch(`${API_BASE}/api/save-recipe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recipeData)
    });
    
    if (!response.ok) {
      console.error('Failed to save recipe to account');
    }
    
  } catch (error) {
    console.error('Error saving recipe to account:', error);
  }
}

// Save recipe to local recent recipes
async function saveRecentRecipe(recipeData) {
  try {
    const result = await chrome.storage.local.get(['recentRecipes']);
    let recentRecipes = result.recentRecipes || [];
    
    // Add new recipe to front, remove duplicates, keep only last 10
    recentRecipes = recentRecipes.filter(r => r.url !== recipeData.url);
    recentRecipes.unshift({
      title: recipeData.title,
      url: recipeData.url,
      timestamp: Date.now()
    });
    recentRecipes = recentRecipes.slice(0, 10);
    
    await chrome.storage.local.set({ recentRecipes });
    
  } catch (error) {
    console.error('Error saving recent recipe:', error);
  }
}

// Open recipe results in new tab
async function openRecipeInNewTab(recipeData) {
  try {
    // Create a new tab with ratio.ai and pass the recipe data
    const ratioAiUrl = `${API_BASE}?recipe=${encodeURIComponent(JSON.stringify({
      title: recipeData.title,
      url: recipeData.url
    }))}`;
    
    await chrome.tabs.create({ url: ratioAiUrl });
    
  } catch (error) {
    console.error('Error opening recipe in new tab:', error);
  }
}

// Display functions
function showLoading() {
  loadingEl.classList.remove('hidden');
  hideAllSections();
}

function hideLoading() {
  loadingEl.classList.add('hidden');
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
  setTimeout(() => {
    errorEl.classList.add('hidden');
  }, 5000);
}

function showLoginSection() {
  hideAllSections();
  loginSectionEl.classList.remove('hidden');
}

function showUserSection() {
  if (!currentUser) return;
  
  hideAllSections();
  userSectionEl.classList.remove('hidden');
  
  // Populate user info
  if (currentUser.picture) {
    userAvatarEl.src = currentUser.picture;
    userAvatarEl.style.display = 'block';
  } else {
    userAvatarEl.style.display = 'none';
  }
  
  userGreetingEl.textContent = `Hey ${currentUser.animal_handle || 'Chef'}!`;
  userEmailEl.textContent = currentUser.email;
}

function showCurrentPageSection() {
  if (!currentTab) return;
  
  currentPageEl.classList.remove('hidden');
  
  // Set page info
  pageTitleEl.textContent = currentTab.title || 'Untitled Page';
  pageUrlEl.textContent = currentTab.url;
  
  // Update extract button based on recipe detection
  if (isRecipeDetected) {
    pageInfoEl.classList.add('recipe-detected');
    extractBtnEl.disabled = false;
    extractBtnEl.textContent = '📊 Extract Ratios';
  } else {
    pageInfoEl.classList.remove('recipe-detected');
    extractBtnEl.disabled = false; // Allow manual extraction
    extractBtnEl.textContent = '📊 Try Extract';
  }
}

function displayRecentRecipes(recipes) {
  recipesListEl.innerHTML = '';
  
  recipes.forEach(recipe => {
    const recipeEl = document.createElement('div');
    recipeEl.className = 'recipe-item';
    recipeEl.innerHTML = `
      <div class="recipe-title">${recipe.title}</div>
      <div class="recipe-url">${recipe.url}</div>
    `;
    
    recipeEl.addEventListener('click', () => {
      chrome.tabs.create({ url: recipe.url });
    });
    
    recipesListEl.appendChild(recipeEl);
  });
}

function hideAllSections() {
  loginSectionEl.classList.add('hidden');
  userSectionEl.classList.add('hidden');
}

// Event listeners
loginBtnEl.addEventListener('click', () => {
  // Open ratio.ai in new tab for Google login
  chrome.tabs.create({ url: `${API_BASE}` });
});

extractBtnEl.addEventListener('click', extractRecipe);

// Initialize when popup opens
init();
