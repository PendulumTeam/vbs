'use client';

import React, { useContext, useRef, useEffect, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SymbolGridContext } from './SymbolGridContext';
import type { CanvasGridProps } from './types';

// Lazy load Konva components to reduce bundle size
const LazyKonvaComponents = React.lazy(() => import('./KonvaComponents'));

function CanvasGridSkeleton() {
  return (
    <Card className="border-2 border-dashed border-gray-300">
      <CardContent className="p-0">
        <Skeleton className="h-[240px] w-full rounded-none" />
      </CardContent>
    </Card>
  );
}

export function CanvasGrid({ className }: CanvasGridProps) {
  const context = useContext(SymbolGridContext);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!context) {
    throw new Error('CanvasGrid must be used within a SymbolGridProvider');
  }

  const { state, actions } = context;

  // Update dimensions when container size changes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        // Use more generous height for better interaction space
        const height = Math.max(300, Math.min(width, width * 0.75)); // Min 300px, max 75% of width
        const cellSize = Math.min(width, height) / 8; // 8x8 grid based on smaller dimension
        
        actions.updateDimensions({ width, height, cellSize });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [actions]);

  // HTML5 drag and drop handlers for the drop zone
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    actions.setDragOver(true);

    // Calculate highlighted cell for visual feedback
    if (containerRef.current && state.settings.showGrid) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const col = Math.floor(x / state.dimensions.cellSize);
      const row = Math.floor(y / state.dimensions.cellSize);
      
      if (col >= 0 && col < 8 && row >= 0 && row < 8) {
        actions.setHighlightedCell({ row, col });
      } else {
        actions.setHighlightedCell(null);
      }
    }
  };

  const handleDragLeave = () => {
    actions.setDragOver(false);
    actions.setHighlightedCell(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    actions.setDragOver(false);
    actions.setHighlightedCell(null);

    if (!containerRef.current) return;

    const symbol = e.dataTransfer.getData('symbol');
    const src = e.dataTransfer.getData('src') || '';

    if (!symbol) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Ensure position is within bounds
    const boundedX = Math.max(25, Math.min(x, state.dimensions.width - 25));
    const boundedY = Math.max(25, Math.min(y, state.dimensions.height - 25));

    // Add the symbol to the grid
    actions.addSymbol({
      symbol,
      position: { x: boundedX, y: boundedY },
      dimensions: { width: 50, height: 50 },
      rotation: 0,
      src,
    });
  };

  return (
    <Card 
      className={cn(
        'border-2 border-dashed transition-colors',
        state.isDragOver 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-gray-300 bg-white',
        className
      )}
    >
      <CardContent className="p-0">
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden"
          style={{ height: state.dimensions.height || 240 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Konva Canvas */}
          <Suspense fallback={<CanvasGridSkeleton />}>
            <LazyKonvaComponents />
          </Suspense>

          {/* Empty state message */}
          {state.symbols.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none">
              Drag symbols here to create your visual search
            </div>
          )}

          {/* Cell highlight overlay for HTML5 drag preview */}
          {state.highlightedCell && state.settings.showGrid && (
            <div
              className="absolute bg-blue-200 bg-opacity-30 border border-blue-400 pointer-events-none"
              style={{
                left: state.highlightedCell.col * state.dimensions.cellSize,
                top: state.highlightedCell.row * state.dimensions.cellSize,
                width: state.dimensions.cellSize,
                height: state.dimensions.cellSize,
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}