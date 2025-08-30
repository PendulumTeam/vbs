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

    // Forward the request to the new VBS backend
    const backendUrl = process.env.VBS_BACKEND_URL || 'http://localhost:8000';

    const response = await fetch(`${backendUrl}/neighbors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ s3_key: id, limit }), // Use s3_key parameter for new backend
    });

    if (!response.ok) {
      throw new Error(`Backend neighbor search failed with status: ${response.status}`);
    }

    const backendData = await response.json();

    // Transform backend response to match frontend expectations
    const transformedResponse = {
      frames: backendData.frames.map((frame: any) => {
        try {
          const parts = frame.s3_key.split('_');
          const frameNumber = parseInt(parts[2]);
          const videoId = `${parts[0]}_${parts[1]}`;

          return {
            image_id: frame.s3_key,
            link: frame.public_url, // Direct CDN URL - much simpler!
            score: 1.0, // No score for neighbor search
            frame_stamp: frameNumber,
            watch_url: `https://youtube.com/watch?v=${videoId}` // Placeholder
          };
        } catch (error) {
          console.warn(`Failed to transform neighbor frame: ${frame.s3_key}`, error);
          return {
            image_id: frame.s3_key,
            link: frame.public_url,
            score: 1.0,
            frame_stamp: 0,
            watch_url: ''
          };
        }
      })
    };

    return NextResponse.json(transformedResponse);

  } catch (error) {
    console.error('Neighbor search API error:', error);


    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
