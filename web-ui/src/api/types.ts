// API types for VBS backend

export interface SearchResult {
  image_id: string;
  link: string;
  score: number;
  frame_stamp: number;
  watch_url: string;
  ocr_text?: string;
  video_fps?: number;
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
  // New fields from updated server response
  image_id?: string; // Contains frame_n value (e.g., "L23_V001_250")
  frame_n?: string; // Frame identifier (e.g., "L23_V001_250")
  fps?: number; // Frame rate
  frame_idx?: number; // Frame index
  pts_time?: number; // Presentation timestamp
  video_id?: string; // Video identifier (e.g., "L23_V001")
  source_file?: string; // Source CSV file
  metadata_hash?: string; // Metadata hash
  ocr_text?: string; // OCR extracted text from frame
  watch_url?: string; // Timestamped YouTube URL from backend
  video_fps?: number; // Video frames per second
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
  frame_id: string;
  limit?: number;
}

export interface VideoParams {
  l: string;
  v: string;
  limit?: number;
}
