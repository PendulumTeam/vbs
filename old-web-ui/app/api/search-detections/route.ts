import { type NextRequest, NextResponse } from 'next/server';

/**
 * POST handler for visual search using object detections
 * Expected format: { object_list: Array<{class_name: string, bbox: number[]}>, limit?: number, logic?: 'AND' | 'OR' }
 * Returns: { frames: SearchResult[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { object_list, limit = 20, logic = 'AND' } = body;

    if (!object_list || !Array.isArray(object_list) || object_list.length === 0) {
      return NextResponse.json(
        { error: 'object_list parameter is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    // Forward the request to the actual VBS backend
    const backendUrl = process.env.VBS_BACKEND_URL || 'http://localhost:3000';
    
    const response = await fetch(`${backendUrl}/search-detections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ object_list, limit, logic }),
    });

    if (!response.ok) {
      throw new Error(`Backend visual search failed with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Visual search API error:', error);
    
    // Return mock data for development/testing
    const mockData = {
      frames: [
        {
          frame_stamp: 456.78,
          image_id: "L12_V008_18234",
          link: "https://drive.google.com/file/d/5Qt-Fyt-qKX_UooY3IVeB8ZYIQ7wrkn1z/view?usp=drivesdk",
          score: 0.9123456789012345,
          watch_url: "https://youtube.com/watch?v=example1"
        },
        {
          frame_stamp: 789.12,
          image_id: "L12_V009_19456",
          link: "https://drive.google.com/file/d/6Rt-Gyt-rLY_VppZ4JWfC9AZJR8xslm2z/view?usp=drivesdk",
          score: 0.8567890123456789,
          watch_url: "https://youtube.com/watch?v=example2"
        }
      ]
    };
    
    return NextResponse.json(mockData);
  }
}