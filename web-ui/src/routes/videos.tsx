import React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useVideoList } from '../api/queries';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, Play } from 'lucide-react';

function VideosPage() {
  const navigate = useNavigate();
  const { data: videoData, isLoading, error } = useVideoList();

  const handleVideoSearch = (l: string, v: string) => {
    // Navigate to search for all frames in this video
    navigate({
      to: '/search',
      search: { 
        q: `video:${l}_${v}`, 
        limit: 100,
        view: 'grouped'
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-gray-500">Loading videos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading videos: {error.message}</p>
      </div>
    );
  }

  const videos = videoData?.videos || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Video Collection</h2>
        <p className="text-gray-600 mt-2">
          Browse all available videos and their frames
        </p>
      </div>

      {/* Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video) => (
          <Card 
            key={`${video.l}_${video.v}`}
            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleVideoSearch(video.l, video.v)}
          >
            <div className="aspect-video bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
              <Play className="h-12 w-12 text-blue-500" />
            </div>
            
            <div className="p-4">
              <h3 className="font-semibold text-gray-900">
                {video.l}_{video.v}
              </h3>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-600">
                  {video.l} • {video.v}
                </span>
                <Badge variant="outline">
                  {video.frame_count} frames
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <div className="text-center text-sm text-gray-500">
        {videos.length} videos available
      </div>
    </div>
  );
}

export const Route = createFileRoute('/videos')({
  component: VideosPage,
});