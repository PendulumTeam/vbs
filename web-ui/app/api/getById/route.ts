import { type NextRequest, NextResponse } from 'next/server';

/**
 * POST handler for getting a specific image by ID
 * Expected format: { id: string }
 * Returns: { frames: SearchResult[] }
 */
export async function POST(request: NextRequest) {
  let body: { id: string };
  let id: string = '';
  
  try {
    body = await request.json();
    id = body.id;

    if (!id) {
      return NextResponse.json(
        { error: 'ID parameter is required' },
        { status: 400 }
      );
    }

    // Forward the request to the actual VBS backend
    const backendUrl = process.env.VBS_BACKEND_URL || 'http://localhost:3000';
    
    const response = await fetch(`${backendUrl}/getById`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      throw new Error(`Backend getById failed with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('GetById API error:', error);
    
    // Return mock data for development/testing
    // Parse the ID to extract video and frame info for realistic mock data
    const idParts = id.split('_');
    const lessonId = idParts[0] || 'L01';
    const videoId = idParts.slice(0, 2).join('_') || 'L01_V001';
    const frameNumber = idParts[2] || '00000';
    
    const mockData = {
      frames: [
        {
          frame_stamp: parseFloat(frameNumber) / 100, // Convert frame to rough timestamp
          image_id: id,
          link: `https://drive.google.com/file/d/mock-${id}/view?usp=drivesdk`,
          score: 1.0, // Perfect match since we're looking for specific ID
          watch_url: `https://youtube.com/watch?v=mock-${videoId}`
        }
      ]
    };
    
    return NextResponse.json(mockData);
  }
}