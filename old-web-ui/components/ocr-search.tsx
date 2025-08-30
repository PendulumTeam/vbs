'use client';

import { useState, FormEvent } from 'react';
import { Search, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { searchOCR } from '@/services/api';
import type { SearchResult } from '@/services/api';

interface OCRSearchProps {
  onResultsFound: (results: SearchResult[]) => void;
  onError: (message: string) => void;
  onLoading: (isLoading: boolean) => void;
  limit: number;
}

export default function OCRSearch({
  onResultsFound,
  onError,
  onLoading,
  limit = 20,
}: OCRSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      return;
    }

    try {
      setIsSearching(true);
      onLoading(true);

      const results = await searchOCR({ query, limit });

      onResultsFound(results);

      if (results.length === 0) {
        onError(`No images found containing text "${query}"`);
      }
    } catch (error) {
      console.error('OCR search error:', error);
      onError('Failed to perform OCR search. Please try again.');
    } finally {
      setIsSearching(false);
      onLoading(false);
    }
  };

  return (
    <Card className="mt-6 border-indigo-200 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center">
          <FileText className="mr-2 h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-medium">Text in Image Search</h2>
        </div>
        <p className="text-sm text-gray-600">
          Find images containing specific text or words using OCR technology.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2 transform" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter text to find in images..."
              className="pl-10 pr-16 focus:border-indigo-500 focus:ring-indigo-500"
              disabled={isSearching}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 transform">
              <span className="text-xs text-gray-500">Max: {limit}</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Find Text
                </>
              )}
            </Button>
          </div>
        </form>

        <Card className="bg-gray-50 border-gray-100">
          <CardContent className="p-3">
            <p className="mb-1 text-xs font-medium text-gray-500">Example searches:</p>
            <p className="text-xs text-gray-500">• Words: &ldquo;exit&rdquo;, &ldquo;emergency&rdquo;, &ldquo;entrance&rdquo;</p>
            <p className="text-xs text-gray-500">• Numbers: &ldquo;2023&rdquo;, &ldquo;Room 101&rdquo;</p>
            <p className="text-xs text-gray-500">• Signs: &ldquo;stop&rdquo;, &ldquo;no parking&rdquo;, &ldquo;open&rdquo;</p>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}