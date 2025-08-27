import { type NextRequest, NextResponse } from 'next/server';

/**
 * POST handler for neighbor search (similar images)
 * Expected format: { id: string, limit?: number }
 * Returns: { frames: SearchResult[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, limit = 20 } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID parameter is required' },
        { status: 400 }
      );
    }

    // Forward the request to the actual VBS backend
    const backendUrl = process.env.VBS_BACKEND_URL || 'http://localhost:3000';
    
    const response = await fetch(`${backendUrl}/neighbor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, limit }),
    });

    if (!response.ok) {
      throw new Error(`Backend neighbor search failed with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Neighbor search API error:', error);
    
    // Return mock data for development/testing
    const mockData = {
      frames: [
        {
          frame_stamp: 985.32,
          image_id: "L15_V013_24785",
          link: "https://drive.google.com/file/d/3Ot-Dyt-oIV_SmmW1GTcZ6YXGO5upil9z/view?usp=drivesdk",
          score: 0.8234567890123456,
          watch_url: "https://youtube.com/watch?v=bxoil0PDw2Q"
        },
        {
          frame_stamp: 1001.78,
          image_id: "L15_V013_24801",
          link: "https://drive.google.com/file/d/4Pt-Eyt-pJW_TnnX2HUdA7ZXHP6vqjm0z/view?usp=drivesdk",
          score: 0.7654321098765432,
          watch_url: "https://youtube.com/watch?v=bxoil0PDw2Q"
        }
      ]
    };
    
    return NextResponse.json(mockData);
  }
}