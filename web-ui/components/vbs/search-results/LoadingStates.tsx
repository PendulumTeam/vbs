'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { LoadingStatesProps } from './types';

export function SearchResultsSkeleton({ count = 2, className }: LoadingStatesProps) {
  return (
    <div className={cn('space-y-6 p-2 md:p-4 border border-blue-200 rounded-xl', className)}>
      {Array.from({ length: count }).map((_, groupIndex) => (
        <Card key={groupIndex} className="shadow-md">
          {/* Video Group Header Skeleton */}
          <CardHeader className="bg-gray-50 border-b">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </CardHeader>
          
          {/* Images Grid Skeleton */}
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 4 + groupIndex }).map((_, imageIndex) => (
                <div key={imageIndex} className="space-y-2">
                  {/* Image Skeleton */}
                  <Skeleton className="aspect-video w-full rounded-md" />
                  
                  {/* Image Info Skeleton */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-20" />
                      <div className="flex gap-1">
                        <Skeleton className="h-6 w-6 rounded" />
                        <Skeleton className="h-6 w-6 rounded" />
                        <Skeleton className="h-6 w-6 rounded" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SearchLoadingSpinner({ className }: { className?: string }) {
  return (
    <Card className={cn('shadow-lg', className)}>
      <CardContent className="flex flex-col justify-center items-center py-12">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900"></div>
        <p className="text-gray-500">Searching for images...</p>
      </CardContent>
    </Card>
  );
}

export function EmptySearchState({ 
  isSearchQuery, 
  className 
}: { 
  isSearchQuery: boolean; 
  className?: string; 
}) {
  return (
    <Card className={cn('shadow-lg border-blue-200', className)}>
      <CardContent className="flex flex-col justify-center items-center p-8 md:p-12">
        {isSearchQuery ? (
          <>
            <div className="mb-6 h-32 w-32 text-gray-300">
              <svg viewBox="0 0 200 200" fill="currentColor">
                <circle cx="80" cy="80" r="35" fill="none" stroke="currentColor" strokeWidth="8" />
                <path d="m121 121 29 29" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-700">
              No matching results
            </h3>
            <p className="mb-6 max-w-md text-center text-gray-500">
              We couldn&apos;t find any images matching your search. Try using different keywords or criteria.
            </p>
          </>
        ) : (
          <>
            <div className="mb-6 h-32 w-32 text-blue-200">
              <svg viewBox="0 0 200 200" fill="currentColor">
                <circle cx="80" cy="80" r="35" fill="none" stroke="currentColor" strokeWidth="8" />
                <path d="m121 121 29 29" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="8 8" opacity="0.3" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-700">
              Start your image discovery
            </h3>
            <p className="mb-6 max-w-md text-center text-gray-500">
              Search for images using the search bar above or try the visual search for a more interactive approach.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ErrorState({ 
  errorCount, 
  className 
}: { 
  errorCount: number; 
  className?: string; 
}) {
  return (
    <Card className={cn('shadow-lg border-red-200 bg-red-50', className)}>
      <CardContent className="p-8 text-center">
        <p className="mb-2 text-gray-600">No images could be displayed</p>
        <p className="text-sm text-gray-500">
          {errorCount} {errorCount === 1 ? 'image' : 'images'} failed to load
        </p>
      </CardContent>
    </Card>
  );
}