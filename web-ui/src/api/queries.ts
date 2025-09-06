// TanStack Query hooks for VBS API

import { useQuery } from '@tanstack/react-query';
import {
  searchText,
  searchNeighbors,
  getFramesByIds,
  getVideoFrames,
  getVideoList,
  checkHealth,
} from "./client";
import type { SearchResult, BackendFrame } from "./types";


/**
 * Transform backend frame to frontend SearchResult format
 */
function transformBackendFrame(frame: BackendFrame): SearchResult {
  try {
    // Use the backend's image_id field (contains frame_n), with fallbacks
    const imageId = frame.image_id || frame.frame_n || frame.s3_key;

    // Extract frame number - try from frame_idx first, then parse from s3_key
    let frameNumber = 0;
    if (frame.frame_idx !== undefined) {
      frameNumber = frame.frame_idx;
    } else {
      const parts = frame.s3_key.split("_");
      frameNumber = parseInt(parts[2]) || 0;
    }

    return {
      image_id: imageId,
      link: frame.public_url, // Direct CDN URL
      score: frame.score || 1.0,
      frame_stamp: frameNumber,
      watch_url: frame.watch_url || "", // Use backend-provided timestamped YouTube URL
      ocr_text: frame.ocr_text,
      video_fps: frame.video_fps,
    };
  } catch (error) {
    console.warn(`Failed to transform frame: ${frame.s3_key}`, error);
    return {
      image_id: frame.image_id || frame.frame_n || frame.s3_key,
      link: frame.public_url,
      score: 1.0,
      frame_stamp: 0,
      watch_url: "",
      ocr_text: undefined,
      video_fps: undefined,
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

export function useNeighborSearch(frameId: string, limit: number = 20) {
  return useQuery({
    queryKey: ["neighbors", frameId, limit],
    queryFn: async () => {
      // Convert frame_n format to s3_key format for API compatibility
      const response = await searchNeighbors({ frame_id: frameId, limit });
      return response.frames.map(transformBackendFrame);
    },
    enabled: !!frameId,
    staleTime: 10 * 60 * 1000, // 10 minutes (neighbors don't change often)
  });
}

export function useFramesByIds(frame_ids: string[]) {
  return useQuery({
    queryKey: ["frames-by-ids", frame_ids],
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
    queryKey: ["video-frames", l, v, limit],
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
    queryKey: ["video-list"],
    queryFn: getVideoList,
    staleTime: 30 * 60 * 1000, // 30 minutes (video list changes rarely)
  });
}

export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: checkHealth,
    refetchInterval: 30 * 1000, // Check every 30 seconds
    retry: false, // Don't retry health checks
  });
}
