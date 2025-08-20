// Tier 3: Video Frames API - Paginated frame data for specific video
import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://vbs_user:vbs_pass@localhost:27017/vbs_db';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI);
    await cachedClient.connect();
  }

  cachedDb = cachedClient.db('data');
  return cachedDb;
}

interface FrameData {
  id: string;
  name: string;
  frameNumber: number;
  url: string;
  fileSize: number;
  uploadDate: string;
  s3Key: string;
  fileHash: string;
}

interface VideoFramesResponse {
  video: {
    groupId: string;
    videoId: string;
    name: string;
  };
  frames: FrameData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * GET /api/files/groups/[groupId]/videos/[videoId]/frames
 * 
 * Ultra-fast loading of frames for specific video with pagination
 * Response time target: <300ms per video
 * 
 * Query Parameters:
 * - page: page number (default: 1)
 * - limit: frames per page (default: 50)
 * - sort: frame, date, size (default: frame)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string; videoId: string } }
) {
  try {
    const { groupId, videoId } = params;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const sort = searchParams.get('sort') || 'frame';

    // Validate parameters
    if (!/^L\d+$/.test(groupId)) {
      return NextResponse.json(
        { error: `Invalid group ID format: ${groupId}` },
        { status: 400 }
      );
    }

    if (!/^V\d+$/.test(videoId)) {
      return NextResponse.json(
        { error: `Invalid video ID format: ${videoId}` },
        { status: 400 }
      );
    }

    if (page < 1 || limit < 1 || limit > 200) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection('file_metadata');

    console.log(`Fetching frames for ${groupId}_${videoId} - page ${page}`);

    // Ultra-fast query: Only specific video frames
    const videoPattern = `^${groupId}_${videoId}/`;
    const startTime = Date.now();

    // Get total count for pagination
    const totalFrames = await collection.countDocuments({
      s3_key: new RegExp(videoPattern)
    });

    if (totalFrames === 0) {
      return NextResponse.json(
        { error: `Video ${groupId}_${videoId} not found` },
        { status: 404 }
      );
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(totalFrames / limit);

    // Fetch frames with pagination
    const sortCriteria = getFrameSortCriteria(sort);
    
    const frames = await collection
      .find({ s3_key: new RegExp(videoPattern) })
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .toArray();

    const queryTime = Date.now() - startTime;
    console.log(`${groupId}_${videoId} frames (page ${page}) loaded in ${queryTime}ms`);

    // Transform to response format
    const frameData: FrameData[] = frames.map(frame => {
      // Extract frame number from s3_key (e.g., "L21_V001/042.jpg" → 42)
      const frameMatch = frame.s3_key.match(/\/(\d+)\.jpg$/);
      const frameNumber = frameMatch ? parseInt(frameMatch[1], 10) : 0;

      return {
        id: frame._id.toString(),
        name: frame.s3_key.split('/')[1], // "042.jpg"
        frameNumber,
        url: frame.public_url,
        fileSize: frame.file_size,
        uploadDate: frame.upload_date.toISOString(),
        s3Key: frame.s3_key,
        fileHash: frame.file_hash
      };
    });

    const response: VideoFramesResponse = {
      video: {
        groupId,
        videoId,
        name: `${groupId}_${videoId}`
      },
      frames: frameData,
      pagination: {
        page,
        limit,
        total: totalFrames,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`Error in /api/files/groups/${params.groupId}/videos/${params.videoId}/frames:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch video frames',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get sort criteria for frames within a video
 */
function getFrameSortCriteria(sortParam: string): Record<string, 1 | -1> {
  switch (sortParam) {
    case 'date':
      return { upload_date: 1 }; // Chronological
    case 'size':
      return { file_size: -1 }; // Largest first
    case 'frame':
    default:
      return { s3_key: 1 }; // Natural frame order (001.jpg, 002.jpg, ...)
  }
}

/**
 * GET /api/files/groups/[groupId]/videos/[videoId]/frames/stats
 * Quick stats for a video without loading frame data
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: { groupId: string; videoId: string } }
) {
  try {
    const { groupId, videoId } = params;

    const db = await connectToDatabase();
    const collection = db.collection('file_metadata');

    const stats = await collection.aggregate([
      {
        $match: {
          s3_key: new RegExp(`^${groupId}_${videoId}/`)
        }
      },
      {
        $group: {
          _id: null,
          frameCount: { $sum: 1 },
          totalSize: { $sum: "$file_size" },
          averageSize: { $avg: "$file_size" },
          dateStart: { $min: "$upload_date" },
          dateEnd: { $max: "$upload_date" }
        }
      }
    ]).toArray();

    const result = stats[0] || {
      frameCount: 0,
      totalSize: 0,
      averageSize: 0,
      dateStart: null,
      dateEnd: null
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error(`Error in video stats for ${params.groupId}_${params.videoId}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch video statistics' },
      { status: 500 }
    );
  }
}