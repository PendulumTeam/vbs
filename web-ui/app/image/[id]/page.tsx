'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Copy, ExternalLink, Clock, Hash, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';
import { getImageById, type SearchResult } from '@/services/api';
import { convertDriveLinkToImageUrl, getLocalImageUrl } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function ImageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [image, setImage] = useState<SearchResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const imageId = params.id as string;

  // Fetch image data
  useEffect(() => {
    if (imageId) {
      getImageById(imageId)
        .then((imageData) => {
          setImage(imageData);
          setIsLoading(false);
        })
        .catch((err) => {
          setError('Failed to load image details');
          setIsLoading(false);
        });
    }
  }, [imageId]);

  // Set image URL
  useEffect(() => {
    const localImageUrl = getLocalImageUrl(imageId);
    setImageUrl(localImageUrl);
    
    // Also try to get Google Drive URL if available
    if (image?.link) {
      convertDriveLinkToImageUrl(image.link).then(setImageUrl);
    }
  }, [imageId, image?.link]);

  const handleBack = () => {
    router.back();
  };

  const handleCopyId = async () => {
    if (image?.image_id) {
      try {
        await navigator.clipboard.writeText(image.image_id);
        toast({
          title: 'Copied to clipboard',
          description: `Image ID ${image.image_id} copied to clipboard`,
        });
      } catch (error) {
        toast({
          title: 'Copy failed',
          description: 'Failed to copy image ID to clipboard',
          variant: 'destructive',
        });
      }
    }
  };

  const handleOpenVideo = () => {
    if (image?.watch_url && image?.frame_stamp) {
      const videoUrl = `${image.watch_url}&t=${Math.floor(image.frame_stamp)}`;
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48 mx-auto" />
              <Skeleton className="aspect-video w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !image) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Image not found'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Navigation */}
      <div className="mb-6">
        <Button variant="ghost" onClick={handleBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Button>
      </div>

      {/* Image Details */}
      <Card className="shadow-lg overflow-hidden">
        {/* Image Display */}
        <CardContent className="p-0">
          <AspectRatio ratio={16 / 9} className="bg-gray-100">
            {imageError ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <AlertCircle className="h-12 w-12 mb-4" />
                <p className="font-medium">Image not available</p>
                <p className="text-sm text-gray-400">
                  Unable to load: {image.image_id}
                </p>
              </div>
            ) : (
              <Image
                src={imageUrl || '/placeholder.svg'}
                alt={`Image ${image.image_id}`}
                fill
                className="object-contain"
                priority
                onError={handleImageError}
              />
            )}
          </AspectRatio>
        </CardContent>

        {/* Image Metadata */}
        <CardContent className="p-6 space-y-6">
          {/* Header with ID and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Hash className="h-6 w-6" />
                {image.image_id}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Video frame from {image.image_id.split('_').slice(0, 2).join('_')}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyId}>
                <Copy className="h-4 w-4 mr-2" />
                Copy ID
              </Button>
              
              <Button onClick={handleOpenVideo}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Video
              </Button>
            </div>
          </div>

          <Separator />

          {/* Details Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Video Information */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Video Details
                </h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wider">Video ID</Label>
                  <p className="font-medium">{image.image_id.split('_').slice(0, 2).join('_')}</p>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wider">Timestamp</Label>
                  <p className="font-medium">{image.frame_stamp.toFixed(2)}s</p>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wider">Formatted Time</Label>
                  <p className="text-sm text-gray-600">
                    {Math.floor(image.frame_stamp / 60)}:{(image.frame_stamp % 60).toFixed(0).padStart(2, '0')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Search Information */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <h2 className="font-semibold text-gray-900">Search Metadata</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wider">Relevance Score</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {(image.score * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                
                {image.ocr_text && (
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wider">OCR Text</Label>
                    <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                      {image.ocr_text}
                    </p>
                  </div>
                )}
                
                <div>
                  <Label className="text-xs text-gray-500 uppercase tracking-wider">Actions</Label>
                  <div className="flex gap-2 mt-1">
                    <Link href="/vbs-search">
                      <Button variant="outline" size="sm">
                        Find Similar
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* OCR Text Display (if available) */}
          {image.ocr_text && (
            <>
              <Separator />
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader className="pb-3">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Detected Text (OCR)
                  </h2>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 bg-white p-3 rounded border leading-relaxed">
                    {image.ocr_text}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}