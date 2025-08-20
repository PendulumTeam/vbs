'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { 
  useGroupsQuery,
  useGroupVideosQuery,
  useVideoFramesQuery,
  useProgressivePrefetch,
  GroupSummary,
  VideoSummary,
  FrameData
} from './use-progressive-file-queries';
import { useUrlSync } from './use-url-state';

// Progressive state management for three-tier loading
interface ProgressiveFileBrowserState {
  // Navigation state (now synced with URL)
  selectedGroup: string | null;
  selectedVideo: string | null;
  currentPage: number;
  
  // UI state
  expandedNodes: Set<string>; // Track which nodes are expanded
  loadingNodes: Set<string>; // Track which nodes are loading
  
  // View preferences (now synced with URL)
  viewMode: 'grid' | 'list';
  thumbnailSize: 'small' | 'medium' | 'large';
  framesPerPage: 25 | 50 | 100;
  
  // Search state
  searchQuery: string;
  
  // Selection state
  selectedFrames: Set<string>;
  multiSelectMode: boolean;
}

interface ProgressiveFileBrowserContextType {
  // State
  state: ProgressiveFileBrowserState;
  
  // Data queries (automatically managed)
  groupsData: ReturnType<typeof useGroupsQuery>;
  currentGroupVideos: ReturnType<typeof useGroupVideosQuery>;
  currentVideoFrames: ReturnType<typeof useVideoFramesQuery>;
  
  // Navigation actions (URL-aware)
  selectGroup: (groupId: string | null) => void;
  selectVideo: (videoId: string | null) => void;
  toggleNodeExpansion: (nodeId: string) => void;
  navigateToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  
  // View actions (URL-aware)
  setViewMode: (mode: 'grid' | 'list') => void;
  setThumbnailSize: (size: 'small' | 'medium' | 'large') => void;
  setFramesPerPage: (count: 25 | 50 | 100) => void;
  
  // Search actions
  setSearchQuery: (query: string) => void;
  
  // Selection actions
  selectFrame: (frameId: string, multiSelect?: boolean) => void;
  toggleMultiSelect: () => void;
  clearSelection: () => void;
  
  // Performance actions
  prefetchOnHover: (type: 'group' | 'video', groupId: string, videoId?: string) => void;
}

const ProgressiveFileBrowserContext = createContext<ProgressiveFileBrowserContextType | null>(null);

export function useProgressiveFileBrowser() {
  const context = useContext(ProgressiveFileBrowserContext);
  if (!context) {
    throw new Error('useProgressiveFileBrowser must be used within a ProgressiveFileBrowserProvider');
  }
  return context;
}

interface ProgressiveFileBrowserProviderProps {
  children: ReactNode;
}

export function ProgressiveFileBrowserProvider({ children }: ProgressiveFileBrowserProviderProps) {
  // URL state management
  const urlSync = useUrlSync();
  
  // Initialize state from URL
  const [state, setState] = useState<ProgressiveFileBrowserState>(() => {
    const urlState = urlSync.getInitialState();
    return {
      selectedGroup: urlState.group || null,
      selectedVideo: urlState.video || null,
      currentPage: urlState.page || 1,
      expandedNodes: new Set(urlState.group ? [urlState.group] : []),
      loadingNodes: new Set(),
      viewMode: urlState.view || 'grid',
      thumbnailSize: urlState.size || 'medium',
      framesPerPage: (urlState.limit as 25 | 50 | 100) || 50,
      searchQuery: '',
      selectedFrames: new Set(),
      multiSelectMode: false,
    };
  });

  // Tier 1: Always load groups overview (fast)
  const groupsData = useGroupsQuery({
    sort: 'name',
    limit: 50
  });

  // Tier 2: Load videos only when group is selected
  const currentGroupVideos = useGroupVideosQuery(
    state.selectedGroup || '',
    {
      sort: 'name',
      includeSample: true // Include sample frames for preview
    },
    {
      enabled: !!state.selectedGroup
    }
  );

  // Tier 3: Load frames only when video is selected
  const currentVideoFrames = useVideoFramesQuery(
    state.selectedGroup || '',
    state.selectedVideo || '',
    {
      page: state.currentPage,
      limit: state.framesPerPage,
      sort: 'frame'
    },
    {
      enabled: !!state.selectedGroup && !!state.selectedVideo
    }
  );

  // Prefetch utilities
  const prefetch = useProgressivePrefetch();

  // Navigation actions (URL-aware)
  const selectGroup = useCallback((groupId: string | null) => {
    if (groupId) {
      urlSync.navigateToGroup(groupId);
    } else {
      urlSync.clearGroup();
    }
    
    setState(prev => ({
      ...prev,
      selectedGroup: groupId,
      selectedVideo: null,
      currentPage: 1,
      selectedFrames: new Set(),
    }));
  }, [urlSync]);

  const selectVideo = useCallback((videoId: string | null) => {
    if (videoId && state.selectedGroup) {
      urlSync.navigateToVideo(state.selectedGroup, videoId);
    } else {
      urlSync.clearVideo();
    }
    
    setState(prev => ({
      ...prev,
      selectedVideo: videoId,
      currentPage: 1,
      selectedFrames: new Set(),
    }));
  }, [urlSync, state.selectedGroup]);

  // Pagination actions
  const navigateToPage = useCallback((page: number) => {
    urlSync.navigateToPage(page);
    setState(prev => ({
      ...prev,
      currentPage: page
    }));
  }, [urlSync]);

  const nextPage = useCallback(() => {
    if (currentVideoFrames.data?.pagination.hasNext) {
      const nextPageNum = state.currentPage + 1;
      navigateToPage(nextPageNum);
    }
  }, [currentVideoFrames.data?.pagination.hasNext, state.currentPage, navigateToPage]);

  const prevPage = useCallback(() => {
    if (currentVideoFrames.data?.pagination.hasPrev) {
      const prevPageNum = state.currentPage - 1;
      navigateToPage(prevPageNum);
    }
  }, [currentVideoFrames.data?.pagination.hasPrev, state.currentPage, navigateToPage]);

  const toggleNodeExpansion = useCallback((nodeId: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedNodes);
      
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
        
        // If expanding a group, select it to trigger video loading
        if (nodeId.match(/^L\d+$/)) {
          // Set as loading while data fetches
          setState(current => ({
            ...current,
            loadingNodes: new Set([...current.loadingNodes, nodeId])
          }));
        }
      }
      
      return {
        ...prev,
        expandedNodes: newExpanded
      };
    });
  }, []);

  // View actions (URL-aware)
  const setViewMode = useCallback((mode: 'grid' | 'list') => {
    urlSync.setViewMode(mode);
    setState(prev => ({ ...prev, viewMode: mode }));
  }, [urlSync]);

  const setThumbnailSize = useCallback((size: 'small' | 'medium' | 'large') => {
    urlSync.setThumbnailSize(size);
    setState(prev => ({ ...prev, thumbnailSize: size }));
  }, [urlSync]);

  const setFramesPerPage = useCallback((count: 25 | 50 | 100) => {
    urlSync.setFramesPerPage(count);
    setState(prev => ({ 
      ...prev, 
      framesPerPage: count,
      currentPage: 1 // Reset to first page when changing page size
    }));
  }, [urlSync]);

  // Search actions
  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  // Selection actions
  const selectFrame = useCallback((frameId: string, multiSelect = false) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedFrames);
      
      if (multiSelect && prev.multiSelectMode) {
        if (newSelected.has(frameId)) {
          newSelected.delete(frameId);
        } else {
          newSelected.add(frameId);
        }
      } else {
        newSelected.clear();
        newSelected.add(frameId);
      }
      
      return {
        ...prev,
        selectedFrames: newSelected
      };
    });
  }, []);

  const toggleMultiSelect = useCallback(() => {
    setState(prev => ({
      ...prev,
      multiSelectMode: !prev.multiSelectMode,
      selectedFrames: new Set() // Clear selection when toggling mode
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedFrames: new Set()
    }));
  }, []);

  // Performance optimization: prefetch on hover
  const prefetchOnHover = useCallback((
    type: 'group' | 'video', 
    groupId: string, 
    videoId?: string
  ) => {
    if (type === 'group') {
      prefetch.prefetchGroupVideos(groupId);
    } else if (type === 'video' && videoId) {
      prefetch.prefetchVideoFrames(groupId, videoId);
    }
  }, [prefetch]);

  // Remove loading state when data loads successfully
  React.useEffect(() => {
    if (state.selectedGroup && !currentGroupVideos.isLoading) {
      setState(prev => {
        const newLoading = new Set(prev.loadingNodes);
        newLoading.delete(state.selectedGroup || '');
        return {
          ...prev,
          loadingNodes: newLoading
        };
      });
    }
  }, [state.selectedGroup, currentGroupVideos.isLoading]);

  const contextValue: ProgressiveFileBrowserContextType = {
    // State
    state,
    
    // Data queries
    groupsData,
    currentGroupVideos,
    currentVideoFrames,
    
    // Navigation actions
    selectGroup,
    selectVideo,
    toggleNodeExpansion,
    navigateToPage,
    nextPage,
    prevPage,
    
    // View actions
    setViewMode,
    setThumbnailSize,
    setFramesPerPage,
    
    // Search actions
    setSearchQuery,
    
    // Selection actions
    selectFrame,
    toggleMultiSelect,
    clearSelection,
    
    // Performance actions
    prefetchOnHover,
  };

  return (
    <ProgressiveFileBrowserContext.Provider value={contextValue}>
      {children}
    </ProgressiveFileBrowserContext.Provider>
  );
}

// Export types for components
export type {
  ProgressiveFileBrowserState,
  ProgressiveFileBrowserContextType,
  GroupSummary,
  VideoSummary,
  FrameData,
};