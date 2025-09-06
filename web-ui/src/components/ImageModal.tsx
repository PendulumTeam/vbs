import React from 'react';
import { Download, ExternalLink, Users, Copy, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { downloadImage, copyToClipboard, openExternalLink, getImageFilename, parseVideoInfo } from '../lib/image-utils';
import { toast } from 'sonner';
import type { SearchResult } from '../api/types';

interface ImageModalProps {
  image: SearchResult;
  isOpen: boolean;
  onClose: () => void;
  onNeighborSearch?: (frameId: string) => void;
  isCenterFrame?: boolean;
}

export function ImageModal({ 
  image, 
  isOpen, 
  onClose, 
  onNeighborSearch,
  isCenterFrame = false 
}: ImageModalProps) {
  const videoInfo = parseVideoInfo(image.image_id);
  const filename = getImageFilename(image.image_id);

  const handleDownload = async () => {
    try {
      await downloadImage(image.link, filename);
      toast.success(`Download started: ${filename}`);
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  const handleCopyId = async () => {
    try {
      await copyToClipboard(image.image_id);
      toast.success(`Copied: ${image.image_id}`);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleCopyUrl = async () => {
    try {
      await copyToClipboard(image.link);
      toast.success("Image URL copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  const handleWatch = () => {
    if (image.watch_url) {
      openExternalLink(image.watch_url);
    } else {
      toast.error("Watch URL not available for this frame");
    }
  };

  const handleNeighbors = () => {
    if (onNeighborSearch) {
      onNeighborSearch(image.image_id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full p-6">
          {/* Large Image Display */}
          <div className="lg:col-span-2 flex items-center justify-center bg-black rounded-lg">
            <img 
              src={image.link} 
              alt={`Frame ${image.image_id}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
          
          {/* Actions & Metadata Panel */}
          <div className="flex flex-col space-y-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {image.image_id}
                {isCenterFrame && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs">
                    🎯 CENTER
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {/* Primary Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleDownload} className="gap-2" variant="default">
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button onClick={handleWatch} className="gap-2" variant="default">
                <ExternalLink className="h-4 w-4" />
                Watch Video
              </Button>
              {!isCenterFrame && (
                <Button onClick={handleNeighbors} className="gap-2" variant="default">
                  <Users className="h-4 w-4" />
                  Find Neighbors
                </Button>
              )}
              <Button onClick={handleCopyId} className="gap-2" variant="outline">
                <Copy className="h-4 w-4" />
                Copy ID
              </Button>
            </div>
            
            {/* Secondary Actions */}
            <div className="grid grid-cols-1 gap-2">
              <Button onClick={handleCopyUrl} variant="outline" size="sm" className="gap-2">
                <Copy className="h-3 w-3" />
                Copy Image URL
              </Button>
            </div>
            
            {/* Frame Metadata */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-3 text-gray-900">Frame Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Frame Number:</span>
                    <span className="font-medium">{image.frame_stamp}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Video Collection:</span>
                    <span className="font-medium">{videoInfo.collection}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Video ID:</span>
                    <span className="font-medium">{videoInfo.video}</span>
                  </div>
                  {image.video_fps && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Video FPS:</span>
                      <span className="font-medium">{image.video_fps} fps</span>
                    </div>
                  )}
                  {image.score && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Relevance Score:</span>
                      <Badge variant="outline" className="text-xs">
                        {(image.score * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              
              {/* OCR Text if available */}
              {image.ocr_text && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-gray-900">OCR Text</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
                    {image.ocr_text}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}