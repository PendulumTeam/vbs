/**
 * URL State Management Hook
 * 
 * Manages browser URL to preserve user navigation context
 * Enables bookmark/refresh/share functionality for specific browse states
 */

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect } from 'react';

interface UrlState {
  group?: string;
  video?: string;
  page?: number;
  view?: 'grid' | 'list';
  size?: 'small' | 'medium' | 'large';
  limit?: number;
}

export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current URL state
  const getCurrentState = useCallback((): UrlState => {
    return {
      group: searchParams.get('group') || undefined,
      video: searchParams.get('video') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined,
      view: (searchParams.get('view') as 'grid' | 'list') || undefined,
      size: (searchParams.get('size') as 'small' | 'medium' | 'large') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
    };
  }, [searchParams]);

  // Update URL with new state
  const updateUrlState = useCallback((updates: Partial<UrlState>) => {
    const currentState = getCurrentState();
    const newState = { ...currentState, ...updates };

    // Build new search params
    const newSearchParams = new URLSearchParams();
    
    if (newState.group) newSearchParams.set('group', newState.group);
    if (newState.video) newSearchParams.set('video', newState.video);
    if (newState.page && newState.page > 1) newSearchParams.set('page', newState.page.toString());
    if (newState.view && newState.view !== 'grid') newSearchParams.set('view', newState.view);
    if (newState.size && newState.size !== 'medium') newSearchParams.set('size', newState.size);
    if (newState.limit && newState.limit !== 50) newSearchParams.set('limit', newState.limit.toString());

    // Update URL without page reload
    const newUrl = `${pathname}?${newSearchParams.toString()}`;
    router.replace(newUrl);
  }, [getCurrentState, pathname, router]);

  // Clear specific state parts
  const clearGroup = useCallback(() => {
    updateUrlState({ group: undefined, video: undefined, page: undefined });
  }, [updateUrlState]);

  const clearVideo = useCallback(() => {
    updateUrlState({ video: undefined, page: undefined });
  }, [updateUrlState]);

  const clearPage = useCallback(() => {
    updateUrlState({ page: undefined });
  }, [updateUrlState]);

  // Navigation helpers
  const navigateToGroup = useCallback((groupId: string) => {
    updateUrlState({ 
      group: groupId, 
      video: undefined, 
      page: undefined 
    });
  }, [updateUrlState]);

  const navigateToVideo = useCallback((groupId: string, videoId: string) => {
    updateUrlState({ 
      group: groupId, 
      video: videoId, 
      page: 1 // Reset to first page when changing video
    });
  }, [updateUrlState]);

  const navigateToPage = useCallback((page: number) => {
    updateUrlState({ page: page > 1 ? page : undefined });
  }, [updateUrlState]);

  // View preference helpers
  const setViewMode = useCallback((view: 'grid' | 'list') => {
    updateUrlState({ view: view !== 'grid' ? view : undefined });
  }, [updateUrlState]);

  const setThumbnailSize = useCallback((size: 'small' | 'medium' | 'large') => {
    updateUrlState({ size: size !== 'medium' ? size : undefined });
  }, [updateUrlState]);

  const setFramesPerPage = useCallback((limit: number) => {
    updateUrlState({ 
      limit: limit !== 50 ? limit : undefined,
      page: 1 // Reset to first page when changing page size
    });
  }, [updateUrlState]);

  // Get current state values
  const state = getCurrentState();

  return {
    // Current state
    state,
    
    // Navigation actions
    navigateToGroup,
    navigateToVideo,
    navigateToPage,
    
    // Clear actions
    clearGroup,
    clearVideo,
    clearPage,
    
    // View actions
    setViewMode,
    setThumbnailSize,
    setFramesPerPage,
    
    // Direct update
    updateState: updateUrlState,
  };
}

/**
 * Hook to sync URL state with component state
 * Used in the file browser provider
 */
export function useUrlSync() {
  const urlState = useUrlState();
  
  // Create shareable URL for current state
  const getShareableUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return window.location.href;
  }, []);

  // Parse URL on component mount to restore state
  const getInitialState = useCallback(() => {
    return urlState.state;
  }, [urlState.state]);

  return {
    urlState: urlState.state,
    updateUrl: urlState.updateState,
    navigateToGroup: urlState.navigateToGroup,
    navigateToVideo: urlState.navigateToVideo,
    navigateToPage: urlState.navigateToPage,
    setViewMode: urlState.setViewMode,
    setThumbnailSize: urlState.setThumbnailSize,
    setFramesPerPage: urlState.setFramesPerPage,
    clearGroup: urlState.clearGroup,
    clearVideo: urlState.clearVideo,
    getShareableUrl,
    getInitialState,
  };
}