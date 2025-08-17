'use client';

import React, { useState, useMemo } from 'react';
import { 
  Grid, 
  List, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal,
  Home,
  ChevronRight,
  Image as ImageIcon,
  Play,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFileBrowser } from '@/hooks/use-file-browser';
import { FrameNode, VideoNode, GroupNode } from '@/lib/file-browser-types';
import { formatFileSize, formatDateRange } from '@/lib/file-browser-utils';

/**
 * ContentPanel - Main content area showing frames/videos based on navigation
 * 
 * Features:
 * - Grid and list view modes
 * - Virtual scrolling for large datasets
 * - Breadcrumb navigation
 * - Lazy loading thumbnails
 * - Quick preview and actions
 */
export function ContentPanel() {
  const {
    state,
    treeData,
    isLoading,
    setViewMode,
    setThumbnailSize,
    navigateToNode,
    selectNode
  } = useFileBrowser();

  const [previewFrame, setPreviewFrame] = useState<FrameNode | null>(null);

  // Get current content based on navigation path
  const currentContent = useMemo(() => {
    if (!treeData || state.currentPath.length === 0) {
      // Show all groups
      return {
        type: 'groups' as const,
        items: treeData?.groups || [],
        title: 'All Groups'
      };
    }

    const [groupId, videoId] = state.currentPath;
    const group = treeData.groups.find(g => g.groupId === groupId);

    if (!group) {
      return { type: 'groups' as const, items: [], title: 'Group Not Found' };
    }

    if (!videoId) {
      // Show videos in group
      return {
        type: 'videos' as const,
        items: group.videos,
        title: `Group ${groupId}`,
        group
      };
    }

    // Show frames in video
    const video = group.videos.find(v => v.videoId === videoId);
    if (!video) {
      return { type: 'videos' as const, items: [], title: 'Video Not Found' };
    }

    return {
      type: 'frames' as const,
      items: video.frames,
      title: `${groupId} › ${videoId}`,
      group,
      video
    };
  }, [treeData, state.currentPath]);

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (index: number) => {
    if (index === 0) {
      navigateToNode([]);
    } else {
      const path = state.breadcrumbs[index].path;
      navigateToNode(path);
    }
  };

  // Handle item click
  const handleItemClick = (item: GroupNode | VideoNode | FrameNode) => {
    if (item.type === 'group') {
      navigateToNode([item.groupId]);
    } else if (item.type === 'video') {
      navigateToNode([item.groupId, item.videoId]);
    } else if (item.type === 'frame') {
      selectNode(item.id);
      setPreviewFrame(item);
    }
  };

  // Render grid item
  const renderGridItem = (item: GroupNode | VideoNode | FrameNode) => {
    const isSelected = state.selectedNodes.has(item.id);
    
    return (
      <div
        key={item.id}
        className={`
          group relative bg-card border rounded-lg overflow-hidden cursor-pointer
          hover:shadow-md transition-all duration-200
          ${isSelected ? 'ring-2 ring-primary' : ''}
          ${state.thumbnailSize === 'small' ? 'aspect-square' : ''}
          ${state.thumbnailSize === 'medium' ? 'aspect-[4/3]' : ''}
          ${state.thumbnailSize === 'large' ? 'aspect-[3/2]' : ''}
        `}
        onClick={() => handleItemClick(item)}
      >
        {/* Thumbnail */}
        <div className="relative flex-1 bg-muted flex items-center justify-center">
          {item.type === 'frame' ? (
            <img
              src={(item as FrameNode).fileMetadata.public_url}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const nextElement = target.nextElementSibling as HTMLElement;
                nextElement?.classList.remove('hidden');
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {item.type === 'group' && (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-2 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {item.metadata.frameCount} frames
                  </Badge>
                </div>
              )}
              {item.type === 'video' && (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-2 bg-green-100 rounded-lg flex items-center justify-center">
                    <Play className="w-8 h-8 text-green-600" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {item.metadata.frameCount} frames
                  </Badge>
                </div>
              )}
            </div>
          )}
          
          {/* Error placeholder (hidden by default) */}
          <div className="hidden absolute inset-0 bg-muted flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex gap-2">
              <Button size="sm" variant="secondary">
                <Maximize2 className="w-4 h-4" />
              </Button>
              {item.type === 'frame' && (
                <Button size="sm" variant="secondary">
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="p-3">
          <div className="font-medium text-sm truncate mb-1">
            {item.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {item.type === 'frame' && (
              <div>
                {formatFileSize((item as FrameNode).fileMetadata.file_size)}
                <span className="mx-1">•</span>
                Frame #{(item as FrameNode).frameNumber}
              </div>
            )}
            {(item.type === 'group' || item.type === 'video') && (
              <div>
                {formatFileSize(item.metadata.totalSize)}
                <span className="mx-1">•</span>
                {formatDateRange(item.metadata.dateRange.start, item.metadata.dateRange.end)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render list item
  const renderListItem = (item: GroupNode | VideoNode | FrameNode) => {
    const isSelected = state.selectedNodes.has(item.id);
    
    return (
      <div
        key={item.id}
        className={`
          flex items-center gap-4 p-3 border rounded-lg cursor-pointer
          hover:bg-accent transition-colors
          ${isSelected ? 'bg-primary/10 border-primary' : ''}
        `}
        onClick={() => handleItemClick(item)}
      >
        {/* Thumbnail */}
        <div className="w-16 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
          {item.type === 'frame' ? (
            <img
              src={(item as FrameNode).fileMetadata.public_url}
              alt={item.name}
              className="w-full h-full object-cover rounded"
              loading="lazy"
            />
          ) : (
            <div>
              {item.type === 'group' && <ImageIcon className="w-6 h-6 text-blue-600" />}
              {item.type === 'video' && <Play className="w-6 h-6 text-green-600" />}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{item.name}</span>
            <Badge variant="secondary" className="text-xs">
              {item.type === 'frame' ? 'Frame' : item.metadata.frameCount}
            </Badge>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {item.type === 'frame' && (
              <>
                Frame #{(item as FrameNode).frameNumber} • 
                {formatFileSize((item as FrameNode).fileMetadata.file_size)}
              </>
            )}
            {(item.type === 'group' || item.type === 'video') && (
              <>
                {formatFileSize(item.metadata.totalSize)} • 
                {formatDateRange(item.metadata.dateRange.start, item.metadata.dateRange.end)}
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b bg-card">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 mb-4">
          {state.breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id}>
              {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className="text-sm hover:text-primary transition-colors"
              >
                {index === 0 ? <Home className="w-4 h-4" /> : crumb.name}
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{currentContent.title}</h1>
            <Badge variant="outline">
              {currentContent.items.length} items
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9 w-64" />
            </div>

            {/* View Mode Toggle */}
            <div className="flex border rounded-md">
              <Button
                variant={state.viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={state.viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Thumbnail Size (Grid mode only) */}
            {state.viewMode === 'grid' && (
              <select
                value={state.thumbnailSize}
                onChange={(e) => setThumbnailSize(e.target.value as any)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            )}

            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          )}

          {!isLoading && currentContent.items.length === 0 && (
            <div className="text-center py-12">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No items found</h3>
              <p className="text-muted-foreground">
                This {currentContent.type.slice(0, -1)} appears to be empty.
              </p>
            </div>
          )}

          {!isLoading && currentContent.items.length > 0 && (
            <div>
              {state.viewMode === 'grid' ? (
                <div 
                  className={`
                    grid gap-4
                    ${state.thumbnailSize === 'small' ? 'grid-cols-6 lg:grid-cols-8' : ''}
                    ${state.thumbnailSize === 'medium' ? 'grid-cols-4 lg:grid-cols-6' : ''}
                    ${state.thumbnailSize === 'large' ? 'grid-cols-2 lg:grid-cols-4' : ''}
                  `}
                >
                  {currentContent.items.map(item => renderGridItem(item))}
                </div>
              ) : (
                <div className="space-y-2">
                  {currentContent.items.map(item => renderListItem(item))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Preview Modal would go here */}
      {previewFrame && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-4 rounded-lg max-w-2xl max-h-[80vh] overflow-auto">
            <img
              src={previewFrame.fileMetadata.public_url}
              alt={previewFrame.name}
              className="max-w-full max-h-full"
            />
            <div className="mt-4 flex justify-between">
              <div>
                <h3 className="font-medium">{previewFrame.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Frame #{previewFrame.frameNumber} • {formatFileSize(previewFrame.fileMetadata.file_size)}
                </p>
              </div>
              <Button onClick={() => setPreviewFrame(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}