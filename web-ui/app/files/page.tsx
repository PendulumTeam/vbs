'use client';

import React from 'react';
import { TreeSidebar } from '@/components/file-browser/tree-sidebar';
import { ContentPanel } from '@/components/file-browser/content-panel';
import { FileBrowserProvider } from '@/hooks/use-file-browser';

/**
 * File Browser Page - MongoDB Video Frame Navigation
 * 
 * Features:
 * - Hierarchical tree navigation (Groups → Videos → Frames)
 * - Virtual scrolling for performance with large datasets
 * - Search and filtering capabilities
 * - Responsive design with mobile support
 * - Integration hooks for future search platform
 */
export default function FileBrowserPage() {
  return (
    <FileBrowserProvider>
      <div className="flex h-[calc(100vh-4rem)] bg-background">
        {/* Tree Sidebar - Fixed width on desktop, collapsible on mobile */}
        <aside className="w-80 border-r bg-card flex-shrink-0 hidden lg:flex">
          <TreeSidebar />
        </aside>

        {/* Main Content Panel */}
        <div className="flex-1 overflow-hidden">
          <ContentPanel />
        </div>
      </div>
    </FileBrowserProvider>
  );
}