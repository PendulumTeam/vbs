'use client';

import * as React from 'react';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (query: string) => void;
  size?: 'default' | 'large';
  className?: string;
}

export default function SearchBar({
  onSearch,
  size = 'default',
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const isLarge = size === 'large';

  return (
    <div className={cn('w-full', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for images..."
          className={cn(
            'border-gray-300 focus:border-transparent focus:ring-gray-500',
            isLarge 
              ? 'h-12 pr-14 text-lg shadow-lg rounded-2xl' 
              : 'h-10 pr-12 text-base rounded-2xl'
          )}
        />
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          className={cn(
            'absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 hover:bg-transparent',
            isLarge ? 'h-10 w-10' : 'h-8 w-8'
          )}
        >
          <Search className={isLarge ? 'h-6 w-6' : 'h-5 w-5'} />
        </Button>
      </form>
    </div>
  );
}