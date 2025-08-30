'use client';

import React, { useContext, useState, useMemo } from 'react';
import { ArrowUpDown, Clock, Hash, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SearchResultsContext } from './SearchResultsContext';
import { ImageResult } from './ImageResult';
import type { SearchResult } from '@/services/api';

type SortOption = 'score' | 'timestamp' | 'video' | 'none';
type SortDirection = 'asc' | 'desc';

interface UngroupedResultsProps {
  onMoreResults: (id: string) => void;
  className?: string;
}

export function UngroupedResults({ onMoreResults, className }: UngroupedResultsProps) {
  const context = useContext(SearchResultsContext);
  const [sortBy, setSortBy] = useState<SortOption>('none');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  if (!context) {
    throw new Error('UngroupedResults must be used within a SearchResultsProvider');
  }

  const { derivedState, state } = context;
  const { allImages } = derivedState;

  // Sort images based on selected criteria
  const sortedImages = useMemo(() => {
    if (sortBy === 'none') return allImages;

    const sorted = [...allImages].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'score':
          comparison = (a.score || 0) - (b.score || 0);
          break;
        case 'timestamp':
          comparison = a.frame_stamp - b.frame_stamp;
          break;
        case 'video':
          const videoA = a.image_id.split('_').slice(0, 2).join('_');
          const videoB = b.image_id.split('_').slice(0, 2).join('_');
          comparison = videoA.localeCompare(videoB);
          break;
        default:
          return 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [allImages, sortBy, sortDirection]);

  // Filter out failed images
  const validImages = sortedImages.filter(
    (image) => !state.failedImageIds.has(image.image_id)
  );

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      // Toggle direction if same option
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort option with default direction
      setSortBy(option);
      setSortDirection(option === 'score' ? 'desc' : 'asc');
    }
  };

  if (validImages.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-gray-500">No frames to display</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Sort Controls */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">Sort by:</span>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSort('score')}
          className={cn(
            'gap-1 h-8',
            sortBy === 'score' && 'bg-blue-50 text-blue-600'
          )}
        >
          <Star className="h-3 w-3" />
          Score
          {sortBy === 'score' && (
            <ArrowUpDown className={cn(
              'h-3 w-3',
              sortDirection === 'desc' && 'rotate-180'
            )} />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSort('timestamp')}
          className={cn(
            'gap-1 h-8',
            sortBy === 'timestamp' && 'bg-blue-50 text-blue-600'
          )}
        >
          <Clock className="h-3 w-3" />
          Time
          {sortBy === 'timestamp' && (
            <ArrowUpDown className={cn(
              'h-3 w-3',
              sortDirection === 'desc' && 'rotate-180'
            )} />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSort('video')}
          className={cn(
            'gap-1 h-8',
            sortBy === 'video' && 'bg-blue-50 text-blue-600'
          )}
        >
          <Hash className="h-3 w-3" />
          Video
          {sortBy === 'video' && (
            <ArrowUpDown className={cn(
              'h-3 w-3',
              sortDirection === 'desc' && 'rotate-180'
            )} />
          )}
        </Button>

        {sortBy !== 'none' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortBy('none')}
            className="h-8 text-gray-500"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {validImages.map((image) => (
          <div key={image.image_id} className="transform transition-transform hover:scale-[1.02]">
            <ImageResult
              image={image}
              onMoreResults={onMoreResults}
              className="h-full"
            />
          </div>
        ))}
      </div>

      {/* Results Summary */}
      <div className="text-center text-sm text-gray-500 pt-4">
        Showing {validImages.length} frames
        {sortBy !== 'none' && ` • Sorted by ${sortBy} (${sortDirection}ending)`}
      </div>
    </div>
  );
}