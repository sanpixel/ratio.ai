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
          className="min-h-screen py-12 px-4"
          style={{
            background: '#87CEEB', // Sky blue
            opacity: showMainApp ? 1 : 0,
            transition: 'opacity 1s ease-in-out'
          }}
        >
          <div className="max-w-4xl mx-auto">
            {/* Header - Always visible */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">ratio.ai</h1>
              <p className="text-xl text-gray-600">
                Transform bloated recipes into clean, memorable ratios
              </p>
            </div>

        {/* Debug Section - Test Recipe Links */}
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🐛 Debug - Test Recipe Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <button
              onClick={() => setUrl('https://www.recipetineats.com/corn-ribs/')}
              className="p-2 bg-green-100 hover:bg-green-200 text-green-800 rounded text-left"
            >
              🌽 Corn Ribs
            </button>
            <button
              onClick={() => setUrl('https://feelgoodfoodie.net/recipe/skinny-broccoli-shrimp-pasta-alfredo/#wprm-recipe-container-5888')}
              className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded text-left"
            >
              🍤 Broccoli Shrimp Alfredo
            </button>
            <button
              onClick={() => setUrl('https://www.loveandlemons.com/focaccia/')}
              className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded text-left"
            >
              🍞 Focaccia
            </button>
            <button
              onClick={() => setUrl('https://pinchofyum.com/the-best-soft-chocolate-chip-cookies')}
              className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-left"
            >
              🍪 Chocolate Chip Cookies
            </button>
          </div>
        </div>

        {/* URL Input Form - Only show when no recipe */}
        {!recipe && (
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex gap-4">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste recipe URL here..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Extract Ratios'}
              </button>
            </div>
          </form>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
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
      </>
    );
  }

  // Normal app rendering after loading is complete
  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#87CEEB' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header - Always visible */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">ratio.ai</h1>
          <p className="text-xl text-gray-600">
            Transform bloated recipes into clean, memorable ratios
          </p>
        </div>

        {/* Debug Section - Test Recipe Links */}
        <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🐛 Debug - Test Recipe Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <button
              onClick={() => setUrl('https://www.recipetineats.com/corn-ribs/')}
              className="p-2 bg-green-100 hover:bg-green-200 text-green-800 rounded text-left"
            >
              🌽 Corn Ribs
            </button>
            <button
              onClick={() => setUrl('https://feelgoodfoodie.net/recipe/skinny-broccoli-shrimp-pasta-alfredo/#wprm-recipe-container-5888')}
              className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded text-left"
            >
              🍤 Broccoli Shrimp Alfredo
            </button>
            <button
              onClick={() => setUrl('https://www.loveandlemons.com/focaccia/')}
              className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded text-left"
            >
              🍞 Focaccia
            </button>
            <button
              onClick={() => setUrl('https://pinchofyum.com/the-best-soft-chocolate-chip-cookies')}
              className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-left"
            >
              🍪 Chocolate Chip Cookies
            </button>
          </div>
        </div>

        {/* URL Input Form - Only show when no recipe */}
        {!recipe && (
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex gap-4">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste recipe URL here..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Extract Ratios'}
              </button>
            </div>
          </form>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
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
