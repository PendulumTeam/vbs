'use client';

import React, { useContext, useState } from 'react';
import { Search, Trash, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SymbolGridContext } from './SymbolGridContext';
import { toast } from '@/hooks/use-toast';
import type { SearchActionsProps, SearchObject } from './types';

export function SearchActions({ onSearch, className }: SearchActionsProps) {
  const context = useContext(SymbolGridContext);
  const [isSearching, setIsSearching] = useState(false);
  
  if (!context) {
    throw new Error('SearchActions must be used within a SymbolGridProvider');
  }

  const { state, actions, hasSymbols, canSearch, coordinateUtils } = context;

  const handleClear = () => {
    actions.clearSymbols();
    toast({
      title: 'Symbols cleared',
      description: 'All symbols have been removed from the grid.',
    });
  };

  const handleReset = () => {
    actions.clearSymbols();
    actions.updateSettings({
      searchLogic: 'AND',
      showGrid: true,
      isEnabled: true,
    });
    toast({
      title: 'Grid reset',
      description: 'All symbols and settings have been reset to defaults.',
    });
  };

  const handleSearch = async () => {
    if (!canSearch) return;

    try {
      setIsSearching(true);
      
      // Transform symbols to API format
      const objectList: SearchObject[] = state.symbols.map(coordinateUtils.toApiCoordinates);
      
      await onSearch({
        objectList,
        logic: state.settings.searchLogic,
      });

      toast({
        title: 'Search completed',
        description: `Found results using ${state.symbols.length} symbol${state.symbols.length === 1 ? '' : 's'} with ${state.settings.searchLogic} logic.`,
      });
    } catch (error) {
      console.error('Visual search error:', error);
      toast({
        title: 'Search failed',
        description: 'There was an error performing the visual search. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className={cn('border-gray-200 shadow-sm', className)}>
      <CardContent className="p-4">
        <div className="flex gap-2">
          {/* Clear Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={!hasSymbols || isSearching}
            className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
          >
            <Trash className="mr-2 h-4 w-4" />
            Clear
          </Button>

          {/* Reset Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isSearching}
            className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            disabled={!canSearch || isSearching}
            size="sm"
            className="flex-[2] bg-gray-800 hover:bg-gray-700 text-white"
          >
            {isSearching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Status Information */}
        <div className="mt-3 text-xs text-gray-500 space-y-1">
          {hasSymbols ? (
            <div className="flex justify-between">
              <span>{state.symbols.length} symbol{state.symbols.length === 1 ? '' : 's'} placed</span>
              <span>{state.settings.searchLogic} logic</span>
            </div>
          ) : (
            <div className="text-center">
              Drag symbols to the grid above to start searching
            </div>
          )}
          
          {!state.settings.isEnabled && (
            <div className="text-amber-600">
              Search is disabled. Enable in controls above.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}