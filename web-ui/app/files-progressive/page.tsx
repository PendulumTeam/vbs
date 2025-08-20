'use client';

import React from 'react';
import { ProgressiveTreeSidebar } from '@/components/file-browser/progressive-tree-sidebar';
import { ProgressiveContentPanel } from '@/components/file-browser/progressive-content-panel';
import { ProgressiveFileBrowserProvider } from '@/hooks/use-progressive-file-browser';

/**
 * Progressive File Browser Page - Three-Tier Loading Architecture
 * 
 * Features:
 * - Tier 1: Groups overview (<500ms)
 * - Tier 2: Videos on-demand (<200ms per group)
 * - Tier 3: Frames lazy loaded (<300ms per video)
 * - Divide-and-conquer approach for optimal performance
 * - Progressive enhancement with smooth loading states
 */
export default function ProgressiveFileBrowserPage() {
  return (
    <ProgressiveFileBrowserProvider>
      <div className="flex h-[calc(100vh-4rem)] bg-background">
        {/* Progressive Tree Sidebar */}
        <aside className="w-80 border-r bg-card flex-shrink-0 hidden lg:flex">
          <ProgressiveTreeSidebar />
        </aside>

        {/* Progressive Content Panel */}
        <div className="flex-1 overflow-hidden">
          <ProgressiveContentPanel />
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
    </ProgressiveFileBrowserProvider>
  );
}