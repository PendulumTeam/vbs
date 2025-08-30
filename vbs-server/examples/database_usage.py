"""Example usage of the VBS database component."""

import asyncio
from datetime import datetime

from src.core.database.repository import MongoFrameRepository
from src.core.database.models import FrameDocument, FileMetadata


async def main():
    """Demonstrate database usage with file_metadata collection."""
    
    # Initialize repository
    repo = MongoFrameRepository(
        connection_string="mongodb://localhost:27017",
        database_name="vbs_db",
        file_metadata_collection="file_metadata"
    )
    
    try:
        print("🔌 Testing database connection...")
        health = await repo.health_check()
        print(f"Health check: {'✅ OK' if health else '❌ FAILED'}")
        
        if not health:
            print("Database not available. Please check your MongoDB connection.")
            return
        
        print("\n🔍 Example 1: Find frame by ID")
        frame_id = "L23_V001_00001"  # This will be converted to S3 key L23_V001/001.jpg
        frame = await repo.find_by_id(frame_id)
        
        if frame:
            print(f"Found frame: {frame.s3_key}")
            print(f"  - Public URL: {frame.public_url}")
            print(f"  - File size: {frame.file_size} bytes")
            print(f"  - Content type: {frame.content_type}")
            print(f"  - Video: {frame.video_collection} / {frame.video_id}")
            print(f"  - Frame number: {frame.frame_number}")
        else:
            print("Frame not found")
        
        print("\n🎬 Example 2: Find all frames in a video")
        video_frames = await repo.find_frames_in_video("L23", "V001", limit=10)
        print(f"Found {len(video_frames)} frames in video L23_V001")
        
        for frame in video_frames[:3]:  # Show first 3
            print(f"  - {frame.s3_key} (frame #{frame.frame_number})")
        
        if len(video_frames) > 3:
            print(f"  ... and {len(video_frames) - 3} more frames")
        
        print("\n🔗 Example 3: Find neighboring frames")
        if video_frames:
            # Use middle frame as reference
            middle_frame = video_frames[len(video_frames) // 2]
            l, v, frame_num = middle_frame.parse_s3_key()
            
            neighbors = await repo.find_neighbors(l, v, frame_num, limit=5)
            print(f"Found {len(neighbors)} neighboring frames around frame {frame_num}")
            
            for neighbor in neighbors:
                marker = " 👉" if neighbor.frame_number == frame_num else "   "
                print(f"{marker} Frame {neighbor.frame_number}: {neighbor.s3_key}")
        
        print("\n📊 Example 4: Test S3 key parsing")
        example_metadata = FileMetadata(
            s3_key="L21_V001_001",
            bucket="vbs",
            content_type="image/jpeg",
            file_hash="abc123",
            file_size=199027,
            public_url="https://vbs.sgp1.digitaloceanspaces.com/L21_V001_001",
            region="sgp1",
            upload_date=datetime.now()
        )
        
        print(f"S3 Key: {example_metadata.s3_key}")
        print(f"  - Video collection: {example_metadata.video_collection}")
        print(f"  - Video ID: {example_metadata.video_id}")
        print(f"  - Frame number: {example_metadata.frame_number}")
        print(f"  - Video prefix: {example_metadata.video_prefix}")
        print(f"  - Frame ID: {example_metadata.to_frame_id()}")
        
        print("\n✅ Database examples completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        
    finally:
        await repo.close()
        print("🔌 Database connection closed")


if __name__ == "__main__":
    asyncio.run(main())