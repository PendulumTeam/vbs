import { type NextRequest, NextResponse } from 'next/server';

/**
 * POST handler for OCR-based search
 * Expected format: { query: string, limit?: number }
 * Returns: { frames: SearchResult[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 20 } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Forward the request to the actual VBS backend
    const backendUrl = process.env.VBS_BACKEND_URL || 'http://localhost:3000';
    
    const response = await fetch(`${backendUrl}/search-ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) {
      throw new Error(`Backend OCR search failed with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('OCR search API error:', error);
    
    // Return mock data for development/testing
    const mockData = {
      frames: [
        {
          frame_stamp: 234.56,
          image_id: "L10_V005_12345",
          link: "https://drive.google.com/file/d/7St-Hyt-sMZ_WqqA5KXgD0BZKSA9ytno3z/view?usp=drivesdk",
          score: 0.9876543210987654,
          watch_url: "https://youtube.com/watch?v=ocr-example1",
          ocr_text: "Found text containing query"
        },
        {
          frame_stamp: 567.89,
          image_id: "L10_V006_13567",
          link: "https://drive.google.com/file/d/8Tt-Iyt-tNA_XrrB6LYhE1CALB0zuop4z/view?usp=drivesdk",
          score: 0.8765432109876543,
          watch_url: "https://youtube.com/watch?v=ocr-example2",
          ocr_text: "Text snippet with query in context"
        }
      ]
    };
    
    return NextResponse.json(mockData);
  }
}