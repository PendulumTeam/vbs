'use client';

import React, { createContext } from 'react';
import type { SearchResultsContextValue } from './types';

export const SearchResultsContext = createContext<SearchResultsContextValue | null>(null);

interface SearchResultsProviderProps {
  value: SearchResultsContextValue;
  children: React.ReactNode;
}

export function SearchResultsProvider({ value, children }: SearchResultsProviderProps) {
  return (
    <SearchResultsContext.Provider value={value}>
      {children}
    </SearchResultsContext.Provider>
  );
}