'use client';

import React, { useState } from 'react';
import { 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  Video, 
  Loader2,
  Filter 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFileBrowser, GroupSummary, VideoSummary } from '@/hooks/use-file-browser';

/**
 * Progressive Tree Sidebar - Three-Tier Loading Architecture
 * 
 * Tier 1: Groups (L01-L30) - Always loaded, fast
 * Tier 2: Videos (V001-V031) - Loaded when group expanded
 * Tier 3: Frames - Loaded when video selected (shown in content panel)
 */
export function TreeSidebar() {
  const {
    state,
    groupsData,
    currentGroupVideos,
    selectGroup,
    selectVideo,
    toggleNodeExpansion,
    setSearchQuery,
    toggleMultiSelect,
    prefetchOnHover
  } = useFileBrowser();

  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Handle search input change with debouncing
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    // Debouncing will be handled by the search query hook
    setSearchQuery(value);
  };

  // Handle group click/expansion
  const handleGroupClick = (group: GroupSummary) => {
    const isExpanded = state.expandedNodes.has(group.id);
    
    if (isExpanded) {
      // Collapse group
      toggleNodeExpansion(group.id);
      selectGroup(null);
    } else {
      // Expand group and select it (triggers video loading)
      toggleNodeExpansion(group.id);
      selectGroup(group.id);
    }
  };

  // Handle video click
  const handleVideoClick = (video: VideoSummary) => {
    selectVideo(video.id);
  };

  // Handle prefetch on hover
  const handleGroupHover = (group: GroupSummary) => {
    if (!state.expandedNodes.has(group.id)) {
      prefetchOnHover('group', group.id);
    }
  };

  const handleVideoHover = (video: VideoSummary) => {
    if (state.selectedGroup) {
      prefetchOnHover('video', state.selectedGroup, video.id);
    }
  };

  // Format file size helper
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

  // Filter groups based on search
  const filteredGroups = React.useMemo(() => {
    if (!groupsData.data?.groups || !searchInput.trim()) {
      return groupsData.data?.groups || [];
    }
    
    const query = searchInput.toLowerCase();
    return groupsData.data.groups.filter(group => 
      group.name.toLowerCase().includes(query)
    );
  }, [groupsData.data?.groups, searchInput]);

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Video Browser</h2>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-accent' : ''}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMultiSelect}
              className={state.multiSelectMode ? 'bg-accent' : ''}
            >
              Multi
            </Button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Quick Stats */}
        {groupsData.data && (
          <div className="mt-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>{groupsData.data.totalGroups} groups</span>
              <span>{groupsData.data.totalVideos} videos</span>
              <span>{groupsData.data.totalFrames.toLocaleString()} frames</span>
            </div>
            <div className="mt-1">
              Total: {formatSize(groupsData.data.totalSize)}
            </div>
          </div>
        )}
      </div>

      {/* Tree Content */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Loading State for Groups */}
          {groupsData.isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading groups...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {groupsData.error && (
            <div className="text-center py-8 text-destructive">
              <p className="text-sm">Failed to load groups</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => groupsData.refetch()}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Groups List */}
          {!groupsData.isLoading && !groupsData.error && (
            <div className="space-y-1">
              {filteredGroups.map(group => (
                <div key={group.id}>
                  {/* Group Node */}
                  <div
                    className={`
                      flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-accent rounded-sm
                      ${state.selectedGroup === group.id ? 'bg-primary/10 border-l-2 border-primary' : ''}
                    `}
                    onClick={() => handleGroupClick(group)}
                    onMouseEnter={() => handleGroupHover(group)}
                  >
                    {/* Expand/Collapse Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-accent"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGroupClick(group);
                      }}
                    >
                      {state.expandedNodes.has(group.id) ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>

                    {/* Group Icon */}
                    <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />

                    {/* Group Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{group.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {group.videoCount}v
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {group.totalFrames.toLocaleString()} frames • {formatSize(group.totalSize)}
                      </div>
                    </div>
                  </div>

                  {/* Videos List (Tier 2 - Loaded on demand) */}
                  {state.expandedNodes.has(group.id) && (
                    <div className="ml-6 mt-1">
                      {/* Loading State for Videos */}
                      {state.selectedGroup === group.id && currentGroupVideos.isLoading && (
                        <div className="flex items-center gap-2 py-2 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs">Loading videos...</span>
                        </div>
                      )}

                      {/* Error State for Videos */}
                      {state.selectedGroup === group.id && currentGroupVideos.error && (
                        <div className="py-2 text-destructive">
                          <p className="text-xs">Failed to load videos</p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-1 h-6 text-xs"
                            onClick={() => currentGroupVideos.refetch()}
                          >
                            Retry
                          </Button>
                        </div>
                      )}

                      {/* Videos */}
                      {state.selectedGroup === group.id && currentGroupVideos.data?.videos.map(video => (
                        <div
                          key={video.id}
                          className={`
                            flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-accent rounded-sm
                            ${state.selectedVideo === video.id ? 'bg-primary/10 border-l-2 border-primary' : ''}
                          `}
                          onClick={() => handleVideoClick(video)}
                          onMouseEnter={() => handleVideoHover(video)}
                        >
                          {/* Video Icon */}
                          <Video className="h-4 w-4 text-green-500 flex-shrink-0 ml-4" />

                          {/* Video Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{video.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {video.frameCount}f
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatSize(video.totalSize)} • {formatSize(video.averageFrameSize)}/frame
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {!groupsData.isLoading && !groupsData.error && filteredGroups.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchInput ? 'No groups match your search' : 'No groups found'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Selection Status */}
      {state.selectedFrames.size > 0 && (
        <div className="p-3 border-t bg-muted/50">
          <div className="text-xs text-muted-foreground">
            {state.selectedFrames.size} frame{state.selectedFrames.size !== 1 ? 's' : ''} selected
          </div>
          {state.multiSelectMode && (
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" className="flex-1">
                Download
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                Actions
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}