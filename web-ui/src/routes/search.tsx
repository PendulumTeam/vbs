import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { useSearchText } from '../api/queries';
import { SearchBar } from '../components/SearchBar';
import { SearchResults } from '../components/SearchResults';

// Search parameters validation
const searchSchema = z.object({
  q: z.string().min(1),
  limit: z.number().min(1).max(100).optional().default(20),
  view: z.enum(['grouped', 'ungrouped']).optional().default('grouped'),
  sort: z.enum(['score', 'timestamp', 'video', 'none']).optional().default('score'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

function SearchPage() {
  const navigate = useNavigate();
  const { q, limit, view, sort, sortDir } = Route.useSearch();

  // Query with URL parameters
  const { data: results, isLoading, error } = useSearchText(q, limit);

  const handleNewSearch = (query: string, newLimit: number) => {
    // Update URL with new search query and limit
    navigate({
      to: '/search',
      search: { q: query, limit: newLimit, view, sort, sortDir },
      replace: true,
    });
  };

  const handleNeighborSearch = (frameId: string) => {
    // Navigate to neighbor search
    navigate({
      to: '/neighbors',
      search: { id: frameId, limit: 20 },
    });
  };

  const handleViewModeChange = (newViewMode: 'grouped' | 'ungrouped') => {
    // Update URL with new view mode
    navigate({
      to: '/search',
      search: { q, limit, view: newViewMode, sort, sortDir },
      replace: true,
    });
  };

  const handleSortChange = (newSort: string, newSortDir: 'asc' | 'desc') => {
    // Update URL with new sort options
    navigate({
      to: '/search', 
      search: { q, limit, view, sort: newSort as any, sortDir: newSortDir },
      replace: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <SearchBar
          onSearch={handleNewSearch}
          currentLimit={limit}
          isLoading={isLoading}
        />

        {/* Current search indicator */}
        <div className="mt-2 text-center">
          <p className="text-sm text-gray-600">
            Searching for: <span className="font-medium">"{q}"</span>
            <span className="ml-2 text-gray-500">• Limit: {limit}</span>
            {results && (
              <span className="ml-2 text-gray-500">
                • {results.length} results
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Search Results with URL state management */}
      <SearchResults
        results={results || []}
        isLoading={isLoading}
        error={error}
        onNeighborSearch={handleNeighborSearch}
        currentViewMode={view}
        currentSortBy={sort}
        currentSortDir={sortDir}
        onViewModeChange={handleViewModeChange}
        onSortChange={handleSortChange}
      />
    </div>
  );
}

export const Route = createFileRoute('/search')({
  component: SearchPage,
  validateSearch: searchSchema,
  // Preload search results when hovering over search links
  beforeLoad: ({ search }) => {
    if (!search.q) {
      throw new Error('Search query is required');
    }
  },
});
