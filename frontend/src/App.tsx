import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

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
  success: boolean;
  error?: string;
}

interface SavedRecipe {
  id: number;
  title: string;
  url: string;
  ingredients: Ingredient[];
  ratios: any;
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
  
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('access_token');
  });
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  
  // Debug flag to disable video animation
  const gif_animation_debug = false;

  // Theme toggle function
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Theme styles
  const getThemeStyles = () => {
    if (isDarkMode) {
      return {
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
        textColor: '#f0f0f0',
        cardBg: '#2a2a2a',
        cardBorder: '#404040',
        tableBg: '#2a2a2a',
        tableHeaderBg: '#333333',
        tableBorder: '#404040',
        inputBg: '#333333',
        inputText: '#f0f0f0',
        buttonBg: '#4A9EFF',
        buttonText: '#121212'
      };
    } else {
      return {
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        textColor: '#212529',
        cardBg: '#ffffff',
        cardBorder: '#dee2e6',
        tableBg: '#ffffff',
        tableHeaderBg: '#f8f9fa',
        tableBorder: '#dee2e6',
        inputBg: '#ffffff',
        inputText: '#212529',
        buttonBg: '#4A9EFF',
        buttonText: '#ffffff'
      };
    }
  };

  const theme = getThemeStyles();


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
    
    if (recipeParam) {
      // Skip loading animation for extension requests
      setIsInitialLoading(false);
      setShowMainApp(true);
      return;
    }
    
    // Normal loading animation for regular visits
    const timer = setTimeout(() => {
      setShowMainApp(true);
      // Give fade transition some time before hiding loading screen
      setTimeout(() => {
        setIsInitialLoading(false);
      }, 1000); // 1 second fade transition
    }, 7000); // Show video for 7 seconds

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

        // Initial render after loading screen completes
        setTimeout(renderGoogleSignInButton, 7000);
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
            await axios.post('/api/save-recipe', response.data, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            console.log('Recipe auto-saved successfully');
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
    
    // Flour category - Green
    if (name.includes('flour') || name.includes('pasta') || name.includes('bread') || name.includes('cornstarch')) {
      return '#228B22'; // ForestGreen
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
    
    // Default - dark red for seasonings, mix-ins, etc.
    return '#8B0000'; // DarkRed
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
          className="fixed inset-0 bg-black flex items-center justify-center z-50"
          style={{
            opacity: showMainApp ? 0 : 1,
            transition: 'opacity 1s ease-in-out'
          }}
        >
          <video 
            src="/loading-video.mp4" 
            autoPlay
            muted
            loop
            playsInline
            controls={false}
            preload="auto"
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
                className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 cursor-pointer transition-all hover:scale-105" 
                style={{color: theme.buttonBg}}
                onClick={toggleTheme}
                title="Click to toggle dark/light mode"
              >
                ratio.ai
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
                style={{
                  backgroundColor: '#4A9EFF'
                }}
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
            <table className="w-full border-collapse mb-6" style={{ backgroundColor: '#2D3748' }}>
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
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4" style={{color: '#4A9EFF'}}>
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
                style={{
                  backgroundColor: '#4A9EFF'
                }}
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
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 cursor-pointer transition-all hover:scale-105" 
            style={{color: theme.buttonBg}}
            onClick={toggleTheme}
            title="Click to toggle dark/light mode"
          >
            ratio.ai
          </h1>
          <p className="text-lg sm:text-xl px-4 mb-4" style={{color: isDarkMode ? '#d1d5db' : '#6b7280'}}>
            Distilling recipes webpages into essential ingredients and foundational ratios.
          </p>
          <p className="text-xs sm:text-sm px-4 max-w-3xl mx-auto leading-relaxed" style={{color: isDarkMode ? '#9ca3af' : '#6b7280'}}>
            Hoping to make recipes easy to remember so you don't have to keep going back to websites or YouTube — just pop by here instead. With thousands of recipes scattered across the internet, keep yours collected and shareable in one place, with a direct link to the original — kind of like Goodreads, but for cooking.
          </p>
        </div>

        {/* Login/User Section */}
        <div className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-lg shadow-lg" style={{ backgroundColor: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {user.picture && (
                  <img src={user.picture} alt="Profile" className="w-10 h-10 rounded-full" />
                )}
                <div>
                  <h3 className="font-semibold" style={{ color: theme.textColor }}>{getRandomGreeting(user.animal_handle || 'Chef')}</h3>
                  <p className="text-sm" style={{ color: isDarkMode ? '#aaa' : '#666' }}>({user.email})</p>
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('access_token');
                  setAccessToken(null);
                  setUser(null);
                  setSavedRecipes([]);
                }}
                className="px-4 py-2 rounded-lg font-semibold transition-all"
                style={{ backgroundColor: theme.buttonBg, color: theme.buttonText }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textColor }}>Sign in to save your recipes</h3>
              <div id="google-sign-in-main" className="flex justify-center"></div>
            </div>
          )}
        </div>

        {/* Recent Recipes Section */}
        {user && savedRecipes.length > 0 && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-lg shadow-lg" style={{ backgroundColor: theme.cardBg, border: `1px solid ${theme.cardBorder}` }}>
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
                      success: true
                    });
                    setUrl(savedRecipe.url);
                  }}
                  className="p-3 rounded-lg text-left transition-all flex items-center gap-3"
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

        {/* Debug Section - Test Recipe Links */}
        <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">🐛 Test Recipe Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
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
                style={{
                  backgroundColor: '#4A9EFF'
                }}
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
        <div style={{ 
          backgroundColor: theme.cardBg, 
          border: `1px solid ${theme.cardBorder}`, 
          padding: '32px',
          marginTop: '24px'
        }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ 
              color: theme.textColor, 
              marginBottom: '12px', 
              fontSize: '28px', 
              fontWeight: '700',
              letterSpacing: '-0.02em'
            }}>{recipe.title}</h2>
            <a href={recipe.url} target="_blank" rel="noopener noreferrer" style={{ 
              color: theme.buttonBg, 
              textDecoration: 'none',
              fontSize: '16px'
            }}>
              View Original Recipe →
            </a>
          </div>

          <table style={{ 
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
              <h2 style={{ 
                fontSize: '3rem', 
                fontWeight: '800', 
                color: theme.buttonBg, 
                marginBottom: '16px',
                letterSpacing: '0.05em'
              }}>
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
        )}
      </div>
    </div>
  );
}

export default App;
