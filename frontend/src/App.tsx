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

function App() {
  const [url, setUrl] = useState('');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showMainApp, setShowMainApp] = useState(false);
  
  // Debug flag to disable video animation
  const gif_animation_debug = false;

  // Handle initial loading animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMainApp(true);
      // Give fade transition some time before hiding loading screen
      setTimeout(() => {
        setIsInitialLoading(false);
      }, 1000); // 1 second fade transition
    }, 7000); // Show video for 7 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a recipe URL');
      return;
    }

    setLoading(true);
    setError('');
    setRecipe(null);

    try {
      const response = await axios.post('/api/process-recipe', {
        url: url
      });
      
      setRecipe(response.data);
      
      if (!response.data.success) {
        setError(response.data.error || 'Failed to process recipe');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error processing recipe');
    } finally {
      setLoading(false);
    }
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
    
    // Default - no color for seasonings, mix-ins, etc.
    return '#000000'; // Black
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
            className="max-w-full max-h-full object-contain"
          />
        </div>
        
        {/* Main App - Fading In */}
        <div 
          className="min-h-screen py-6 sm:py-12 px-4"
          style={{
            background: 'linear-gradient(135deg, #121212 0%, #1a1a1a 100%)', // Dark gradient
            opacity: showMainApp ? 1 : 0,
            transition: 'opacity 1s ease-in-out'
          }}
        >
          <div className="max-w-6xl mx-auto">
            {/* Header - Always visible */}
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4" style={{color: '#87CEEB'}}>ratio.ai</h1>
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
                  backgroundColor: '#87CEEB'
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
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4" style={{color: '#87CEEB'}}>
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
                  backgroundColor: '#87CEEB'
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
    <div className="min-h-screen py-6 sm:py-12 px-4" style={{ background: 'linear-gradient(135deg, #121212 0%, #1a1a1a 100%)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header - Always visible */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4" style={{color: '#87CEEB'}}>ratio.ai</h1>
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
                  backgroundColor: '#87CEEB'
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
        <div>
          <div style={{ marginBottom: '20px' }}>
            <h2>{recipe.title}</h2>
            <a href={recipe.url} target="_blank" rel="noopener noreferrer">
              View Original Recipe →
            </a>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Quantity</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Unit</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Grams</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Ingredient</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Full Debug</th>
              </tr>
            </thead>
            <tbody>
              {recipe.ingredients.map((ingredient, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                    <input
                      type="number"
                      step="0.25"
                      value={ingredient.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                      style={{ width: '80px', border: 'none', padding: '4px' }}
                    />
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                    <input
                      type="text"
                      value={ingredient.unit}
                      onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      style={{ width: '80px', border: 'none', padding: '4px' }}
                    />
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                    <input
                      type="number"
                      step="0.1"
                      value={ingredient.grams}
                      onChange={(e) => updateIngredient(index, 'grams', parseFloat(e.target.value) || 0)}
                      style={{ width: '80px', border: 'none', padding: '4px' }}
                    />
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                    <input
                      type="text"
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                      style={{ 
                        width: '100%', 
                        border: 'none', 
                        padding: '4px',
                        fontWeight: ingredient.was_normalized ? 'bold' : 'normal',
                        color: getIngredientCategoryColor(ingredient.name)
                      }}
                    />
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '4px', fontSize: '12px', color: '#666', maxWidth: '200px' }}>
                    {ingredient.original_text}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {recipe.ratios['Main Ratio'] && (
            <div style={{ marginBottom: '30px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {recipe.ratios['Main Ratio'].ratio_string}
              </h2>
              <p style={{ fontSize: '1rem', color: '#666', marginTop: '10px' }}>
                {recipe.ratios['Main Ratio'].categories.map((category: string, index: number) => (
                  <span key={index}>
                    {recipe.ratios['Main Ratio'].ratio[index]} {category}
                    {index < recipe.ratios['Main Ratio'].categories.length - 1 ? ' : ' : ''}
                  </span>
                ))}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ccc' }}>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste another recipe URL here..."
              style={{ width: '400px', padding: '8px', marginRight: '10px' }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              {loading ? 'Processing...' : 'Extract Ratios'}
            </button>
          </form>
          
          {error && (
            <div style={{ color: 'red', marginTop: '10px' }}>
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
