// Utility functions for image actions

/**
 * Download image from URL
 */
export async function downloadImage(imageUrl: string, filename: string): Promise<void> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error('Failed to download image');
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    throw new Error('Failed to copy to clipboard');
  }
}

/**
 * Open URL in new tab
 */
export function openExternalLink(url: string): void {
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Get filename from image ID
 */
export function getImageFilename(imageId: string): string {
  return `${imageId}.jpg`;
}

/**
 * Parse video info from image ID
 */
export function parseVideoInfo(imageId: string): { collection: string; video: string; frame: number } {
  const parts = imageId.split('_');
  if (parts.length !== 3) {
    throw new Error(`Invalid image ID format: ${imageId}`);
  }
  
  return {
    collection: parts[0], // L21
    video: `${parts[0]}_${parts[1]}`, // L21_V001
    frame: parseInt(parts[2]), // 1
  };
}