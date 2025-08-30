"""
VBS Simple Server - Minimal video frame search API
3-file implementation: main.py (routes) + database.py + search_engine.py
"""

import os
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import our modules
import database
import search_engine

# Simple configuration
HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', 8000))
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'

# Simple models
class FrameRequest(BaseModel):
    frame_ids: List[str]

class NeighborRequest(BaseModel):
    s3_key: str
    limit: int = 20

class VideoRequest(BaseModel):
    l: str  # L21
    v: str  # V001
    limit: Optional[int] = 100

class SearchRequest(BaseModel):
    query: str
    limit: int = 20

class FrameResponse(BaseModel):
    frames: List[Dict[str, Any]]
    count: int

# FastAPI app
app = FastAPI(
    title="VBS Simple Server",
    description="Minimal video frame search API with FAISS search",
    version="1.0.0"
)

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"], 
    allow_headers=["*"],
)

# Routes
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "VBS Simple Server",
        "status": "running", 
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Simple health check."""
    db_health = await database.health_check()
    search_health = {"models_loaded": search_engine.is_loaded()}
    
    return {
        **db_health,
        "search_engine": search_health
    }

@app.post("/frames", response_model=FrameResponse)
async def get_frames_by_ids(request: FrameRequest):
    """Get frames by their IDs or S3 keys."""
    try:
        docs = await database.get_frames_by_s3_keys(request.frame_ids)
        return FrameResponse(frames=docs, count=len(docs))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/search", response_model=FrameResponse)
async def search_text(request: SearchRequest):
    """Search frames using text embeddings and FAISS."""
    try:
        if not search_engine.is_loaded():
            raise HTTPException(status_code=503, detail="Search models not loaded")
        
        # Perform text search
        search_results = search_engine.search_text(request.query, request.limit)
        
        # Get frame metadata from database
        s3_keys = [result["s3_key"] for result in search_results]
        frame_docs = await database.get_frames_by_s3_keys(s3_keys)
        
        # Combine search scores with frame metadata
        frames_with_scores = []
        frame_lookup = {doc["s3_key"]: doc for doc in frame_docs}
        
        for result in search_results:
            s3_key = result["s3_key"]
            if s3_key in frame_lookup:
                frame_doc = frame_lookup[s3_key]
                frame_doc["score"] = result["score"]
                frames_with_scores.append(frame_doc)
        
        return FrameResponse(frames=frames_with_scores, count=len(frames_with_scores))
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")

@app.post("/neighbors", response_model=FrameResponse)
async def get_neighbor_frames(request: NeighborRequest):
    """Get neighboring frames for a given frame."""
    try:
        docs = await database.find_neighbors(request.s3_key, request.limit)
        return FrameResponse(frames=docs, count=len(docs))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/video-frames", response_model=FrameResponse)
async def get_video_frames(request: VideoRequest):
    """Get all frames from a specific video."""
    try:
        docs = await database.find_video_frames(request.l, request.v, request.limit)
        return FrameResponse(frames=docs, count=len(docs))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/video-list")
async def get_video_list():
    """Get list of available videos."""
    try:
        videos = await database.get_video_list()
        return {"videos": videos, "total": len(videos)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Legacy compatibility endpoints (matching old API)
@app.post("/getById")
async def get_by_id_legacy(data: Dict[str, Any]):
    """Legacy endpoint for getting frame by ID."""
    frame_id = data.get("id")
    if not frame_id:
        raise HTTPException(status_code=400, detail="Missing 'id' field")
    
    frames = await get_frames_by_ids(FrameRequest(frame_ids=[frame_id]))
    return {"item_count": frames.count, "frames": frames.frames}

@app.post("/neighbor")
async def neighbor_legacy(data: Dict[str, Any]):
    """Legacy endpoint for neighbor search."""
    frame_id = data.get("id")
    limit = data.get("limit", 20)
    
    if not frame_id:
        raise HTTPException(status_code=400, detail="Missing 'id' field")
    
    neighbors = await get_neighbor_frames(NeighborRequest(s3_key=frame_id, limit=limit))
    return {"item_count": neighbors.count, "frames": neighbors.frames}

# Main execution
if __name__ == "__main__":
    import uvicorn
    
    print(f"🚀 Starting VBS Simple Server...")
    print(f"🔧 Loading search models...")
    
    # Load search models on startup
    if search_engine.load_models():
        print(f"✅ Search models loaded successfully")
    else:
        print(f"⚠️ Search models failed to load (text search disabled)")
    
    print(f"🌐 Server: http://{HOST}:{PORT}")
    print(f"📖 API Docs: http://{HOST}:{PORT}/docs")
    
    uvicorn.run(
        app,
        host=HOST,
        port=PORT,
        reload=DEBUG,
        log_level="info" if DEBUG else "warning"
    )