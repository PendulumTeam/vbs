import { type NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * GET handler for serving VBS images
 * Route: /api/images/[...path]
 * Example: /api/images/L11/L11_V017/frame_24726.jpg
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: imagePath } = await params;
    
    if (!imagePath || imagePath.length === 0) {
      return NextResponse.json(
        { error: 'Image path is required' },
        { status: 400 }
      );
    }

    // Construct the file path
    // Expected format: /api/images/L11/L11_V017/frame_24726.jpg
    const fullPath = path.join(process.cwd(), 'public', 'images', ...imagePath);
    
    // Security check: ensure the path is within the public/images directory
    const publicImagesPath = path.join(process.cwd(), 'public', 'images');
    const resolvedPath = path.resolve(fullPath);
    const resolvedPublicPath = path.resolve(publicImagesPath);
    
    if (!resolvedPath.startsWith(resolvedPublicPath)) {
      return NextResponse.json(
        { error: 'Invalid image path' },
        { status: 403 }
      );
    }

    try {
      // Try to read the file
      const fileBuffer = await fs.readFile(resolvedPath);
      
      // Determine content type based on file extension
      const ext = path.extname(resolvedPath).toLowerCase();
      let contentType = 'application/octet-stream';
      
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
        case '.webp':
          contentType = 'image/webp';
          break;
        case '.svg':
          contentType = 'image/svg+xml';
          break;
      }

      // Return the image with appropriate headers
      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
      
    } catch (fileError) {
      // If file doesn't exist, return a placeholder
      console.log(`Image not found: ${resolvedPath}, serving placeholder`);
      
      // Return a simple SVG placeholder
      const placeholderSvg = `
        <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f1f1f1"/>
          <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" fill="#666" text-anchor="middle" dy=".3em">
            Image Not Found
          </text>
          <text x="50%" y="65%" font-family="Arial, sans-serif" font-size="10" fill="#999" text-anchor="middle" dy=".3em">
            ${imagePath.join('/')}
          </text>
        </svg>
      `;
      
      return new NextResponse(placeholderSvg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    
  } catch (error) {
    console.error('Images API error:', error);
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    );
  }
}