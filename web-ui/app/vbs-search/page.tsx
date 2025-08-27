'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, AlertTriangle, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SearchBar from '@/components/search-bar';
import { SymbolGrid } from '@/components/vbs/symbol-grid';
import { SearchResults, SearchLoadingSpinner, EmptySearchState } from '@/components/vbs/search-results';
import OCRSearch from '@/components/ocr-search';
import {
  searchImages,
  searchNeighbor,
  visualSearch,
  type SearchResult,
} from '@/services/api';
import type { VisualSearchParams } from '@/components/vbs/symbol-grid/types';

export default function VBSSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHeaderFixed, setIsHeaderFixed] = useState(false);
  const [limit, setLimit] = useState(20);
  const [focusId, setFocusId] = useState<string | null>(null);

  const heroSectionRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Handle scroll for fixed header
  useEffect(() => {
    const handleScroll = () => {
      if (heroSectionRef.current) {
        const heroHeight = heroSectionRef.current.offsetHeight;
        const scrollPosition = window.scrollY;

        if (scrollPosition > heroHeight - 10) {
          setIsHeaderFixed(true);
        } else {
          setIsHeaderFixed(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle text-based search
  const handleTextSearch = async (query: string) => {
    setIsLoading(true);
    setSearchQuery(query);
    setError(null);
    setFocusId(null);

    try {
      const results = await searchImages({ query, limit });
      setSearchResults(results);

      // Scroll to results on mobile
      if (mainContentRef.current && window.innerWidth < 1024) {
        mainContentRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      setError('Failed to perform search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle neighbor search (similar images)
  const handleNeighborSearch = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await searchNeighbor({ id, limit });
      setSearchResults(results);
      setFocusId(id);
    } catch (err) {
      setError('Failed to perform neighbor search. Please try again.');
      console.error('Neighbor search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle visual search from symbol grid
  const handleVisualSearch = async ({ objectList, logic = 'AND' }: VisualSearchParams) => {
    setFocusId(null);
    setIsLoading(true);
    setError(null);

    try {
      const results = await visualSearch({ objectList, logic, limit });
      setSearchResults(results);

      // Scroll to results on mobile
      if (mainContentRef.current && window.innerWidth < 1024) {
        mainContentRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      setError('Failed to perform visual search. Please try again.');
      console.error('Visual search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OCR search
  const handleOCRSearch = async (results: SearchResult[]) => {
    setSearchResults(results);
    setFocusId(null);

    // Scroll to results on mobile
    if (mainContentRef.current && window.innerWidth < 1024) {
      mainContentRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle limit change
  const handleLimitChange = (newLimit: string) => {
    const limitNum = parseInt(newLimit);
    setLimit(limitNum);

    // Re-run current search with new limit
    if (searchQuery) {
      handleTextSearch(searchQuery);
    }
  };

  return (
    <>
      {/* Hero Section with Search */}
      <div ref={heroSectionRef} className="pt-16 pb-4">
        <div className="w-full px-4 md:px-8 lg:px-12">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-4 text-4xl font-bold text-gray-900">
              Visual-Based Search
            </h1>
            <p className="mb-6 text-lg text-gray-600">
              Search video frames using text, visual objects, or OCR text detection
            </p>

            <div className="mb-4">
              <SearchBar onSearch={handleTextSearch} size="large" />
            </div>

            <div className="flex justify-center items-center gap-4 flex-wrap">
              <Link href="/find-image" className="flex items-center text-gray-600 hover:text-gray-900">
                <Search className="mr-1 h-4 w-4" />
                Find by ID
              </Link>

              <Link href="/files" className="flex items-center text-gray-600 hover:text-gray-900">
                <Database className="mr-1 h-4 w-4" />
                File Browser
              </Link>

              {/* Results Limit Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Results:</span>
                <Select value={limit.toString()} onValueChange={handleLimitChange}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Header (appears on scroll) */}
      <header
        className={`w-full bg-white z-50 transition-all duration-300 ease-in-out border-b ${
          isHeaderFixed ? 'fixed top-0 shadow-md' : 'absolute -top-20 opacity-0'
        }`}
      >
        <div className="w-full px-4 md:px-8 lg:px-12 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">VBS</h1>
            <div className="flex-1 max-w-2xl mx-4">
              <SearchBar onSearch={handleTextSearch} />
            </div>
            <div className="flex items-center gap-2">
              <Link href="/files">
                <Button variant="outline" size="sm">
                  <Database className="h-4 w-4 mr-1" />
                  Files
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      {isHeaderFixed && <div className="h-[73px]" />}

      {/* Main Content */}
      <div ref={mainContentRef} className="w-full px-4 md:px-8 lg:px-12 py-6">
        <div className="grid lg:grid-cols-5 xl:grid-cols-3 gap-6 2xl:gap-8">
          {/* Left Sidebar - Visual Search Tools (Expanded for Better Interaction) */}
          <aside className="lg:col-span-2 xl:col-span-1 space-y-6">
            <SymbolGrid onSearch={handleVisualSearch} />
            <OCRSearch
              onResultsFound={handleOCRSearch}
              onError={setError}
              onLoading={setIsLoading}
              limit={limit}
            />
          </aside>

          {/* Right Content - Search Results */}
          <main className="lg:col-span-3 xl:col-span-2">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <SearchLoadingSpinner />
            ) : searchResults.length > 0 ? (
              <SearchResults
                results={searchResults}
                onMoreResults={handleNeighborSearch}
                focusId={focusId}
              />
            ) : (
              <EmptySearchState isSearchQuery={!!searchQuery} />
            )}
          </main>
        </div>
      </div>
    </>
  );
}
