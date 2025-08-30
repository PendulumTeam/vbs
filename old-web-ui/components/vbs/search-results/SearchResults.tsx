'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useSearchResults } from './hooks/useSearchResults';
import { SearchResultsProvider } from './SearchResultsContext';
import { VideoGroup } from './VideoGroup';
import { ViewModeToggle } from './ViewModeToggle';
import { UngroupedResults } from './UngroupedResults';
import { EmptySearchState, ErrorState } from './LoadingStates';
import type { SearchResultsProps } from './types';

// Internal component that uses the context
function SearchResultsContent({ 
  results, 
  onMoreResults, 
  focusId, 
  className 
}: SearchResultsProps) {
  const searchResultsState = useSearchResults(results, focusId);
  const { state, derivedState } = searchResultsState;

  // Filter out video groups that have no valid images
  const validGroups = state.groups.filter((group) =>
    group.images.some((img) => !state.failedImageIds.has(img.image_id))
  );

  // If all images failed to load, show error state
  if (validGroups.length === 0 && derivedState.errorImages > 0) {
    return <ErrorState errorCount={derivedState.errorImages} className={className} />;
  }

  // If no results at all, show empty state
  if (results.length === 0) {
    return <EmptySearchState isSearchQuery={true} className={className} />;
  }

  return (
    <div className={cn('space-y-4 p-2 md:p-4 border border-blue-200 rounded-xl', className)}>
      {/* View Mode Toggle */}
      <ViewModeToggle />
      
      {/* Conditional Content Based on View Mode */}
      {state.viewMode === 'grouped' ? (
        // Grouped by Video (Current Layout)
        <div className="space-y-6">
          {validGroups.map((group) => (
            <VideoGroup
              key={group.videoId}
              group={{
                ...group,
                // Filter out failed images from each group
                images: group.images.filter(
                  (img) => !state.failedImageIds.has(img.image_id)
                ),
              }}
              onMoreResults={onMoreResults}
            />
          ))}
        </div>
      ) : (
        // Ungrouped Grid Layout
        <UngroupedResults onMoreResults={onMoreResults} />
      )}
      
      {/* Results Summary - Only show in grouped mode to avoid duplication */}
      {state.viewMode === 'grouped' && derivedState.hasResults && (
        <div className="text-center pt-4 border-t border-gray-200">
          <div className="flex justify-center items-center gap-4 text-sm text-gray-500">
            <span>{derivedState.totalImages} total images</span>
            <span>•</span>
            <span>{derivedState.totalVideos} videos</span>
            {derivedState.errorImages > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-600">
                  {derivedState.errorImages} failed to load
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Main exported component with provider
export default function SearchResults({ results, onMoreResults, focusId, className }: SearchResultsProps) {
  const searchResultsState = useSearchResults(results, focusId);

  return (
    <SearchResultsProvider value={searchResultsState}>
      <SearchResultsContent 
        results={results}
        onMoreResults={onMoreResults}
        focusId={focusId}
        className={className}
      />
    </SearchResultsProvider>
  );
}