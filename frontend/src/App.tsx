import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import CardView from './CardViews';

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  grams: number;
  original_text: string;
  was_normalized?: boolean;
}

interface Recipe {
  title: string;
  url: string;
  ingredients: Ingredient[];
  ratios: any;
  instructions?: string[];
  savedId?: number;   // set when this card is a saved recipe
  mine?: boolean;     // saved by the signed-in user, who may remove it
  success: boolean;
  error?: string;
}

interface SavedRecipe {
  id: number;
  title: string;
  url: string;
  ingredients: Ingredient[];
  ratios: any;
  instructions?: string[];
  is_mine?: boolean;
  created_at: string;
  user_handle?: string;
  user_picture?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  picture?: string;
  animal_handle?: string;
}

// The "Sign in to save your recipes" banner.
const SHOW_SIGNIN_BANNER = true;

// The 1-5 card layout picker. Off: every card shows as the index card (layout 2).
const SHOW_CARD_PICKER = false;
const DEFAULT_CARD_VIEW = 2;

// The intro video (public/loading-animation.gif) that plays for 7 s before the site. Kept, but off.
const SHOW_INTRO_ANIMATION = false;

// Global Google types
declare global {
  interface Window {
    google?: any;
  }
}

function App() {
  const [url, setUrl] = useState('');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showMainApp, setShowMainApp] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  // which card layout to show (1 = the editable table, 2-5 = the sketches in CardViews.tsx)
  const [cardView, setCardView] = useState<number>(() => {
    if (!SHOW_CARD_PICKER) return DEFAULT_CARD_VIEW;
    try { return Number(localStorage.getItem('card_view')) || DEFAULT_CARD_VIEW; } catch (e) { return DEFAULT_CARD_VIEW; }
  });
  // the back of the card: directions
  const [flipped, setFlipped] = useState(false);
  useEffect(() => { setFlipped(false); }, [recipe?.url]);
  const pickView = (n: number) => { setCardView(n); try { localStorage.setItem('card_view', String(n)); } catch (e) {} };
  
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('access_token');
  });
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  
  // Debug flag to disable GIF animation
  const gif_animation_debug = false;

  // Theme toggle function
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Theme styles
  const getThemeStyles = () => {
    if (isDarkMode) {
      return {
        background: 'transparent',
        textColor: '#fff4e6',
        cardBg: 'rgba(28, 10, 46, 0.72)',
        cardBorder: 'rgba(255, 61, 139, 0.45)',
        tableBg: 'rgba(28, 10, 46, 0.55)',
        tableHeaderBg: 'rgba(255, 61, 139, 0.18)',
        tableBorder: 'rgba(255, 140, 66, 0.35)',
        inputBg: 'rgba(12, 4, 24, 0.7)',
        inputText: '#fff4e6',
        buttonBg: '#ff3d8b',
        buttonText: '#ffffff'
      };
    } else {
      return {
        background: 'transparent',
        textColor: '#3b1408',
        cardBg: 'rgba(255, 246, 232, 0.82)',
        cardBorder: 'rgba(214, 84, 34, 0.45)',
        tableBg: 'rgba(255, 250, 242, 0.8)',
        tableHeaderBg: 'rgba(255, 166, 77, 0.25)',
        tableBorder: 'rgba(214, 84, 34, 0.3)',
        inputBg: 'rgba(255, 255, 255, 0.9)',
        inputText: '#3b1408',
        buttonBg: '#d6336c',
        buttonText: '#ffffff'
      };
    }
  };

  const theme = getThemeStyles();

  // the dusk scene behind the page (public/index.html) follows the toggle
  useEffect(() => {
    document.body.dataset.mode = isDarkMode ? 'night' : 'day';
  }, [isDarkMode]);


  // Random greeting function
  const getRandomGreeting = (animalHandle: string): string => {
    const greetings = [
      `Hey there, ${animalHandle}!`,
      `Ready to cook, ${animalHandle}?`,
      `What's cooking, ${animalHandle}?`,
      `Time to ratio, ${animalHandle}!`,
      `Let's get cooking, ${animalHandle}!`,
      `Good to see you, ${animalHandle}!`,
      `Hey ${animalHandle}!`,
      `Looking good, ${animalHandle}!`,
      `You're in, ${animalHandle}!`,
      `Howdy, ${animalHandle}!`,
      `Sup, ${animalHandle}!`,
      `${animalHandle} is in the house!`,
      `Chef ${animalHandle}!`
    ];
    
    // Use current time to ensure different greeting each time (not based on email)
    const randomIndex = Math.floor(Math.random() * greetings.length);
    return greetings[randomIndex];
  };

  // Handle initial loading animation
useEffect(() => {
    // Check for extension recipe first
    const urlParams = new URLSearchParams(window.location.search);
    const recipeParam = urlParams.get('recipe');
    
    // Skip loading animation for specific pages
    const currentPath = window.location.pathname;
    const skipLoadingPaths = ['/privacy-policy.html', '/privacy-policy'];
    
    if (!SHOW_INTRO_ANIMATION || recipeParam || skipLoadingPaths.some(path => currentPath.includes(path))) {
      // Skip loading animation for extension requests and static pages
      setIsInitialLoading(false);
      setShowMainApp(true);
      return;
    }
    
    // Normal loading animation for regular visits to main site
    const timer = setTimeout(() => {
      setShowMainApp(true);
      // Give fade transition some time before hiding loading screen
      setTimeout(() => {
        setIsInitialLoading(false);
      }, 1000); // 1 second fade transition
    }, 7000); // Show GIF animation for 7 seconds

    return () => clearTimeout(timer);
  }, []);

  // Function to render Google Sign-In button
  const renderGoogleSignInButton = () => {
    if (!window.google) return;
    
    const mainButton = document.getElementById('google-sign-in-main');
    if (mainButton) {
      // Clear any existing content
      mainButton.innerHTML = '';
      window.google.accounts.id.renderButton(
        mainButton,
        { theme: 'outline', size: 'large' }
      );
    }
  };

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      try {
        const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
        console.log('Google Client ID:', clientId ? 'Loaded' : 'Not found');
        console.log('Client ID value:', clientId);
        
        window.google.accounts.id.initialize({
          client_id: clientId || 'YOUR_GOOGLE_CLIENT_ID',
          callback: handleGoogleResponse
        });

        // Render the button now; retry briefly in case the page isn't drawn yet
        renderGoogleSignInButton();
        setTimeout(renderGoogleSignInButton, 300);
      } catch (error) {
        console.error('Google Sign-In initialization error:', error);
      }
    };

    if (window.google) {
      initializeGoogleSignIn();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = initializeGoogleSignIn;
      document.body.appendChild(script);
    }
  }, []);

  // Re-render Google Sign-In button when user logs out
  useEffect(() => {
    if (!user && window.google && !isInitialLoading) {
      // Small delay to ensure DOM is ready
      setTimeout(renderGoogleSignInButton, 100);
    }
  }, [user, isInitialLoading]);

  // Check for existing access token on mount
  useEffect(() => {
    if (accessToken) {
      fetchUserData();
    }
  }, []);

  // Handle recipe URLs from extension
  useEffect(() => {
    const handleExtensionRecipe = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const recipeParam = urlParams.get('recipe');
      
      if (recipeParam) {
        try {
          const recipeData = JSON.parse(decodeURIComponent(recipeParam));
          console.log('Extension recipe data:', recipeData);
          
          if (recipeData.url && recipeData.fromExtension) {
            // Skip loading animation for extension requests
            setIsInitialLoading(false);
            setShowMainApp(true);
            
            // Set the URL and automatically process the recipe
            setUrl(recipeData.url);
            
            // Auto-process the recipe
            await processRecipeFromUrl(recipeData.url, recipeData.title);
            
            // Clean up URL parameters
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        } catch (error) {
          console.error('Error parsing extension recipe data:', error);
        }
      }
    };
    
    // Only run once on mount
    handleExtensionRecipe();
  }, []);

  // Handle links shared from a phone: Android's share sheet (web share target, /share?url=&text=&title=)
  // and the iPhone Shortcut, which opens /share?url=<the page> without encoding it.
  useEffect(() => {
    const s = window.location.search;
    if (!s) return;
    let found: string | null = null;
    const raw = s.match(/[?&]url=(https?:\/\/.*)$/);
    if (raw) found = raw[1];
    else {
      const p = new URLSearchParams(s);
      for (const k of ['url', 'text', 'title']) {
        const m = (p.get(k) || '').match(/https?:\/\/[^\s]+/);
        if (m) { found = m[0]; break; }
      }
    }
    if (!found) return;
    setIsInitialLoading(false);
    setShowMainApp(true);
    setUrl(found);
    processRecipeFromUrl(found);
    window.history.replaceState({}, document.title, '/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleResponse = async (response: any) => {
    try {
      console.log('Google response received:', response.credential ? 'Token received' : 'No token');
      const res = await axios.post('/api/auth/google', {
        token: response.credential
      });
      console.log('Backend auth response:', res.data);
      const { access_token } = res.data;
      localStorage.setItem('access_token', access_token);
      setAccessToken(access_token);
      await fetchUserData(access_token);
    } catch (error: any) {
      console.error('Sign-in error:', error);
      alert('Sign-in failed: ' + (error.response?.data?.detail || error.message));
    }
  };

  const fetchUserData = async (token?: string) => {
    const authToken = token || accessToken;
    try {
      console.log('Fetching user data with token:', authToken ? 'Token exists' : 'No token');
      const res = await axios.get('/api/user', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      console.log('User data received:', res.data);
      setUser(res.data);
      loadSavedRecipes(authToken || undefined);
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const loadSavedRecipes = async (token?: string) => {
    const authToken = token || accessToken;
    if (!authToken) {
      console.log('No auth token available for loading saved recipes');
      return;
    }
    try {
      const res = await axios.get('/api/saved-recipes', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      setSavedRecipes(res.data);
    } catch (error) {
      console.error('Error loading saved recipes:', error);
    }
  };

  const handleSaveRecipe = async () => {
    if (!recipe) return;
    try {
      await axios.post('/api/save-recipe', recipe, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      loadSavedRecipes();
    } catch (error) {
      console.error('Error saving recipe:', error);
    }
  };

  // Process recipe from URL (shared function for form submission and extension)
  const processRecipeFromUrl = async (recipeUrl: string, expectedTitle?: string) => {
    setLoading(true);
    setError('');
    setRecipe(null);

    try {
      console.log('Processing recipe URL:', recipeUrl);
      const response = await axios.post('/api/process-recipe', {
        url: recipeUrl
      });
      
      setRecipe(response.data);
      
      if (!response.data.success) {
        setError(response.data.error || 'Failed to process recipe');
      } else {
        // Auto-save recipe for logged-in users
        const token = accessToken || localStorage.getItem('access_token');
        if (token) {
          try {
            console.log('Auto-saving recipe for logged-in user...');
            const saved = await axios.post('/api/save-recipe', response.data, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            console.log('Recipe auto-saved successfully');
            if (saved.data && saved.data.id) setRecipe({ ...response.data, savedId: saved.data.id, mine: true });
            // Refresh saved recipes list
            loadSavedRecipes(token);
          } catch (saveError) {
            console.error('Error auto-saving recipe:', saveError);
            // Don't show error to user - recipe still displays fine
          }
        } else {
          console.log('No access token available, skipping auto-save');
        }
      }
    } catch (err: any) {
      console.error('Error processing recipe:', err);
      setError(err.response?.data?.detail || 'Error processing recipe');
    } finally {
      setLoading(false);
    }
  };

  // remove the card on screen from the saved list (only its owner sees the button)
  const removeSaved = async () => {
    const token = accessToken || localStorage.getItem('access_token');
    if (!recipe || !recipe.savedId || !token) return;
    if (!window.confirm('Remove "' + recipe.title + '" from the saved recipes?')) return;
    try {
      await axios.delete('/api/saved-recipes/' + recipe.savedId, { headers: { Authorization: `Bearer ${token}` } });
      setRecipe(null);
      setUrl('');
      loadSavedRecipes(token);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not remove that recipe');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a recipe URL');
      return;
    }

    await processRecipeFromUrl(url);
  };

  const getIngredientCategoryColor = (ingredientName: string): string => {
    const name = ingredientName.toLowerCase();
    
    // Flour category - Gold
    if (name.includes('flour') || name.includes('pasta') || name.includes('bread') || name.includes('cornstarch')) {
      return '#FFD700'; // Gold
    }
    
    // Liquid category - Blue  
    if (name.includes('water') || name.includes('milk') || name.includes('cream') || 
        name.includes('stock') || name.includes('broth') || name.includes('wine') || 
        name.includes('beer') || name.includes('juice') || name === 'egg' || name === 'eggs') {
      return '#4169E1'; // RoyalBlue
    }
    
    // Fat category - Orange
    if (name.includes('butter') || name.includes('oil') || name.includes('lard') || 
        name.includes('shortening') || name.includes('cheese')) {
      return '#FF8C00'; // DarkOrange
    }
    
    // Sugar category - Pink
    if (name.includes('sugar') || name.includes('honey') || name.includes('maple syrup')) {
      return '#FF69B4'; // HotPink
    }
    
    // Default - medium sea green for seasonings, mix-ins, etc.
    return '#3CB371'; // MediumSeaGreen
  };

  const updateIngredient = async (index: number, field: keyof Ingredient, value: string | number) => {
    if (!recipe) return;
    
    const updatedIngredients = [...recipe.ingredients];
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      [field]: value
    };
    
    // Update ingredients immediately for UI responsiveness
    setRecipe({
      ...recipe,
      ingredients: updatedIngredients
    });
    
    // Recalculate ratios with updated ingredients (only for quantity/unit changes)
    if (field === 'quantity' || field === 'unit') {
      try {
        const response = await axios.post('/api/recalculate-ratios', {
          ingredients: updatedIngredients
        });
        
        if (response.data.success) {
          setRecipe(prev => prev ? {
            ...prev,
            ratios: response.data.ratios
          } : null);
        }
      } catch (err) {
        console.error('Error recalculating ratios:', err);
        // Continue with UI update even if recalculation fails
      }
    }
  };

  // Show loading screen on initial load (unless debug is disabled)
  if (isInitialLoading && !gif_animation_debug) {
    return (
      <>
        {/* Loading Screen */}
        <div 
          className="fixed inset-0 loading-veil flex items-center justify-center z-50"
          style={{
            opacity: showMainApp ? 0 : 1,
            transition: 'opacity 1s ease-in-out'
          }}
        >
          <img 
            src="/loading-animation.gif" 
            alt="Loading..."
            className="max-w-full max-h-full object-contain"
          />
        </div>
        
        {/* Main App - Fading In */}
        <div 
          className="min-h-screen py-6 sm:py-12 px-4"
          style={{
            background: theme.background,
            color: theme.textColor,
            opacity: showMainApp ? 1 : 0,
            transition: 'opacity 1s ease-in-out'
          }}
        >
          <div className="max-w-6xl mx-auto">
            {/* Header - Always visible */}
            <div className="text-center mb-8 sm:mb-12">
              <h1 
                className="wordmark mb-2 cursor-pointer" 
                style={{color: theme.buttonBg}}
                onClick={toggleTheme}
                title="Click to toggle dark/light mode"
              >
                <span className="wm-ratio">ratio</span><span className="wm-ai">.ai</span>
                <span className="wm-badge">Thanksgiving edition</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-300 px-4">
                Transform bloated recipes into clean, memorable ratios
              </p>
            </div>


        {/* Debug Section - Test Recipe Links */}
        <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">🐛 Test Recipe Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <button
              onClick={() => setUrl('https://www.recipetineats.com/corn-ribs/')}
              className="p-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-left transition-colors border border-gray-600"
            >
              🌽 Corn Ribs
            </button>
            <button
              onClick={() => setUrl('https://feelgoodfoodie.net/recipe/skinny-broccoli-shrimp-pasta-alfredo/#wprm-recipe-container-5888')}
              className="p-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-left transition-colors border border-gray-600"
            >
              🍤 Broccoli Shrimp Alfredo
            </button>
            <button
              onClick={() => setUrl('https://www.loveandlemons.com/focaccia/')}
              className="p-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-left transition-colors border border-gray-600"
            >
              🍞 Focaccia
            </button>
            <button
              onClick={() => setUrl('https://pinchofyum.com/the-best-soft-chocolate-chip-cookies')}
              className="p-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-left transition-colors border border-gray-600"
            >
              🍪 Chocolate Chip Cookies
            </button>
          </div>
        </div>

        {/* Recent Recipes Section */}
        {user && savedRecipes.length > 0 && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-lg shadow-lg" style={{ backgroundColor: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textColor }}>🕒 Recent Recipes (Last 33)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {savedRecipes.map((savedRecipe) => (
                <button
                  key={savedRecipe.id}
                  onClick={() => {
                    setRecipe({
                      title: savedRecipe.title,
                      url: savedRecipe.url,
                      ingredients: savedRecipe.ingredients,
                      ratios: savedRecipe.ratios,
                      instructions: savedRecipe.instructions || [],
                      savedId: savedRecipe.id,
                      mine: !!savedRecipe.is_mine,
                      success: true
                    });
                    setUrl(savedRecipe.url);
                  }}
                  className="p-3 rounded-lg text-left transition-all"
                  style={{
                    backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                    color: theme.textColor,
                    border: `1px solid ${theme.tableBorder}`
                  }}
                >
                  📋 {savedRecipe.title.length > 30 ? savedRecipe.title.substring(0, 30) + '...' : savedRecipe.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* URL Input Form - Only show when no recipe */}
        {!recipe && (
          <form onSubmit={handleSubmit} className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste recipe URL here..."
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent text-gray-200 placeholder-gray-400"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 sm:px-8 py-3 text-gray-900 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{}}
              >
                {loading ? 'Processing...' : 'Extract Ratios'}
              </button>
            </div>
          </form>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="mb-6 sm:mb-8 p-4 bg-red-900 border border-red-600 text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {recipe && recipe.success && (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 sm:p-6 shadow-lg">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-200 mb-2">{recipe.title}</h2>
            <a href={recipe.url} target="_blank" rel="noopener noreferrer" 
               className="text-sky-400 hover:text-sky-300 underline transition-colors">
              View Original Recipe →
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="ingr w-full border-collapse mb-6" style={{ backgroundColor: 'transparent' }}>
              <thead>
                <tr className="bg-gray-700">
                  <th className="border border-gray-600 p-2 sm:p-3 text-left text-gray-200 text-sm font-semibold">Qty</th>
                  <th className="border border-gray-600 p-2 sm:p-3 text-left text-gray-200 text-sm font-semibold">Unit</th>
                  <th className="border border-gray-600 p-2 sm:p-3 text-left text-gray-200 text-sm font-semibold">Grams</th>
                  <th className="border border-gray-600 p-2 sm:p-3 text-left text-gray-200 text-sm font-semibold">Ingredient</th>
                  <th className="border border-gray-600 p-2 sm:p-3 text-left text-gray-200 text-sm font-semibold hidden sm:table-cell">Debug</th>
                </tr>
              </thead>
              <tbody>
                {recipe.ingredients.map((ingredient, index) => (
                  <tr key={index} className="hover:bg-gray-700 transition-colors">
                    <td className="border border-gray-600 p-2">
                      <input
                        type="number"
                        step="0.25"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-16 sm:w-20 bg-gray-700 border-none p-1 text-gray-200 text-sm rounded"
                      />
                    </td>
                    <td className="border border-gray-600 p-2">
                      <input
                        type="text"
                        value={ingredient.unit}
                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                        className="w-16 sm:w-20 bg-gray-700 border-none p-1 text-gray-200 text-sm rounded"
                      />
                    </td>
                    <td className="border border-gray-600 p-2">
                      <input
                        type="number"
                        step="0.1"
                        value={ingredient.grams}
                        onChange={(e) => updateIngredient(index, 'grams', parseFloat(e.target.value) || 0)}
                        className="w-16 sm:w-20 bg-gray-700 border-none p-1 text-gray-200 text-sm rounded"
                      />
                    </td>
                    <td className="border border-gray-600 p-2">
                      <input
                        type="text"
                        value={ingredient.name}
                        onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                        className="w-full bg-gray-700 border-none p-1 text-sm rounded"
                        style={{ 
                          fontWeight: ingredient.was_normalized ? 'bold' : 'normal',
                          color: getIngredientCategoryColor(ingredient.name)
                        }}
                      />
                    </td>
                    <td className="border border-gray-600 p-2 text-xs text-gray-400 max-w-xs hidden sm:table-cell">
                      <div className="truncate">{ingredient.original_text}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {recipe.ratios['Main Ratio'] && (
            <div className="mb-8 text-center p-4 sm:p-6 bg-gray-700 rounded-lg border border-gray-600">
              <h2 className="ratio-neon mb-4">
                {recipe.ratios['Main Ratio'].ratio_string}
              </h2>
              <p className="text-sm sm:text-base text-gray-300">
                {recipe.ratios['Main Ratio'].categories.map((category: string, index: number) => (
                  <span key={index}>
                    {recipe.ratios['Main Ratio'].ratio[index]} {category}
                    {index < recipe.ratios['Main Ratio'].categories.length - 1 ? ' : ' : ''}
                  </span>
                ))}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 pt-4 border-t border-gray-600">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste another recipe URL here..."
                className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent text-gray-200 placeholder-gray-400"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 sm:px-8 py-3 text-gray-900 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{}}
              >
                {loading ? 'Processing...' : 'Extract Ratios'}
              </button>
            </div>
          </form>
          
          {error && (
            <div className="mt-4 p-3 bg-red-900 border border-red-600 text-red-200 rounded-lg">
              {error}
            </div>
          )}
        </div>
        )}
          </div>
        </div>
      </>
    );
  }

  // Normal app rendering after loading is complete
  return (
    <div className="min-h-screen py-6 sm:py-12 px-4" style={{ background: theme.background, color: theme.textColor }}>
      <div className="max-w-6xl mx-auto">
        {/* Header - Always visible */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 
            className="wordmark mb-2 cursor-pointer" 
            style={{color: theme.buttonBg}}
            onClick={toggleTheme}
            title="Click to toggle dark/light mode"
          >
            <span className="wm-ratio">ratio</span><span className="wm-ai">.ai</span>
                <span className="wm-badge">Thanksgiving edition</span>
          </h1>
          <div className="intro-panel">
          <p className="text-lg sm:text-xl mb-3" style={{color: theme.textColor}}>
            Distilling recipes webpages into essential ingredients and foundational ratios.
          </p>
          <p className="text-xs sm:text-sm max-w-3xl mx-auto leading-relaxed" style={{color: isDarkMode ? '#e8d6e3' : '#5a2a14'}}>
            Hoping to make recipes easy to remember so you don't have to keep going back to websites or YouTube — just pop by here instead. With thousands of recipes scattered across the internet, keep yours collected and shareable in one place, with a direct link to the original — kind of like Goodreads, but for cooking.
          </p>
          </div>
        </div>

        {/* URL Input Form - Only show when no recipe */}
        {!recipe && (
          <form onSubmit={handleSubmit} className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste recipe URL here..."
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent text-gray-200 placeholder-gray-400"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 sm:px-8 py-3 text-gray-900 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{}}
              >
                {loading ? 'Processing...' : 'Extract Ratios'}
              </button>
            </div>
          </form>
        )}
        

        {/* Login/User Section: the sign-in prompt is off (SHOW_SIGNIN_BANNER); a signed-in user still sees it */}
        {(user || SHOW_SIGNIN_BANNER) && (
        <div className={user ? "signed-in mb-6 sm:mb-8 rounded-lg" : "mb-6 sm:mb-8"} style={user ? { backgroundColor: theme.cardBg, border: `1px solid ${theme.cardBorder}` } : {}}>
          {user ? (
            <div key="signed-in" className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                {user.picture && (
                  <img src={user.picture} alt="" className="w-7 h-7 rounded-full" style={{ flex: 'none' }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div className="text-sm font-semibold" style={{ color: theme.textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getRandomGreeting(user.animal_handle || 'Chef')}</div>
                  <div className="text-xs" style={{ color: isDarkMode ? '#aaa' : '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('access_token');
                  setAccessToken(null);
                  setUser(null);
                  setSavedRecipes([]);
                }}
                className="sign-out"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div key="signed-out" className="text-center">
              <div id="google-sign-in-main" className="flex justify-center"></div>
            </div>
          )}
        </div>
        )}

        {/* Debug Section - Test Recipe Links */}
        <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">🐛 Test Recipe Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <button
              onClick={() => setUrl('https://www.loveandlemons.com/focaccia/')}
              className="p-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-left transition-colors border border-gray-600"
            >
              🍞 Focaccia
            </button>
            <button
              onClick={() => setUrl('https://pinchofyum.com/the-best-soft-chocolate-chip-cookies')}
              className="p-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-left transition-colors border border-gray-600"
            >
              🍪 Chocolate Chip Cookies
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 sm:mb-8 p-4 bg-red-900 border border-red-600 text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {recipe && recipe.success && (
        <>
        {SHOW_CARD_PICKER && (
        <div className="view-strip" role="group" aria-label="Card layout">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-pressed={cardView === n} onClick={() => pickView(n)}
              title={['Table', 'Index card', 'Weight bar', 'Receipt', 'Tiles'][n - 1]}>{n}</button>
          ))}
          <span>{['Table', 'Index card', 'Weight bar', 'Receipt', 'Tiles'][cardView - 1]}</span>
        </div>
        )}
        <div style={{ 
          backgroundColor: theme.cardBg, 
          border: `1px solid ${theme.cardBorder}`, 
          padding: '32px',
          marginTop: '24px'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <div className="title-row">
            <h2 style={{ 
              color: theme.textColor, 
              marginBottom: '12px', 
              fontSize: '28px', 
              fontWeight: '700',
              letterSpacing: '-0.02em'
            }}>{recipe.title}</h2>
            {recipe.mine && recipe.savedId && (
              <button type="button" className="remove-btn" title="Remove this recipe from the saved list" onClick={removeSaved}>remove</button>
            )}
            <button type="button" className="flip-btn" aria-pressed={flipped} onClick={() => setFlipped(!flipped)}>
              {flipped ? 'Ingredients' : 'Directions'} <span aria-hidden="true">↻</span>
            </button>
            </div>
            <a href={recipe.url} target="_blank" rel="noopener noreferrer" style={{ 
              color: theme.buttonBg, 
              textDecoration: 'none',
              fontSize: '16px'
            }}>
              View Original Recipe →
            </a>
          </div>

          {flipped ? (
            <div className="cv cv-index cv-back">
              <div className="back-h">Directions</div>
              {recipe.instructions && recipe.instructions.length ? (
                <ol>{recipe.instructions.map((s, k) => <li key={k}>{s}</li>)}</ol>
              ) : (
                <p className="none">No directions came with this card. They're on the <a href={recipe.url} target="_blank" rel="noopener noreferrer">original recipe</a>.</p>
              )}
            </div>
          ) : cardView === 1 ? (<>
          <table className="ingr" style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            marginBottom: '40px',
            backgroundColor: 'transparent'
          }}>
            <thead>
              <tr style={{ backgroundColor: theme.tableHeaderBg }}>
                <th style={{ border: `1px solid ${theme.tableBorder}`, padding: '1px', textAlign: 'left', color: theme.textColor, fontWeight: '600', fontSize: '14px' }}>Qty</th>
                <th style={{ border: `1px solid ${theme.tableBorder}`, padding: '1px', textAlign: 'left', color: theme.textColor, fontWeight: '600', fontSize: '14px' }}>Unit</th>
                <th style={{ border: `1px solid ${theme.tableBorder}`, padding: '1px', textAlign: 'left', color: theme.textColor, fontWeight: '600', fontSize: '14px' }}>Grams</th>
                <th style={{ border: `1px solid ${theme.tableBorder}`, padding: '1px', textAlign: 'left', color: theme.textColor, fontWeight: '600', fontSize: '14px' }}>Ingredient</th>
                <th style={{ border: `1px solid ${theme.tableBorder}`, padding: '1px', textAlign: 'left', color: theme.textColor, fontWeight: '600', fontSize: '14px' }}>Debug</th>
              </tr>
            </thead>
            <tbody>
              {recipe.ingredients.map((ingredient, index) => (
                <tr key={index} style={{ backgroundColor: 'transparent' }}>
                  <td style={{ border: `1px solid ${theme.tableBorder}`, padding: '1px' }}>
                    <input
                      type="number"
                      step="0.25"
                      value={ingredient.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                      style={{ 
                        width: '60px', 
                        border: 'none', 
                        padding: '2px', 
                        backgroundColor: 'transparent',
                        color: theme.textColor,
                        fontSize: '14px'
                      }}
                    />
                  </td>
                  <td style={{ border: `1px solid ${theme.tableBorder}`, padding: '1px' }}>
                    <input
                      type="text"
                      value={ingredient.unit}
                      onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      style={{ 
                        width: '60px', 
                        border: 'none', 
                        padding: '2px', 
                        backgroundColor: 'transparent',
                        color: theme.textColor,
                        fontSize: '14px'
                      }}
                    />
                  </td>
                  <td style={{ border: `1px solid ${theme.tableBorder}`, padding: '1px' }}>
                    <input
                      type="number"
                      step="0.1"
                      value={ingredient.grams}
                      onChange={(e) => updateIngredient(index, 'grams', parseFloat(e.target.value) || 0)}
                      style={{ 
                        width: '60px', 
                        border: 'none', 
                        padding: '2px', 
                        backgroundColor: 'transparent',
                        color: theme.textColor,
                        fontSize: '14px'
                      }}
                    />
                  </td>
                  <td style={{ border: `1px solid ${theme.tableBorder}`, padding: '1px' }}>
                    <input
                      type="text"
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                      style={{ 
                        width: '100%', 
                        border: 'none', 
                        padding: '2px',
                        backgroundColor: 'transparent',
                        fontWeight: ingredient.was_normalized ? 'bold' : 'normal',
                        color: getIngredientCategoryColor(ingredient.name),
                        fontSize: '14px'
                      }}
                    />
                  </td>
                  <td style={{ 
                    border: `1px solid ${theme.tableBorder}`, 
                    padding: '1px', 
                    fontSize: '12px', 
                    color: isDarkMode ? '#888' : '#555', 
                    maxWidth: '150px',
                    fontFamily: 'monospace'
                  }}>
                    <div style={{ padding: '2px' }}>{ingredient.original_text}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {recipe.ratios['Main Ratio'] && (
            <div style={{ 
              marginBottom: '40px', 
              marginTop: '40px',
              textAlign: 'center',
              borderTop: `2px solid ${theme.tableBorder}`,
              borderBottom: `2px solid ${theme.tableBorder}`,
              padding: '32px 0'
            }}>
              <h2 className="ratio-neon" style={{ marginBottom: '16px' }}>
                {recipe.ratios['Main Ratio'].ratio_string}
              </h2>
              <p style={{ 
                fontSize: '18px', 
                color: theme.textColor, 
                fontWeight: '500',
                letterSpacing: '0.02em'
              }}>
                {recipe.ratios['Main Ratio'].categories.map((category: string, index: number) => (
                  <span key={index}>
                    {recipe.ratios['Main Ratio'].ratio[index]} {category}
                    {index < recipe.ratios['Main Ratio'].categories.length - 1 ? ' : ' : ''}
                  </span>
                ))}
              </p>
            </div>
          )}

          </>) : (
            <CardView view={cardView} ingredients={recipe.ingredients} ratios={recipe.ratios} colorOf={getIngredientCategoryColor} />
          )}

          <form onSubmit={handleSubmit} style={{ 
            marginTop: '30px', 
            paddingTop: '20px', 
            borderTop: `1px solid ${theme.tableBorder}`,
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste another recipe URL here..."
              style={{ 
                flex: 1,
                padding: '12px', 
                backgroundColor: theme.inputBg,
                color: theme.inputText,
                border: `1px solid ${theme.tableBorder}`,
                borderRadius: '6px'
              }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ 
                padding: '12px 20px', 
                backgroundColor: theme.buttonBg, 
                color: theme.buttonText, 
                border: 'none', 
                cursor: 'pointer',
                borderRadius: '6px',
                fontWeight: '600'
              }}
            >
              {loading ? 'Processing...' : 'Extract Ratios'}
            </button>
          </form>
          
          {error && (
            <div style={{ 
              color: '#ef4444', 
              marginTop: '15px',
              padding: '12px',
              backgroundColor: isDarkMode ? '#fef2f2' : '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px'
            }}>
              {error}
            </div>
          )}
        </div>
        </>
        )}
        
        {/* Recent Recipes Section */}
        {user && savedRecipes.length > 0 && (
          <div className="mt-8 mb-6 sm:mb-8 p-4 sm:p-6 rounded-lg shadow-lg" style={{ backgroundColor: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textColor }}>🌍 Global Recent Recipes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {savedRecipes.map((savedRecipe) => (
                <button
                  key={savedRecipe.id}
                  onClick={() => {
                    setRecipe({
                      title: savedRecipe.title,
                      url: savedRecipe.url,
                      ingredients: savedRecipe.ingredients,
                      ratios: savedRecipe.ratios,
                      instructions: savedRecipe.instructions || [],
                      savedId: savedRecipe.id,
                      mine: !!savedRecipe.is_mine,
                      success: true
                    });
                    setUrl(savedRecipe.url);
                  }}
                  className="feed-item p-3 rounded-lg text-left transition-all flex items-center gap-3"
                  style={{
                    backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
                    color: theme.textColor,
                    border: `1px solid ${theme.tableBorder}`
                  }}
                >
                  {savedRecipe.user_picture && (
                    <img 
                      src={savedRecipe.user_picture} 
                      alt="Profile" 
                      className="w-6 h-6 rounded-full flex-shrink-0" 
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs mb-1" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                      {savedRecipe.user_handle || 'Unknown Chef'}
                    </div>
                    <div className="truncate">
                      📋 {savedRecipe.title.length > 25 ? savedRecipe.title.substring(0, 25) + '...' : savedRecipe.title}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t" style={{ borderColor: theme.tableBorder }}>
          <div className="text-center text-sm" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
            <p className="mb-2">
              <a href="/phone.html" className="hover:underline" style={{ color: theme.buttonBg }}>
                Send recipes from your phone
              </a>
              {" | "}
              <a 
                href="/privacy-policy.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: theme.buttonBg }}
              >
                Privacy Policy
              </a>
              {" | "}
              <a 
                href="https://github.com/sanpixel/ratio.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: theme.buttonBg }}
              >
                GitHub
              </a>
            </p>
            <p>&copy; 2025 ratio.ai - Making recipes memorable</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
