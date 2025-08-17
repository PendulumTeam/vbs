// Tree Structure API - Hierarchical file navigation
import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db } from 'mongodb';
import { 
  FileMetadata,
  TreeResponse, 
  AggregationGroupResult
} from '@/lib/file-browser-types';
import { createFileBrowserError } from '@/lib/file-browser-utils';

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

  cachedDb = cachedClient.db('data'); // Use 'data' database as specified in .env
  return cachedDb;
}

/**
 * GET /api/files/tree
 * 
 * Query Parameters:
 * - expand: comma-separated list of group IDs to pre-expand
 * - limit: maximum number of groups to return
 * - sort: sort order (name, date, size)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const sortParam = searchParams.get('sort') || 'name';

    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    const db = await connectToDatabase();
    const collection = db.collection<FileMetadata>('file_metadata');

    // Optimized aggregation pipeline for large datasets (10K+ records)
    const pipeline = [
      {
        // First stage: Basic projection and filtering to reduce data early
        $project: {
          s3_key: 1,
          file_size: 1,
          upload_date: 1,
          content_type: 1,
          public_url: 1,
          // Parse only what we need for grouping
          parsedPath: {
            $let: {
              vars: {
                groupVideo: { 
                  $split: [
                    { $arrayElemAt: [{ $split: ["$s3_key", "/"] }, 0] }, 
                    "_"
                  ] 
                }
              },
              in: {
                group: { $arrayElemAt: ["$$groupVideo", 0] },
                video: { $arrayElemAt: ["$$groupVideo", 1] }
              }
            }
          }
        }
      },
      {
        // Early filtering to reduce dataset size
        $match: {
          "parsedPath.group": { $regex: /^[A-Z]\d+$/ },
          "parsedPath.video": { $regex: /^[A-Z]\d+$/ },
          "s3_key": { $regex: /.*\.jpg$/ }
        }
      },
      {
        // First aggregation: Group by video (more granular, less memory intensive)
        $group: {
          _id: {
            group: "$parsedPath.group",
            video: "$parsedPath.video"
          },
          frameCount: { $sum: 1 },
          totalSize: { $sum: "$file_size" },
          dateStart: { $min: "$upload_date" },
          dateEnd: { $max: "$upload_date" },
          avgFrameSize: { $avg: "$file_size" },
          // Only include minimal frame data, not full documents
          sampleFrame: { $first: {
            s3_key: "$s3_key",
            public_url: "$public_url",
            file_size: "$file_size"
          }}
        }
      },
      {
        // Second aggregation: Group by location/group
        $group: {
          _id: "$_id.group",
          videos: {
            $push: {
              videoId: "$_id.video",
              frameCount: "$frameCount",
              totalSize: "$totalSize",
              dateRange: {
                start: "$dateStart",
                end: "$dateEnd"
              },
              averageFrameSize: "$avgFrameSize",
              sampleFrame: "$sampleFrame"
            }
          },
          totalFrames: { $sum: "$frameCount" },
          totalSize: { $sum: "$totalSize" },
          videoCount: { $sum: 1 },
          groupDateStart: { $min: "$dateStart" },
          groupDateEnd: { $max: "$dateEnd" }
        }
      },
      {
        // Sort groups
        $sort: getSortCriteria(sortParam)
      },
      {
        // Limit results for initial load
        $limit: limit
      }
    ];

    console.log('Executing aggregation pipeline for large dataset (10K+ records)');
    
    const aggregationResults = await collection.aggregate<AggregationGroupResult>(pipeline, {
      allowDiskUse: true, // Allow disk usage for large datasets
      maxTimeMS: 30000,   // 30 second timeout
      batchSize: 100      // Process in smaller batches
    }).toArray();
    
    console.log(`Found ${aggregationResults.length} groups`);

    // Convert aggregation results to tree structure without loading all frames
    const groups = aggregationResults.map(group => {
      const videos = group.videos.map(video => ({
        id: `${group._id}_${video.videoId}`,
        name: video.videoId,
        type: 'video' as const,
        groupId: group._id,
        videoId: video.videoId,
        frames: [], // Don't load all frames initially for performance
        children: [],
        metadata: {
          frameCount: video.frameCount,
          totalSize: video.totalSize,
          dateRange: {
            start: new Date(video.dateRange.start),
            end: new Date(video.dateRange.end)
          },
          averageFrameSize: video.averageFrameSize
        }
      }));

      return {
        id: group._id,
        name: group._id,
        type: 'group' as const,
        groupId: group._id,
        videos,
        children: videos,
        metadata: {
          frameCount: group.totalFrames,
          totalSize: group.totalSize,
          dateRange: {
            start: new Date(group.groupDateStart),
            end: new Date(group.groupDateEnd)
          },
          videoCount: group.videoCount
        }
      };
    });

    // Calculate totals
    const totalFiles = groups.reduce((sum, group) => sum + group.metadata.frameCount, 0);
    const totalSize = groups.reduce((sum, group) => sum + group.metadata.totalSize, 0);
    const totalGroups = groups.length;
    const totalVideos = groups.reduce((sum, group) => sum + group.videos.length, 0);

    const response: TreeResponse = {
      groups,
      totalFiles,
      totalSize,
      totalGroups,
      totalVideos
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in /api/files/tree:', error);
    
    const errorResponse = createFileBrowserError(
      'DB_ERROR',
      'Failed to fetch tree structure',
      error
    );

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Get sort criteria for MongoDB aggregation
 */
function getSortCriteria(sortParam: string): Record<string, 1 | -1> {
  switch (sortParam) {
    case 'date':
      return { groupDateStart: -1 }; // Newest first
    case 'size':
      return { totalSize: -1 }; // Largest first
    case 'frames':
      return { totalFrames: -1 }; // Most frames first
    case 'name':
    default:
      return { _id: 1 }; // Alphabetical
  }
}

/**
 * GET /api/files/tree/stats
 * Get quick statistics without full tree structure
 */
export async function HEAD(_request: NextRequest) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection<FileMetadata>('file_metadata');

    const stats = await collection.aggregate([
      {
        $project: {
          parsedPath: {
            $let: {
              vars: {
                groupVideo: { 
                  $split: [
                    { $arrayElemAt: [{ $split: ["$s3_key", "/"] }, 0] }, 
                    "_"
                  ] 
                }
              },
              in: {
                group: { $arrayElemAt: ["$$groupVideo", 0] },
                video: { $arrayElemAt: ["$$groupVideo", 1] }
              }
            }
          },
          file_size: 1
        }
      },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: "$file_size" },
          uniqueGroups: { $addToSet: "$parsedPath.group" },
          uniqueVideos: { $addToSet: { 
            $concat: ["$parsedPath.group", "_", "$parsedPath.video"] 
          }}
        }
      },
      {
        $project: {
          totalFiles: 1,
          totalSize: 1,
          totalGroups: { $size: "$uniqueGroups" },
          totalVideos: { $size: "$uniqueVideos" }
        }
      }
    ]).toArray();

    const result = stats[0] || {
      totalFiles: 0,
      totalSize: 0,
      totalGroups: 0,
      totalVideos: 0
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in /api/files/tree/stats:', error);
    return NextResponse.json(
      createFileBrowserError('DB_ERROR', 'Failed to fetch statistics', error),
      { status: 500 }
    );
  }
}