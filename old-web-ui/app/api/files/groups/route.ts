// Tier 1: Groups Overview API - Fast metadata-only loading
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

interface GroupSummary {
  id: string;
  name: string;
  videoCount: number;
  totalFrames: number;
  totalSize: number;
  dateRange: {
    start: string;
    end: string;
  };
}

interface GroupsResponse {
  groups: GroupSummary[];
  totalGroups: number;
  totalVideos: number;
  totalFrames: number;
  totalSize: number;
}

/**
 * GET /api/files/groups
 * 
 * Fast overview of all groups with video counts (NO frame data)
 * Response time target: <500ms even with 177K+ records
 * 
 * Query Parameters:
 * - sort: name, frames, size, date (default: name)
 * - limit: max groups to return (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'name';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const db = await connectToDatabase();
    const collection = db.collection('file_metadata');

    console.log('Fetching groups overview - metadata only');

    // Ultra-fast aggregation: Only process group/video combinations, no frame data
    const pipeline = [
      {
        // Extract only group and video from s3_key
        $project: {
          groupVideo: { 
            $arrayElemAt: [{ $split: ["$s3_key", "/"] }, 0] 
          },
          file_size: 1,
          upload_date: 1
        }
      },
      {
        // Parse group and video IDs
        $project: {
          parsedPath: {
            $let: {
              vars: {
                parts: { $split: ["$groupVideo", "_"] }
              },
              in: {
                group: { $arrayElemAt: ["$$parts", 0] },
                video: { $arrayElemAt: ["$$parts", 1] }
              }
            }
          },
          file_size: 1,
          upload_date: 1
        }
      },
      {
        // Filter valid group/video combinations
        $match: {
          "parsedPath.group": { $regex: /^L\d+$/ },
          "parsedPath.video": { $regex: /^V\d+$/ }
        }
      },
      {
        // Aggregate by group-video combination (intermediate step)
        $group: {
          _id: {
            group: "$parsedPath.group",
            video: "$parsedPath.video"
          },
          frameCount: { $sum: 1 },
          videoSize: { $sum: "$file_size" },
          dateStart: { $min: "$upload_date" },
          dateEnd: { $max: "$upload_date" }
        }
      },
      {
        // Final aggregation by group only
        $group: {
          _id: "$_id.group",
          videoCount: { $sum: 1 },
          totalFrames: { $sum: "$frameCount" },
          totalSize: { $sum: "$videoSize" },
          dateStart: { $min: "$dateStart" },
          dateEnd: { $max: "$dateEnd" }
        }
      },
      {
        // Sort groups
        $sort: getSortCriteria(sort)
      },
      {
        // Limit results
        $limit: limit
      }
    ];

    const startTime = Date.now();
    
    const results = await collection.aggregate(pipeline, {
      allowDiskUse: false, // Should be fast enough not to need disk
      maxTimeMS: 5000      // 5 second timeout for safety
    }).toArray();

    const queryTime = Date.now() - startTime;
    console.log(`Groups overview completed in ${queryTime}ms`);

    // Transform to response format
    const groups: GroupSummary[] = results.map(group => ({
      id: group._id,
      name: group._id,
      videoCount: group.videoCount,
      totalFrames: group.totalFrames,
      totalSize: group.totalSize,
      dateRange: {
        start: group.dateStart.toISOString(),
        end: group.dateEnd.toISOString()
      }
    }));

    // Calculate overall totals
    const totalGroups = groups.length;
    const totalVideos = groups.reduce((sum, g) => sum + g.videoCount, 0);
    const totalFrames = groups.reduce((sum, g) => sum + g.totalFrames, 0);
    const totalSize = groups.reduce((sum, g) => sum + g.totalSize, 0);

    const response: GroupsResponse = {
      groups,
      totalGroups,
      totalVideos,
      totalFrames,
      totalSize
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in /api/files/groups:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch groups overview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get MongoDB sort criteria based on parameter
 */
function getSortCriteria(sortParam: string): Record<string, 1 | -1> {
  switch (sortParam) {
    case 'frames':
      return { totalFrames: -1 }; // Most frames first
    case 'size':
      return { totalSize: -1 }; // Largest first
    case 'date':
      return { dateStart: -1 }; // Newest first
    case 'name':
    default:
      return { _id: 1 }; // Alphabetical (L01, L02, ...)
  }
}