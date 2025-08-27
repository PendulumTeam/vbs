import { type NextRequest, NextResponse } from 'next/server';

/**
 * POST handler for visual search (alternative endpoint)
 * Expected format: { objectList: Array<{class_name: string, bbox: number[]}>, limit?: number, logic?: 'AND' | 'OR' }
 * Returns: { frames: SearchResult[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { objectList, limit = 20, logic = 'AND' } = body;

    if (!objectList || !Array.isArray(objectList) || objectList.length === 0) {
      return NextResponse.json(
        { error: 'objectList parameter is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    // Convert objectList to object_list format for backend compatibility
    const object_list = objectList;

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
          frame_stamp: 123.45,
          image_id: "L08_V003_09876",
          link: "https://drive.google.com/file/d/9Ut-Jyt-uOB_YssC7MZiF2DBMC1avpq5z/view?usp=drivesdk",
          score: 0.9345678901234567,
          watch_url: "https://youtube.com/watch?v=visual-example1"
        }
      ]
    };
    
    return NextResponse.json(mockData);
  }
}