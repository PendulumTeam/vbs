# VBS Simple Server

> Minimal video frame search API for temporary use

## 🚀 Quick Start

1. **Install dependencies**:
```bash
pip install -r requirements.txt
```

2. **Run the server**:
```bash
cd src
python main.py
```

3. **Test it works**:
```bash
curl http://localhost:8000/
curl http://localhost:8000/health
```

## 📁 Project Structure

```
vbs-server/
├── src/
│   └── main.py          # Complete server in one file
├── requirements.txt     # 5 minimal dependencies
└── README.md           # This file
```

## ⚙️ Configuration

Set environment variables as needed:

```bash
# MongoDB connection
export MONGO_URI="mongodb://localhost:27017"
export DB_NAME="vbs_db"
export COLLECTION="file_metadata"

# Server settings
export HOST="0.0.0.0"
export PORT="8000"
export DEBUG="true"  # Enable auto-reload and detailed logs
```

## 📚 API Endpoints

All endpoints documented at: `http://localhost:8000/docs`

### Core Endpoints

- **`GET /`** - Server status
- **`GET /health`** - Health check (shows MongoDB connection status)
- **`POST /frames`** - Get frames by S3 keys
- **`POST /neighbors`** - Get neighboring frames
- **`POST /video-frames`** - Get all frames from a video
- **`GET /video-list`** - List available videos

### Legacy Compatibility

- **`POST /getById`** - Compatible with old API
- **`POST /neighbor`** - Compatible with old API

### Example Usage

```bash
# Get frames by S3 keys
curl -X POST http://localhost:8000/frames \
  -H "Content-Type: application/json" \
  -d '{"frame_ids": ["L21_V001_001", "L21_V001_002"]}'

# Get neighboring frames
curl -X POST http://localhost:8000/neighbors \
  -H "Content-Type: application/json" \
  -d '{"s3_key": "L21_V001_010", "limit": 5}'

# Get all frames from video L21_V001
curl -X POST http://localhost:8000/video-frames \
  -H "Content-Type: application/json" \
  -d '{"l": "L21", "v": "V001", "limit": 100}'
```

## 🔧 Customization

The entire server logic is in `src/main.py` - easy to modify:

- **Add new endpoints**: Just add new `@app.post()` functions
- **Change MongoDB queries**: Modify the `files_collection.find()` calls
- **Add new fields**: Update the Pydantic models at the top
- **Change response format**: Modify the return dictionaries

## 🚀 Different Run Options

```bash
# Basic run
cd src && python main.py

# Custom port
cd src && PORT=8001 python main.py

# Debug mode (auto-reload)
cd src && DEBUG=true python main.py

# With uvicorn directly
cd src && uvicorn main:app --reload --port 8000
```

## 🗄️ MongoDB Data

Expects `file_metadata` collection with documents like:
```json
{
  "s3_key": "L21_V001_001",
  "bucket": "vbs",
  "content_type": "image/jpeg", 
  "file_hash": "abc123...",
  "file_size": 199027,
  "public_url": "https://example.com/L21_V001_001",
  "region": "sgp1",
  "upload_date": "2025-08-16T15:38:04.476Z"
}
```

## 📄 License

MIT License