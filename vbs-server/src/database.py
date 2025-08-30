"""Database operations for VBS file_metadata collection."""

import os
import re
from typing import List, Dict, Any, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB configuration
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'vbs_db')
COLLECTION = os.getenv('COLLECTION', 'file_metadata')

# Global MongoDB client
client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
files_collection = db[COLLECTION]


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


async def find_neighbors(s3_key: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Find neighboring frames for a given frame.
    
    Args:
        s3_key: Target frame S3 key (e.g., L21_V001_010)
        limit: Number of neighbor frames to return
        
    Returns:
        List of neighboring frame documents sorted by frame number
    """
    try:
        # Parse target frame
        l, v, target_frame_num = parse_s3_key(s3_key)
        
        # Find all frames in the same video
        video_prefix = f"{l}_{v}_"
        cursor = files_collection.find(
            {"s3_key": {"$regex": f"^{re.escape(video_prefix)}"}},
            {"_id": 0}
        )
        
        docs = await cursor.to_list(length=1000)
        
        if not docs:
            return []
        
        # Extract frame numbers and sort
        frame_data = []
        for doc in docs:
            try:
                _, _, frame_num = parse_s3_key(doc["s3_key"])
                frame_data.append((frame_num, doc))
            except ValueError:
                continue  # Skip invalid s3_keys
        
        frame_data.sort(key=lambda x: x[0])  # Sort by frame number
        
        # Find target frame index
        target_idx = None
        for i, (frame_num, _) in enumerate(frame_data):
            if frame_num == target_frame_num:
                target_idx = i
                break
        
        if target_idx is None:
            return []  # Target frame not found
        
        # Select neighbors around target
        half_limit = limit // 2
        start_idx = max(0, target_idx - half_limit)
        end_idx = min(len(frame_data), target_idx + half_limit + 1)
        
        neighbor_frames = [frame_data[i][1] for i in range(start_idx, end_idx)]
        
        return neighbor_frames
        
    except ValueError:
        return []  # Invalid s3_key format


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


async def close_connection():
    """Close MongoDB connection."""
    client.close()