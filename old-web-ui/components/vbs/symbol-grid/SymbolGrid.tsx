'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSymbolGrid } from './hooks/useSymbolGrid';
import { SymbolGridProvider } from './SymbolGridContext';
import { SymbolPalette } from './SymbolPalette';
import { GridControls } from './GridControls';
import { CanvasGrid } from './CanvasGrid';
import { SearchActions } from './SearchActions';
import type { VisualSearchParams } from './types';

interface SymbolGridProps {
  onSearch: (params: VisualSearchParams) => Promise<void>;
  className?: string;
}

// Internal component that uses the context
function SymbolGridContent({ onSearch, className }: SymbolGridProps) {
  return (
    <Card className={cn('border-red-200 shadow-lg', className)}>
      <CardHeader className="pb-4">
        <h2 className="text-lg font-semibold text-gray-800">Visual Search</h2>
        <p className="text-sm text-gray-600">
          Drag objects to the canvas and define their positions to search for similar scenes
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Available Symbols */}
        <SymbolPalette />
        
        {/* Grid Controls */}
        <GridControls />
        
        {/* Interactive Canvas */}
        <CanvasGrid />
        
        {/* Search Actions */}
        <SearchActions onSearch={onSearch} />
      </CardContent>
    </Card>
  );
}

// Main exported component with provider
export default function SymbolGrid({ onSearch, className }: SymbolGridProps) {
  const symbolGridState = useSymbolGrid();

  return (
    <SymbolGridProvider value={symbolGridState}>
      <SymbolGridContent onSearch={onSearch} className={className} />
    </SymbolGridProvider>
  );
}