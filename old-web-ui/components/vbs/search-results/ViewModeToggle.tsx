'use client';

import React, { useContext } from 'react';
import { Layers, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SearchResultsContext } from './SearchResultsContext';
import type { ViewMode } from './types';

export function ViewModeToggle() {
  const context = useContext(SearchResultsContext);
  
  if (!context) {
    throw new Error('ViewModeToggle must be used within a SearchResultsProvider');
  }

  const { state, actions } = context;
  const { viewMode } = state;
  const { setViewMode } = actions;

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-gray-600 font-medium">View:</span>
      
      <div className="flex bg-gray-100 rounded-lg p-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode('grouped')}
          className={cn(
            'gap-2 transition-all',
            viewMode === 'grouped' 
              ? 'bg-white shadow-sm text-blue-600' 
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Layers className="h-4 w-4" />
          <span className="hidden sm:inline">Videos</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewMode('ungrouped')}
          className={cn(
            'gap-2 transition-all',
            viewMode === 'ungrouped' 
              ? 'bg-white shadow-sm text-blue-600' 
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          <Grid className="h-4 w-4" />
          <span className="hidden sm:inline">Grid</span>
        </Button>
      </div>
      
      {/* Results count indicator */}
      <div className="ml-auto text-sm text-gray-500">
        {context.derivedState.totalImages} frames
        {viewMode === 'grouped' && ` • ${context.derivedState.totalVideos} videos`}
      </div>
    </div>
  );
}