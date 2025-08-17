'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { 
  TreeNode, 
  GroupNode, 
  VideoNode, 
  FrameNode,
  FileBrowserState, 
  TreeResponse,
  FileFilters,
  BreadcrumbItem,
  SearchPlatformIntegration,
  FileMetadata
} from '@/lib/file-browser-types';
import { debounce } from '@/lib/file-browser-utils';
import { useTreeQuery, usePrefetchQueries } from './use-file-queries';

interface FileBrowserContextType {
  // State
  state: FileBrowserState;
  
  // Tree data
  treeData: TreeResponse | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  expandNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  selectNode: (nodeId: string, multiSelect?: boolean) => void;
  navigateToNode: (path: string[]) => void;
  
  // Search actions
  setSearchQuery: (query: string) => void;
  applyFilters: (filters: Partial<FileFilters>) => void;
  clearFilters: () => void;
  
  // View actions
  setViewMode: (mode: 'grid' | 'list') => void;
  setThumbnailSize: (size: 'small' | 'medium' | 'large') => void;
  setSortBy: (sortBy: string, direction?: 'asc' | 'desc') => void;
  
  // Multi-select actions
  toggleMultiSelect: () => void;
  selectAll: () => void;
  clearSelection: () => void;
  
  // Integration hooks for search platform
  onFrameSelect?: (frames: FileMetadata[]) => void;
  onSimilaritySearch?: (frameId: string) => void;
  onAddToCanvas?: (frame: FileMetadata) => void;
  
  // Performance optimization hooks
  onNodeHover?: (node: TreeNode) => void;
  refreshData?: () => void;
}

const FileBrowserContext = createContext<FileBrowserContextType | null>(null);

export function useFileBrowser() {
  const context = useContext(FileBrowserContext);
  if (!context) {
    throw new Error('useFileBrowser must be used within a FileBrowserProvider');
  }
  return context;
}

interface FileBrowserProviderProps {
  children: ReactNode;
  integration?: SearchPlatformIntegration;
}

export function FileBrowserProvider({ children, integration }: FileBrowserProviderProps) {
  // Core state
  const [state, setState] = useState<FileBrowserState>({
    expandedNodes: new Set(),
    selectedNodes: new Set(),
    loadingNodes: new Set(),
    viewMode: 'grid',
    thumbnailSize: 'medium',
    sortBy: 'name',
    sortDirection: 'asc',
    currentPath: [],
    breadcrumbs: [{ id: 'root', name: 'Files', type: 'root', path: [] }],
    searchQuery: '',
    activeFilters: {},
    multiSelectMode: false,
    lastSelectedNode: null
  });

  // TanStack Query for tree data
  const { 
    data: treeData, 
    isLoading, 
    error: queryError,
    refetch: refetchTree 
  } = useTreeQuery({
    expand: Array.from(state.expandedNodes),
    sort: state.sortBy
  });
  
  const error = queryError?.message || null;
  const prefetch = usePrefetchQueries();

  // Tree navigation actions
  const expandNode = useCallback((nodeId: string) => {
    setState(prev => ({
      ...prev,
      expandedNodes: new Set([...prev.expandedNodes, nodeId])
    }));
  }, []);

  const collapseNode = useCallback((nodeId: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedNodes);
      newExpanded.delete(nodeId);
      return {
        ...prev,
        expandedNodes: newExpanded
      };
    });
  }, []);

  const selectNode = useCallback((nodeId: string, multiSelect = false) => {
    setState(prev => {
      let newSelected = new Set(prev.selectedNodes);
      
      if (multiSelect && prev.multiSelectMode) {
        if (newSelected.has(nodeId)) {
          newSelected.delete(nodeId);
        } else {
          newSelected.add(nodeId);
        }
      } else {
        newSelected = new Set([nodeId]);
      }

      return {
        ...prev,
        selectedNodes: newSelected,
        lastSelectedNode: nodeId
      };
    });
  }, []);

  const navigateToNode = useCallback((path: string[]) => {
    const breadcrumbs: BreadcrumbItem[] = [
      { id: 'root', name: 'Files', type: 'root', path: [] }
    ];

    for (let i = 0; i < path.length; i++) {
      const currentPath = path.slice(0, i + 1);
      const nodeId = currentPath.join('_');
      
      let name = path[i];
      let type: 'root' | 'group' | 'video' = 'group';
      
      if (i === 1) type = 'video';
      
      breadcrumbs.push({
        id: nodeId,
        name,
        type,
        path: currentPath
      });
    }

    setState(prev => ({
      ...prev,
      currentPath: path,
      breadcrumbs
    }));
  }, []);

  // Search actions
  const setSearchQuery = useCallback(
    debounce((query: string) => {
      setState(prev => ({
        ...prev,
        searchQuery: query
      }));
    }, 300),
    []
  );

  const applyFilters = useCallback((filters: Partial<FileFilters>) => {
    setState(prev => ({
      ...prev,
      activeFilters: {
        ...prev.activeFilters,
        ...filters
      }
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeFilters: {}
    }));
  }, []);

  // View actions
  const setViewMode = useCallback((mode: 'grid' | 'list') => {
    setState(prev => ({
      ...prev,
      viewMode: mode
    }));
  }, []);

  const setThumbnailSize = useCallback((size: 'small' | 'medium' | 'large') => {
    setState(prev => ({
      ...prev,
      thumbnailSize: size
    }));
  }, []);

  const setSortBy = useCallback((sortBy: string, direction: 'asc' | 'desc' = 'asc') => {
    setState(prev => ({
      ...prev,
      sortBy,
      sortDirection: direction
    }));

    // Tree data will automatically refetch with new sort order due to dependency on state.sortBy
  }, []);

  // Multi-select actions
  const toggleMultiSelect = useCallback(() => {
    setState(prev => ({
      ...prev,
      multiSelectMode: !prev.multiSelectMode,
      selectedNodes: prev.multiSelectMode ? new Set() : prev.selectedNodes
    }));
  }, []);

  const selectAll = useCallback(() => {
    if (!treeData) return;

    const allNodeIds = new Set<string>();
    
    const addNodeIds = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        allNodeIds.add(node.id);
        if (node.children) {
          addNodeIds(node.children);
        }
      });
    };

    addNodeIds(treeData.groups);

    setState(prev => ({
      ...prev,
      selectedNodes: allNodeIds
    }));
  }, [treeData]);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedNodes: new Set(),
      lastSelectedNode: null
    }));
  }, []);

  // Add prefetching on hover for better UX
  const handleNodeHover = useCallback((node: TreeNode) => {
    if (node.type === 'group') {
      const groupNode = node as GroupNode;
      prefetch.prefetchGroup(groupNode.groupId);
    } else if (node.type === 'video') {
      const videoNode = node as VideoNode;
      prefetch.prefetchVideo(videoNode.groupId, videoNode.videoId);
    }
  }, [prefetch]);

  // Integration callbacks
  const handleFrameSelect = useCallback((frames: FileMetadata[]) => {
    integration?.onFrameSelect?.(frames);
  }, [integration]);

  const handleSimilaritySearch = useCallback((frameId: string) => {
    integration?.onSimilaritySearch?.(frameId);
  }, [integration]);

  const handleAddToCanvas = useCallback((frame: FileMetadata) => {
    integration?.onAddToCanvas?.(frame);
  }, [integration]);

  const contextValue: FileBrowserContextType = {
    // State
    state,
    treeData,
    isLoading,
    error,
    
    // Actions
    expandNode,
    collapseNode,
    selectNode,
    navigateToNode,
    
    // Search actions
    setSearchQuery,
    applyFilters,
    clearFilters,
    
    // View actions
    setViewMode,
    setThumbnailSize,
    setSortBy,
    
    // Multi-select actions
    toggleMultiSelect,
    selectAll,
    clearSelection,
    
    // Integration hooks
    onFrameSelect: handleFrameSelect,
    onSimilaritySearch: handleSimilaritySearch,
    onAddToCanvas: handleAddToCanvas,
    
    // Performance hooks
    onNodeHover: handleNodeHover,
    refreshData: refetchTree
  };

  return (
    <FileBrowserContext.Provider value={contextValue}>
      {children}
    </FileBrowserContext.Provider>
  );
}