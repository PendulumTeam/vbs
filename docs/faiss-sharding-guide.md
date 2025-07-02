# FAISS Sharding Guide for Beginners

## What is FAISS?

FAISS (Facebook AI Similarity Search) is a library that helps you find similar items quickly. Think of it like a super-fast search engine for embeddings (numerical representations of your data).

### Simple Analogy
Imagine you have 1 million photos and want to find similar ones:
- **Without FAISS**: Check every single photo (slow!)
- **With FAISS**: Use smart organization to check only relevant photos (fast!)

## What is Sharding?

Sharding means splitting your data into smaller, manageable pieces. It's like organizing a huge library into different sections.

### Why Shard?
```
Problem: 10 million embeddings = 30GB+ memory needed
Solution: Split into 10 shards of 1 million each = 3GB per shard

Benefits:
✓ Use less memory at once
✓ Search faster (search relevant shards only)
✓ Scale beyond single machine limits
✓ Update parts without rebuilding everything
```

## Visual Representation

```
Without Sharding:
┌─────────────────────────────────┐
│   ONE GIANT INDEX (30GB RAM)    │
│   10 million embeddings         │
│   Slow to load, search, update  │
└─────────────────────────────────┘

With Sharding:
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Shard 1 │ │ Shard 2 │ │ Shard 3 │ ... (10 shards)
│ 1M emb. │ │ 1M emb. │ │ 1M emb. │
│ 3GB RAM │ │ 3GB RAM │ │ 3GB RAM │
└─────────┘ └─────────┘ └─────────┘
```

## How FAISS Sharding Works

### Basic Concept
1. **Divide** your embeddings into groups
2. **Build** separate FAISS indices for each group
3. **Search** only relevant shards
4. **Combine** results from all searched shards

### Sharding Strategies

#### 1. **Random Sharding** (Simplest)
```python
# Randomly distribute embeddings across shards
embeddings[0] → Shard 0
embeddings[1] → Shard 1
embeddings[2] → Shard 2
embeddings[3] → Shard 0  # Loop back
```

#### 2. **Time-based Sharding** (For Videos)
```python
# Group by time periods
Morning videos (6am-12pm) → Shard 1
Afternoon videos (12pm-6pm) → Shard 2
Evening videos (6pm-12am) → Shard 3
```

#### 3. **Content-based Sharding** (Smart)
```python
# Group by content type
Indoor scenes → Shard 1
Outdoor scenes → Shard 2
People/faces → Shard 3
```

## Complete Implementation Example

```python
import faiss
import numpy as np
import pickle
import os
from typing import List, Tuple

class ShardedFAISSIndex:
    """
    A sharded FAISS index that splits embeddings across multiple files
    Perfect for datasets too large for memory
    """
    
    def __init__(self, dimension: int, num_shards: int = 10):
        self.dimension = dimension
        self.num_shards = num_shards
        self.shard_indices = []
        self.shard_paths = []
        self.metadata = {
            'total_vectors': 0,
            'vectors_per_shard': []
        }
        
    def create_shards(self, save_dir: str):
        """Create empty shard indices"""
        os.makedirs(save_dir, exist_ok=True)
        
        for i in range(self.num_shards):
            # Create a simple index for each shard
            index = faiss.IndexFlatL2(self.dimension)
            
            # Wrap with IDMap to track original IDs
            index = faiss.IndexIDMap(index)
            
            # Save path for this shard
            shard_path = os.path.join(save_dir, f'shard_{i}.index')
            self.shard_paths.append(shard_path)
            self.shard_indices.append(index)
            self.metadata['vectors_per_shard'].append(0)
    
    def add_embeddings(self, embeddings: np.ndarray, ids: np.ndarray):
        """Add embeddings to shards using round-robin distribution"""
        
        for i, (embedding, id_) in enumerate(zip(embeddings, ids)):
            # Determine which shard (round-robin)
            shard_idx = i % self.num_shards
            
            # Add to the selected shard
            self.shard_indices[shard_idx].add_with_ids(
                embedding.reshape(1, -1), 
                np.array([id_])
            )
            
            # Update metadata
            self.metadata['vectors_per_shard'][shard_idx] += 1
            self.metadata['total_vectors'] += 1
    
    def save_shards(self):
        """Save all shards to disk"""
        for idx, (index, path) in enumerate(zip(self.shard_indices, self.shard_paths)):
            faiss.write_index(index, path)
            print(f"Saved shard {idx} with {self.metadata['vectors_per_shard'][idx]} vectors")
        
        # Save metadata
        with open(os.path.join(os.path.dirname(self.shard_paths[0]), 'metadata.pkl'), 'wb') as f:
            pickle.dump(self.metadata, f)
    
    def load_shard(self, shard_idx: int):
        """Load a single shard into memory"""
        return faiss.read_index(self.shard_paths[shard_idx])
    
    def search(self, query_embedding: np.ndarray, k: int = 10) -> Tuple[np.ndarray, np.ndarray]:
        """
        Search across all shards and combine results
        This loads one shard at a time to save memory
        """
        all_distances = []
        all_ids = []
        
        # Search each shard
        for i in range(self.num_shards):
            # Load shard (only one in memory at a time!)
            shard_index = self.load_shard(i)
            
            # Search this shard
            distances, ids = shard_index.search(query_embedding.reshape(1, -1), k)
            
            all_distances.extend(distances[0])
            all_ids.extend(ids[0])
            
            # Free memory
            del shard_index
        
        # Combine and get top-k results
        all_distances = np.array(all_distances)
        all_ids = np.array(all_ids)
        
        # Sort by distance and get top k
        top_k_indices = np.argsort(all_distances)[:k]
        
        return all_distances[top_k_indices], all_ids[top_k_indices]

# Practical usage example
def demo_sharded_index():
    """Demonstrate sharded FAISS for video embeddings"""
    
    # Setup
    dimension = 768  # GME embedding dimension
    num_videos = 1000
    frames_per_video = 1000
    total_embeddings = num_videos * frames_per_video  # 1 million
    
    # Create sharded index
    sharded_index = ShardedFAISSIndex(
        dimension=dimension,
        num_shards=10  # 100k embeddings per shard
    )
    sharded_index.create_shards('./faiss_shards')
    
    # Simulate adding embeddings batch by batch
    print(f"Adding {total_embeddings:,} embeddings to sharded index...")
    
    batch_size = 10000
    for batch_start in range(0, total_embeddings, batch_size):
        # Create fake embeddings (in reality, these come from GME)
        batch_embeddings = np.random.rand(batch_size, dimension).astype('float32')
        batch_ids = np.arange(batch_start, batch_start + batch_size)
        
        # Add to shards
        sharded_index.add_embeddings(batch_embeddings, batch_ids)
        
        if batch_start % 100000 == 0:
            print(f"Progress: {batch_start:,} / {total_embeddings:,}")
    
    # Save all shards
    print("Saving shards to disk...")
    sharded_index.save_shards()
    
    # Search example
    print("\nSearching for similar frames...")
    query = np.random.rand(1, dimension).astype('float32')
    distances, ids = sharded_index.search(query, k=5)
    
    print(f"Found similar frames: {ids}")
    print(f"Distances: {distances}")
```

## Advanced Sharding Strategies

### 1. **Smart Routing** (Know which shard to search)

```python
class SmartShardedIndex:
    """Route queries to specific shards based on content"""
    
    def __init__(self):
        self.shard_mapping = {
            'indoor': 0,
            'outdoor': 1,
            'people': 2,
            'vehicles': 3,
            'text': 4
        }
    
    def add_embedding_smart(self, embedding, metadata):
        """Add to shard based on content type"""
        scene_type = metadata.get('scene_type', 'other')
        shard_idx = self.shard_mapping.get(scene_type, 5)  # Default shard 5
        
        # Add to specific shard
        self.shards[shard_idx].add(embedding)
    
    def search_smart(self, query, scene_types=None):
        """Search only relevant shards"""
        if scene_types:
            # Search only specified shards
            relevant_shards = [self.shard_mapping[st] for st in scene_types]
        else:
            # Search all shards
            relevant_shards = range(len(self.shards))
        
        # Search only relevant shards (much faster!)
        results = []
        for shard_idx in relevant_shards:
            results.extend(self.search_shard(shard_idx, query))
        
        return results
```

### 2. **Hierarchical Sharding** (For very large datasets)

```python
class HierarchicalShardedIndex:
    """Two-level sharding for massive scale"""
    
    def __init__(self):
        # Level 1: Coarse clustering (e.g., 100 clusters)
        self.coarse_index = faiss.IndexFlatL2(768)
        
        # Level 2: Fine shards within each cluster
        self.fine_shards = {}  # cluster_id -> list of shards
    
    def search_hierarchical(self, query, k=10):
        # Step 1: Find relevant clusters
        _, cluster_ids = self.coarse_index.search(query, 10)
        
        # Step 2: Search only shards in those clusters
        results = []
        for cluster_id in cluster_ids[0]:
            if cluster_id in self.fine_shards:
                for shard in self.fine_shards[cluster_id]:
                    results.extend(shard.search(query, k))
        
        # Step 3: Merge and return top-k
        return merge_results(results, k)
```

## Practical Tips for Your AI Challenge

### 1. **Optimal Shard Size**
```python
# Rule of thumb for CPU-only deployment
RAM_available = 8  # GB
RAM_per_shard = 0.5  # GB (leave room for other processes)
num_shards = int(RAM_available / RAM_per_shard)

# Each embedding = 768 dims * 4 bytes = 3KB
# 500MB shard = ~170k embeddings
embeddings_per_shard = 170_000
```

### 2. **Shard by Video Timeline**
```python
def get_shard_for_timestamp(timestamp_seconds):
    """Assign shard based on video timestamp"""
    # 10 shards for a 30-minute video
    minutes = timestamp_seconds // 60
    shard_idx = min(minutes // 3, 9)  # 3-minute chunks
    return shard_idx

# Usage
frame_timestamp = 425  # 7:05 in the video
shard = get_shard_for_timestamp(frame_timestamp)  # Returns shard 2
```

### 3. **Parallel Shard Search**
```python
from concurrent.futures import ThreadPoolExecutor

def parallel_shard_search(query, shard_paths, k=10):
    """Search multiple shards in parallel"""
    
    def search_single_shard(shard_path):
        index = faiss.read_index(shard_path)
        distances, ids = index.search(query, k)
        return distances[0], ids[0]
    
    # Search all shards in parallel
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(search_single_shard, path) 
                  for path in shard_paths]
        
        # Collect results
        all_results = []
        for future in futures:
            distances, ids = future.result()
            all_results.extend(zip(distances, ids))
    
    # Sort and return top-k
    all_results.sort(key=lambda x: x[0])
    return all_results[:k]
```

## Memory Usage Comparison

```
Without Sharding:
- 1M embeddings × 768 dims × 4 bytes = 3 GB continuously in RAM
- 10M embeddings = 30 GB RAM needed!

With Sharding (10 shards):
- Load 1 shard = 3 GB / 10 = 300 MB in RAM
- Search time: 10 × 100ms = 1 second total
- Can run on 4GB RAM machine!
```

## Common Pitfalls & Solutions

### 1. **Unbalanced Shards**
```python
# Bad: Some shards have 10x more data
# Solution: Use round-robin or monitor shard sizes

def balanced_add(embeddings, shard_sizes):
    # Always add to smallest shard
    min_shard = np.argmin(shard_sizes)
    return min_shard
```

### 2. **Loading All Shards at Once**
```python
# Bad - Uses too much memory
all_indices = [faiss.read_index(p) for p in paths]

# Good - Load one at a time
for path in paths:
    index = faiss.read_index(path)
    # Use index
    del index  # Free memory
```

### 3. **Not Using IVF for Large Shards**
```python
# For shards > 100k vectors, use IVF index
def create_large_shard(embeddings):
    n_clusters = int(np.sqrt(len(embeddings)))
    
    # Create IVF index (faster search)
    quantizer = faiss.IndexFlatL2(dimension)
    index = faiss.IndexIVFFlat(quantizer, dimension, n_clusters)
    
    # Train on sample data
    index.train(embeddings[:10000])
    index.add(embeddings)
    
    return index
```

## Integration with Your Project

```python
# For your GME + Video search pipeline

class VideoEmbeddingShardedIndex:
    def __init__(self, num_shards=20):
        self.sharded_index = ShardedFAISSIndex(768, num_shards)
        self.video_metadata = {}  # video_id -> shard mapping
    
    def process_video(self, video_id, gme_embeddings):
        """Add video embeddings to sharded index"""
        
        # Generate unique IDs for each frame
        base_id = hash(video_id) & 0x7FFFFFFF
        frame_ids = np.arange(base_id, base_id + len(gme_embeddings))
        
        # Add to shards
        self.sharded_index.add_embeddings(gme_embeddings, frame_ids)
        
        # Track which shards contain this video
        self.video_metadata[video_id] = {
            'start_id': base_id,
            'num_frames': len(gme_embeddings),
            'shards': list(range(self.sharded_index.num_shards))
        }
    
    def search_similar_scenes(self, query_embedding, k=10):
        """Find similar scenes across all videos"""
        distances, frame_ids = self.sharded_index.search(query_embedding, k)
        
        # Map back to video IDs and timestamps
        results = []
        for dist, frame_id in zip(distances, frame_ids):
            video_id = self.find_video_for_frame(frame_id)
            frame_number = frame_id - self.video_metadata[video_id]['start_id']
            
            results.append({
                'video_id': video_id,
                'frame_number': frame_number,
                'distance': dist,
                'timestamp': self.frame_to_timestamp(frame_number)
            })
        
        return results
```

## Summary

FAISS sharding is essential when:
- Your embeddings don't fit in RAM (>8GB)
- You need to update parts without rebuilding everything
- You want to scale across multiple machines
- You need fast search on CPU-only hardware

For your AI Challenge:
1. Start with 10-20 shards for 1M+ embeddings
2. Use round-robin distribution initially
3. Load one shard at a time during search
4. Consider time-based sharding for video data
5. Save shards to SSD for fast loading

Remember: Sharding trades a bit of search accuracy for massive scalability. Perfect for your competition needs!

---

## 🎯 Complete Search Plan for Sharded FAISS

### Understanding the Search Challenge

When searching with sharded FAISS, you face three main challenges:
1. **Which shards to search?** (Don't want to search all if unnecessary)
2. **How to track what's in each shard?** (Need metadata)
3. **How to combine results efficiently?** (Merge from multiple shards)

Here's a comprehensive plan to solve these challenges:

### 📋 Step-by-Step Search Strategy

#### Phase 1: Smart Sharding Organization

```python
# shard_organizer.py
import json
import numpy as np
from datetime import datetime
from typing import Dict, List, Set

class VideoShardOrganizer:
    """
    Intelligently organize video embeddings across shards
    Key idea: Group similar content together for faster search
    """
    
    def __init__(self, num_shards=20, strategy='hybrid'):
        self.num_shards = num_shards
        self.strategy = strategy
        
        # Metadata tracking
        self.shard_metadata = {
            i: {
                'video_ids': set(),
                'frame_count': 0,
                'time_range': [float('inf'), float('-inf')],
                'dominant_scenes': [],
                'last_updated': None
            } for i in range(num_shards)
        }
        
        # Video to shard mapping
        self.video_to_shards = {}  # video_id -> [shard_ids]
        
    def assign_video_to_shards(self, video_id: str, video_metadata: dict) -> List[int]:
        """
        Decide which shards should store this video's embeddings
        """
        if self.strategy == 'time_based':
            # Videos from same time period go to same shards
            hour = video_metadata['timestamp'].hour
            primary_shard = hour % self.num_shards
            return [primary_shard]
            
        elif self.strategy == 'content_based':
            # Group by dominant content type
            scene_types = video_metadata.get('scene_types', [])
            if 'indoor' in scene_types:
                return [0, 1, 2]  # Indoor shards
            elif 'outdoor' in scene_types:
                return [3, 4, 5]  # Outdoor shards
            else:
                return [6, 7, 8]  # Mixed content
                
        else:  # hybrid strategy (recommended)
            # Combine multiple factors
            shards = set()
            
            # Factor 1: Time-based
            hour = video_metadata['timestamp'].hour
            shards.add(hour % self.num_shards)
            
            # Factor 2: Content-based
            for scene in video_metadata.get('scene_types', []):
                shards.add(hash(scene) % self.num_shards)
            
            # Factor 3: Load balancing
            if len(shards) < 3:
                # Add least loaded shard
                loads = [self.shard_metadata[i]['frame_count'] for i in range(self.num_shards)]
                least_loaded = np.argmin(loads)
                shards.add(least_loaded)
            
            return list(shards)[:3]  # Max 3 shards per video
```

#### Phase 2: Metadata Management System

```python
# metadata_manager.py
class ShardMetadataManager:
    """
    Track what's in each shard for intelligent searching
    """
    
    def __init__(self, metadata_path='./shard_metadata.json'):
        self.metadata_path = metadata_path
        self.load_metadata()
        
    def load_metadata(self):
        try:
            with open(self.metadata_path, 'r') as f:
                self.metadata = json.load(f)
        except:
            self.metadata = self._initialize_metadata()
    
    def _initialize_metadata(self):
        return {
            'shards': {},
            'videos': {},
            'frame_index': {},  # frame_id -> (video_id, frame_num, shard_id)
            'statistics': {
                'total_frames': 0,
                'total_videos': 0,
                'avg_frames_per_shard': 0
            }
        }
    
    def add_video_frames(self, video_id: str, frame_data: List[dict], shard_assignments: List[int]):
        """
        Track where each frame is stored
        """
        # Update video metadata
        self.metadata['videos'][video_id] = {
            'total_frames': len(frame_data),
            'shards': shard_assignments,
            'time_range': [frame_data[0]['timestamp'], frame_data[-1]['timestamp']],
            'scene_summary': self._summarize_scenes(frame_data)
        }
        
        # Update shard metadata
        frames_per_shard = len(frame_data) // len(shard_assignments)
        for shard_id in shard_assignments:
            if str(shard_id) not in self.metadata['shards']:
                self.metadata['shards'][str(shard_id)] = {
                    'videos': [],
                    'frame_count': 0,
                    'scene_types': {}
                }
            
            self.metadata['shards'][str(shard_id)]['videos'].append(video_id)
            self.metadata['shards'][str(shard_id)]['frame_count'] += frames_per_shard
            
        # Update frame index for fast lookup
        for i, frame in enumerate(frame_data):
            frame_id = f"{video_id}_frame_{i}"
            shard_id = shard_assignments[i % len(shard_assignments)]
            self.metadata['frame_index'][frame_id] = {
                'video_id': video_id,
                'frame_number': i,
                'shard_id': shard_id,
                'timestamp': frame['timestamp']
            }
    
    def get_relevant_shards(self, query_metadata: dict) -> List[int]:
        """
        Determine which shards to search based on query
        """
        relevant_shards = set()
        
        # If query specifies time range
        if 'time_range' in query_metadata:
            start, end = query_metadata['time_range']
            for video_id, video_data in self.metadata['videos'].items():
                video_start, video_end = video_data['time_range']
                if not (end < video_start or start > video_end):
                    relevant_shards.update(video_data['shards'])
        
        # If query specifies scene types
        if 'scene_types' in query_metadata:
            query_scenes = set(query_metadata['scene_types'])
            for shard_id, shard_data in self.metadata['shards'].items():
                shard_scenes = set(shard_data.get('scene_types', {}).keys())
                if query_scenes.intersection(shard_scenes):
                    relevant_shards.add(int(shard_id))
        
        # If no specific criteria, search all shards
        if not relevant_shards:
            relevant_shards = set(range(len(self.metadata['shards'])))
        
        return list(relevant_shards)
```

#### Phase 3: Optimized Search Implementation

```python
# optimized_search.py
import faiss
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

class OptimizedShardedSearch:
    """
    Fast search across sharded FAISS indices
    """
    
    def __init__(self, shard_dir='./faiss_shards', metadata_manager=None):
        self.shard_dir = shard_dir
        self.metadata_manager = metadata_manager
        self.cache = {}  # Cache loaded shards
        self.cache_size = 5  # Keep 5 shards in memory
        
    def search(self, query_embedding: np.ndarray, k: int = 10, 
               query_metadata: dict = None, use_parallel: bool = True) -> List[dict]:
        """
        Smart search that only looks at relevant shards
        """
        start_time = time.time()
        
        # Step 1: Determine which shards to search
        if self.metadata_manager and query_metadata:
            relevant_shards = self.metadata_manager.get_relevant_shards(query_metadata)
            print(f"Searching {len(relevant_shards)} out of {self.metadata_manager.num_shards} shards")
        else:
            # Fallback: search all shards
            relevant_shards = list(range(20))  # Adjust based on your setup
        
        # Step 2: Search shards (parallel or sequential)
        if use_parallel and len(relevant_shards) > 3:
            results = self._parallel_search(query_embedding, relevant_shards, k)
        else:
            results = self._sequential_search(query_embedding, relevant_shards, k)
        
        # Step 3: Merge and rank results
        final_results = self._merge_results(results, k)
        
        search_time = time.time() - start_time
        print(f"Search completed in {search_time:.2f} seconds")
        
        return final_results
    
    def _parallel_search(self, query: np.ndarray, shard_ids: List[int], k: int) -> List[tuple]:
        """
        Search multiple shards in parallel
        """
        results = []
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            # Submit search tasks
            future_to_shard = {
                executor.submit(self._search_single_shard, query, shard_id, k): shard_id 
                for shard_id in shard_ids
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_shard):
                shard_id = future_to_shard[future]
                try:
                    shard_results = future.result()
                    results.extend(shard_results)
                except Exception as e:
                    print(f"Error searching shard {shard_id}: {e}")
        
        return results
    
    def _sequential_search(self, query: np.ndarray, shard_ids: List[int], k: int) -> List[tuple]:
        """
        Search shards one by one (lower memory usage)
        """
        results = []
        
        for shard_id in shard_ids:
            try:
                shard_results = self._search_single_shard(query, shard_id, k)
                results.extend(shard_results)
            except Exception as e:
                print(f"Error searching shard {shard_id}: {e}")
        
        return results
    
    def _search_single_shard(self, query: np.ndarray, shard_id: int, k: int) -> List[tuple]:
        """
        Search a single shard with caching
        """
        # Check cache first
        if shard_id in self.cache:
            index = self.cache[shard_id]
        else:
            # Load shard
            shard_path = f"{self.shard_dir}/shard_{shard_id}.index"
            index = faiss.read_index(shard_path)
            
            # Update cache (LRU style)
            if len(self.cache) >= self.cache_size:
                # Remove oldest cached shard
                oldest = min(self.cache.keys())
                del self.cache[oldest]
            
            self.cache[shard_id] = index
        
        # Search
        distances, ids = index.search(query.reshape(1, -1), k)
        
        # Return results with shard info
        results = []
        for dist, frame_id in zip(distances[0], ids[0]):
            if frame_id != -1:  # Valid result
                results.append((dist, frame_id, shard_id))
        
        return results
    
    def _merge_results(self, all_results: List[tuple], k: int) -> List[dict]:
        """
        Merge results from multiple shards and return top-k
        """
        # Sort by distance
        all_results.sort(key=lambda x: x[0])
        
        # Take top k and format
        final_results = []
        for dist, frame_id, shard_id in all_results[:k]:
            # Look up frame metadata
            if self.metadata_manager:
                frame_info = self.metadata_manager.get_frame_info(frame_id)
            else:
                frame_info = {'frame_id': frame_id}
            
            final_results.append({
                'frame_id': frame_id,
                'distance': float(dist),
                'shard_id': shard_id,
                **frame_info
            })
        
        return final_results
```

#### Phase 4: Complete Search Workflow

```python
# complete_workflow.py
class VideoSearchSystem:
    """
    Complete system tying everything together
    """
    
    def __init__(self):
        # Initialize components
        self.shard_organizer = VideoShardOrganizer(num_shards=20, strategy='hybrid')
        self.metadata_manager = ShardMetadataManager()
        self.sharded_index = ShardedFAISSIndex(dimension=768, num_shards=20)
        self.search_engine = OptimizedShardedSearch(
            metadata_manager=self.metadata_manager
        )
        
    def process_new_video(self, video_id: str, video_path: str):
        """
        Complete pipeline for adding a video
        """
        print(f"Processing video: {video_id}")
        
        # Step 1: Extract frames and generate embeddings
        frames = extract_frames(video_path)  # Your extraction logic
        embeddings = generate_gme_embeddings(frames)  # Your GME model
        
        # Step 2: Analyze video content
        video_metadata = {
            'timestamp': datetime.now(),
            'scene_types': analyze_scenes(frames),  # e.g., ['outdoor', 'daytime']
            'duration': get_video_duration(video_path)
        }
        
        # Step 3: Decide shard placement
        shard_assignments = self.shard_organizer.assign_video_to_shards(
            video_id, video_metadata
        )
        print(f"Assigning to shards: {shard_assignments}")
        
        # Step 4: Add embeddings to shards
        frame_ids = [f"{video_id}_frame_{i}" for i in range(len(embeddings))]
        self.sharded_index.add_embeddings_smart(
            embeddings, frame_ids, shard_assignments
        )
        
        # Step 5: Update metadata
        frame_data = [
            {
                'timestamp': i / 30.0,  # Assuming 30 fps
                'scene_type': analyze_single_frame(frame)
            }
            for i, frame in enumerate(frames)
        ]
        self.metadata_manager.add_video_frames(
            video_id, frame_data, shard_assignments
        )
        
        print(f"Video {video_id} processed successfully")
    
    def search_videos(self, query: str, filters: dict = None) -> List[dict]:
        """
        Search for similar videos/frames
        """
        # Step 1: Generate query embedding
        query_embedding = generate_query_embedding(query)  # Your model
        
        # Step 2: Parse query for metadata hints
        query_metadata = {
            'scene_types': extract_scene_hints(query),  # e.g., ['outdoor'] from "outdoor scene"
            'time_range': extract_time_hints(query),    # e.g., [300, 600] from "5-10 minutes"
            **filters  # Additional filters from user
        }
        
        # Step 3: Perform optimized search
        results = self.search_engine.search(
            query_embedding,
            k=20,
            query_metadata=query_metadata,
            use_parallel=True
        )
        
        # Step 4: Post-process results
        enhanced_results = []
        for result in results:
            # Add video information
            video_id = result['video_id']
            result['video_title'] = get_video_title(video_id)
            result['thumbnail_url'] = generate_thumbnail_url(video_id, result['frame_number'])
            result['preview_clip'] = generate_preview_clip(video_id, result['timestamp'])
            
            enhanced_results.append(result)
        
        return enhanced_results
```

### 🚀 Performance Optimization Tips

#### 1. **Pre-filtering Strategy**
```python
def smart_shard_selection(query, metadata):
    """
    Reduce shards to search by 80%+ using metadata
    """
    # Example: User searches "red car at night"
    # - Only search shards with 'night' scenes
    # - Only search shards with 'vehicle' content
    # - Skip shards with only 'indoor' content
    
    relevant_shards = []
    for shard_id, shard_info in metadata['shards'].items():
        score = 0
        
        # Check scene match
        if 'night' in shard_info.get('scene_types', {}):
            score += 2
        
        # Check object match
        if 'vehicle' in shard_info.get('object_types', {}):
            score += 2
            
        # Skip irrelevant
        if score == 0 and 'indoor' in shard_info.get('scene_types', {}):
            continue
            
        if score > 0:
            relevant_shards.append((int(shard_id), score))
    
    # Sort by relevance score
    relevant_shards.sort(key=lambda x: x[1], reverse=True)
    
    # Return top shards
    return [shard_id for shard_id, _ in relevant_shards[:5]]
```

#### 2. **Caching Strategy**
```python
class SmartCache:
    def __init__(self, max_memory_gb=2):
        self.cache = {}
        self.access_count = {}
        self.max_size = max_memory_gb * 1024 * 1024 * 1024
        
    def get_or_load(self, shard_id, loader_func):
        if shard_id in self.cache:
            self.access_count[shard_id] += 1
            return self.cache[shard_id]
        
        # Evict if needed
        if self._get_cache_size() > self.max_size:
            self._evict_lru()
        
        # Load and cache
        data = loader_func(shard_id)
        self.cache[shard_id] = data
        self.access_count[shard_id] = 1
        
        return data
```

#### 3. **Query Optimization**
```python
def optimize_query_for_search(query_text: str, query_embedding: np.ndarray):
    """
    Enhance query for better shard selection
    """
    # Extract hints from query text
    hints = {
        'has_color': bool(re.search(r'\b(red|blue|green|yellow)\b', query_text)),
        'has_time': bool(re.search(r'\b(morning|night|evening|day)\b', query_text)),
        'has_object': bool(re.search(r'\b(car|person|building|tree)\b', query_text)),
        'has_action': bool(re.search(r'\b(running|walking|driving)\b', query_text))
    }
    
    # Use hints to pre-filter shards
    if hints['has_time']:
        # Only search shards with matching time metadata
        pass
    
    return hints
```

### 📊 Expected Performance

With this optimized approach:
- **Search latency**: 50-200ms (vs 1-2s naive approach)
- **Memory usage**: 2-4GB (vs 30GB+ loading everything)
- **Accuracy**: 95%+ of full search (by smart shard selection)
- **Scalability**: Handle 10M+ embeddings on single machine

### 🎯 Quick Start Checklist

1. **Week 1**: 
   - [ ] Implement basic sharding with round-robin
   - [ ] Create metadata tracking system
   - [ ] Test with 100k embeddings

2. **Week 2**:
   - [ ] Add smart shard assignment
   - [ ] Implement parallel search
   - [ ] Add caching layer

3. **Week 3**:
   - [ ] Optimize query parsing
   - [ ] Add pre-filtering
   - [ ] Benchmark performance

4. **Week 4**:
   - [ ] Fine-tune shard sizes
   - [ ] Add monitoring
   - [ ] Prepare for competition scale

This plan will help you build a fast, scalable search system that can handle millions of embeddings efficiently on CPU-only hardware!