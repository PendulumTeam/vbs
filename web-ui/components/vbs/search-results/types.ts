// Type definitions for SearchResults feature

import type { SearchResult } from '@/services/api';

export interface VideoGroup {
  videoId: string;
  videoUrl: string;
  images: SearchResult[];
}

export interface ImageState {
  result: SearchResult;
  isLoading: boolean;
  hasError: boolean;
  isCached: boolean;
  localImageUrl?: string;
  googleDriveImageUrl?: string;
}

export interface SearchResultsState {
  groups: VideoGroup[];
  imageStates: Map<string, ImageState>;
  failedImageIds: Set<string>;
  focusedImageId: string | null;
  focusRefs: Record<string, HTMLDivElement>;
}

export interface SearchResultsActions {
  updateImageState: (imageId: string, updates: Partial<ImageState>) => void;
  setImageError: (imageId: string) => void;
  setImageLoaded: (imageId: string) => void;
  setFocusedImage: (imageId: string | null) => void;
  registerFocusRef: (imageId: string, ref: HTMLDivElement | null) => void;
  copyImageId: (imageId: string) => void;
}

export interface SearchResultsContextValue {
  state: SearchResultsState;
  actions: SearchResultsActions;
  derivedState: {
    hasResults: boolean;
    totalImages: number;
    totalVideos: number;
    loadingImages: number;
    errorImages: number;
  };
}

// Component prop types
export interface SearchResultsProps {
  results: SearchResult[];
  onMoreResults: (id: string) => void;
  focusId: string | null;
  className?: string;
}

export interface VideoGroupProps {
  group: VideoGroup;
  onMoreResults: (id: string) => void;
  className?: string;
}

export interface ImageResultProps {
  image: SearchResult;
  onMoreResults: (id: string) => void;
  className?: string;
}

export interface ImageActionsProps {
  image: SearchResult;
  onMoreResults: (id: string) => void;
  className?: string;
}

export interface LoadingStatesProps {
  count?: number;
  className?: string;
}

// Utility types
export interface CacheEntry {
  imageId: string;
  url: string;
  timestamp: number;
  type: 'local' | 'google-drive';
}

export interface FocusScrollOptions {
  behavior: 'smooth' | 'instant';
  block: 'start' | 'center' | 'end' | 'nearest';
  inline: 'start' | 'center' | 'end' | 'nearest';
}