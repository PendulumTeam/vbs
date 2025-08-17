/**
 * Query Keys Factory for VBS Video Browser System
 * 
 * Provides type-safe, consistent query key generation for TanStack Query.
 * Organized hierarchically for efficient cache invalidation.
 * 
 * Key Structure:
 * ['files'] - Root namespace
 * ['files', 'tree'] - Tree structure queries
 * ['files', 'group', groupId] - Group-specific queries
 * ['files', 'video', groupId, videoId] - Video-specific queries
 * ['files', 'search'] - Search queries
 */

import { FileFilters } from './file-browser-types';

export const queryKeys = {
  // Root namespace for all file-related queries
  all: ['files'] as const,
  
  // Tree structure queries
  tree: {
    all: () => [...queryKeys.all, 'tree'] as const,
    list: (params?: {
      expand?: string[];
      limit?: number;
      sort?: string;
    }) => [...queryKeys.tree.all(), 'list', params] as const,
    stats: () => [...queryKeys.tree.all(), 'stats'] as const,
  },
  
  // Group-specific queries
  groups: {
    all: () => [...queryKeys.all, 'group'] as const,
    detail: (groupId: string, params?: {
      page?: number;
      limit?: number;
      sort?: string;
      includeFrames?: boolean;
    }) => [...queryKeys.groups.all(), groupId, params] as const,
    stats: (groupId: string) => [...queryKeys.groups.all(), groupId, 'stats'] as const,
  },
  
  // Video-specific queries
  videos: {
    all: () => [...queryKeys.all, 'video'] as const,
    detail: (groupId: string, videoId: string, params?: {
      page?: number;
      limit?: number;
      sort?: string;
      frameRange?: string;
    }) => [...queryKeys.videos.all(), groupId, videoId, params] as const,
    timeline: (groupId: string, videoId: string, intervals?: number) => 
      [...queryKeys.videos.all(), groupId, videoId, 'timeline', intervals] as const,
    frames: (groupId: string, videoId: string, page?: number) =>
      [...queryKeys.videos.all(), groupId, videoId, 'frames', page] as const,
  },
  
  // Search queries
  search: {
    all: () => [...queryKeys.all, 'search'] as const,
    results: (params: {
      query: string;
      scope?: 'all' | 'group' | 'video';
      filters?: FileFilters;
      limit?: number;
      page?: number;
    }) => [...queryKeys.search.all(), 'results', params] as const,
    suggestions: (query: string, limit?: number) => 
      [...queryKeys.search.all(), 'suggestions', { query, limit }] as const,
  },
  
  // Frame-specific queries (for individual frame operations)
  frames: {
    all: () => [...queryKeys.all, 'frame'] as const,
    detail: (frameId: string) => [...queryKeys.frames.all(), frameId] as const,
    metadata: (frameId: string) => [...queryKeys.frames.all(), frameId, 'metadata'] as const,
    similar: (frameId: string, limit?: number) => 
      [...queryKeys.frames.all(), frameId, 'similar', limit] as const,
  },
  
  // Statistics and analytics
  stats: {
    all: () => [...queryKeys.all, 'stats'] as const,
    overview: () => [...queryKeys.stats.all(), 'overview'] as const,
    usage: (timeRange?: string) => [...queryKeys.stats.all(), 'usage', timeRange] as const,
  },
} as const;

/**
 * Utility functions for working with query keys
 */
export const queryKeyUtils = {
  /**
   * Check if a query key matches a pattern
   */
  matches: (queryKey: readonly unknown[], pattern: readonly unknown[]): boolean => {
    if (pattern.length > queryKey.length) return false;
    
    return pattern.every((item, index) => {
      if (item === undefined) return true; // undefined matches any value
      return queryKey[index] === item;
    });
  },
  
  /**
   * Get all query keys that start with a given prefix
   */
  getKeysWithPrefix: (prefix: readonly unknown[]) => {
    return {
      queryKey: prefix,
      exact: false, // This will match all keys that start with the prefix
    };
  },
  
  /**
   * Create a query key for prefetching related data
   */
  getPrefetchKeys: (currentKey: readonly unknown[]) => {
    const keys = [];
    
    // If viewing a group, prefetch tree structure
    if (queryKeyUtils.matches(currentKey, queryKeys.groups.all())) {
      keys.push(queryKeys.tree.list());
    }
    
    // If viewing a video, prefetch group data
    if (queryKeyUtils.matches(currentKey, queryKeys.videos.all())) {
      const [, , , groupId] = currentKey;
      if (typeof groupId === 'string') {
        keys.push(queryKeys.groups.detail(groupId));
      }
    }
    
    return keys;
  },
  
  /**
   * Get related query keys for invalidation
   */
  getRelatedKeys: (mutationType: 'create' | 'update' | 'delete', entityType: 'group' | 'video' | 'frame', entityId?: string) => {
    const keys = [];
    
    // Always invalidate tree on any mutation
    keys.push(queryKeys.tree.all());
    keys.push(queryKeys.stats.all());
    
    switch (entityType) {
      case 'group':
        if (entityId) {
          keys.push(queryKeys.groups.detail(entityId));
          keys.push(queryKeys.groups.stats(entityId));
        }
        break;
        
      case 'video':
        if (entityId) {
          const [groupId, videoId] = entityId.split('_');
          if (groupId && videoId) {
            keys.push(queryKeys.videos.detail(groupId, videoId));
            keys.push(queryKeys.groups.detail(groupId));
          }
        }
        break;
        
      case 'frame':
        if (entityId) {
          keys.push(queryKeys.frames.detail(entityId));
          // Could also invalidate parent video/group if needed
        }
        break;
    }
    
    return keys;
  },
};

/**
 * Type-safe query key factories for specific use cases
 */
export type QueryKeyFactory = typeof queryKeys;
export type TreeQueryKey = ReturnType<typeof queryKeys.tree.list>;
export type GroupQueryKey = ReturnType<typeof queryKeys.groups.detail>;
export type VideoQueryKey = ReturnType<typeof queryKeys.videos.detail>;
export type SearchQueryKey = ReturnType<typeof queryKeys.search.results>;

/**
 * Query key predicates for type guards
 */
export const isTreeQueryKey = (key: readonly unknown[]): key is TreeQueryKey => {
  return queryKeyUtils.matches(key, queryKeys.tree.all());
};

export const isGroupQueryKey = (key: readonly unknown[]): key is GroupQueryKey => {
  return queryKeyUtils.matches(key, queryKeys.groups.all());
};

export const isVideoQueryKey = (key: readonly unknown[]): key is VideoQueryKey => {
  return queryKeyUtils.matches(key, queryKeys.videos.all());
};

export const isSearchQueryKey = (key: readonly unknown[]): key is SearchQueryKey => {
  return queryKeyUtils.matches(key, queryKeys.search.all());
};

// Type for QueryClient debug utilities
interface QueryClientDebug {
  getQueryCache(): {
    getAll(): Array<{
      queryKey: readonly unknown[];
      state: { 
        status: string; 
        dataUpdatedAt: number;
        data?: unknown;
      };
      isStale(): boolean;
    }>;
    findAll(filters: { queryKey?: readonly unknown[] }): unknown[];
  };
}

/**
 * Debug utilities for development
 */
export const debugQueryKeys = {
  /**
   * Log all active query keys
   */
  logActiveKeys: (queryClient: QueryClientDebug) => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    console.group('Active Query Keys');
    queries.forEach((query) => {
      console.log(query.queryKey, {
        state: query.state.status,
        dataUpdatedAt: new Date(query.state.dataUpdatedAt),
        stale: query.isStale(),
      });
    });
    console.groupEnd();
  },
  
  /**
   * Find queries matching a pattern
   */
  findQueries: (queryClient: QueryClientDebug, pattern: readonly unknown[]) => {
    const cache = queryClient.getQueryCache();
    return cache.findAll({ queryKey: pattern });
  },
  
  /**
   * Get cache statistics
   */
  getCacheStats: (queryClient: QueryClientDebug) => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const stats = {
      total: queries.length,
      fresh: queries.filter((q) => !q.isStale()).length,
      stale: queries.filter((q) => q.isStale()).length,
      loading: queries.filter((q) => q.state.status === 'pending').length,
      error: queries.filter((q) => q.state.status === 'error').length,
      success: queries.filter((q) => q.state.status === 'success').length,
      totalMemoryUsage: queries.reduce((acc: number, query) => {
        return acc + (JSON.stringify(query.state.data || {}).length);
      }, 0),
    };
    
    return stats;
  },
};