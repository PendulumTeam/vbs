'use client';

import React, { createContext } from 'react';
import type { SymbolGridContextValue } from './types';

export const SymbolGridContext = createContext<SymbolGridContextValue | null>(null);

interface SymbolGridProviderProps {
  value: SymbolGridContextValue;
  children: React.ReactNode;
}

export function SymbolGridProvider({ value, children }: SymbolGridProviderProps) {
  return (
    <SymbolGridContext.Provider value={value}>
      {children}
    </SymbolGridContext.Provider>
  );
}