// Direct API client for VBS backend

import type { 
  BackendResponse, 
  SearchParams, 
  NeighborParams, 
  VideoParams 
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class APIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new APIError(`Request failed: ${response.statusText}`, response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// API Functions

export async function searchText(params: SearchParams): Promise<BackendResponse> {
  return fetchAPI<BackendResponse>('/search', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function searchNeighbors(params: NeighborParams): Promise<BackendResponse> {
  return fetchAPI<BackendResponse>('/neighbors', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getFramesByIds(frame_ids: string[]): Promise<BackendResponse> {
  return fetchAPI<BackendResponse>('/frames', {
    method: 'POST',
    body: JSON.stringify({ frame_ids }),
  });
}

export async function getVideoFrames(params: VideoParams): Promise<BackendResponse> {
  return fetchAPI<BackendResponse>('/video-frames', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getVideoList(): Promise<{ videos: Array<{ l: string; v: string; frame_count: number }> }> {
  return fetchAPI<{ videos: Array<{ l: string; v: string; frame_count: number }> }>('/video-list');
}

export async function checkHealth(): Promise<{ status: string; database: string; search_engine: any }> {
  return fetchAPI<{ status: string; database: string; search_engine: any }>('/health');
}