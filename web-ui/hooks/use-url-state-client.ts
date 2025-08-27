'use client';

/**
 * Client-side URL State Management Hook
 * Wraps useSearchParams with proper client-side handling for Next.js 15
 */

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, Suspense } from 'react';

interface UrlState {
  group?: string;
  video?: string;
  page?: number;
  view?: 'grid' | 'list';
  size?: 'small' | 'medium' | 'large';
  limit?: number;
}

// Internal hook that uses useSearchParams (must be wrapped in Suspense)
function useSearchParamsInternal() {
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
    const newUrl = `${pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`;
    router.replace(newUrl);
  }, [getCurrentState, pathname, router]);

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
      page: 1 
    });
  }, [updateUrlState]);

  const navigateToPage = useCallback((page: number) => {
    updateUrlState({ page: page > 1 ? page : undefined });
  }, [updateUrlState]);

  const setViewMode = useCallback((view: 'grid' | 'list') => {
    updateUrlState({ view: view !== 'grid' ? view : undefined });
  }, [updateUrlState]);

  const setThumbnailSize = useCallback((size: 'small' | 'medium' | 'large') => {
    updateUrlState({ size: size !== 'medium' ? size : undefined });
  }, [updateUrlState]);

  const setFramesPerPage = useCallback((limit: number) => {
    updateUrlState({ 
      limit: limit !== 50 ? limit : undefined,
      page: 1 
    });
  }, [updateUrlState]);

  return {
    state: getCurrentState(),
    updateState: updateUrlState,
    navigateToGroup,
    navigateToVideo,
    navigateToPage,
    setViewMode,
    setThumbnailSize,
    setFramesPerPage,
  };
}

// Safe wrapper that handles the Suspense requirement
export function useUrlState() {
  try {
    return useSearchParamsInternal();
  } catch (error) {
    // Fallback state when useSearchParams fails (during SSR)
    const router = useRouter();
    const pathname = usePathname();
    
    const fallbackState: UrlState = {};
    
    const updateUrlState = useCallback((updates: Partial<UrlState>) => {
      const newSearchParams = new URLSearchParams();
      
      if (updates.group) newSearchParams.set('group', updates.group);
      if (updates.video) newSearchParams.set('video', updates.video);
      if (updates.page && updates.page > 1) newSearchParams.set('page', updates.page.toString());
      if (updates.view && updates.view !== 'grid') newSearchParams.set('view', updates.view);
      if (updates.size && updates.size !== 'medium') newSearchParams.set('size', updates.size);
      if (updates.limit && updates.limit !== 50) newSearchParams.set('limit', updates.limit.toString());

      const newUrl = `${pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`;
      router.replace(newUrl);
    }, [pathname, router]);

    return {
      state: fallbackState,
      updateState: updateUrlState,
      navigateToGroup: (groupId: string) => updateUrlState({ group: groupId }),
      navigateToVideo: (groupId: string, videoId: string) => updateUrlState({ group: groupId, video: videoId }),
      navigateToPage: (page: number) => updateUrlState({ page }),
      setViewMode: (view: 'grid' | 'list') => updateUrlState({ view }),
      setThumbnailSize: (size: 'small' | 'medium' | 'large') => updateUrlState({ size }),
      setFramesPerPage: (limit: number) => updateUrlState({ limit }),
    };
  }
}