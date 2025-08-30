import React, { useState } from 'react';
import { useSearchText, useNeighborSearch, useHealthCheck } from './api/queries';
import { SearchBar } from './components/SearchBar';
import { SearchResults } from './components/SearchResults';
import { Badge } from './components/ui/badge';

function App() {
  const [currentQuery, setCurrentQuery] = useState('');
  const [neighborFrameId, setNeighborFrameId] = useState<string | null>(null);
  
  // API queries
  const { data: searchResults, isLoading: isSearching, error: searchError } = useSearchText(currentQuery);
  const { data: neighborResults, isLoading: isLoadingNeighbors } = useNeighborSearch(neighborFrameId || '');
  const { data: health } = useHealthCheck();

  const handleSearch = (query: string) => {
    setCurrentQuery(query);
    setNeighborFrameId(null); // Clear neighbor search when doing new text search
  };

  const handleNeighborSearch = (frameId: string) => {
    setNeighborFrameId(frameId);
    setCurrentQuery(''); // Clear text search when doing neighbor search
  };

  // Determine what results to show
  const resultsToShow = neighborResults || searchResults || [];
  const isLoading = isSearching || isLoadingNeighbors;
  const error = searchError;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                VBS Search
              </h1>
              {health && (
                <Badge 
                  variant={health.status === 'healthy' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {health.status}
                </Badge>
              )}
            </div>
            
            {/* Search Stats */}
            {resultsToShow.length > 0 && (
              <div className="text-sm text-gray-600">
                {resultsToShow.length} results
                {currentQuery && ` for "${currentQuery}"`}
                {neighborFrameId && ` near "${neighborFrameId}"`}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <SearchBar 
              onSearch={handleSearch}
              isLoading={isLoading}
              placeholder="Search for images using text descriptions..."
            />
            
            {/* Current search indicator */}
            {(currentQuery || neighborFrameId) && (
              <div className="mt-2 text-center">
                {currentQuery && (
                  <p className="text-sm text-gray-600">
                    Searching for: <span className="font-medium">"{currentQuery}"</span>
                  </p>
                )}
                {neighborFrameId && (
                  <p className="text-sm text-gray-600">
                    Neighbors of: <span className="font-medium">{neighborFrameId}</span>
                    <button 
                      onClick={() => setNeighborFrameId(null)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ✕ Clear
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Search Results */}
          <SearchResults
            results={resultsToShow}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </main>
    </div>
  );
}

export default App;