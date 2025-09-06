import React, { useState } from 'react';
import { Layers, Grid, Clock, Hash, Star, Loader2, Download, ExternalLink, Users, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { ImageModal } from './ImageModal';
import { cn } from '../lib/utils';
import { downloadImage, copyToClipboard, openExternalLink, getImageFilename } from '../lib/image-utils';
import { toast } from 'sonner';
import type { SearchResult } from '../api/types';

type ViewMode = 'grouped' | 'ungrouped';
type SortOption = 'score' | 'timestamp' | 'video' | 'none';
type SortDirection = 'asc' | 'desc';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  error?: Error | null;
  onNeighborSearch?: (frameId: string) => void;
  currentViewMode?: ViewMode;
  currentSortBy?: SortOption;
  currentSortDir?: SortDirection;
  onViewModeChange?: (mode: ViewMode) => void;
  onSortChange?: (sortBy: SortOption, sortDir: SortDirection) => void;
  centerFrameId?: string; // ID of the center frame to highlight
  className?: string;
}

interface VideoGroup {
  videoId: string;
  images: SearchResult[];
}

function ViewModeToggle({
  viewMode,
  onViewModeChange,
  totalImages,
  totalVideos
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalImages: number;
  totalVideos: number;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 font-medium">View:</span>

        <div className="flex bg-gray-100 rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange('grouped')}
            className={cn(
              'gap-2 transition-all',
              viewMode === 'grouped'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Videos</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange('ungrouped')}
            className={cn(
              'gap-2 transition-all',
              viewMode === 'ungrouped'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Grid className="h-4 w-4" />
            <span className="hidden sm:inline">Grid</span>
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        {totalImages} frames
        {viewMode === 'grouped' && ` • ${totalVideos} videos`}
      </div>
    </div>
  );
}

function ImageCard({
  image,
  onNeighborSearch,
  isCenterFrame = false
}: {
  image: SearchResult;
  onNeighborSearch?: (frameId: string) => void;
  isCenterFrame?: boolean;
}) {
  const [imageError, setImageError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImageClick = () => {
    setIsModalOpen(true);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await downloadImage(image.link, getImageFilename(image.image_id));
      toast.success(`Download started: ${image.image_id}.jpg`);
    } catch {
      toast.error("Failed to download image");
    }
  };

  const handleWatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (image.watch_url) {
      openExternalLink(image.watch_url);
    } else {
      toast.error("Watch URL not available for this frame");
    }
  };

  const handleNeighbors = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNeighborSearch && !isCenterFrame) {
      onNeighborSearch(image.image_id);
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await copyToClipboard(image.image_id);
      toast.success(`Copied: ${image.image_id}`);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden transition-all duration-300",
          isCenterFrame
            ? "ring-4 ring-gradient-to-r from-blue-50 via-blue-200 to-red-300 shadow-xl transform scale-105 bg-gradient-to-br"
            : "hover:shadow-lg",
          isCenterFrame && "relative z-10"
        )}
      >
        {/* Image Area - Click to open modal */}
        <div className="aspect-video relative bg-gray-100 cursor-pointer" onClick={handleImageClick}>
          {!imageError ? (
            <img
              src={image.link}
              alt={`Frame ${image.image_id}`}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <span className="text-sm">Image not found</span>
            </div>
          )}

          {/* Center frame indicator */}
          {isCenterFrame && (
            <div className="absolute top-2 left-2 z-10">
              <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold shadow-lg">
                🎯 CENTER
              </Badge>
            </div>
          )}

          {/* Score badge */}
          {image.score && (
            <Badge className="absolute top-2 right-2 bg-black/70 text-white">
              {(image.score * 100).toFixed(0)}%
            </Badge>
          )}
        </div>

        {/* Always Visible Action Bar */}
        <div className="p-3 space-y-3">
          <div className='space-y-1 flex flex-row justify-between items-center'>
            <p className="text-sm font-medium text-gray-900 truncate" title={image.image_id}>
              {image.image_id}
            </p>
            <p className="text-xs text-gray-500">
              Frame {image.frame_stamp}
              {image.video_fps && <span className="ml-1">@ {image.video_fps}fps</span>}
              {isCenterFrame && (
                <span className="ml-2 text-purple-600 font-medium">• Target frame</span>
              )}
            </p>
          </div>

          {/* Icon-Only Action Buttons with Tooltips */}
          <div className="flex gap-2 justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={handleDownload} className="w-8 h-8 p-0">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download image</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={handleWatch} className="w-8 h-8 p-0">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Watch video</TooltipContent>
            </Tooltip>
            
            {!isCenterFrame && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={handleNeighbors} className="w-8 h-8 p-0">
                    <Users className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Find neighbors</TooltipContent>
              </Tooltip>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={handleCopy} className="w-8 h-8 p-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy image ID</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </Card>

      {/* Large Image Modal */}
      <ImageModal
        image={image}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onNeighborSearch={onNeighborSearch}
        isCenterFrame={isCenterFrame}
      />
    </>
  );
}

function GroupedResults({
  groups,
  onNeighborSearch,
  centerFrameId
}: {
  groups: VideoGroup[];
  onNeighborSearch?: (frameId: string) => void;
  centerFrameId?: string;
}) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.videoId} className="space-y-3">
          {/* Video header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              {group.videoId}
            </h3>
            <Badge variant="outline">
              {group.images.length} frames
            </Badge>
          </div>

          {/* Images grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {group.images.map((image) => (
              <ImageCard
                key={image.image_id}
                image={image}
                onNeighborSearch={onNeighborSearch}
                isCenterFrame={image.image_id === centerFrameId}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function UngroupedResults({
  images,
  sortBy,
  onSort,
  onNeighborSearch,
  centerFrameId
}: {
  images: SearchResult[];
  sortBy: SortOption;
  onSort: (option: SortOption) => void;
  onNeighborSearch?: (frameId: string) => void;
  centerFrameId?: string;
}) {
  return (
    <div className="space-y-4">
      {/* Sort controls */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">Sort by:</span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSort('score')}
          className={cn(
            'gap-1 h-8',
            sortBy === 'score' && 'bg-blue-50 text-blue-600'
          )}
        >
          <Star className="h-3 w-3" />
          Score
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSort('timestamp')}
          className={cn(
            'gap-1 h-8',
            sortBy === 'timestamp' && 'bg-blue-50 text-blue-600'
          )}
        >
          <Clock className="h-3 w-3" />
          Time
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSort('video')}
          className={cn(
            'gap-1 h-8',
            sortBy === 'video' && 'bg-blue-50 text-blue-600'
          )}
        >
          <Hash className="h-3 w-3" />
          Video
        </Button>
      </div>

      {/* Images grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {images.map((image) => (
          <div key={image.image_id} className="transform transition-transform hover:scale-[1.02]">
            <ImageCard
              image={image}
              onNeighborSearch={onNeighborSearch}
              isCenterFrame={image.image_id === centerFrameId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SearchResults({
  results,
  isLoading,
  error,
  onNeighborSearch,
  currentViewMode = 'grouped',
  currentSortBy = 'none',
  currentSortDir = 'desc',
  onViewModeChange,
  onSortChange,
  centerFrameId,
  className
}: SearchResultsProps) {
  // Use props from route instead of local state
  const viewMode = currentViewMode;
  const sortBy = currentSortBy;
  const sortDirection = currentSortDir;

  // Handle view mode change via URL navigation
  const handleViewModeChange = (mode: ViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  // Handle sorting via URL navigation
  const handleSort = (option: SortOption) => {
    if (onSortChange) {
      const newDirection = sortBy === option
        ? (sortDirection === 'asc' ? 'desc' : 'asc')
        : (option === 'score' ? 'desc' : 'asc');
      onSortChange(option, newDirection);
    }
  };

  // Group results by video
  const groups: VideoGroup[] = React.useMemo(() => {
    return results.reduce((acc, result) => {
      const videoId = result.image_id.split('_').slice(0, 2).join('_');
      const existingGroup = acc.find(group => group.videoId === videoId);

      if (existingGroup) {
        existingGroup.images.push(result);
      } else {
        acc.push({
          videoId,
          images: [result],
        });
      }

      return acc;
    }, [] as VideoGroup[]);
  }, [results]);

  // Sort images for ungrouped view
  const sortedImages = React.useMemo(() => {
    if (sortBy === 'none') return results;

    const sorted = [...results].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'score':
          comparison = (a.score || 0) - (b.score || 0);
          break;
        case 'timestamp':
          comparison = a.frame_stamp - b.frame_stamp;
          break;
        case 'video': {
          const videoA = a.image_id.split('_').slice(0, 2).join('_');
          const videoB = b.image_id.split('_').slice(0, 2).join('_');
          comparison = videoA.localeCompare(videoB);
          break;
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [results, sortBy, sortDirection]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-gray-500">Searching...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-red-500">Error: {error.message}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-gray-500">No results found</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <ViewModeToggle
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        totalImages={results.length}
        totalVideos={groups.length}
      />

      {viewMode === 'grouped' ? (
        <GroupedResults
          groups={groups}
          onNeighborSearch={onNeighborSearch}
          centerFrameId={centerFrameId}
        />
      ) : (
        <UngroupedResults
          images={sortedImages}
          sortBy={sortBy}
          onSort={handleSort}
          onNeighborSearch={onNeighborSearch}
          centerFrameId={centerFrameId}
        />
      )}
    </div>
  );
}
