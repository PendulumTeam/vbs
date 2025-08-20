'use client';

import React from 'react';
import { TreeSidebar } from '@/components/file-browser/tree-sidebar';
import { ContentPanel } from '@/components/file-browser/content-panel';
import { FileBrowserProvider } from '@/hooks/use-file-browser';

/**
 * File Browser Page - Optimized Three-Tier Loading Architecture
 * 
 * Features:
 * - Tier 1: Groups overview (<500ms)
 * - Tier 2: Videos on-demand (<200ms per group)
 * - Tier 3: Frames lazy loaded (<300ms per video)
 * - URL state management for bookmarkable navigation
 * - Pagination controls with keyboard shortcuts
 * - Divide-and-conquer approach for optimal performance
 */
export default function FileBrowserPage() {
  return (
    <FileBrowserProvider>
      <div className="flex h-[calc(100vh-4rem)] bg-background">
        {/* Tree Sidebar */}
        <aside className="w-80 border-r bg-card flex-shrink-0 hidden lg:flex">
          <TreeSidebar />
        </aside>

        {/* Content Panel */}
        <div className="flex-1 overflow-hidden">
          <ContentPanel />
        </div>

        {/* Mobile Tree Drawer (for responsive design) */}
        <div className="lg:hidden">
          {/* Mobile drawer implementation would go here */}
          <div className="p-4 text-center text-muted-foreground">
            <p className="text-sm">Mobile tree navigation coming soon</p>
            <p className="text-xs mt-1">Use desktop for full experience</p>
          </div>
        </div>
      </div>
    </FileBrowserProvider>
  );
}