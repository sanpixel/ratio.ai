import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
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
      const response = await axios.post('http://localhost:8000/process-recipe', {
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
        const response = await axios.post('http://localhost:8000/recalculate-ratios', {
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header - Always visible */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">ratio.ai</h1>
          <p className="text-xl text-gray-600">
            Transform bloated recipes into clean, memorable ratios
          </p>
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
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Ingredient</th>
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
                      type="text"
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                      style={{ 
                        width: '100%', 
                        border: 'none', 
                        padding: '4px',
                        fontWeight: ingredient.was_normalized ? 'bold' : 'normal'
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {Object.keys(recipe.ratios).length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h3>Ratios:</h3>
              {Object.entries(recipe.ratios).map(([groupType, ratioData]: [string, any]) => (
                <div key={groupType} style={{ marginBottom: '10px' }}>
                  <strong>{groupType}:</strong> {ratioData.ratio_string}
                  <br />
                  <small>
                    {ratioData.ingredients.map((ingredient: string, index: number) => (
                      <span key={index}>
                        {ratioData.ratio[index]} {ingredient}
                        {index < ratioData.ingredients.length - 1 ? ' : ' : ''}
                      </span>
                    ))}
                  </small>
                </div>
              ))}
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
