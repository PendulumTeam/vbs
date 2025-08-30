import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function convertDriveLinkToImageUrl(
  link: string,
  size: number = 220,
) {
  console.log(link);
  const imgId = link.split('/')[link.split('/').length - 2];
  const convertedId = imgId[0] === '$' ? imgId.slice(1) : imgId;
  return `https://lh3.googleusercontent.com/d/${convertedId}=s${size}`;
}

/**
 * Maps a local image ID to the proper URL for display
 * @param imageId Format: L11_V017_24726
 * @returns URL to the image
 */
export function getLocalImageUrl(imageId: string): string {
  // Split the image ID into its components
  const parts = imageId.split('_');

  if (parts.length < 3) {
    console.error('Invalid image ID format:', imageId);
    return '/placeholder.svg';
  }

  const lessonId = parts[0]; // L11
  const videoId = `${parts[0]}_${parts[1]}`; // L11_V017
  const frameNumber = parts[2]; // 24726

  // Construct the URL path
  return `/images/${lessonId}/${videoId}/frame_${frameNumber}.jpg`;
}
