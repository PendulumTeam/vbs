/**
 * Progressive File Browser Query Hooks - Three-Tier Loading Architecture
 * 
 * Tier 1: Groups Overview (always fast)
 * Tier 2: Group Videos (on-demand)
 * Tier 3: Video Frames (lazy loaded with pagination)
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';

// Updated query keys for progressive loading
export const progressiveQueryKeys = {
  // Tier 1: Groups overview
  groups: {
    all: () => ['files', 'groups'] as const,
    list: (params?: { sort?: string; limit?: number }) => 
      [...progressiveQueryKeys.groups.all(), 'list', params] as const,
  },
  
  // Tier 2: Videos for specific group  
  groupVideos: {
    all: () => ['files', 'group-videos'] as const,
    byGroup: (groupId: string, params?: { sort?: string; includeSample?: boolean }) =>
      [...progressiveQueryKeys.groupVideos.all(), groupId, params] as const,
  },
  
  // Tier 3: Frames for specific video
  videoFrames: {
    all: () => ['files', 'video-frames'] as const,
    byVideo: (groupId: string, videoId: string, params?: { 
      page?: number; 
      limit?: number; 
      sort?: string; 
    }) => [...progressiveQueryKeys.videoFrames.all(), groupId, videoId, params] as const,
    stats: (groupId: string, videoId: string) =>
      [...progressiveQueryKeys.videoFrames.all(), groupId, videoId, 'stats'] as const,
  },
} as const;

// Response types for new API structure
interface GroupSummary {
  id: string;
  name: string;
  videoCount: number;
  totalFrames: number;
  totalSize: number;
  dateRange: {
    start: string;
    end: string;
  };
}

interface GroupsResponse {
  groups: GroupSummary[];
  totalGroups: number;
  totalVideos: number;
  totalFrames: number;
  totalSize: number;
}

interface VideoSummary {
  id: string;
  name: string;
  frameCount: number;
  totalSize: number;
  averageFrameSize: number;
  dateRange: {
    start: string;
    end: string;
  };
  sampleFrame?: {
    s3_key: string;
    public_url: string;
  };
}

interface GroupVideosResponse {
  group: {
    id: string;
    name: string;
  };
  videos: VideoSummary[];
  totalVideos: number;
  totalFrames: number;
  totalSize: number;
}

interface FrameData {
  id: string;
  name: string;
  frameNumber: number;
  url: string;
  fileSize: number;
  uploadDate: string;
  s3Key: string;
  fileHash: string;
}

interface VideoFramesResponse {
  video: {
    groupId: string;
    videoId: string;
    name: string;
  };
  frames: FrameData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Tier 1: Groups Overview Query (Always Fast - <500ms)
 * Load all groups with basic metadata, no frame data
 */
export function useGroupsQuery(params?: {
  sort?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: progressiveQueryKeys.groups.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.sort) searchParams.set('sort', params.sort);
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      
      const response = await fetch(`/api/files/groups?${searchParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch groups: ${response.statusText}`);
      }
      
      return response.json() as Promise<GroupsResponse>;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - groups structure rarely changes
    gcTime: 60 * 60 * 1000,    // 1 hour in cache
  });
}

/**
 * Tier 2: Group Videos Query (On-Demand - <200ms)
 * Load videos for specific group when expanded
 */
export function useGroupVideosQuery(
  groupId: string,
  params?: {
    sort?: string;
    includeSample?: boolean;
  },
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: progressiveQueryKeys.groupVideos.byGroup(groupId, params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.sort) searchParams.set('sort', params.sort);
      if (params?.includeSample) searchParams.set('includeSample', 'true');
      
      const response = await fetch(`/api/files/groups/${groupId}/videos?${searchParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch videos for group ${groupId}: ${response.statusText}`);
      }
      
      return response.json() as Promise<GroupVideosResponse>;
    },
    enabled: options?.enabled !== false && !!groupId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000,    // 20 minutes in cache
  });
}

/**
 * Tier 3: Video Frames Query (Lazy Loaded - <300ms)
 * Load actual frame data with pagination when video expanded
 */
export function useVideoFramesQuery(
  groupId: string,
  videoId: string,
  params?: {
    page?: number;
    limit?: number;
    sort?: string;
  },
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: progressiveQueryKeys.videoFrames.byVideo(groupId, videoId, params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.sort) searchParams.set('sort', params.sort);
      
      const response = await fetch(
        `/api/files/groups/${groupId}/videos/${videoId}/frames?${searchParams}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch frames for ${groupId}_${videoId}: ${response.statusText}`);
      }
      
      return response.json() as Promise<VideoFramesResponse>;
    },
    enabled: options?.enabled !== false && !!groupId && !!videoId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes in cache
  });
}

/**
 * Video statistics (quick metadata without frame loading)
 */
export function useVideoStatsQuery(
  groupId: string,
  videoId: string,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: progressiveQueryKeys.videoFrames.stats(groupId, videoId),
    queryFn: async () => {
      const response = await fetch(
        `/api/files/groups/${groupId}/videos/${videoId}/frames/stats`,
        { method: 'HEAD' }
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch stats for ${groupId}_${videoId}: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: options?.enabled !== false && !!groupId && !!videoId,
    staleTime: 10 * 60 * 1000, // 10 minutes for stats
  });
}

/**
 * Prefetch utilities for smooth UX
 */
export function useProgressivePrefetch() {
  const queryClient = useQueryClient();
  
  return {
    /**
     * Prefetch group videos when hovering over group
     */
    prefetchGroupVideos: (groupId: string) => {
      queryClient.prefetchQuery({
        queryKey: progressiveQueryKeys.groupVideos.byGroup(groupId, { includeSample: true }),
        queryFn: async () => {
          const response = await fetch(`/api/files/groups/${groupId}/videos?includeSample=true`);
          return response.json();
        },
        staleTime: 10 * 60 * 1000,
      });
    },
    
    /**
     * Prefetch first page of frames when hovering over video
     */
    prefetchVideoFrames: (groupId: string, videoId: string) => {
      queryClient.prefetchQuery({
        queryKey: progressiveQueryKeys.videoFrames.byVideo(groupId, videoId, { page: 1, limit: 50 }),
        queryFn: async () => {
          const response = await fetch(`/api/files/groups/${groupId}/videos/${videoId}/frames?page=1&limit=50`);
          return response.json();
        },
        staleTime: 5 * 60 * 1000,
      });
    },
  };
}

/**
 * Cache management for progressive loading
 */
export function useProgressiveCacheManagement() {
  const queryClient = useQueryClient();
  
  return {
    /**
     * Invalidate group cache when videos are modified
     */
    invalidateGroup: (groupId: string) => {
      // Invalidate both groups overview and specific group videos
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: progressiveQueryKeys.groups.all() }),
        queryClient.invalidateQueries({ queryKey: progressiveQueryKeys.groupVideos.byGroup(groupId) }),
      ]);
    },
    
    /**
     * Invalidate video cache when frames are modified
     */
    invalidateVideo: (groupId: string, videoId: string) => {
      // Invalidate video frames and parent group
      return Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: progressiveQueryKeys.videoFrames.byVideo(groupId, videoId) 
        }),
        queryClient.invalidateQueries({ 
          queryKey: progressiveQueryKeys.groupVideos.byGroup(groupId) 
        }),
      ]);
    },
    
    /**
     * Clear all caches (memory management)
     */
    clearAllCaches: () => {
      queryClient.clear();
    },
  };
}

// Export types for components
export type {
  GroupSummary,
  GroupsResponse,
  VideoSummary,
  GroupVideosResponse,
  FrameData,
  VideoFramesResponse,
};