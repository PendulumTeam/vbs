import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { cn } from '../lib/utils';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function SearchBar({ 
  onSearch, 
  isLoading = false,
  className 
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
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
        <div className="relative">
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
        
        {/* Help text */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Use natural language to describe what you want to find</span>
          <span className="font-mono">Ctrl+Enter to search</span>
        </div>
      </div>
    </form>
  );
}