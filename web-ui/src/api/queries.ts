// TanStack Query hooks for VBS API

import { useQuery } from '@tanstack/react-query';
import { 
  searchText, 
  searchNeighbors, 
  getFramesByIds, 
  getVideoFrames, 
  getVideoList,
  checkHealth 
} from './client';
import type { SearchResult } from './types';

/**
 * Transform backend frame to frontend SearchResult format
 */
function transformBackendFrame(frame: any): SearchResult {
  try {
    const parts = frame.s3_key.split('_');
    const frameNumber = parseInt(parts[2]);
    const videoId = `${parts[0]}_${parts[1]}`;
    
    return {
      image_id: frame.s3_key,
      link: frame.public_url, // Direct CDN URL
      score: frame.score || 1.0,
      frame_stamp: frameNumber,
      watch_url: `https://youtube.com/watch?v=${videoId}`,
      ocr_text: frame.ocr_text
    };
  } catch (error) {
    console.warn(`Failed to transform frame: ${frame.s3_key}`, error);
    return {
      image_id: frame.s3_key,
      link: frame.public_url,
      score: 1.0,
      frame_stamp: 0,
      watch_url: '',
      ocr_text: undefined
    };
  }
}

// Query Hooks

export function useSearchText(query: string, limit: number = 20) {
  return useQuery({
    queryKey: ['search-text', query, limit],
    queryFn: async () => {
      const response = await searchText({ query, limit });
      return response.frames.map(transformBackendFrame);
    },
    enabled: !!query.trim(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useNeighborSearch(s3_key: string, limit: number = 20) {
  return useQuery({
    queryKey: ['neighbors', s3_key, limit],
    queryFn: async () => {
      const response = await searchNeighbors({ s3_key, limit });
      return response.frames.map(transformBackendFrame);
    },
    enabled: !!s3_key,
    staleTime: 10 * 60 * 1000, // 10 minutes (neighbors don't change often)
  });
}

export function useFramesByIds(frame_ids: string[]) {
  return useQuery({
    queryKey: ['frames-by-ids', frame_ids],
    queryFn: async () => {
      const response = await getFramesByIds(frame_ids);
      return response.frames.map(transformBackendFrame);
    },
    enabled: frame_ids.length > 0,
    staleTime: 15 * 60 * 1000, // 15 minutes (frame data doesn't change)
  });
}

export function useVideoFrames(l: string, v: string, limit: number = 100) {
  return useQuery({
    queryKey: ['video-frames', l, v, limit],
    queryFn: async () => {
      const response = await getVideoFrames({ l, v, limit });
      return response.frames.map(transformBackendFrame);
    },
    enabled: !!(l && v),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

export function useVideoList() {
  return useQuery({
    queryKey: ['video-list'],
    queryFn: getVideoList,
    staleTime: 30 * 60 * 1000, // 30 minutes (video list changes rarely)
  });
}

export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
    refetchInterval: 30 * 1000, // Check every 30 seconds
    retry: false, // Don't retry health checks
  });
}