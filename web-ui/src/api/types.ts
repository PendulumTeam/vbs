// API types for VBS backend

export interface SearchResult {
  image_id: string;
  link: string;
  score: number;
  frame_stamp: number;
  watch_url: string;
  ocr_text?: string;
}

export interface BackendFrame {
  s3_key: string;
  bucket: string;
  content_type: string;
  file_hash: string;
  file_size: number;
  public_url: string;
  region: string;
  upload_date: string;
  score?: number;
}

export interface BackendResponse {
  frames: BackendFrame[];
  count: number;
}

export interface SearchParams {
  query: string;
  limit?: number;
}

export interface NeighborParams {
  s3_key: string;
  limit?: number;
}

export interface VideoParams {
  l: string;
  v: string;
  limit?: number;
}