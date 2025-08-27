'use client';

import { useReducer, useCallback, useMemo } from 'react';
import {
  GridState,
  GridActions,
  PositionedSymbol,
  GridSettings,
  GridDimensions,
  DEFAULT_SYMBOL_SIZE,
} from '../types';

// Action types for useReducer
type GridAction =
  | { type: 'ADD_SYMBOL'; payload: Omit<PositionedSymbol, 'id' | 'zIndex'> }
  | { type: 'UPDATE_SYMBOL'; payload: { id: string; updates: Partial<PositionedSymbol> } }
  | { type: 'REMOVE_SYMBOL'; payload: string }
  | { type: 'SELECT_SYMBOL'; payload: string | null }
  | { type: 'CLEAR_SYMBOLS' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<GridSettings> }
  | { type: 'UPDATE_DIMENSIONS'; payload: GridDimensions }
  | { type: 'SET_DRAG_OVER'; payload: boolean }
  | { type: 'SET_HIGHLIGHTED_CELL'; payload: { row: number; col: number } | null };

// Initial state
const initialState: GridState = {
  symbols: [],
  settings: {
    showGrid: true,
    searchLogic: 'AND',
    isEnabled: true,
  },
  dimensions: {
    width: 320,
    height: 300,
    cellSize: 37.5,
  },
  selectedSymbolId: null,
  highestZIndex: 1,
  isDragOver: false,
  highlightedCell: null,
};

// Reducer function
function gridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case 'ADD_SYMBOL': {
      const newSymbol: PositionedSymbol = {
        ...action.payload,
        id: `${action.payload.symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        zIndex: state.highestZIndex + 1,
      };
      
      return {
        ...state,
        symbols: [...state.symbols, newSymbol],
        highestZIndex: state.highestZIndex + 1,
        selectedSymbolId: newSymbol.id,
      };
    }

    case 'UPDATE_SYMBOL': {
      const { id, updates } = action.payload;
      
      return {
        ...state,
        symbols: state.symbols.map((symbol) =>
          symbol.id === id ? { ...symbol, ...updates } : symbol
        ),
        // Update zIndex if position changed (bring to front)
        highestZIndex: updates.position
          ? Math.max(state.highestZIndex, (updates.zIndex || 0) + 1)
          : state.highestZIndex,
      };
    }

    case 'REMOVE_SYMBOL': {
      return {
        ...state,
        symbols: state.symbols.filter((symbol) => symbol.id !== action.payload),
        selectedSymbolId: state.selectedSymbolId === action.payload ? null : state.selectedSymbolId,
      };
    }

    case 'SELECT_SYMBOL': {
      return {
        ...state,
        selectedSymbolId: action.payload,
      };
    }

    case 'CLEAR_SYMBOLS': {
      return {
        ...state,
        symbols: [],
        selectedSymbolId: null,
        highestZIndex: 1,
      };
    }

    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    }

    case 'UPDATE_DIMENSIONS': {
      return {
        ...state,
        dimensions: action.payload,
      };
    }

    case 'SET_DRAG_OVER': {
      return {
        ...state,
        isDragOver: action.payload,
      };
    }

    case 'SET_HIGHLIGHTED_CELL': {
      return {
        ...state,
        highlightedCell: action.payload,
      };
    }

    default:
      return state;
  }
}

export function useSymbolGrid() {
  const [state, dispatch] = useReducer(gridReducer, initialState);

  // Memoized actions to prevent unnecessary re-renders
  const actions: GridActions = useMemo(
    () => ({
      addSymbol: (symbol: Omit<PositionedSymbol, 'id' | 'zIndex'>) => {
        dispatch({ type: 'ADD_SYMBOL', payload: symbol });
      },

      updateSymbol: (id: string, updates: Partial<PositionedSymbol>) => {
        dispatch({ type: 'UPDATE_SYMBOL', payload: { id, updates } });
      },

      removeSymbol: (id: string) => {
        dispatch({ type: 'REMOVE_SYMBOL', payload: id });
      },

      selectSymbol: (id: string | null) => {
        dispatch({ type: 'SELECT_SYMBOL', payload: id });
      },

      clearSymbols: () => {
        dispatch({ type: 'CLEAR_SYMBOLS' });
      },

      updateSettings: (settings: Partial<GridSettings>) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
      },

      updateDimensions: (dimensions: GridDimensions) => {
        dispatch({ type: 'UPDATE_DIMENSIONS', payload: dimensions });
      },

      setDragOver: (isDragOver: boolean) => {
        dispatch({ type: 'SET_DRAG_OVER', payload: isDragOver });
      },

      setHighlightedCell: (cell: { row: number; col: number } | null) => {
        dispatch({ type: 'SET_HIGHLIGHTED_CELL', payload: cell });
      },
    }),
    []
  );

  // Derived state calculations with memoization
  const derivedState = useMemo(() => ({
    hasSymbols: state.symbols.length > 0,
    canSearch: state.symbols.length > 0 && state.settings.isEnabled,
    selectedSymbol: state.symbols.find(s => s.id === state.selectedSymbolId) || null,
  }), [state.symbols, state.selectedSymbolId, state.settings.isEnabled]);

  // Coordinate transformation utilities
  const coordinateUtils = useMemo(() => ({
    // Transform grid coordinates to API format (1280x720)
    toApiCoordinates: (symbol: PositionedSymbol) => {
      const scaleX = 1280 / state.dimensions.width;
      const scaleY = 720 / state.dimensions.height;
      
      return {
        bbox: [
          (symbol.position.x - symbol.dimensions.width / 2) * scaleX,
          (symbol.position.y - symbol.dimensions.height / 2) * scaleY,
          (symbol.position.x + symbol.dimensions.width / 2) * scaleX,
          (symbol.position.y + symbol.dimensions.height / 2) * scaleY,
        ],
        class_name: symbol.symbol,
      };
    },

    // Check if position is within grid bounds
    isValidPosition: (x: number, y: number, symbolWidth = DEFAULT_SYMBOL_SIZE, symbolHeight = DEFAULT_SYMBOL_SIZE) => {
      return (
        x >= symbolWidth / 2 &&
        x <= state.dimensions.width - symbolWidth / 2 &&
        y >= symbolHeight / 2 &&
        y <= state.dimensions.height - symbolHeight / 2
      );
    },

    // Snap position to grid if grid is enabled
    snapToGrid: (x: number, y: number) => {
      if (!state.settings.showGrid) return { x, y };
      
      const { cellSize } = state.dimensions;
      return {
        x: Math.round(x / cellSize) * cellSize,
        y: Math.round(y / cellSize) * cellSize,
      };
    },
  }), [state.dimensions, state.settings.showGrid]);

  return {
    state,
    actions,
    ...derivedState,
    coordinateUtils,
  };
}