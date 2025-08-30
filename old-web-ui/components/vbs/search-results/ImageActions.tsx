'use client';

import React, { useState } from 'react';
import { Copy, ExternalLink, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { ImageActionsProps } from './types';

export function ImageActions({ image, onMoreResults, className }: ImageActionsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(image.image_id);
      setCopiedId(image.image_id);
      
      toast({
        title: 'Copied to clipboard',
        description: `Image ID ${image.image_id} copied to clipboard`,
      });

      // Reset copied status after 2 seconds
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy image ID to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleMoreResults = () => {
    onMoreResults(image.image_id);
  };

  const handleOpenVideo = () => {
    const videoUrl = `${image.watch_url}&t=${Math.floor(image.frame_stamp)}`;
    window.open(videoUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={cn('flex justify-end gap-1', className)}>
      {/* Copy ID Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopyId}
        className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
        title="Copy image ID"
      >
        {copiedId === image.image_id ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>

      {/* Open Video Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpenVideo}
        className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
        title="Open video at timestamp"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>

      {/* More Similar Images Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleMoreResults}
        className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
        title="Find similar images"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}