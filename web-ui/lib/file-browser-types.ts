// File Browser Types for MongoDB Video Frame Navigation

import { ObjectId } from 'mongodb';

// MongoDB file_metadata document structure
export interface FileMetadata {
  _id: ObjectId;
  bucket: string;
  content_type: string;
  file_hash: string;
  file_size: number;
  public_url: string;
  region: string;
  s3_key: string;
  upload_date: Date;
}

// Parsed path components from s3_key
export interface ParsedPath {
  group: string;      // e.g., "L23"
  video: string;      // e.g., "V001"
  frame: string;      // e.g., "001.jpg"
  frameNumber: number; // parsed number from frame
}

// Tree node structure for hierarchical display
export interface TreeNode {
  id: string;
  name: string;
  type: 'group' | 'video' | 'frame';
  children?: TreeNode[];
  metadata: TreeNodeMetadata;
  expanded?: boolean;
  loading?: boolean;
  selected?: boolean;
}

// Metadata for tree nodes at different levels
export interface TreeNodeMetadata {
  frameCount: number;
  totalSize: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  // Video-specific metadata
  duration?: number;
  resolution?: string;
  // Frame-specific metadata  
  dimensions?: {
    width: number;
    height: number;
  };
  timestamp?: string;
}

// Group node (L23, L24, etc.)
export interface GroupNode extends TreeNode {
  type: 'group';
  groupId: string;
  videos: VideoNode[];
  metadata: TreeNodeMetadata & {
    videoCount: number;
  };
}

// Video node (V001, V002, etc.)
export interface VideoNode extends TreeNode {
  type: 'video';
  groupId: string;
  videoId: string;
  frames: FrameNode[];
  metadata: TreeNodeMetadata & {
    averageFrameSize: number;
  };
}

// Frame node (001.jpg, 002.jpg, etc.)
export interface FrameNode extends TreeNode {
  type: 'frame';
  groupId: string;
  videoId: string;
  frameNumber: number;
  fileMetadata: FileMetadata;
  metadata: TreeNodeMetadata & {
    fileHash: string;
    mimeType: string;
  };
}

// API Response types
export interface TreeResponse {
  groups: GroupNode[];
  totalFiles: number;
  totalSize: number;
  totalGroups: number;
  totalVideos: number;
}

export interface GroupResponse {
  group: GroupNode;
  videos: VideoNode[];
  pagination?: PaginationInfo;
}

export interface VideoResponse {
  video: VideoNode;
  frames: FrameNode[];
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Search and filter types
export interface FileFilters {
  groups?: string[];
  videos?: string[];
  contentTypes?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
}

export interface SearchRequest {
  query: string;
  scope: 'all' | 'group' | 'video';
  filters?: FileFilters;
  limit?: number;
  page?: number;
}

export interface SearchResponse {
  results: (GroupNode | VideoNode | FrameNode)[];
  total: number;
  pagination: PaginationInfo;
  facets?: SearchFacets;
}

export interface SearchFacets {
  groups: Array<{ name: string; count: number }>;
  videos: Array<{ name: string; count: number }>;
  contentTypes: Array<{ name: string; count: number }>;
}

// UI State types
export interface FileBrowserState {
  // Tree state
  expandedNodes: Set<string>;
  selectedNodes: Set<string>;
  loadingNodes: Set<string>;
  
  // View state
  viewMode: 'grid' | 'list';
  thumbnailSize: 'small' | 'medium' | 'large';
  sortBy: 'name' | 'date' | 'size';
  sortDirection: 'asc' | 'desc';
  
  // Navigation state
  currentPath: string[];
  breadcrumbs: BreadcrumbItem[];
  
  // Search state
  searchQuery: string;
  activeFilters: FileFilters;
  
  // Selection state
  multiSelectMode: boolean;
  lastSelectedNode: string | null;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
  type: 'root' | 'group' | 'video';
  path: string[];
}

// Integration types for future search platform
export interface SearchPlatformIntegration {
  onFrameSelect: (frames: FileMetadata[]) => void;
  onSimilaritySearch: (frameId: string) => void;
  onAddToCanvas: (frame: FileMetadata) => void;
  navigationContext?: NavigationContext;
  selectionContext?: SelectionContext;
}

export interface NavigationContext {
  currentGroup?: string;
  currentVideo?: string;
  viewHistory: string[];
  lastViewTime: Date;
}

export interface SelectionContext {
  selectedFrames: FileMetadata[];
  selectionMode: 'single' | 'multiple' | 'range';
  lastAction: 'select' | 'preview' | 'download' | 'search';
}

// Utility types for tree operations
export type TreeUpdateAction = 
  | { type: 'EXPAND_NODE'; nodeId: string }
  | { type: 'COLLAPSE_NODE'; nodeId: string }
  | { type: 'SELECT_NODE'; nodeId: string; multiSelect?: boolean }
  | { type: 'LOAD_CHILDREN'; nodeId: string }
  | { type: 'UPDATE_METADATA'; nodeId: string; metadata: Partial<TreeNodeMetadata> };

// MongoDB aggregation result types for optimized large dataset queries
export interface AggregationGroupResult {
  _id: string; // group ID
  videos: Array<{
    videoId: string;
    frameCount: number;
    totalSize: number;
    dateRange: { start: Date; end: Date };
    averageFrameSize: number;
    sampleFrame: {
      s3_key: string;
      public_url: string;
      file_size: number;
    };
  }>;
  totalFrames: number;
  totalSize: number;
  videoCount: number;
  groupDateStart: Date;
  groupDateEnd: Date;
}

export interface AggregationVideoResult {
  _id: { group: string; video: string };
  frames: FileMetadata[];
  frameCount: number;
  totalSize: number;
  dateRange: { start: Date; end: Date };
}

// Error types
export interface FileBrowserError {
  code: 'PARSE_ERROR' | 'DB_ERROR' | 'NOT_FOUND' | 'INVALID_PATH';
  message: string;
  details?: unknown;
}