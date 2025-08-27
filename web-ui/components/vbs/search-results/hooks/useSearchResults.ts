'use client';

import { useState, useMemo, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import type { SearchResult } from '@/services/api';
import type { 
  VideoGroup, 
  ImageState, 
  SearchResultsState, 
  SearchResultsActions
} from '../types';

export function useSearchResults(results: SearchResult[], focusId: string | null) {
  const [imageStates, setImageStates] = useState<Map<string, ImageState>>(new Map());
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());
  const [focusedImageId, setFocusedImageId] = useState<string | null>(focusId);
  const [focusRefs, setFocusRefs] = useState<Record<string, HTMLDivElement>>({});

  // Group results by video
  const groups = useMemo((): VideoGroup[] => {
    return results.reduce((acc, result) => {
      // Extract video ID from image_id (format: L15_V013_24791)
      const videoId = result.image_id.split('_').slice(0, 2).join('_');
      
      const existingGroup = acc.find((group) => group.videoId === videoId);
      
      if (existingGroup) {
        existingGroup.images.push(result);
      } else {
        acc.push({
          videoId,
          videoUrl: result.watch_url,
          images: [result],
        });
      }
      
      return acc;
    }, [] as VideoGroup[]);
  }, [results]);

  // Initialize image states when results change
  useEffect(() => {
    const newStates = new Map<string, ImageState>();
    
    results.forEach((result) => {
      if (!imageStates.has(result.image_id)) {
        newStates.set(result.image_id, {
          result,
          isLoading: true,
          hasError: false,
          isCached: false,
        });
      } else {
        // Keep existing state but update result data
        const existingState = imageStates.get(result.image_id)!;
        newStates.set(result.image_id, {
          ...existingState,
          result,
        });
      }
    });
    
    setImageStates(newStates);
  }, [results]);

  // Update focused image when focusId prop changes
  useEffect(() => {
    setFocusedImageId(focusId);
    
    // Scroll to focused image
    if (focusId && focusRefs[focusId]) {
      const timeoutId = setTimeout(() => {
        focusRefs[focusId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        
        // Add pulse animation
        focusRefs[focusId]?.classList.add('animate-pulse');
        setTimeout(() => {
          focusRefs[focusId]?.classList.remove('animate-pulse');
        }, 1500);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [focusId, focusRefs]);

  // Actions
  const actions: SearchResultsActions = useMemo(() => ({
    updateImageState: (imageId: string, updates: Partial<ImageState>) => {
      setImageStates((prev) => {
        const newStates = new Map(prev);
        const currentState = newStates.get(imageId);
        
        if (currentState) {
          newStates.set(imageId, { ...currentState, ...updates });
        }
        
        return newStates;
      });
    },

    setImageError: (imageId: string) => {
      setFailedImageIds((prev) => new Set([...prev, imageId]));
      
      setImageStates((prev) => {
        const newStates = new Map(prev);
        const currentState = newStates.get(imageId);
        
        if (currentState) {
          newStates.set(imageId, {
            ...currentState,
            hasError: true,
            isLoading: false,
          });
        }
        
        return newStates;
      });
    },

    setImageLoaded: (imageId: string) => {
      setImageStates((prev) => {
        const newStates = new Map(prev);
        const currentState = newStates.get(imageId);
        
        if (currentState) {
          newStates.set(imageId, {
            ...currentState,
            isLoading: false,
            hasError: false,
          });
        }
        
        return newStates;
      });
    },

    setFocusedImage: (imageId: string | null) => {
      setFocusedImageId(imageId);
    },

    registerFocusRef: (imageId: string, ref: HTMLDivElement | null) => {
      if (ref) {
        setFocusRefs((prev) => ({ ...prev, [imageId]: ref }));
      } else {
        setFocusRefs((prev) => {
          const newRefs = { ...prev };
          delete newRefs[imageId];
          return newRefs;
        });
      }
    },

    copyImageId: (imageId: string) => {
      navigator.clipboard.writeText(imageId);
      toast({
        title: 'Copied to clipboard',
        description: `Image ID ${imageId} copied to clipboard`,
      });
    },
  }), []);

  // Derived state
  const derivedState = useMemo(() => ({
    hasResults: groups.length > 0,
    totalImages: results.length,
    totalVideos: groups.length,
    loadingImages: Array.from(imageStates.values()).filter(state => state.isLoading).length,
    errorImages: failedImageIds.size,
  }), [groups.length, results.length, imageStates, failedImageIds.size]);

  const state: SearchResultsState = {
    groups,
    imageStates,
    failedImageIds,
    focusedImageId,
    focusRefs,
  };

  return {
    state,
    actions,
    derivedState,
  };
}