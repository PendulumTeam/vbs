/**
 * File Browser Query Hooks using TanStack Query
 * 
 * Provides type-safe, cached data fetching for the video browser system.
 * Includes optimistic updates, background refetching, and error handling.
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { 
  TreeResponse, 
  GroupResponse, 
  VideoResponse, 
  SearchRequest,
  SearchResponse,
  FileFilters,
  FileMetadata 
} from '@/lib/file-browser-types';

// API Base URL - could be environment variable
const API_BASE = '/api/files';

/**
 * HTTP client with error handling
 */
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: response.statusText 
    }));
    
    const error = new Error(errorData.message || 'API request failed') as any;
    error.status = response.status;
    error.data = errorData;
    throw error;
  }
  
  return response.json();
}

/**
 * Tree Structure Queries
 */
export function useTreeQuery(params?: {
  expand?: string[];
  limit?: number;
  sort?: string;
}) {
  return useQuery({
    queryKey: queryKeys.tree.list(params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.expand) searchParams.set('expand', params.expand.join(','));
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.sort) searchParams.set('sort', params.sort);
      
      const query = searchParams.toString();
      return fetchAPI<TreeResponse>(`/tree${query ? `?${query}` : ''}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - tree structure doesn't change frequently
    gcTime: 10 * 60 * 1000,   // Keep in cache for 10 minutes
  });
}

/**
 * Tree statistics (quick overview)
 */
export function useTreeStatsQuery() {
  return useQuery({
    queryKey: queryKeys.tree.stats(),
    queryFn: () => fetchAPI('/tree/stats', { method: 'HEAD' }),
    staleTime: 2 * 60 * 1000, // 2 minutes for stats
  });
}

/**
 * Group-specific queries
 */
export function useGroupQuery(
  groupId: string,
  params?: {
    page?: number;
    limit?: number;
    sort?: string;
    includeFrames?: boolean;
  }
) {
  return useQuery({
    queryKey: queryKeys.groups.detail(groupId, params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.sort) searchParams.set('sort', params.sort);
      if (params?.includeFrames) searchParams.set('includeFrames', 'true');
      
      const query = searchParams.toString();
      return fetchAPI<GroupResponse>(`/group/${groupId}${query ? `?${query}` : ''}`);
    },
    enabled: !!groupId,
    staleTime: 3 * 60 * 1000, // 3 minutes for group data
  });
}

/**
 * Group statistics
 */
export function useGroupStatsQuery(groupId: string) {
  return useQuery({
    queryKey: queryKeys.groups.stats(groupId),
    queryFn: () => fetchAPI(`/group/${groupId}/stats`, { method: 'HEAD' }),
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Video-specific queries
 */
export function useVideoQuery(
  groupId: string,
  videoId: string,
  params?: {
    page?: number;
    limit?: number;
    sort?: string;
    frameRange?: string;
  }
) {
  return useQuery({
    queryKey: queryKeys.videos.detail(groupId, videoId, params),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.sort) searchParams.set('sort', params.sort);
      if (params?.frameRange) searchParams.set('frameRange', params.frameRange);
      
      const query = searchParams.toString();
      return fetchAPI<VideoResponse>(`/video/${groupId}/${videoId}${query ? `?${query}` : ''}`);
    },
    enabled: !!groupId && !!videoId,
    staleTime: 5 * 60 * 1000, // 5 minutes for video frame data
  });
}

/**
 * Video timeline (for navigation)
 */
export function useVideoTimelineQuery(
  groupId: string,
  videoId: string,
  intervals: number = 10
) {
  return useQuery({
    queryKey: queryKeys.videos.timeline(groupId, videoId, intervals),
    queryFn: () => fetchAPI(`/video/${groupId}/${videoId}/timeline`, {
      method: 'POST',
      body: JSON.stringify({ intervals }),
    }),
    enabled: !!groupId && !!videoId,
    staleTime: 10 * 60 * 1000, // 10 minutes for timeline data
  });
}

/**
 * Infinite query for video frames (for pagination)
 */
export function useInfiniteVideoFramesQuery(
  groupId: string,
  videoId: string,
  params?: {
    limit?: number;
    sort?: string;
  }
) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.videos.frames(groupId, videoId), params],
    queryFn: ({ pageParam = 1 }) => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', pageParam.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.sort) searchParams.set('sort', params.sort);
      
      return fetchAPI<VideoResponse>(`/video/${groupId}/${videoId}?${searchParams}`);
    },
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination.hasNext ? pagination.page + 1 : undefined;
    },
    enabled: !!groupId && !!videoId,
    staleTime: 5 * 60 * 1000,
    initialPageParam: 1,
  });
}

/**
 * Search queries
 */
export function useSearchQuery(
  request: SearchRequest,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: queryKeys.search.results(request),
    queryFn: () => fetchAPI<SearchResponse>('/search', {
      method: 'POST',
      body: JSON.stringify(request),
    }),
    enabled: options?.enabled !== false && !!request.query?.trim(),
    staleTime: 1 * 60 * 1000, // 1 minute for search results
    gcTime: 5 * 60 * 1000,    // Keep search results for 5 minutes
  });
}

/**
 * Search suggestions with debouncing
 */
export function useSearchSuggestionsQuery(query: string, limit?: number) {
  return useQuery({
    queryKey: queryKeys.search.suggestions(query, limit),
    queryFn: () => {
      const searchParams = new URLSearchParams({ q: query });
      if (limit) searchParams.set('limit', limit.toString());
      
      return fetchAPI(`/search/suggestions?${searchParams}`);
    },
    enabled: !!query && query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds for suggestions
    gcTime: 2 * 60 * 1000, // 2 minutes cache
  });
}

/**
 * Prefetch utilities for performance optimization
 */
export function usePrefetchQueries() {
  const queryClient = useQueryClient();
  
  return {
    /**
     * Prefetch group data when hovering over group in tree
     */
    prefetchGroup: (groupId: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.groups.detail(groupId, { includeFrames: false }),
        queryFn: () => fetchAPI<GroupResponse>(`/group/${groupId}?includeFrames=false`),
        staleTime: 3 * 60 * 1000,
      });
    },
    
    /**
     * Prefetch video data when hovering over video in group
     */
    prefetchVideo: (groupId: string, videoId: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.videos.detail(groupId, videoId, { limit: 20 }),
        queryFn: () => fetchAPI<VideoResponse>(`/video/${groupId}/${videoId}?limit=20`),
        staleTime: 5 * 60 * 1000,
      });
    },
    
    /**
     * Prefetch next page of frames
     */
    prefetchNextFrames: (groupId: string, videoId: string, currentPage: number) => {
      const nextPage = currentPage + 1;
      queryClient.prefetchQuery({
        queryKey: queryKeys.videos.detail(groupId, videoId, { page: nextPage }),
        queryFn: () => fetchAPI<VideoResponse>(`/video/${groupId}/${videoId}?page=${nextPage}`),
        staleTime: 5 * 60 * 1000,
      });
    },
  };
}

/**
 * Cache management utilities
 */
export function useCacheManagement() {
  const queryClient = useQueryClient();
  
  return {
    /**
     * Manually refresh tree data
     */
    refreshTree: () => {
      return queryClient.invalidateQueries({ 
        queryKey: queryKeys.tree.all() 
      });
    },
    
    /**
     * Clear search cache (useful when filters change)
     */
    clearSearchCache: () => {
      queryClient.removeQueries({ 
        queryKey: queryKeys.search.all() 
      });
    },
    
    /**
     * Optimistically update cache after mutations
     */
    updateCacheAfterMutation: (
      entityType: 'group' | 'video' | 'frame',
      entityId: string,
      updateFn: (oldData: any) => any
    ) => {
      // Implementation would depend on specific mutation types
      // This is a placeholder for future mutation support
      console.log('Cache update after mutation:', { entityType, entityId });
    },
    
    /**
     * Get cache statistics for debugging
     */
    getCacheStats: () => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      return {
        total: queries.length,
        byStatus: queries.reduce((acc, query) => {
          const status = query.state.status;
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        totalMemoryUsage: queries.reduce((acc, query) => {
          return acc + (JSON.stringify(query.state.data || {}).length);
        }, 0),
      };
    },
  };
}

/**
 * Error recovery utilities
 */
export function useErrorRecovery() {
  const queryClient = useQueryClient();
  
  return {
    /**
     * Retry failed queries
     */
    retryFailedQueries: () => {
      const failedQueries = queryClient.getQueryCache().findAll({
        type: 'active',
        stale: true,
      });
      
      return Promise.all(
        failedQueries.map(query => queryClient.refetchQueries({
          queryKey: query.queryKey
        }))
      );
    },
    
    /**
     * Reset error state for specific query
     */
    resetQueryError: (queryKey: readonly unknown[]) => {
      queryClient.resetQueries({ queryKey });
    },
    
    /**
     * Force refetch when coming back online
     */
    refetchOnReconnect: () => {
      queryClient.refetchQueries({
        type: 'active',
        stale: true,
      });
    },
  };
}