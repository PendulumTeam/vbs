'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, List, ExternalLink, Copy, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { toast } from '@/hooks/use-toast';

interface ImageResult {
  id: string;
  url: string;
  videoId: string;
  videoUrl: string;
  found: boolean;
}

export default function FindImagePage() {
  const [imageIds, setImageIds] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ImageResult[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();

  // Clear results when input changes
  useEffect(() => {
    if (results.length > 0) {
      setResults([]);
    }
  }, [imageIds]);

  const parseImageIds = (input: string): string[] => {
    return input
      .split(/[\s,;\n]+/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedIds = parseImageIds(imageIds);

    if (parsedIds.length === 0) {
      setError('Please enter at least one image ID');
      return;
    }

    setError(null);
    setIsSearching(true);

    // Single ID - redirect to image detail page
    if (parsedIds.length === 1) {
      router.push(`/image/${parsedIds[0]}`);
      return;
    }

    // Multiple IDs - show results grid
    try {
      // Simulate API calls for demo - in real app, this would call getImageById for each
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      const mockResults = parsedIds.map((id) => {
        // Simple validation for demo
        const exists = ['L15_V013_24791', 'L15_V014_25123', 'L12_V008_18234'].includes(id);
        
        return {
          id,
          url: exists ? '/placeholder.svg?height=200&width=300' : '',
          videoId: exists ? id.split('_').slice(0, 2).join('_') : '',
          videoUrl: exists ? 'https://youtube.com/watch?v=example' : '',
          found: exists,
        };
      });

      setResults(mockResults);
    } catch (err) {
      setError('Failed to fetch image information. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      
      toast({
        title: 'Copied to clipboard',
        description: `Image ID ${id} copied to clipboard`,
      });

      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy image ID to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Navigation */}
      <div className="mb-8">
        <Link href="/vbs-search">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Button>
        </Link>
      </div>

      {/* Main Form */}
      <Card className="shadow-lg">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">Find Images by ID</h1>
          <p className="text-center text-gray-600">
            Enter one or multiple image IDs to view their details
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="imageIds">Enter Image IDs</Label>
              <div className="relative">
                <Textarea
                  id="imageIds"
                  value={imageIds}
                  onChange={(e) => setImageIds(e.target.value)}
                  placeholder="Enter multiple IDs separated by commas, spaces, or new lines (e.g., L15_V013_24791, L15_V014_25123)"
                  className={`min-h-[100px] pr-12 ${error ? 'border-red-500' : ''}`}
                />
                <List className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <p className="text-xs text-gray-500">
                Enter one or more image IDs. Single ID will redirect to detail page.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isSearching}
              className="w-full"
              size="lg"
            >
              {isSearching ? 'Searching...' : 'Find Images'}
            </Button>
          </form>

          {/* Sample IDs */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Sample Image IDs</h3>
              <p className="text-gray-600 mb-4 text-sm">Try these sample IDs:</p>
              <div className="flex flex-wrap gap-2">
                {['L15_V013_24791', 'L15_V014_25123', 'L12_V008_18234'].map((id) => (
                  <Button
                    key={id}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImageIds((prev) => (prev ? `${prev}, ${id}` : id));
                      setError(null);
                    }}
                  >
                    {id}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImageIds('L15_V013_24791, L15_V014_25123, L12_V008_18234');
                    setError(null);
                  }}
                  className="bg-gray-200"
                >
                  All Samples
                </Button>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card className="mt-8 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Search Results</h2>
              <Badge variant="outline">
                {results.length} {results.length === 1 ? 'image' : 'images'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {results.map((result) => (
              <Card
                key={result.id}
                className={`border ${result.found ? 'border-gray-200' : 'border-red-200 bg-red-50'}`}
              >
                <CardHeader className="bg-gray-50 py-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">ID: {result.id}</span>
                      {!result.found && (
                        <div className="flex items-center text-red-500 text-sm">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Not found
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyId(result.id)}
                      >
                        {copiedId === result.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      
                      {result.found && (
                        <Link href={`/image/${result.id}`}>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {result.found && (
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="w-full sm:w-1/3">
                        <AspectRatio ratio={16 / 9}>
                          <Image
                            src={result.url || '/placeholder.svg'}
                            alt={`Image ${result.id}`}
                            fill
                            className="object-cover rounded-md"
                          />
                        </AspectRatio>
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div>
                          <span className="text-sm text-gray-500">Video ID:</span>
                          <span className="ml-2 font-medium">{result.videoId}</span>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={result.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open Video
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Direct Access Info */}
      <Card className="mt-8 bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-gray-600">
            You can also access images directly by navigating to{' '}
            <code className="bg-white px-2 py-1 rounded text-gray-700 border">
              /image/[image-id]
            </code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}