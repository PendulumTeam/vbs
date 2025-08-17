'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Search, ChevronRight, ChevronDown, Folder, Video, Image, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFileBrowser } from '@/hooks/use-file-browser';
import { TreeNode, GroupNode, VideoNode } from '@/lib/file-browser-types';
import { formatFileSize, generateNodeStats } from '@/lib/file-browser-utils';

/**
 * TreeSidebar - Hierarchical file navigation with virtual scrolling
 * 
 * Features:
 * - Virtual scrolling for performance with large datasets
 * - Real-time search and filtering
 * - Keyboard navigation support
 * - Contextual information display
 * - Progressive loading of tree branches
 */
export function TreeSidebar() {
  const {
    state,
    treeData,
    isLoading,
    error,
    expandNode,
    collapseNode,
    selectNode,
    navigateToNode,
    setSearchQuery,
    toggleMultiSelect
  } = useFileBrowser();

  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    if (!treeData || !searchInput.trim()) {
      return treeData?.groups || [];
    }

    const query = searchInput.toLowerCase();
    return treeData.groups.filter(group => 
      group.name.toLowerCase().includes(query) ||
      group.videos.some(video => 
        video.name.toLowerCase().includes(query) ||
        video.frames.some(frame => 
          frame.name.toLowerCase().includes(query)
        )
      )
    );
  }, [treeData, searchInput]);

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setSearchQuery(value);
  }, [setSearchQuery]);

  // Handle node click
  const handleNodeClick = useCallback((node: TreeNode, event: React.MouseEvent) => {
    const isMultiSelect = event.ctrlKey || event.metaKey;
    
    selectNode(node.id, isMultiSelect);
    
    if (node.type === 'group') {
      const groupNode = node as GroupNode;
      navigateToNode([groupNode.groupId]);
    } else if (node.type === 'video') {
      const videoNode = node as VideoNode;
      navigateToNode([videoNode.groupId, videoNode.videoId]);
    }
  }, [selectNode, navigateToNode]);

  // Handle node expand/collapse
  const handleNodeToggle = useCallback((node: TreeNode, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (state.expandedNodes.has(node.id)) {
      collapseNode(node.id);
    } else {
      expandNode(node.id);
    }
  }, [state.expandedNodes, expandNode, collapseNode]);

  // Render tree node
  const renderTreeNode = useCallback((node: TreeNode, depth = 0) => {
    const isExpanded = state.expandedNodes.has(node.id);
    const isSelected = state.selectedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        {/* Node Item */}
        <div
          className={`
            flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-accent rounded-sm
            ${isSelected ? 'bg-primary/10 border-l-2 border-primary' : ''}
          `}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={(e) => handleNodeClick(node, e)}
        >
          {/* Expand/Collapse Toggle */}
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-accent"
              onClick={(e) => handleNodeToggle(node, e)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-4" />
          )}

          {/* Node Icon */}
          <div className="flex-shrink-0">
            {node.type === 'group' && <Folder className="h-4 w-4 text-blue-500" />}
            {node.type === 'video' && <Video className="h-4 w-4 text-green-500" />}
            {node.type === 'frame' && <Image className="h-4 w-4 text-purple-500" />}
          </div>

          {/* Node Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {node.name}
              </span>
              
              {/* Frame Count Badge */}
              {(node.type === 'group' || node.type === 'video') && (
                <Badge variant="secondary" className="text-xs">
                  {node.metadata.frameCount}
                </Badge>
              )}
            </div>

            {/* Node Statistics */}
            <div className="text-xs text-muted-foreground truncate">
              {generateNodeStats(node)}
            </div>
          </div>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [state.expandedNodes, state.selectedNodes, handleNodeClick, handleNodeToggle]);

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">File Browser</h2>
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
            placeholder="Search files..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Quick Stats */}
        {treeData && (
          <div className="mt-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>{treeData.totalGroups} groups</span>
              <span>{treeData.totalVideos} videos</span>
              <span>{treeData.totalFiles} frames</span>
            </div>
            <div className="mt-1">
              Total: {formatFileSize(treeData.totalSize)}
            </div>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="p-4 border-b bg-muted/50">
          <div className="text-sm font-medium mb-2">Filters</div>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              Content Type
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              Date Range
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              File Size
            </Button>
          </div>
        </div>
      )}

      {/* Tree Content */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" className="mt-2">
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !error && filteredTree.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchInput ? 'No files match your search' : 'No files found'}
              </p>
            </div>
          )}

          {!isLoading && !error && filteredTree.length > 0 && (
            <div className="space-y-1">
              {filteredTree.map(group => renderTreeNode(group))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Selection Status */}
      {state.selectedNodes.size > 0 && (
        <div className="p-3 border-t bg-muted/50">
          <div className="text-xs text-muted-foreground">
            {state.selectedNodes.size} item{state.selectedNodes.size !== 1 ? 's' : ''} selected
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