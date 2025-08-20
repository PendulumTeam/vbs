'use client';

import React, { useState } from 'react';
import { 
  Grid, 
  List, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal,
  Home,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Play,
  Maximize2,
  Loader2,
  Folder,
  Share
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProgressiveFileBrowser, GroupSummary, VideoSummary, FrameData } from '@/hooks/use-progressive-file-browser';

/**
 * Progressive Content Panel - Context-aware display based on selection level
 * 
 * Level 1: Groups overview (when no group selected)
 * Level 2: Videos in group (when group selected but no video)
 * Level 3: Frames in video (when video selected)
 */
export function ProgressiveContentPanel() {
  const {
    state,
    groupsData,
    currentGroupVideos,
    currentVideoFrames,
    selectGroup,
    selectVideo,
    setViewMode,
    setThumbnailSize,
    setFramesPerPage,
    selectFrame,
    navigateToPage,
    nextPage,
    prevPage
  } = useProgressiveFileBrowser();

  const [previewFrame, setPreviewFrame] = useState<FrameData | null>(null);
  const [searchInput, setSearchInput] = useState('');

  // Determine current content level
  const getCurrentContent = () => {
    if (!state.selectedGroup) {
      return {
        level: 'groups' as const,
        title: 'All Groups',
        items: groupsData.data?.groups || [],
        isLoading: groupsData.isLoading,
        error: groupsData.error
      };
    }
    
    if (!state.selectedVideo) {
      return {
        level: 'videos' as const,
        title: `Group ${state.selectedGroup}`,
        items: currentGroupVideos.data?.videos || [],
        isLoading: currentGroupVideos.isLoading,
        error: currentGroupVideos.error
      };
    }
    
    return {
      level: 'frames' as const,
      title: `${state.selectedGroup} › ${state.selectedVideo}`,
      items: currentVideoFrames.data?.frames || [],
      isLoading: currentVideoFrames.isLoading,
      error: currentVideoFrames.error,
      pagination: currentVideoFrames.data?.pagination
    };
  };

  const currentContent = getCurrentContent();

  // Keyboard navigation for pagination
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard navigation when viewing frames
      if (currentContent.level !== 'frames' || !currentContent.pagination) return;
      
      // Ignore if user is typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          if (currentContent.pagination.hasPrev) {
            event.preventDefault();
            prevPage();
          }
          break;
        case 'ArrowRight':
          if (currentContent.pagination.hasNext) {
            event.preventDefault();
            nextPage();
          }
          break;
        case 'Home':
          if (currentContent.pagination.page > 1) {
            event.preventDefault();
            navigateToPage(1);
          }
          break;
        case 'End':
          if (currentContent.pagination.page < currentContent.pagination.totalPages) {
            event.preventDefault();
            navigateToPage(currentContent.pagination.totalPages);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentContent.level, currentContent.pagination, nextPage, prevPage, navigateToPage]);

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (level: 'home' | 'group') => {
    if (level === 'home') {
      selectGroup(null);
      selectVideo(null);
    } else if (level === 'group') {
      selectVideo(null);
    }
  };

  // Handle item click based on content level
  const handleItemClick = (item: GroupSummary | VideoSummary | FrameData) => {
    if (currentContent.level === 'groups') {
      const group = item as GroupSummary;
      selectGroup(group.id);
    } else if (currentContent.level === 'videos') {
      const video = item as VideoSummary;
      selectVideo(video.id);
    } else if (currentContent.level === 'frames') {
      const frame = item as FrameData;
      selectFrame(frame.id);
      setPreviewFrame(frame);
    }
  };

  // Format file size
  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  // Render item based on content level
  const renderItem = (item: GroupSummary | VideoSummary | FrameData) => {
    const itemId = 'id' in item ? item.id : 'name' in item ? item.name : '';
    const isSelected = state.selectedFrames.has(itemId);
    
    return (
      <div
        key={itemId}
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
        {/* Thumbnail/Icon */}
        <div className="relative flex-1 bg-muted flex items-center justify-center">
          {currentContent.level === 'frames' ? (
            // Frame thumbnail
            <img
              src={(item as FrameData).url}
              alt={`Frame ${(item as FrameData).name}`}
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
            // Icon for groups/videos
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-2 rounded-lg flex items-center justify-center ${
                currentContent.level === 'groups' 
                  ? 'bg-blue-100' 
                  : 'bg-green-100'
              }`}>
                {currentContent.level === 'groups' ? (
                  <Folder className="w-8 h-8 text-blue-600" />
                ) : (
                  <Play className="w-8 h-8 text-green-600" />
                )}
              </div>
              
              {/* Stats badge */}
              <Badge variant="secondary" className="text-xs">
                {currentContent.level === 'groups' 
                  ? `${(item as GroupSummary).videoCount} videos`
                  : `${(item as VideoSummary).frameCount} frames`
                }
              </Badge>
            </div>
          )}
          
          {/* Error placeholder */}
          <div className="hidden absolute inset-0 bg-muted flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex gap-2">
              <Button size="sm" variant="secondary">
                <Maximize2 className="w-4 h-4" />
              </Button>
              {currentContent.level === 'frames' && (
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
            {'name' in item ? item.name : item.id}
          </div>
          <div className="text-xs text-muted-foreground">
            {currentContent.level === 'groups' && (
              <>
                {formatSize((item as GroupSummary).totalSize)} • 
                {(item as GroupSummary).totalFrames.toLocaleString()} frames
              </>
            )}
            {currentContent.level === 'videos' && (
              <>
                {formatSize((item as VideoSummary).totalSize)} • 
                {(item as VideoSummary).frameCount} frames
              </>
            )}
            {currentContent.level === 'frames' && (
              <>
                {formatSize((item as FrameData).fileSize)} • 
                Frame #{(item as FrameData).frameNumber}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with Breadcrumbs */}
      <div className="p-4 border-b bg-card">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 mb-4">
          <button
            onClick={() => handleBreadcrumbClick('home')}
            className="text-sm hover:text-primary transition-colors"
          >
            <Home className="w-4 h-4" />
          </button>
          
          {state.selectedGroup && (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <button
                onClick={() => handleBreadcrumbClick('group')}
                className="text-sm hover:text-primary transition-colors"
              >
                {state.selectedGroup}
              </button>
            </>
          )}
          
          {state.selectedVideo && (
            <>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {state.selectedVideo}
              </span>
            </>
          )}
        </nav>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{currentContent.title}</h1>
            <Badge variant="outline">
              {currentContent.isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                `${currentContent.items.length} items`
              )}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Search (only show for frames level) */}
            {currentContent.level === 'frames' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search frames..." 
                  className="pl-9 w-48"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
            )}

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
          {/* Loading State */}
          {currentContent.isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading {currentContent.level}...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {currentContent.error && (
            <div className="text-center py-12">
              <div className="text-destructive text-xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium mb-2">Failed to Load</h3>
              <p className="text-muted-foreground mb-4">
                {currentContent.error instanceof Error 
                  ? currentContent.error.message 
                  : 'Unknown error occurred'
                }
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!currentContent.isLoading && !currentContent.error && currentContent.items.length === 0 && (
            <div className="text-center py-12">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No {currentContent.level} found</h3>
              <p className="text-muted-foreground">
                {currentContent.level === 'groups' && 'No video groups available'}
                {currentContent.level === 'videos' && 'No videos in this group'}
                {currentContent.level === 'frames' && 'No frames in this video'}
              </p>
            </div>
          )}

          {/* Content Grid/List */}
          {!currentContent.isLoading && !currentContent.error && currentContent.items.length > 0 && (
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
                  {currentContent.items.map(item => renderItem(item))}
                </div>
              ) : (
                <div className="space-y-2">
                  {currentContent.items.map(item => renderListItem(item))}
                </div>
              )}
              
              {/* Enhanced Pagination for frames */}
              {currentContent.level === 'frames' && currentContent.pagination && (
                <div className="mt-6 pt-4 border-t space-y-4">
                  {/* Pagination Info */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {currentContent.pagination.page} of {currentContent.pagination.totalPages} 
                      ({currentContent.pagination.total} total frames)
                    </div>
                    
                    {/* Frames per page selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Show:</span>
                      <select
                        value={state.framesPerPage}
                        onChange={(e) => setFramesPerPage(parseInt(e.target.value) as 25 | 50 | 100)}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-sm text-muted-foreground">per page</span>
                    </div>
                  </div>
                  
                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between">
                    {/* Left side - Previous */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={!currentContent.pagination.hasPrev}
                      onClick={prevPage}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>

                    {/* Center - Page Numbers */}
                    <div className="flex items-center gap-1">
                      {/* First page */}
                      {currentContent.pagination.page > 3 && (
                        <>
                          <Button
                            variant={1 === currentContent.pagination.page ? "default" : "ghost"}
                            size="sm"
                            onClick={() => navigateToPage(1)}
                          >
                            1
                          </Button>
                          {currentContent.pagination.page > 4 && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                        </>
                      )}

                      {/* Current page range */}
                      {Array.from({ length: Math.min(5, currentContent.pagination.totalPages) }, (_, i) => {
                        const startPage = Math.max(1, Math.min(
                          currentContent.pagination.page - 2,
                          currentContent.pagination.totalPages - 4
                        ));
                        const pageNum = startPage + i;
                        
                        if (pageNum <= currentContent.pagination.totalPages) {
                          return (
                            <Button
                              key={pageNum}
                              variant={pageNum === currentContent.pagination.page ? "default" : "ghost"}
                              size="sm"
                              onClick={() => navigateToPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                        return null;
                      })}

                      {/* Last page */}
                      {currentContent.pagination.page < currentContent.pagination.totalPages - 2 && (
                        <>
                          {currentContent.pagination.page < currentContent.pagination.totalPages - 3 && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentContent.pagination.totalPages === currentContent.pagination.page ? "default" : "ghost"}
                            size="sm"
                            onClick={() => navigateToPage(currentContent.pagination.totalPages)}
                          >
                            {currentContent.pagination.totalPages}
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Right side - Next */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={!currentContent.pagination.hasNext}
                      onClick={nextPage}
                      className="flex items-center gap-2"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Share URL */}
                  <div className="flex items-center justify-center">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        // Could add toast notification here
                      }}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Share className="w-3 h-3" />
                      Share current view
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Preview Modal */}
      {previewFrame && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setPreviewFrame(null)}
        >
          <div 
            className="bg-card p-4 rounded-lg max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewFrame.url}
              alt={`Frame ${previewFrame.name}`}
              className="max-w-full max-h-full"
            />
            <div className="mt-4 flex justify-between items-center">
              <div>
                <h3 className="font-medium">{previewFrame.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Frame #{previewFrame.frameNumber} • {formatSize(previewFrame.fileSize)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
                <Button onClick={() => setPreviewFrame(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to render list items
  function renderListItem(item: GroupSummary | VideoSummary | FrameData) {
    const itemId = 'id' in item ? item.id : 'name' in item ? item.name : '';
    const isSelected = state.selectedFrames.has(itemId);
    
    return (
      <div
        key={itemId}
        className={`
          flex items-center gap-4 p-3 border rounded-lg cursor-pointer
          hover:bg-accent transition-colors
          ${isSelected ? 'bg-primary/10 border-primary' : ''}
        `}
        onClick={() => handleItemClick(item)}
      >
        {/* Thumbnail/Icon */}
        <div className="w-16 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
          {currentContent.level === 'frames' ? (
            <img
              src={(item as FrameData).url}
              alt={`Frame ${(item as FrameData).name}`}
              className="w-full h-full object-cover rounded"
              loading="lazy"
            />
          ) : (
            <div>
              {currentContent.level === 'groups' && <Folder className="w-6 h-6 text-blue-600" />}
              {currentContent.level === 'videos' && <Play className="w-6 h-6 text-green-600" />}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">
              {'name' in item ? item.name : item.id}
            </span>
            <Badge variant="secondary" className="text-xs">
              {currentContent.level === 'groups' && `${(item as GroupSummary).videoCount}v`}
              {currentContent.level === 'videos' && `${(item as VideoSummary).frameCount}f`}
              {currentContent.level === 'frames' && 'Frame'}
            </Badge>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {currentContent.level === 'groups' && (
              <>
                {formatSize((item as GroupSummary).totalSize)} • 
                {(item as GroupSummary).totalFrames.toLocaleString()} frames
              </>
            )}
            {currentContent.level === 'videos' && (
              <>
                {formatSize((item as VideoSummary).totalSize)} • 
                {formatSize((item as VideoSummary).averageFrameSize)}/frame
              </>
            )}
            {currentContent.level === 'frames' && (
              <>
                Frame #{(item as FrameData).frameNumber} • 
                {formatSize((item as FrameData).fileSize)}
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
  }
}