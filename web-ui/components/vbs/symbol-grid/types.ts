// Type definitions for SymbolGrid feature

export interface PositionedSymbol {
  id: string;
  symbol: string;
  position: {
    x: number;
    y: number;
  };
  dimensions: {
    width: number;
    height: number;
  };
  rotation: number;
  zIndex: number;
  src: string;
}

export interface GridDimensions {
  width: number;
  height: number;
  cellSize: number;
}

export interface GridSettings {
  showGrid: boolean;
  searchLogic: 'AND' | 'OR';
  isEnabled: boolean;
}

export interface GridState {
  symbols: PositionedSymbol[];
  settings: GridSettings;
  dimensions: GridDimensions;
  selectedSymbolId: string | null;
  highestZIndex: number;
  isDragOver: boolean;
  highlightedCell: {
    row: number;
    col: number;
  } | null;
}

export interface GridActions {
  addSymbol: (symbol: Omit<PositionedSymbol, 'id' | 'zIndex'>) => void;
  updateSymbol: (id: string, updates: Partial<PositionedSymbol>) => void;
  removeSymbol: (id: string) => void;
  selectSymbol: (id: string | null) => void;
  clearSymbols: () => void;
  updateSettings: (settings: Partial<GridSettings>) => void;
  updateDimensions: (dimensions: GridDimensions) => void;
  setDragOver: (isDragOver: boolean) => void;
  setHighlightedCell: (cell: { row: number; col: number } | null) => void;
}

export interface SymbolGridContextValue {
  state: GridState;
  actions: GridActions;
  hasSymbols: boolean;
  canSearch: boolean;
  selectedSymbol: PositionedSymbol | null;
  coordinateUtils: {
    toApiCoordinates: (symbol: PositionedSymbol) => SearchObject;
    isValidPosition: (x: number, y: number, symbolWidth?: number, symbolHeight?: number) => boolean;
    snapToGrid: (x: number, y: number) => { x: number; y: number };
  };
}

// API-related types
export interface SearchObject {
  class_name: string;
  bbox: number[];
}

export interface VisualSearchParams {
  objectList: SearchObject[];
  logic: 'AND' | 'OR';
}

// Component prop types
export interface SymbolPaletteProps {
  className?: string;
}

export interface GridControlsProps {
  className?: string;
}

export interface CanvasGridProps {
  className?: string;
}

export interface PlacedSymbolProps {
  symbol: PositionedSymbol;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<PositionedSymbol>) => void;
}

export interface SearchActionsProps {
  onSearch: (params: VisualSearchParams) => Promise<void>;
  className?: string;
}

// Constants
export const GRID_SIZE = 8;
export const DEFAULT_SYMBOL_SIZE = 50;
export const TARGET_CANVAS_WIDTH = 1280;
export const TARGET_CANVAS_HEIGHT = 720;