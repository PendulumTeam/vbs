'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

/**
 * TanStack Query Provider for VBS Video Browser System
 *
 * Features:
 * - Optimized for video frame metadata caching
 * - Next.js SSR-safe with client-side initialization
 * - Error handling and retry logic
 * - DevTools integration for development
 */

// Create a stable QueryClient factory function
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache settings optimized for video metadata
        staleTime: 5 * 60 * 1000, // 5 minutes - metadata doesn't change frequently
        gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory longer (was cacheTime in v4)

        // Network settings
        retry: (failureCount, error: unknown) => {
          // Don't retry on 4xx errors (client errors)
          const httpError = error as { status?: number };
          if (httpError?.status && httpError.status >= 400 && httpError.status < 500) {
            return false;
          }
          // Retry up to 3 times for network/server errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // UI behavior
        refetchOnWindowFocus: false, // Don't refetch when window gets focus
        refetchOnReconnect: true,    // Do refetch when network reconnects
        refetchOnMount: true,        // Refetch when component mounts if data is stale

        // Error handling
        throwOnError: false, // Handle errors in components rather than throwing
      },
      mutations: {
        // Retry mutations more conservatively
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create QueryClient instance only once per app lifecycle
  // This prevents hydration mismatches between server and client
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show DevTools only in development and if available */}
      {process.env.NODE_ENV === 'development' && ReactQueryDevtools && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="left"
        />
      )}
    </QueryClientProvider>
  );
}

/**
 * Utility function to invalidate related queries
 * Used when mutations affect multiple query results
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return {
    // Invalidate all tree-related queries
    invalidateTree: () => queryClient.invalidateQueries({
      queryKey: ['files', 'tree']
    }),

    // Invalidate specific group queries
    invalidateGroup: (groupId: string) => queryClient.invalidateQueries({
      queryKey: ['files', 'group', groupId]
    }),

    // Invalidate specific video queries
    invalidateVideo: (groupId: string, videoId: string) => queryClient.invalidateQueries({
      queryKey: ['files', 'video', groupId, videoId]
    }),

    // Invalidate all search queries
    invalidateSearch: () => queryClient.invalidateQueries({
      queryKey: ['files', 'search']
    }),

    // Invalidate everything (nuclear option)
    invalidateAll: () => queryClient.invalidateQueries(),

    // Clear all caches (for memory management)
    clearAll: () => queryClient.clear(),
  };
}

/**
 * Query client configuration for server-side rendering
 * Used in app router layouts or pages that need SSR
 */
export function createSSRQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Never refetch during SSR
        staleTime: Infinity,
        gcTime: Infinity,
      },
    },
  });
}
