// Search API - Search across files with filters and facets
import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db } from 'mongodb';
import { 
  FileMetadata, 
  SearchRequest,
  SearchResponse,
  SearchFacets,
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
 * POST /api/files/search
 * 
 * Body:
 * {
 *   query: string,
 *   scope: 'all' | 'group' | 'video',
 *   filters?: FileFilters,
 *   limit?: number,
 *   page?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const searchRequest: SearchRequest = await request.json();
    const {
      query,
      scope = 'all',
      filters = {},
      limit = 50,
      page = 1
    } = searchRequest;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        createFileBrowserError('INVALID_PATH', 'Search query is required'),
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection<FileMetadata>('file_metadata');

    // Build MongoDB query based on search parameters
    const mongoQuery = buildSearchQuery(query, scope, filters);
    
    console.log('Search query:', JSON.stringify(mongoQuery, null, 2));

    // Execute search with pagination
    const skip = (page - 1) * limit;
    
    const [results, total, facets] = await Promise.all([
      collection.find(mongoQuery).skip(skip).limit(limit).toArray(),
      collection.countDocuments(mongoQuery),
      generateSearchFacets(collection, mongoQuery, query)
    ]);

    // Organize results by scope - simplified for performance
    const organizedResults: FileMetadata[] = results;

    // Create pagination info
    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      hasNext: skip + limit < total,
      hasPrev: page > 1
    };

    const response: SearchResponse = {
      results: organizedResults,
      total,
      pagination,
      facets
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in /api/files/search:', error);
    
    const errorResponse = createFileBrowserError(
      'DB_ERROR',
      'Search failed',
      error
    );

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Build MongoDB search query based on parameters
 */
function buildSearchQuery(query: string, scope: string, filters: Record<string, unknown>): Record<string, unknown> {
  const baseQuery: Record<string, unknown> = {};
  
  // Text search in s3_key (which contains group, video, and frame info)
  if (query) {
    baseQuery.$or = [
      { s3_key: new RegExp(query, 'i') },
      { content_type: new RegExp(query, 'i') }
    ];
  }

  // Apply scope-specific filters
  if (scope === 'group' && query) {
    // Search for groups (L23, L24, etc.)
    baseQuery.s3_key = new RegExp(`^${query.toUpperCase()}`, 'i');
  } else if (scope === 'video' && query) {
    // Search for videos (V001, V002, etc.)
    baseQuery.s3_key = new RegExp(`_${query.toUpperCase()}`, 'i');
  }

  // Apply additional filters
  if (filters.groups && filters.groups.length > 0) {
    const groupRegex = filters.groups.map(g => `^${g}_`).join('|');
    baseQuery.s3_key = new RegExp(groupRegex);
  }

  if (filters.videos && filters.videos.length > 0) {
    const videoRegex = filters.videos.map(v => `_${v}/`).join('|');
    baseQuery.s3_key = { ...baseQuery.s3_key, $regex: new RegExp(videoRegex) };
  }

  if (filters.contentTypes && filters.contentTypes.length > 0) {
    baseQuery.content_type = { $in: filters.contentTypes };
  }

  if (filters.dateRange) {
    baseQuery.upload_date = {
      $gte: new Date(filters.dateRange.start),
      $lte: new Date(filters.dateRange.end)
    };
  }

  if (filters.sizeRange) {
    baseQuery.file_size = {
      $gte: filters.sizeRange.min,
      $lte: filters.sizeRange.max
    };
  }

  return baseQuery;
}

/**
 * Generate search facets for filtering
 */
async function generateSearchFacets(
  collection: any,
  baseQuery: Record<string, unknown>,
  _query: string
): Promise<SearchFacets> {
  try {
    // Generate facets using aggregation
    const facetPipeline = [
      { $match: baseQuery },
      {
        $project: {
          s3_key: 1,
          content_type: 1,
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
        $facet: {
          groups: [
            { $group: { _id: "$parsedPath.group", count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
            { $limit: 20 }
          ],
          videos: [
            { 
              $group: { 
                _id: { 
                  $concat: ["$parsedPath.group", "_", "$parsedPath.video"] 
                }, 
                count: { $sum: 1 } 
              } 
            },
            { $sort: { _id: 1 } },
            { $limit: 20 }
          ],
          contentTypes: [
            { $group: { _id: "$content_type", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ]
        }
      }
    ];

    const facetResults = await collection.aggregate(facetPipeline).toArray();
    const facetData = facetResults[0] || { groups: [], videos: [], contentTypes: [] };

    return {
      groups: facetData.groups.map((g: { _id: string; count: number }) => ({
        name: g._id,
        count: g.count
      })),
      videos: facetData.videos.map((v: { _id: string; count: number }) => ({
        name: v._id,
        count: v.count
      })),
      contentTypes: facetData.contentTypes.map((c: { _id: string; count: number }) => ({
        name: c._id,
        count: c.count
      }))
    };

  } catch (error) {
    console.error('Error generating search facets:', error);
    return {
      groups: [],
      videos: [],
      contentTypes: []
    };
  }
}

/**
 * GET /api/files/search/suggestions
 * Get search suggestions based on partial query
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const db = await connectToDatabase();
    const collection = db.collection<FileMetadata>('file_metadata');

    // Get unique groups and videos that match the query
    const suggestions = await collection.aggregate([
      {
        $project: {
          s3_key: 1,
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
        $match: {
          $or: [
            { "parsedPath.group": new RegExp(query, 'i') },
            { "parsedPath.video": new RegExp(query, 'i') }
          ]
        }
      },
      {
        $group: {
          _id: null,
          groups: { $addToSet: "$parsedPath.group" },
          videos: { $addToSet: "$parsedPath.video" }
        }
      }
    ]).toArray();

    const suggestionData = suggestions[0] || { groups: [], videos: [] };
    
    const allSuggestions = [
      ...(suggestionData.groups as string[]).map((g: string) => ({ 
        text: g, 
        type: 'group' as const,
        description: `Group ${g}`
      })),
      ...(suggestionData.videos as string[]).map((v: string) => ({ 
        text: v, 
        type: 'video' as const,
        description: `Video ${v}`
      }))
    ]
    .filter(s => s.text.toLowerCase().includes(query.toLowerCase()))
    .slice(0, limit);

    return NextResponse.json({ suggestions: allSuggestions });

  } catch (error) {
    console.error('Error in /api/files/search/suggestions:', error);
    return NextResponse.json(
      createFileBrowserError('DB_ERROR', 'Failed to get suggestions', error),
      { status: 500 }
    );
  }
}