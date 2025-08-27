import { type NextRequest, NextResponse } from 'next/server';

/**
 * POST handler for text-based search
 * Expected format: { query: string, limit?: number, model?: string }
 * Returns: { frames: SearchResult[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, model = 'blip2_feature_extractor', limit = 20 } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Forward the request to the actual VBS backend
    const backendUrl = process.env.VBS_BACKEND_URL || 'http://localhost:3000';
    
    const response = await fetch(`${backendUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit, model }),
    });

    if (!response.ok) {
      throw new Error(`Backend search failed with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Search API error:', error);
    
    // Return mock data for development/testing
    const mockData = {
      frames: [
        {
          frame_stamp: 991.64,
          image_id: "L15_V013_24791",
          link: "https://drive.google.com/file/d/1Nt-Byt-mGT_QkkU9ESaX4YWEM3snghjz/view?usp=drivesdk",
          score: 0.5527825355529785,
          watch_url: "https://youtube.com/watch?v=bxoil0PDw2Q"
        },
        {
          frame_stamp: 1123.45,
          image_id: "L15_V014_25123",
          link: "https://drive.google.com/file/d/2Mt-Cyt-nHU_RllV0FSbY5ZXFN4tohk8z/view?usp=drivesdk",
          score: 0.4823764329185672,
          watch_url: "https://youtube.com/watch?v=bxoil0PDw2Q"
        }
      ]
    };
    
    return NextResponse.json(mockData);
  }
}