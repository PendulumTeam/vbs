// Group-specific API - Get videos and frames for a specific group
import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db } from 'mongodb';
import { 
  FileMetadata, 
  GroupResponse,
  PaginationInfo 
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
 * GET /api/files/group/[groupId]
 * 
 * Query Parameters:
 * - page: page number (default: 1)
 * - limit: videos per page (default: 20)
 * - sort: sort order (name, date, size, frames)
 * - includeFrames: include frame data (default: false)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const { groupId } = params;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sort = searchParams.get('sort') || 'name';
    const includeFrames = searchParams.get('includeFrames') === 'true';

    // Validate groupId format
    if (!/^[A-Z]\d+$/.test(groupId)) {
      return NextResponse.json(
        createFileBrowserError('INVALID_PATH', `Invalid group ID format: ${groupId}`),
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection<FileMetadata>('file_metadata');

    // First, get all files for this group to build the tree structure
    const groupFiles = await collection.find({
      s3_key: new RegExp(`^${groupId}_`)
    }).toArray();

    if (groupFiles.length === 0) {
      return NextResponse.json(
        createFileBrowserError('NOT_FOUND', `Group ${groupId} not found`),
        { status: 404 }
      );
    }

    // Build tree structure to get properly organized data
    const groups = buildTreeStructure(groupFiles);
    const group = groups.find(g => g.groupId === groupId);

    if (!group) {
      return NextResponse.json(
        createFileBrowserError('NOT_FOUND', `Group ${groupId} not found after parsing`),
        { status: 404 }
      );
    }

    // Sort videos based on sort parameter
    const sortedVideos = [...group.videos];
    switch (sort) {
      case 'date':
        sortedVideos.sort((a, b) => 
          b.metadata.dateRange.start.getTime() - a.metadata.dateRange.start.getTime()
        );
        break;
      case 'size':
        sortedVideos.sort((a, b) => b.metadata.totalSize - a.metadata.totalSize);
        break;
      case 'frames':
        sortedVideos.sort((a, b) => b.metadata.frameCount - a.metadata.frameCount);
        break;
      case 'name':
      default:
        sortedVideos.sort((a, b) => a.videoId.localeCompare(b.videoId));
        break;
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedVideos = sortedVideos.slice(startIndex, endIndex);

    // If frames not included, remove frame data to reduce payload size
    if (!includeFrames) {
      paginatedVideos.forEach(video => {
        video.frames = [];
        video.children = [];
      });
    }

    // Create pagination info
    const pagination: PaginationInfo = {
      page,
      limit,
      total: sortedVideos.length,
      hasNext: endIndex < sortedVideos.length,
      hasPrev: page > 1
    };

    const response: GroupResponse = {
      group: {
        ...group,
        videos: paginatedVideos,
        children: paginatedVideos
      },
      videos: paginatedVideos,
      pagination
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`Error in /api/files/group/${params.groupId}:`, error);
    
    const errorResponse = createFileBrowserError(
      'DB_ERROR',
      'Failed to fetch group data',
      error
    );

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET /api/files/group/[groupId]/stats
 * Get statistics for a specific group
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const { groupId } = params;
    
    // Validate groupId format
    if (!/^[A-Z]\d+$/.test(groupId)) {
      return NextResponse.json(
        createFileBrowserError('INVALID_PATH', `Invalid group ID format: ${groupId}`),
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection<FileMetadata>('file_metadata');

    const stats = await collection.aggregate([
      {
        $match: {
          s3_key: new RegExp(`^${groupId}_`)
        }
      },
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
                video: { $arrayElemAt: ["$$groupVideo", 1] }
              }
            }
          },
          file_size: 1,
          upload_date: 1
        }
      },
      {
        $group: {
          _id: null,
          totalFrames: { $sum: 1 },
          totalSize: { $sum: "$file_size" },
          uniqueVideos: { $addToSet: "$parsedPath.video" },
          dateStart: { $min: "$upload_date" },
          dateEnd: { $max: "$upload_date" },
          avgFileSize: { $avg: "$file_size" }
        }
      },
      {
        $project: {
          totalFrames: 1,
          totalSize: 1,
          videoCount: { $size: "$uniqueVideos" },
          dateRange: {
            start: "$dateStart",
            end: "$dateEnd"
          },
          averageFrameSize: { $round: "$avgFileSize" }
        }
      }
    ]).toArray();

    const result = stats[0] || {
      totalFrames: 0,
      totalSize: 0,
      videoCount: 0,
      dateRange: null,
      averageFrameSize: 0
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error(`Error in /api/files/group/${params.groupId}/stats:`, error);
    return NextResponse.json(
      createFileBrowserError('DB_ERROR', 'Failed to fetch group statistics', error),
      { status: 500 }
    );
  }
}