// File Browser Utilities for Path Parsing and Tree Operations

import { 
  FileMetadata, 
  ParsedPath, 
  TreeNode, 
  GroupNode, 
  VideoNode, 
  FrameNode,
  FileBrowserError
} from './file-browser-types';

/**
 * Parse s3_key into hierarchical components
 * Expected format: L23_V001/001.jpg
 */
export function parseS3Key(s3Key: string): ParsedPath | null {
  try {
    // Regex to match pattern: {GROUP}_{VIDEO}/{FRAME}
    const pathRegex = /^([A-Z]\d+)_([A-Z]\d+)\/(\d+\.jpg)$/;
    const match = s3Key.match(pathRegex);
    
    if (!match) {
      console.warn(`Invalid s3_key format: ${s3Key}`);
      return null;
    }

    const [, group, video, frame] = match;
    
    // Extract frame number from filename
    const frameNumberMatch = frame.match(/^(\d+)\.jpg$/);
    const frameNumber = frameNumberMatch ? parseInt(frameNumberMatch[1], 10) : 0;

    return {
      group,
      video,
      frame,
      frameNumber
    };
  } catch (error) {
    console.error(`Error parsing s3_key: ${s3Key}`, error);
    return null;
  }
}

/**
 * Group file metadata by hierarchy: Group → Video → Frames
 */
export function buildTreeStructure(files: FileMetadata[]): GroupNode[] {
  const groupMap = new Map<string, Map<string, FileMetadata[]>>();
  
  // Group files by group and video
  for (const file of files) {
    const parsed = parseS3Key(file.s3_key);
    if (!parsed) continue;

    const { group, video } = parsed;
    
    if (!groupMap.has(group)) {
      groupMap.set(group, new Map());
    }
    
    const videoMap = groupMap.get(group)!;
    if (!videoMap.has(video)) {
      videoMap.set(video, []);
    }
    
    videoMap.get(video)!.push(file);
  }

  // Build tree structure
  const groups: GroupNode[] = [];
  
  for (const [groupId, videoMap] of groupMap.entries()) {
    const videos: VideoNode[] = [];
    let groupFrameCount = 0;
    let groupTotalSize = 0;
    let groupDateStart = new Date();
    let groupDateEnd = new Date(0);

    for (const [videoId, frames] of videoMap.entries()) {
      // Sort frames by frame number
      const sortedFrames = frames.sort((a, b) => {
        const parsedA = parseS3Key(a.s3_key);
        const parsedB = parseS3Key(b.s3_key);
        return (parsedA?.frameNumber || 0) - (parsedB?.frameNumber || 0);
      });

      // Calculate video metadata
      const videoFrameCount = sortedFrames.length;
      const videoTotalSize = sortedFrames.reduce((sum, f) => sum + f.file_size, 0);
      const videoDateStart = new Date(Math.min(...sortedFrames.map(f => f.upload_date.getTime())));
      const videoDateEnd = new Date(Math.max(...sortedFrames.map(f => f.upload_date.getTime())));

      // Create frame nodes
      const frameNodes: FrameNode[] = sortedFrames.map(file => {
        const parsed = parseS3Key(file.s3_key)!;
        return {
          id: `${groupId}_${videoId}_${parsed.frameNumber}`,
          name: parsed.frame,
          type: 'frame',
          groupId,
          videoId,
          frameNumber: parsed.frameNumber,
          fileMetadata: file,
          metadata: {
            frameCount: 1,
            totalSize: file.file_size,
            dateRange: {
              start: file.upload_date,
              end: file.upload_date
            },
            fileHash: file.file_hash,
            mimeType: file.content_type,
            dimensions: extractDimensionsFromContentType(file.content_type)
          }
        };
      });

      // Create video node
      const videoNode: VideoNode = {
        id: `${groupId}_${videoId}`,
        name: videoId,
        type: 'video',
        groupId,
        videoId,
        frames: frameNodes,
        children: frameNodes,
        metadata: {
          frameCount: videoFrameCount,
          totalSize: videoTotalSize,
          dateRange: {
            start: videoDateStart,
            end: videoDateEnd
          },
          averageFrameSize: Math.round(videoTotalSize / videoFrameCount),
          duration: estimateVideoDuration(videoFrameCount)
        }
      };

      videos.push(videoNode);
      
      // Update group totals
      groupFrameCount += videoFrameCount;
      groupTotalSize += videoTotalSize;
      if (videoDateStart < groupDateStart) groupDateStart = videoDateStart;
      if (videoDateEnd > groupDateEnd) groupDateEnd = videoDateEnd;
    }

    // Create group node
    const groupNode: GroupNode = {
      id: groupId,
      name: groupId,
      type: 'group',
      groupId,
      videos,
      children: videos,
      metadata: {
        frameCount: groupFrameCount,
        totalSize: groupTotalSize,
        dateRange: {
          start: groupDateStart,
          end: groupDateEnd
        },
        videoCount: videos.length
      }
    };

    groups.push(groupNode);
  }

  // Sort groups by name
  return groups.sort((a, b) => a.groupId.localeCompare(b.groupId));
}

/**
 * Find a node in the tree by ID
 */
export function findNodeById(nodes: TreeNode[], nodeId: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }
    if (node.children) {
      const found = findNodeById(node.children, nodeId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Get the path to a node (breadcrumbs)
 */
export function getNodePath(nodes: TreeNode[], nodeId: string): TreeNode[] {
  function findPath(currentNodes: TreeNode[], path: TreeNode[]): TreeNode[] | null {
    for (const node of currentNodes) {
      const newPath = [...path, node];
      
      if (node.id === nodeId) {
        return newPath;
      }
      
      if (node.children) {
        const found = findPath(node.children, newPath);
        if (found) return found;
      }
    }
    return null;
  }

  return findPath(nodes, []) || [];
}

/**
 * Update node metadata after changes
 */
export function updateNodeMetadata(node: TreeNode): TreeNode {
  if (!node.children || node.children.length === 0) {
    return node;
  }

  // Recursively update children first
  const updatedChildren = node.children.map(updateNodeMetadata);

  // Calculate aggregate metadata
  const frameCount = updatedChildren.reduce((sum, child) => sum + child.metadata.frameCount, 0);
  const totalSize = updatedChildren.reduce((sum, child) => sum + child.metadata.totalSize, 0);
  
  const dates = updatedChildren.flatMap(child => [
    child.metadata.dateRange.start,
    child.metadata.dateRange.end
  ]);
  
  const dateRange = {
    start: new Date(Math.min(...dates.map(d => d.getTime()))),
    end: new Date(Math.max(...dates.map(d => d.getTime())))
  };

  return {
    ...node,
    children: updatedChildren,
    metadata: {
      ...node.metadata,
      frameCount,
      totalSize,
      dateRange
    }
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Format date range for display
 */
export function formatDateRange(start: Date | string, end: Date | string): string {
  // Ensure we have proper Date objects
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);
  
  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 'Invalid date';
  }
  
  const sameDay = startDate.toDateString() === endDate.toDateString();
  
  if (sameDay) {
    return startDate.toLocaleDateString();
  }
  
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const options: Intl.DateTimeFormatOptions = sameYear 
    ? { month: 'short', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' };

  return `${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(undefined, options)}`;
}

/**
 * Estimate video duration based on frame count (assuming 30fps)
 */
function estimateVideoDuration(frameCount: number, fps: number = 30): number {
  return Math.round(frameCount / fps);
}

/**
 * Extract image dimensions from content type or filename
 */
function extractDimensionsFromContentType(contentType: string): { width: number; height: number } | undefined {
  // This would need to be enhanced with actual image metadata
  // For now, assume common dimensions
  if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) {
    return { width: 1920, height: 1080 }; // Default HD
  }
  return undefined;
}

/**
 * Validate s3_key format
 */
export function validateS3Key(s3Key: string): boolean {
  return parseS3Key(s3Key) !== null;
}

/**
 * Generate node statistics for display
 */
export function generateNodeStats(node: TreeNode): string {
  const { frameCount, totalSize } = node.metadata;
  const size = formatFileSize(totalSize);
  
  switch (node.type) {
    case 'group':
      const groupNode = node as GroupNode;
      return `${frameCount} frames, ${size}, ${groupNode.videos.length} videos`;
    case 'video':
      return `${frameCount} frames, ${size}`;
    case 'frame':
      return size;
    default:
      return '';
  }
}

/**
 * Error handling utilities
 */
export function createFileBrowserError(
  code: FileBrowserError['code'],
  message: string,
  details?: any
): FileBrowserError {
  return { code, message, details };
}

/**
 * Debounce utility for search
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout;
  
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}

/**
 * Create a tree node ID from components
 */
export function createNodeId(groupId: string, videoId?: string, frameNumber?: number): string {
  if (frameNumber !== undefined && videoId) {
    return `${groupId}_${videoId}_${frameNumber}`;
  }
  if (videoId) {
    return `${groupId}_${videoId}`;
  }
  return groupId;
}