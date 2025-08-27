'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DraggableSymbol from '@/components/draggable-symbol';
import { ObjectList } from '@/constants/objects';
import { cn } from '@/lib/utils';
import type { SymbolPaletteProps } from './types';

export function SymbolPalette({ className }: SymbolPaletteProps) {
  return (
    <Card className={cn('border-gray-200 shadow-sm', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Available Symbols</h3>
          <Badge variant="secondary" className="text-xs">
            {ObjectList.length}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-6 gap-1 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-6">
          {ObjectList.map((symbol) => (
            <DraggableSymbol
              key={symbol.id}
              symbol={symbol.id}
              src={symbol.src}
              alt={symbol.alt}
              className="h-8 w-8 p-1 transition-all duration-200 hover:scale-110"
            />
          ))}
        </div>
        
        <div className="mt-3 text-xs text-gray-500">
          Drag symbols to the grid below to create your visual search
        </div>
      </CardContent>
    </Card>
  );
}