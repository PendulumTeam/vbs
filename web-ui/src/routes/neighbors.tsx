import React from 'react';
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { z } from 'zod';
import { useNeighborSearch } from '../api/queries';
import { SearchResults } from '../components/SearchResults';

// Neighbor search parameters validation
const neighborSchema = z.object({
  id: z.string().min(1),
  limit: z.number().min(1).max(100).optional().default(20),
});

function NeighborsPage() {
  const router = useRouter()
  const navigate = useNavigate();
  const { id, limit } = Route.useSearch();

  // Query neighbors with URL parameters
  const { data: results, isLoading, error } = useNeighborSearch(id, limit);

  const handleBackToSearch = () => {
    router.history.back();
  };

  const handleNeighborSearch = (frameId: string) => {
    // Navigate to neighbors of a different frame
    navigate({
      to: '/neighbors',
      search: { id: frameId, limit },
    });
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleBackToSearch}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back to Search
        </button>

        <div className="text-sm text-gray-600">
          Neighbors of: <span className="font-medium">{id}</span>
          {results && (
            <span className="ml-2 text-gray-500">
              • {results.length} neighbors
            </span>
          )}
        </div>
      </div>

      {/* Neighbor Results with center frame highlighting */}
      <SearchResults
        results={results || []}
        isLoading={isLoading}
        error={error}
        onNeighborSearch={handleNeighborSearch}
        centerFrameId={id} // Highlight the target frame
        currentViewMode="grouped" // Default to grouped for neighbor view
      />
    </div>
  );
}

export const Route = createFileRoute('/neighbors')({
  component: NeighborsPage,
  validateSearch: neighborSchema,
  beforeLoad: ({ search }) => {
    if (!search.id) {
      throw new Error('Frame ID is required for neighbor search');
    }
  },
});
