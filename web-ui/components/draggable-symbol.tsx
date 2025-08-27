'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DraggableSymbolProps {
  symbol: string;
  src: string;
  alt: string;
  className?: string;
}

export default function DraggableSymbol({
  symbol,
  src,
  alt,
  className,
}: DraggableSymbolProps) {
  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    e.dataTransfer.setData('symbol', symbol);
    e.dataTransfer.setData('src', src);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      draggable
      onDragStart={handleDragStart}
      className={cn(
        'h-10 w-10 p-1 cursor-grab active:cursor-grabbing border-2 hover:border-blue-300 hover:shadow-md transition-all',
        className
      )}
      title={alt}
    >
      <Image
        src={src}
        alt={alt}
        width={24}
        height={24}
        className="h-6 w-6 object-contain"
        draggable={false}
      />
    </Button>
  );
}