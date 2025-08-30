// Tier 2: Group Details API - Videos for specific group
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

interface VideoSummary {
  id: string;
  name: string;
  frameCount: number;
  totalSize: number;
  averageFrameSize: number;
  dateRange: {
    start: string;
    end: string;
  };
  sampleFrame?: {
    s3_key: string;
    public_url: string;
  };
}

interface GroupVideosResponse {
  group: {
    id: string;
    name: string;
  };
  videos: VideoSummary[];
  totalVideos: number;
  totalFrames: number;
  totalSize: number;
}

/**
 * GET /api/files/groups/[groupId]/videos
 * 
 * Fast loading of videos for a specific group (NO frame data)
 * Response time target: <200ms per group
 * 
 * Query Parameters:
 * - sort: name, frames, size, date (default: name)
 * - includeSample: include one sample frame per video for preview
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'name';
    const includeSample = searchParams.get('includeSample') === 'true';

    // Validate group ID format
    if (!/^L\d+$/.test(groupId)) {
      return NextResponse.json(
        { error: `Invalid group ID format: ${groupId}` },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection('file_metadata');

    console.log(`Fetching videos for group ${groupId} - metadata only`);

    // Fast aggregation: Only process files for this specific group
    const pipeline = [
      {
        // Filter to only this group's files
        $match: {
          s3_key: new RegExp(`^${groupId}_`)
        }
      },
      {
        // Extract video ID from s3_key
        $project: {
          video: { 
            $arrayElemAt: [
              { $split: [
                { $arrayElemAt: [{ $split: ["$s3_key", "/"] }, 0] }, 
                "_"
              ] }, 
              1
            ] 
          },
          file_size: 1,
          upload_date: 1,
          s3_key: 1,
          public_url: 1
        }
      },
      {
        // Filter valid video IDs
        $match: {
          video: { $regex: /^V\d+$/ }
        }
      },
      {
        // Group by video
        $group: {
          _id: "$video",
          frameCount: { $sum: 1 },
          totalSize: { $sum: "$file_size" },
          dateStart: { $min: "$upload_date" },
          dateEnd: { $max: "$upload_date" },
          // Include sample frame if requested
          ...(includeSample && {
            sampleFrame: { 
              $first: {
                s3_key: "$s3_key",
                public_url: "$public_url"
              }
            }
          })
        }
      },
      {
        // Sort videos
        $sort: getVideoSortCriteria(sort)
      }
    ];

    const startTime = Date.now();
    
    const results = await collection.aggregate(pipeline, {
      maxTimeMS: 3000 // 3 second timeout - should be much faster
    }).toArray();

    const queryTime = Date.now() - startTime;
    console.log(`Group ${groupId} videos loaded in ${queryTime}ms`);

    if (results.length === 0) {
      return NextResponse.json(
        { error: `Group ${groupId} not found` },
        { status: 404 }
      );
    }

    // Transform to response format
    const videos: VideoSummary[] = results.map(video => ({
      id: video._id,
      name: video._id,
      frameCount: video.frameCount,
      totalSize: video.totalSize,
      averageFrameSize: Math.round(video.totalSize / video.frameCount),
      dateRange: {
        start: video.dateStart.toISOString(),
        end: video.dateEnd.toISOString()
      },
      ...(video.sampleFrame && { sampleFrame: video.sampleFrame })
    }));

    // Calculate totals for this group
    const totalVideos = videos.length;
    const totalFrames = videos.reduce((sum, v) => sum + v.frameCount, 0);
    const totalSize = videos.reduce((sum, v) => sum + v.totalSize, 0);

    const response: GroupVideosResponse = {
      group: {
        id: groupId,
        name: groupId
      },
      videos,
      totalVideos,
      totalFrames,
      totalSize
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`Error in /api/files/groups/${groupId}/videos:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch group videos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get sort criteria for videos within a group
 */
function getVideoSortCriteria(sortParam: string): Record<string, 1 | -1> {
  switch (sortParam) {
    case 'frames':
      return { frameCount: -1 }; // Most frames first
    case 'size':
      return { totalSize: -1 }; // Largest first
    case 'date':
      return { dateStart: -1 }; // Newest first
    case 'name':
    default:
      return { _id: 1 }; // Alphabetical (V001, V002, ...)
  }
}