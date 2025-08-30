// API service functions for image search

/**
 * Interface for search parameters
 */
interface SearchParams {
  query: string;
  model?: string;
  limit?: number;
}

/**
 * Interface for OCR search parameters
 */
interface OCRSearchParams {
  query: string;
  limit?: number;
}

/**
 * Interface for visual search parameters
 */
interface VisualSearchParams {
  objectList: {
    class_name: string;
    bbox: number[];
  }[];
  limit?: number;
  logic?: 'AND' | 'OR';
}

/**
 * Interface for search results
 * frame_stamp: 991.64
 * image_id: "L15_V013_24791"
 * link: "https: // drive.google.com/file/d/$1Nt-Byt-mGT_QkkU9ESaX4YWEM3snghjz/view?usp=drivesdk"
 * score: 0.5527825355529785
 * watch_url: "https://youtube.com/watch?v=bxoil0PDw2Q"
 */
export interface SearchResult {
  frame_stamp: number;
  image_id: string;
  link: string;
  score: number;
  watch_url: string;
  ocr_text?: string; // Optional OCR text field
}

/**
 * Backend frame response format from VBS server
 */
interface BackendFrame {
  s3_key: string;
  bucket: string;
  content_type: string;
  file_hash: string;
  file_size: number;
  public_url: string;
  region: string;
  upload_date: string;
  score?: number; // Only present in search results
}

/**
 * Backend response wrapper
 */
interface BackendResponse {
  frames: BackendFrame[];
  count: number;
}

const BASE_URL = process.env.NEXT_PUBLIC_VBS_API_URL || 'http://localhost:8000';

/**
 * Parse video information from s3_key
 * L21_V001_001 -> { collection: "L21", video: "V001", frame: 1 }
 */
function parseS3Key(s3_key: string) {
  const parts = s3_key.split('_');
  if (parts.length !== 3) {
    throw new Error(`Invalid s3_key format: ${s3_key}`);
  }
  
  const [collection, video, frameStr] = parts;
  return {
    collection,
    video, 
    frame: parseInt(frameStr),
    videoId: `${collection}_${video}` // For grouping
  };
}

/**
 * Generate YouTube watch URL from video information
 * This is a placeholder - you may need to implement actual mapping
 */
function generateWatchUrl(collection: string, video: string): string {
  // This would need to be mapped to actual YouTube URLs if available
  // For now, return a placeholder
  return `https://youtube.com/watch?v=${collection}_${video}`;
}

/**
 * Transform backend frame to frontend SearchResult format
 */
function transformBackendFrame(backendFrame: BackendFrame): SearchResult {
  try {
    const { collection, video, frame } = parseS3Key(backendFrame.s3_key);
    
    return {
      image_id: backendFrame.s3_key, // Use s3_key as image_id
      link: backendFrame.public_url, // Use direct CDN URL - much simpler!
      score: backendFrame.score || 1.0, // Default score if not provided
      frame_stamp: frame, // Use frame number as timestamp placeholder
      watch_url: generateWatchUrl(collection, video), // Generate or map to actual URL
      ocr_text: undefined // Not provided by new backend
    };
  } catch (error) {
    console.warn(`Failed to transform frame: ${backendFrame.s3_key}`, error);
    // Return fallback format
    return {
      image_id: backendFrame.s3_key,
      link: backendFrame.public_url,
      score: 1.0,
      frame_stamp: 0,
      watch_url: '',
      ocr_text: undefined
    };
  }
}

/**
 * Transform backend response to frontend format
 */
function transformBackendResponse(backendResponse: BackendResponse): SearchResult[] {
  return backendResponse.frames.map(transformBackendFrame);
}

/**
 * Perform a text-based search using new VBS backend
 */
export async function searchImages({
  query,
  limit = 20,
  model = 'beit3', // Updated default model
}: SearchParams): Promise<SearchResult[]> {
  try {
    const response = await fetch(`${BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit }), // Remove model parameter for new backend
    });

    if (!response.ok) {
      throw new Error(`Search failed with status: ${response.status}`);
    }

    const backendData: BackendResponse = await response.json();
    console.log('Backend response:', backendData);

    // Transform backend response to frontend format
    const transformedResults = transformBackendResponse(backendData);
    console.log('Transformed results:', transformedResults);

    return transformedResults;
  } catch (error) {
    console.error('Error searching images:', error);
    throw error;
  }
}

export async function searchNeighbor({
  id,
  limit = 20,
}: {
  id: string;
  limit?: number;
}): Promise<SearchResult[]> {
  try {
    const response = await fetch(`${BASE_URL}/neighbors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ s3_key: id, limit }), // Use s3_key parameter for new backend
    });

    if (!response.ok) {
      throw new Error(`Neighbor search failed with status: ${response.status}`);
    }

    const backendData: BackendResponse = await response.json();
    console.log('Neighbor backend response:', backendData);

    // Transform backend response to frontend format
    const transformedResults = transformBackendResponse(backendData);
    console.log('Transformed neighbor results:', transformedResults);

    return transformedResults;
  } catch (error) {
    console.error('Error in neighbor search:', error);
    throw error;
  }
}

/**
 * Perform OCR search to find images containing specific text
 */
export async function searchOCR({
  query,
  limit = 20,
}: OCRSearchParams): Promise<SearchResult[]> {
  try {
    const response = await fetch(`${BASE_URL}/search-ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) {
      throw new Error(`OCR search failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data.frames;
  } catch (error) {
    console.error('Error performing OCR search:', error);
    throw error;
  }
}

/**
 * Perform a visual search based on symbols and their positions
 */
export async function visualSearch({
  objectList,
  limit = 20,
  logic = 'AND',
}: VisualSearchParams): Promise<SearchResult[]> {
  try {
    const response = await fetch(`${BASE_URL}/search-detections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        object_list: objectList,
        limit,
        logic,
      }),
    });

    if (!response.ok) {
      throw new Error(`Visual search failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data.frames;
  } catch (error) {
    console.error('Error performing visual search:', error);
    throw error;
  }
}

export async function getImageById(id: string): Promise<SearchResult> {
  try {
    const response = await fetch(`${BASE_URL}/frames`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ frame_ids: [id] }), // Use frame_ids array for new backend
    });

    if (!response.ok) {
      throw new Error(`Get frame by ID failed with status: ${response.status}`);
    }

    const backendData: BackendResponse = await response.json();
    
    if (backendData.frames.length === 0) {
      throw new Error(`Frame not found: ${id}`);
    }

    // Transform backend response to frontend format
    const transformedResults = transformBackendResponse(backendData);
    return transformedResults[0];
  } catch (error) {
    console.error('Error getting frame by ID:', error);
    throw error;
  }
}