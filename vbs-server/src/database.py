"""Database operations for VBS file_metadata collection."""

import os
import re
import logging
import time
from typing import List, Dict, Any, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create logger for database operations
logger = logging.getLogger(__name__)

# MongoDB configuration
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'data')
COLLECTION = os.getenv('COLLECTION', 'file_metadata')

# Global MongoDB client
client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
files_collection = db[COLLECTION]
video_metadata_collection = db['video_metadata']


def parse_s3_key(s3_key: str) -> Tuple[str, str, int]:
    """
    Parse s3_key into components.

    Args:
        s3_key: S3 key in format L21_V001_001

    Returns:
        Tuple of (collection, video, frame_number)

    Example:
        parse_s3_key("L21_V001_001") -> ("L21", "V001", 1)
    """
    parts = s3_key.split('_')
    if len(parts) != 3:
        raise ValueError(f"Invalid s3_key format: {s3_key}")

    l, v, frame_str = parts
    frame_number = int(frame_str)
    return l, v, frame_number


def build_s3_key(l: str, v: str, frame_num: int) -> str:
    """
    Build s3_key from components.

    Args:
        l: Collection identifier (L21)
        v: Video identifier (V001)
        frame_num: Frame number (1)

    Returns:
        S3 key string

    Example:
        build_s3_key("L21", "V001", 1) -> "L21_V001_001"
    """
    return f"{l}_{v}_{frame_num:03d}"


def parse_frame_n(frame_n: str) -> Tuple[str, str, int]:
    """
    Parse frame_n into components.

    Args:
        frame_n: Frame identifier in format L21_V001_250

    Returns:
        Tuple of (collection, video, frame_index)

    Example:
        parse_frame_n("L21_V001_250") -> ("L21", "V001", 250)
    """
    parts = frame_n.split('_')
    if len(parts) != 3:
        raise ValueError(f"Invalid frame_n format: {frame_n}")

    l, v, frame_str = parts
    frame_index = int(frame_str)
    return l, v, frame_index


async def health_check() -> Dict[str, Any]:
    """Check MongoDB connection health."""
    try:
        await client.admin.command('ping')
        await files_collection.find_one()

        return {
            "status": "healthy",
            "database": "connected",
            "collection": COLLECTION
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }


async def get_frames_by_s3_keys(s3_keys: List[str]) -> List[Dict[str, Any]]:
    """
    Get frames by their S3 keys.

    Args:
        s3_keys: List of S3 keys to retrieve

    Returns:
        List of frame documents from file_metadata collection
    """
    if not s3_keys:
        return []

    cursor = files_collection.find(
        {"s3_key": {"$in": s3_keys}},
        {"_id": 0}  # Exclude MongoDB _id field
    )

    docs = await cursor.to_list(length=len(s3_keys))
    return docs


async def find_neighbors(frame_n: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Find neighboring frames for a given frame using frame_n identifier.

    Args:
        frame_n: Target frame identifier (e.g., L21_V001_250)
        limit: Number of neighbor frames to return

    Returns:
        List of neighboring frame documents sorted by frame index
    """
    try:
        # Parse target frame
        l, v, target_frame_idx = parse_frame_n(frame_n)

        # Find all frames in the same video using video_id field
        video_id = f"{l}_{v}"
        print("Searching neighbors for video_id:", video_id)
        cursor = files_collection.find(
            {"video_id": video_id},
            {"_id": 0}
        )

        docs = await cursor.to_list(length=1000)

        if not docs:
            print("No documents found for video_id:", video_id)
            return []

        # Extract frame indices and sort
        frame_data = []
        for doc in docs:
            try:
                frame_idx = doc.get("frame_idx")
                if frame_idx is not None:
                    frame_data.append((frame_idx, doc))
            except (KeyError, TypeError):
                continue  # Skip documents without valid frame_idx

        frame_data.sort(key=lambda x: x[0])  # Sort by frame index

        # Find target frame index
        target_idx = None
        for i, (frame_idx, _) in enumerate(frame_data):
            if frame_idx == target_frame_idx:
                target_idx = i
                break

        if target_idx is None:
            print("Target frame not found:", frame_n)
            return []  # Target frame not found

        # Select neighbors around target
        half_limit = limit // 2
        start_idx = max(0, target_idx - half_limit)
        end_idx = min(len(frame_data), target_idx + half_limit + 1)

        neighbor_frames = [frame_data[i][1] for i in range(start_idx, end_idx)]

        return neighbor_frames

    except ValueError:
        return []  # Invalid frame_n format


async def find_video_frames(l: str, v: str, limit: int = 100) -> List[Dict[str, Any]]:
    """
    Find all frames from a specific video.

    Args:
        l: Collection identifier (L21)
        v: Video identifier (V001)
        limit: Maximum number of frames to return

    Returns:
        List of frame documents sorted by frame number
    """
    video_prefix = f"{l}_{v}_"

    cursor = files_collection.find(
        {"s3_key": {"$regex": f"^{re.escape(video_prefix)}"}},
        {"_id": 0}
    ).limit(limit)

    docs = await cursor.to_list(length=limit)

    # Sort by frame number
    frame_data = []
    for doc in docs:
        try:
            _, _, frame_num = parse_s3_key(doc["s3_key"])
            frame_data.append((frame_num, doc))
        except ValueError:
            continue

    frame_data.sort(key=lambda x: x[0])
    sorted_frames = [doc for _, doc in frame_data]

    return sorted_frames


async def get_video_list() -> List[Dict[str, Any]]:
    """
    Get list of available videos with frame counts.

    Returns:
        List of video information dictionaries
    """
    # Aggregate to get unique video prefixes
    pipeline = [
        {
            "$group": {
                "_id": {
                    "$substr": ["$s3_key", 0, {"$indexOfBytes": ["$s3_key", "_", 6]}]
                },
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]

    cursor = files_collection.aggregate(pipeline)
    results = await cursor.to_list(length=1000)

    videos = []
    for result in results:
        video_prefix = result["_id"]
        if video_prefix and '_' in video_prefix:
            try:
                l, v = video_prefix.split('_')
                videos.append({
                    "l": l,
                    "v": v,
                    "frame_count": result["count"],
                    "video_prefix": video_prefix
                })
            except ValueError:
                continue

    return videos


async def get_video_metadata(video_id: str) -> Optional[Dict[str, Any]]:
    """
    Get video metadata by video_id from video_metadata collection.

    Args:
        video_id: Video identifier (e.g., "K05_V009")

    Returns:
        Video metadata document or None if not found
    """
    try:
        logger.debug(f"Querying video_metadata collection for video_id: {video_id}")
        result = await video_metadata_collection.find_one(
            {"video_id": video_id},
            {"_id": 0}
        )
        if result:
            title = result.get('title', 'Unknown')[:50]
            watch_url = result.get('watch_url', '')
            logger.debug(f"Found metadata for {video_id}: title='{title}...', has_watch_url={bool(watch_url)}")
            return result
        else:
            logger.debug(f"No metadata document found for video_id: {video_id}")
            return None
    except Exception as e:
        logger.error(f"Database error fetching video metadata for {video_id}: {e}")
        return None


def generate_watch_url(video_metadata: Dict[str, Any], pts_time: Optional[float]) -> str:
    """
    Generate timestamped YouTube URL from video metadata and frame timestamp.

    Args:
        video_metadata: Video metadata document from video_metadata collection
        pts_time: Frame timestamp in seconds from file_metadata

    Returns:
        Timestamped YouTube URL (e.g., "https://youtube.com/watch?v=HipnbldhXeY&t=123s")
    """
    watch_url = video_metadata.get("watch_url", "")
    if pts_time and watch_url:
        # Convert pts_time to integer seconds for URL parameter
        timestamp_seconds = int(pts_time)
        return f"{watch_url}&t={timestamp_seconds}s"
    return watch_url or ""


async def enrich_frames_with_watch_urls(frames: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Add timestamped YouTube watch URLs and video FPS to frame documents.

    Args:
        frames: List of frame documents from file_metadata collection

    Returns:
        List of enriched frame documents with watch_url and video_fps fields
    """
    start_time = time.time()
    frame_count = len(frames)

    logger.info(f"Starting watch URL enrichment for {frame_count} frames")

    if not frames:
        logger.info("No frames provided, returning empty list")
        return []

    # Group frames by video_id to minimize database queries
    video_ids = {frame.get("video_id") for frame in frames if frame.get("video_id")}
    video_ids_clean = {vid for vid in video_ids if vid}  # Remove None values

    frames_without_video_id = sum(1 for frame in frames if not frame.get("video_id"))

    logger.info(f"Found {len(video_ids_clean)} unique video_ids from {frame_count} frames")
    if frames_without_video_id > 0:
        logger.warning(f"{frames_without_video_id} frames missing video_id field")
    logger.debug(f"Video IDs to process: {list(video_ids_clean)}")

    # Batch retrieve video metadata for all unique video IDs
    video_metadata_cache = {}
    metadata_found_count = 0
    metadata_missing_count = 0

    logger.info(f"Retrieving metadata for {len(video_ids_clean)} video_ids")

    for video_id in video_ids_clean:
        logger.debug(f"Fetching metadata for video_id: {video_id}")
        metadata = await get_video_metadata(video_id)
        if metadata:
            video_metadata_cache[video_id] = metadata
            metadata_found_count += 1
            title_preview = metadata.get('title', 'N/A')[:50]
            logger.debug(f"Metadata found for {video_id}: {title_preview}...")
        else:
            metadata_missing_count += 1
            logger.warning(f"No metadata found for video_id: {video_id}")

    logger.info(f"Video metadata retrieval complete: {metadata_found_count} found, {metadata_missing_count} missing")

    # Enrich each frame with watch URL
    enriched_frames = []
    frames_enriched = 0
    frames_skipped = 0

    logger.info(f"Starting frame enrichment process")

    for i, frame in enumerate(frames):
        frame_copy = frame.copy()
        video_id = frame.get("video_id")
        pts_time = frame.get("pts_time")

        if video_id and video_id in video_metadata_cache:
            watch_url = generate_watch_url(video_metadata_cache[video_id], pts_time)
            frame_copy["watch_url"] = watch_url
            frame_copy["video_fps"] = frame.get("fps")  # Add FPS from frame data
            frames_enriched += 1
            logger.debug(f"Frame {i+1}: Generated watch URL for {video_id} at {pts_time}s, FPS={frame.get('fps')}")
        else:
            # Fallback: empty watch_url if video metadata not found
            frame_copy["watch_url"] = ""
            frame_copy["video_fps"] = frame.get("fps")  # Include FPS even without watch_url
            frames_skipped += 1
            if not video_id:
                logger.debug(f"Frame {i+1}: Skipped - no video_id, FPS={frame.get('fps')}")
            else:
                logger.debug(f"Frame {i+1}: Skipped - no metadata for {video_id}, FPS={frame.get('fps')}")

        enriched_frames.append(frame_copy)

    # Performance and summary logging
    end_time = time.time()
    processing_time = end_time - start_time
    enrichment_rate = (frames_enriched / frame_count) * 100 if frame_count > 0 else 0

    logger.info(f"Watch URL enrichment completed in {processing_time:.3f}s")
    logger.info(f"Enrichment summary: {frames_enriched}/{frame_count} frames enriched ({enrichment_rate:.1f}%)")

    if frames_skipped > 0:
        logger.info(f"Frames skipped: {frames_skipped} (missing video_id or metadata)")

    return enriched_frames


async def close_connection():
    """Close MongoDB connection."""
    client.close()
