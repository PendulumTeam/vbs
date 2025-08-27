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

const BASE_URL = process.env.NEXT_PUBLIC_VBS_API_URL || 'http://localhost:3000';

/**
 * Perform a text-based search
 */
export async function searchImages({
  query,
  limit = 20,
  model = 'blip2_feature_extractor',
}: SearchParams): Promise<SearchResult[]> {
  try {
    const response = await fetch(`${BASE_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit, model }),
    });

    if (!response.ok) {
      throw new Error(`Search failed with status: ${response.status}`);
    }

    const data = await response.json();

    console.log(data);

    return data.frames;
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
  const response = await fetch(`${BASE_URL}/neighbor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, limit }),
  });

  if (!response.ok) {
    throw new Error(`Neighbor search failed with status: ${response.status}`);
  }

  const data = await response.json();
  return data.frames;
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
  const response = await fetch(`${BASE_URL}/getById`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id }),
  });
  const data = await response.json();
  return data.frames[0];
}