'use client';

import React, { useState, useEffect, useRef, useContext } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { cn, convertDriveLinkToImageUrl, getLocalImageUrl } from '@/lib/utils';
import { SearchResultsContext } from './SearchResultsContext';
import { ImageActions } from './ImageActions';
import type { ImageResultProps } from './types';

export function ImageResult({ image, onMoreResults, className }: ImageResultProps) {
  const context = useContext(SearchResultsContext);
  const [googleDriveImageUrl, setGoogleDriveImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  if (!context) {
    throw new Error('ImageResult must be used within a SearchResultsProvider');
  }

  const { state, actions } = context;
  const isFocused = state.focusedImageId === image.image_id;

  // Get local image URL
  const localImageUrl = getLocalImageUrl(image.image_id);

  // Register ref for focus management
  useEffect(() => {
    if (imageRef.current) {
      actions.registerFocusRef(image.image_id, imageRef.current);
    }

    return () => {
      actions.registerFocusRef(image.image_id, null);
    };
  }, [image.image_id, actions]);

  // Convert Google Drive link
  useEffect(() => {
    if (image.link) {
      convertDriveLinkToImageUrl(image.link).then((url) => {
        setGoogleDriveImageUrl(url);
        actions.setImageLoaded(image.image_id);
      });
    }
  }, [image.link, image.image_id, actions]);

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
    actions.setImageError(image.image_id);
  };

  // Don't render if image failed to load
  if (imageError) {
    return null;
  }

  const handleMoreResults = (id: string) => {
    // This will be passed down from the parent SearchResults component
    // For now, we'll get it from the context or props
  };

  return (
    <div
      ref={imageRef}
      className={cn(
        'group relative transition-all duration-200',
        isFocused && 'ring-2 ring-blue-500 rounded-lg p-1',
        className
      )}
    >
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          {/* Image */}
          <AspectRatio ratio={16 / 9}>
            <Link href={`/image/${image.image_id}`} className="block h-full">
              <Image
                src={localImageUrl || googleDriveImageUrl || '/placeholder.svg'}
                alt={`Image ${image.image_id}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmMWYxIi8+PC9zdmc+"
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                onError={handleImageError}
                loading="lazy"
              />
            </Link>
          </AspectRatio>
          
          {/* Image Metadata */}
          <div className="p-3 space-y-2">
            {/* ID and Actions Row */}
            <div className="flex justify-between items-center">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate" title={image.image_id}>
                  ID: {image.image_id}
                </p>
              </div>
              
              <ImageActions 
                image={image} 
                onMoreResults={onMoreResults}
              />
            </div>
            
            {/* Timestamp and Score */}
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span title="Video timestamp">
                At {Math.floor(image.frame_stamp)}s
              </span>
              
              {image.score && (
                <Badge variant="secondary" className="text-xs">
                  {(image.score * 100).toFixed(1)}%
                </Badge>
              )}
            </div>

            {/* OCR Text if available */}
            {image.ocr_text && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-600 line-clamp-2" title={image.ocr_text}>
                  📝 {image.ocr_text}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}