import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { cn } from '../lib/utils';

interface SearchBarProps {
  onSearch: (query: string, limit: number) => void;
  currentLimit?: number;
  isLoading?: boolean;
  className?: string;
}

export function SearchBar({ 
  onSearch, 
  currentLimit = 20,
  isLoading = false,
  className 
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(currentLimit);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), limit);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    if (query.trim()) {
      // Auto-search with new limit if query exists
      onSearch(query.trim(), newLimit);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to search
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Regular Enter for line breaks (default behavior)
  };

  return (
    <form onSubmit={handleSubmit} className={cn('w-full', className)}>
      <div className="space-y-3">
        <div className="flex gap-3">
          {/* Main search textarea */}
          <div className="flex-1 relative">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Describe what you're looking for using natural language...

Examples:
• person walking in the park
• red car driving on highway
• group of people talking outdoors
• dog playing with ball
• beautiful sunset landscape`}
              rows={3}
              className="resize-none pr-12 text-base leading-relaxed"
              disabled={isLoading}
            />
            
            <Button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="absolute bottom-2 right-2 h-8 w-8 p-0"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Limit control */}
          <div className="w-20 flex flex-col">
            <label className="text-xs text-gray-500 mb-1 block font-medium">
              Limit
            </label>
            <Input
              type="number"
              value={limit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              min={1}
              max={100}
              className="text-center text-sm h-12"
            />
          </div>
        </div>
        
        {/* Popular limit shortcuts */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Quick limits:</span>
          <div className="flex gap-1">
            {[10, 20, 50, 100].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handleLimitChange(value)}
                className={cn(
                  "px-2 py-1 text-xs rounded border transition-colors",
                  limit === value 
                    ? "bg-blue-500 text-white border-blue-500" 
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        
        {/* Help text */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Use natural language to describe what you want to find</span>
          <span className="font-mono">Ctrl+Enter to search</span>
        </div>
      </div>
    </form>
  );
}