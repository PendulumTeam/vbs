// Video-specific API - Get frames for a specific video
import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db } from 'mongodb';
import { 
  FileMetadata, 
  VideoResponse, 
  VideoNode,
  PaginationInfo 
} from '@/lib/file-browser-types';
import { buildTreeStructure, createFileBrowserError, parseS3Key } from '@/lib/file-browser-utils';

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
 * GET /api/files/video/[groupId]/[videoId]
 * 
 * Query Parameters:
 * - page: page number (default: 1)
 * - limit: frames per page (default: 50)
 * - sort: sort order (frame, date, size)
 * - frameRange: start-end frame numbers (e.g., "1-100")
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
    const frameRange = searchParams.get('frameRange');

    // Validate parameters
    if (!/^[A-Z]\d+$/.test(groupId)) {
      return NextResponse.json(
        createFileBrowserError('INVALID_PATH', `Invalid group ID format: ${groupId}`),
        { status: 400 }
      );
    }

    if (!/^[A-Z]\d+$/.test(videoId)) {
      return NextResponse.json(
        createFileBrowserError('INVALID_PATH', `Invalid video ID format: ${videoId}`),
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection<FileMetadata>('file_metadata');

    // Build the query for this specific video
    const baseQuery = {
      s3_key: new RegExp(`^${groupId}_${videoId}/`)
    };

    // Use base query (frame range filtering done client-side for performance)
    const query = baseQuery;
    if (frameRange) {
      const [startFrame, endFrame] = frameRange.split('-').map(n => parseInt(n, 10));
      if (!isNaN(startFrame) && !isNaN(endFrame)) {
        // This requires fetching all files and filtering client-side since frame number is in filename
        // For better performance, consider storing frame number as a separate field
      }
    }

    // Fetch all frames for this video
    const videoFiles = await collection.find(query).toArray();

    if (videoFiles.length === 0) {
      return NextResponse.json(
        createFileBrowserError('NOT_FOUND', `Video ${groupId}_${videoId} not found`),
        { status: 404 }
      );
    }

    // Parse and sort frames by frame number
    const framesWithParsedInfo = videoFiles
      .map(file => ({
        file,
        parsed: parseS3Key(file.s3_key)
      }))
      .filter(item => item.parsed !== null)
      .map(item => ({
        ...item.file,
        frameNumber: item.parsed!.frameNumber
      }));

    // Apply frame range filter if specified
    let filteredFrames = framesWithParsedInfo;
    if (frameRange) {
      const [startFrame, endFrame] = frameRange.split('-').map(n => parseInt(n, 10));
      if (!isNaN(startFrame) && !isNaN(endFrame)) {
        filteredFrames = framesWithParsedInfo.filter(
          frame => frame.frameNumber >= startFrame && frame.frameNumber <= endFrame
        );
      }
    }

    // Sort frames
    switch (sort) {
      case 'date':
        filteredFrames.sort((a, b) => a.upload_date.getTime() - b.upload_date.getTime());
        break;
      case 'size':
        filteredFrames.sort((a, b) => b.file_size - a.file_size);
        break;
      case 'frame':
      default:
        filteredFrames.sort((a, b) => a.frameNumber - b.frameNumber);
        break;
    }

    // Build tree structure to get properly organized video node
    const allGroupFiles = await collection.find({
      s3_key: new RegExp(`^${groupId}_`)
    }).toArray();

    const groups = buildTreeStructure(allGroupFiles);
    const group = groups.find(g => g.groupId === groupId);
    const video = group?.videos.find(v => v.videoId === videoId);

    if (!video) {
      return NextResponse.json(
        createFileBrowserError('NOT_FOUND', `Video ${groupId}_${videoId} not found after parsing`),
        { status: 404 }
      );
    }

    // Apply pagination to frames
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedFrames = filteredFrames.slice(startIndex, endIndex);

    // Convert back to FileMetadata format and update video node
    const paginatedFileMetadata: FileMetadata[] = paginatedFrames.map(frame => ({
      _id: frame._id,
      bucket: frame.bucket,
      content_type: frame.content_type,
      file_hash: frame.file_hash,
      file_size: frame.file_size,
      public_url: frame.public_url,
      region: frame.region,
      s3_key: frame.s3_key,
      upload_date: frame.upload_date
    }));

    // Rebuild frame nodes for this subset
    const frameNodes = buildTreeStructure(paginatedFileMetadata)
      .find(g => g.groupId === groupId)
      ?.videos.find(v => v.videoId === videoId)
      ?.frames || [];

    // Create pagination info
    const pagination: PaginationInfo = {
      page,
      limit,
      total: filteredFrames.length,
      hasNext: endIndex < filteredFrames.length,
      hasPrev: page > 1
    };

    // Update video with paginated frames
    const videoWithPaginatedFrames: VideoNode = {
      ...video,
      frames: frameNodes,
      children: frameNodes,
      metadata: {
        ...video.metadata,
        frameCount: filteredFrames.length // Update count to reflect filtering
      }
    };

    const response: VideoResponse = {
      video: videoWithPaginatedFrames,
      frames: frameNodes,
      pagination
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`Error in /api/files/video/${params.groupId}/${params.videoId}:`, error);
    
    const errorResponse = createFileBrowserError(
      'DB_ERROR',
      'Failed to fetch video data',
      error
    );

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET /api/files/video/[groupId]/[videoId]/timeline
 * Get timeline data for video navigation (frame thumbnails at intervals)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string; videoId: string } }
) {
  try {
    const { groupId, videoId } = params;
    const body = await request.json();
    const { intervals = 10 } = body; // Number of timeline points

    const db = await connectToDatabase();
    const collection = db.collection<FileMetadata>('file_metadata');

    // Get all frames for this video
    const videoFiles = await collection.find({
      s3_key: new RegExp(`^${groupId}_${videoId}/`)
    }).toArray();

    if (videoFiles.length === 0) {
      return NextResponse.json(
        createFileBrowserError('NOT_FOUND', `Video ${groupId}_${videoId} not found`),
        { status: 404 }
      );
    }

    // Parse and sort frames by frame number
    const sortedFrames = videoFiles
      .map(file => ({
        file,
        parsed: parseS3Key(file.s3_key)
      }))
      .filter(item => item.parsed !== null)
      .sort((a, b) => a.parsed!.frameNumber - b.parsed!.frameNumber);

    // Select frames at regular intervals for timeline
    const frameCount = sortedFrames.length;
    const intervalSize = Math.max(1, Math.floor(frameCount / intervals));
    
    const timelineFrames = [];
    for (let i = 0; i < frameCount; i += intervalSize) {
      const frame = sortedFrames[i];
      timelineFrames.push({
        frameNumber: frame.parsed!.frameNumber,
        s3_key: frame.file.s3_key,
        public_url: frame.file.public_url,
        file_size: frame.file.file_size,
        upload_date: frame.file.upload_date,
        position: (i / frameCount) * 100 // Percentage position
      });
    }

    // Always include the last frame if not already included
    if (timelineFrames.length > 0) {
      const lastFrame = sortedFrames[frameCount - 1];
      const lastTimelineFrame = timelineFrames[timelineFrames.length - 1];
      
      if (lastTimelineFrame.frameNumber !== lastFrame.parsed!.frameNumber) {
        timelineFrames.push({
          frameNumber: lastFrame.parsed!.frameNumber,
          s3_key: lastFrame.file.s3_key,
          public_url: lastFrame.file.public_url,
          file_size: lastFrame.file.file_size,
          upload_date: lastFrame.file.upload_date,
          position: 100
        });
      }
    }

    return NextResponse.json({
      videoId: `${groupId}_${videoId}`,
      totalFrames: frameCount,
      timeline: timelineFrames
    });

  } catch (error) {
    console.error(`Error in timeline for ${params.groupId}/${params.videoId}:`, error);
    
    return NextResponse.json(
      createFileBrowserError('DB_ERROR', 'Failed to generate timeline', error),
      { status: 500 }
    );
  }
}