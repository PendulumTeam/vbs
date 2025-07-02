# MinIO Storage Guide for AI Embeddings - Beginner Friendly

## What is MinIO?

Think of MinIO as your own personal "Amazon S3" that you can run anywhere. It's like having your own private cloud storage service that speaks the same language as Amazon S3, but costs much less and gives you full control.

### Simple Analogy
- **Amazon S3** = Renting a storage unit from a big company
- **MinIO** = Building your own storage shed that works exactly like the rental unit

## Why MinIO for Your AI Challenge?

### 1. **Cost Effective**
```
Amazon S3: $23/month per TB + data transfer fees
MinIO on DigitalOcean: $5-10/month for 1TB (fixed cost)
Savings: ~70-80% lower cost
```

### 2. **S3 Compatible**
Your code written for S3 works with MinIO without changes:
```python
# This same code works for both S3 and MinIO!
from boto3 import client

# For S3
s3 = client('s3', aws_access_key_id='xxx', aws_secret_access_key='yyy')

# For MinIO - just change the endpoint
minio = client('s3', 
    endpoint_url='https://your-minio-server.com',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin'
)
```

### 3. **Full Control**
- Your data stays where you want it
- No surprise bills
- No API rate limits
- Can run locally for development

## Core Concepts (Simple Terms)

### Buckets = Folders
```
minio/
├── embeddings-bucket/      # Like a main folder
├── models-bucket/          # Another main folder
└── results-bucket/         # Another main folder
```

### Objects = Files
```
embeddings-bucket/
├── video1/
│   ├── frame_001.json     # These are objects (files)
│   ├── frame_002.json
│   └── metadata.json
└── video2/
    └── ...
```

## How MinIO Works for Your Embeddings

```
Your Setup:
┌─────────────────┐
│  GPU Server     │ ──── Generates ───► ┌──────────────┐
│  (GME Model)    │     Embeddings      │    MinIO     │
└─────────────────┘                     │   Storage    │
                                        └──────────────┘
                                               │
┌─────────────────┐                           │
│  Your Local     │ ◄──── Downloads ──────────┘
│  Chat Server    │      Embeddings
└─────────────────┘      When Needed
```

## Step-by-Step Setup Guide

### Option 1: MinIO on DigitalOcean Spaces (Easiest)

1. **Create DigitalOcean Account**
   - Sign up at digitalocean.com
   - Get $200 free credits (new users)

2. **Create a Space**
   ```
   - Click "Spaces" in dashboard
   - Create new Space
   - Choose region (pick closest to you)
   - Name it: "vbs-embeddings"
   ```

3. **Get Access Keys**
   ```
   Spaces → Manage Keys → Generate New Key
   Save these safely:
   - Access Key: XXXXXXXXXXXX
   - Secret Key: YYYYYYYYYYYY
   ```

4. **Use in Your Python Code**
   ```python
   from minio import Minio
   import json
   
   # Connect to your storage
   client = Minio(
       "sgp1.digitaloceanspaces.com",  # Your region
       access_key="your-access-key",
       secret_key="your-secret-key",
       secure=True
   )
   
   # Save an embedding
   def save_embedding(video_id, frame_num, embedding_data):
       # Convert to JSON
       data = json.dumps({
           "embedding": embedding_data.tolist(),
           "frame": frame_num,
           "timestamp": "00:01:23"
       })
       
       # Upload to MinIO/Spaces
       client.put_object(
           "vbs-embeddings",  # bucket name
           f"videos/{video_id}/frame_{frame_num}.json",
           data=data.encode(),
           length=len(data)
       )
   ```

### Option 2: Self-Hosted MinIO (More Control)

1. **Get a VPS (Virtual Private Server)**
   ```
   Recommended: DigitalOcean Droplet
   - 4GB RAM, 80GB SSD = $24/month
   - Can store ~50GB embeddings
   ```

2. **Install MinIO**
   ```bash
   # SSH into your server
   ssh root@your-server-ip
   
   # Download MinIO
   wget https://dl.min.io/server/minio/release/linux-amd64/minio
   chmod +x minio
   
   # Create data directory
   mkdir /data
   
   # Run MinIO
   ./minio server /data --console-address ":9001"
   ```

3. **Access MinIO**
   ```
   Browser: http://your-server-ip:9001
   Default login: minioadmin / minioadmin
   ```

## Practical Example: Storing Your GME Embeddings

```python
# embedding_storage.py
from minio import Minio
import numpy as np
import json
from datetime import datetime

class EmbeddingStorage:
    def __init__(self):
        # Connect to MinIO
        self.client = Minio(
            "localhost:9000",  # or your DigitalOcean Spaces URL
            access_key="minioadmin",
            secret_key="minioadmin",
            secure=False  # Use True for production
        )
        
        # Create bucket if not exists
        if not self.client.bucket_exists("embeddings"):
            self.client.make_bucket("embeddings")
    
    def save_frame_embedding(self, video_id, frame_data):
        """Save a single frame's embedding"""
        
        # Prepare data
        doc = {
            "video_id": video_id,
            "frame_number": frame_data['frame_num'],
            "timestamp": frame_data['timestamp'],
            "gme_embedding": frame_data['embedding'].tolist(),  # Convert numpy to list
            "description": frame_data['description'],  # GME's text description
            "objects": frame_data['detected_objects'],
            "processed_at": datetime.now().isoformat()
        }
        
        # Convert to JSON
        json_data = json.dumps(doc)
        
        # Save to MinIO
        object_name = f"{video_id}/frame_{frame_data['frame_num']:06d}.json"
        self.client.put_object(
            "embeddings",
            object_name,
            data=json_data.encode(),
            length=len(json_data),
            content_type="application/json"
        )
        
        print(f"Saved: {object_name}")
    
    def get_frame_embedding(self, video_id, frame_num):
        """Retrieve a frame's embedding"""
        
        object_name = f"{video_id}/frame_{frame_num:06d}.json"
        
        try:
            # Download from MinIO
            response = self.client.get_object("embeddings", object_name)
            data = json.loads(response.read())
            
            # Convert list back to numpy array
            data['gme_embedding'] = np.array(data['gme_embedding'])
            
            return data
        finally:
            response.close()
    
    def list_video_frames(self, video_id):
        """List all frames for a video"""
        
        frames = []
        objects = self.client.list_objects(
            "embeddings",
            prefix=f"{video_id}/",
            recursive=True
        )
        
        for obj in objects:
            frames.append(obj.object_name)
        
        return frames

# Usage example
if __name__ == "__main__":
    storage = EmbeddingStorage()
    
    # Save embedding
    fake_embedding = np.random.rand(768)  # 768-dim embedding
    frame_data = {
        'frame_num': 42,
        'timestamp': '00:01:23',
        'embedding': fake_embedding,
        'description': 'A red car on the street',
        'detected_objects': ['car', 'street', 'person']
    }
    
    storage.save_frame_embedding('video_001', frame_data)
    
    # Retrieve embedding
    retrieved = storage.get_frame_embedding('video_001', 42)
    print(f"Retrieved description: {retrieved['description']}")
```

## Cost Breakdown for Your Project

### Estimated Storage Needs
```
1 video = 30 minutes
30 fps extraction = 54,000 frames
Sample at 1 fps = 1,800 frames
Per frame: ~3KB (embedding + metadata)
Per video: 5.4MB

100 videos = 540MB
1000 videos = 5.4GB
```

### Cost Comparison
```
1. AWS S3 (1TB/month)
   - Storage: $23
   - Requests: ~$10
   - Transfer: ~$90
   - Total: ~$123/month

2. MinIO on DigitalOcean Spaces
   - Storage: $5 (250GB included)
   - Extra storage: $0.02/GB
   - Transfer: Included
   - Total: ~$5-10/month

3. Self-hosted MinIO
   - VPS: $24/month (4GB RAM, 80GB SSD)
   - Can handle your entire competition
   - Total: $24/month (fixed)
```

## Quick Decision Guide

### Choose DigitalOcean Spaces + MinIO if:
- You want easiest setup (< 10 minutes)
- You need reliable storage
- You don't want to manage servers
- Budget: $5-10/month is OK

### Choose Self-Hosted MinIO if:
- You want full control
- You have basic Linux skills
- You might need more than 250GB
- Budget: $24/month fixed is OK

### Choose AWS S3 if:
- You have huge scale (10TB+)
- Your company pays for it
- You need enterprise features
- Budget: Not a concern

## Common Pitfalls & Solutions

### 1. **Forgetting to Handle Errors**
```python
# Bad
data = storage.get_frame_embedding('video_001', 42)

# Good
try:
    data = storage.get_frame_embedding('video_001', 42)
except Exception as e:
    print(f"Error retrieving embedding: {e}")
    # Use fallback or regenerate
```

### 2. **Not Compressing Data**
```python
# Save 50% space by using float16
embedding = model.encode(image)
compressed = embedding.astype(np.float16)
```

### 3. **No Backup Strategy**
```python
# Always keep a local backup of critical embeddings
def backup_to_local(video_id):
    os.makedirs(f"backup/{video_id}", exist_ok=True)
    # Download all frames for backup
```

## Next Steps for Your Project

1. **Week 1**: Set up DigitalOcean Spaces (10 minutes)
2. **Week 1**: Test upload/download with sample embeddings
3. **Week 2**: Integrate with your GME pipeline
4. **Week 3**: Implement caching layer for fast access
5. **Week 4**: Optimize storage format (compression, batching)

## TL;DR (Summary)

MinIO is like having your own private Amazon S3 that:
- Costs 80% less ($5-24/month vs $100+)
- Uses the same code as S3 (no learning curve)
- Gives you full control of your data
- Perfect for storing AI embeddings

For your AI Challenge, start with DigitalOcean Spaces + MinIO client. It's the sweet spot of easy setup, low cost, and good performance.

---

*Remember: The best storage solution is the one that gets you building quickly. Start simple with DigitalOcean Spaces, and you can always migrate later if needed!*