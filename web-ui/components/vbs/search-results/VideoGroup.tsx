'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ImageResult } from './ImageResult';
import type { VideoGroupProps, VideoGroup as VideoGroupType } from './types';

export function VideoGroup({ group, onMoreResults, className }: VideoGroupProps) {
  const [filteredImages, setFilteredImages] = useState(group.images);

  // Handle removing images that fail to load
  const handleImageError = (imageId: string) => {
    setFilteredImages((prev) => prev.filter((img) => img.image_id !== imageId));
  };

  // Update filtered images when group changes
  useEffect(() => {
    setFilteredImages(group.images);
  }, [group.images]);

  // Don't render if all images have been filtered out
  if (filteredImages.length === 0) {
    return null;
  }

  const handleOpenVideo = () => {
    window.open(group.videoUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className={cn('shadow-md overflow-hidden', className)}>
      {/* Video Group Header */}
      <CardHeader className="bg-gray-50 border-b py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">
              Video: {group.videoId}
            </h3>
            <Badge variant="outline" className="text-xs">
              {filteredImages.length} {filteredImages.length === 1 ? 'image' : 'images'}
            </Badge>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenVideo}
            className="text-gray-600 hover:text-gray-900"
          >
            <ExternalLink className="mr-1 h-4 w-4" />
            Open Video
          </Button>
        </div>
      </CardHeader>

      {/* Images Grid */}
      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
          {filteredImages.map((image) => (
            <ImageResult
              key={image.image_id}
              image={image}
              onMoreResults={onMoreResults}
              className="hover:scale-[1.02] transition-transform"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}