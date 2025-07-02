# AI Challenge 2025: Intelligent Virtual Assistant for Multimedia Retrieval
## Project Development Plan

### Executive Summary
This plan outlines the development of an intelligent virtual assistant for multimedia data retrieval, designed for the AI Challenge 2025 competition. The system will support both traditional user-driven search and automatic AI-to-AI competition modes, with special focus on Vietnamese language and cultural content.

**Timeline**: 4 weeks (30 days)
**Core Technologies**: Hybrid Architecture (Python ML + Go/JS Server), CLIP, Vector Databases, LLMs, Vietnamese NLP
**Deliverables**: High-performance web-based chatbot with multimodal search capabilities
**Deployment**: Cloud-based embedding, CPU-optimized local inference

---

## Technical Architecture

### Modular Architecture (Not Microservices)
- **AI Module (Python)**: All ML models, embeddings, video processing
- **Chat Module (Go/Node.js)**: API server, WebSocket, chat interface
- **Communication**: Simple HTTP/REST between modules, WebSocket for clients
- **Shared Database**: Single PostgreSQL/MongoDB for both modules

### System Components

1. **Cloud-Based Embedding Pipeline**
   - CLIP for image-text alignment (GPU-accelerated)
   - Video frame extraction and keyframe selection
   - Audio transcription (Whisper)
   - Vietnamese text processing (PhoBERT/ViT5)
   - Batch processing for large datasets

2. **CPU-Optimized Inference Engine**
   - Quantized models (ONNX, INT8)
   - Lightweight embedding models (MobileViT)
   - Pre-computed embedding cache
   - Efficient similarity search

3. **Vector Search Infrastructure**
   - Faiss/ChromaDB for similarity search
   - Hybrid search with BM25 + semantic
   - Distributed index for scalability

4. **High-Performance Web Server**
   - Go/Node.js API server
   - WebSocket for real-time updates
   - Connection pooling and caching
   - Load balancing support

5. **Video Processing Pipeline**
   - FFmpeg for video decoding
   - Scene detection algorithms
   - Keyframe extraction (1-5 fps)
   - Temporal search capabilities

---

## Week-by-Week Breakdown

### Week 1: Foundation & Research (Days 1-7)

#### Day 1-2: Environment Setup
- Set up monorepo with two modules: ai-module/ and chat-module/
- Initialize Git repository with modular structure
- Configure single Docker compose for both modules
- Set up cloud development environment (GPU access)

#### Day 3-4: Data Analysis & Video Processing
- Analyze competition video format requirements
- Implement video frame extraction pipeline
- Create data loaders for videos, images, audio, text
- Test keyframe selection algorithms

#### Day 5-6: Architecture Design
- Design hybrid architecture (Python + Go/JS)
- Plan cloud embedding vs local inference split
- Design gRPC service interfaces
- Create deployment architecture for CPU-only inference

#### Day 7: Proof of Concept
- Test CLIP embedding on cloud GPU
- Implement CPU-optimized model loading
- Validate video processing pipeline
- Benchmark CPU inference performance

### Week 2: Core Model Development (Days 8-14)

#### Day 8-9: Cloud Embedding Pipeline
- Set up cloud GPU infrastructure
- Implement CLIP embeddings for images and video frames
- Add Vietnamese text processing with PhoBERT
- Create batch processing for large video datasets

#### Day 10-11: CPU Inference Setup
- Convert models to ONNX format
- Implement INT8 quantization
- Set up lightweight models (MobileViT)
- Create embedding cache system

#### Day 12-13: Video Search Logic
- Implement temporal search across video frames
- Add scene-based grouping
- Create keyframe ranking algorithms
- Build metadata indexing for videos

#### Day 14: CPU Optimization
- Benchmark CPU inference performance
- Implement multi-threading for parallel processing
- Optimize memory usage for large datasets
- Add pre-computed embedding lookup

### Week 3: Server & Chatbot Development (Days 15-21)

#### Day 15-16: Go/Node.js Chat Module
- Implement high-performance chat server
- Add WebSocket support for real-time chat
- Create HTTP clients to call AI module
- Implement connection pooling and caching

#### Day 17-18: Chatbot Logic
- Design video-aware conversation flows
- Implement temporal query understanding
- Add Vietnamese language support
- Create response templates for video results

#### Day 19-20: Web Interface
- Build responsive web UI (React/Vue)
- Add video preview and timeline navigation
- Implement real-time search updates
- Create mobile-friendly design

#### Day 21: Module Integration
- Connect Chat module with AI module via REST
- Implement health checks between modules
- Add request logging and monitoring
- Test end-to-end video search flow

### Week 4: Testing & Deployment (Days 22-30)

#### Day 22-23: Performance Testing
- Load test with large datasets
- Identify and fix bottlenecks
- Optimize resource usage

#### Day 24-25: Feature Enhancement
- Add advanced search filters
- Implement feedback mechanisms
- Enhance UI/UX based on testing

#### Day 26-27: Competition Preparation
- Implement automatic mode API
- Add rate limiting and security
- Prepare deployment scripts

#### Day 28-30: Final Polish
- Complete documentation
- Record demo videos
- Submit competition entry

---

## Implementation Prompts

### Phase 1: Project Setup and Foundation

#### Prompt 1.1: Initialize Modular Project Structure
```
Create a monorepo with two main modules:

ai-module/ (Python AI/ML Module):
├── embeddings/      # GME, CLIP embeddings
├── models/          # Model loading and management
├── processors/      # Video/image processing
├── search/          # Vector search, FAISS
├── nlp/            # Vietnamese text processing
├── api/            # FastAPI endpoints for AI services
├── config/         # Configuration files
└── requirements.txt # Python dependencies

chat-module/ (Go/Node.js Chat Server):
├── server/         # Main server application
├── handlers/       # HTTP/WebSocket handlers
├── chat/           # Chat logic and history
├── auth/           # User authentication
├── cache/          # Redis caching layer
├── static/         # Frontend assets
└── go.mod          # Go dependencies

shared/:
├── database/       # Shared DB schemas
├── docker-compose.yml
└── config/         # Shared configuration
```

#### Prompt 1.2: Video Processing Pipeline
```
Implement a video processing module that:
- Uses OpenCV and ffmpeg for video decoding
- Extracts keyframes using scene detection (PySceneDetect)
- Samples frames at configurable FPS (1-5 fps)
- Generates frame metadata (timestamp, scene_id)
- Handles various video formats (mp4, avi, mov)
- Implements parallel processing for multiple videos
- Saves frames efficiently with compression
Save as ai-module/processors/video_processor.py
```

#### Prompt 1.3: Cloud vs Local Configuration
```
Create a dual configuration system:

1. Cloud Config (cloud_config.yaml):
- GPU instance settings
- Batch processing parameters
- Model paths (CLIP, Whisper, PhoBERT)
- Storage bucket configurations

2. Local Config (local_config.yaml):
- CPU-only model paths (ONNX, quantized)
- Memory limits and thread counts
- Cache sizes and strategies
- Pre-computed embedding paths

Use Pydantic for validation, support env overrides
Save as ai-module/config/
```

### Phase 2: Embedding and Indexing

#### Prompt 2.1: GME-Qwen2-VL Cloud Service
```
Implement GME-Qwen2-VL-7B embedding and description service:
- Deploy on GPU instances (A100/V100 recommended)
- Load Alibaba-NLP/gme-Qwen2-VL-7B-Instruct model
- Generate both embeddings AND textual descriptions for frames
- Extract scene understanding, objects, actions, text in images
- Support English descriptions
- Batch process with 4-bit quantization for efficiency
- Save embeddings + descriptions to cloud storage
- Implement checkpoint resuming for large datasets
Save as ai-module/embeddings/gme_embedder.py
```

#### Prompt 2.2: CPU-Optimized Inference
```
Create CPU-optimized models for local inference:
- Convert CLIP to ONNX format with optimization
- Implement INT8 quantization for 4x speedup
- Use OpenVINO or ONNX Runtime for inference
- Create lightweight alternative (MobileViT)
- Implement model caching and warm-up
- Support batch inference on CPU
- Benchmark and ensure <100ms per query
Save as ai-module/inference/cpu_optimizer.py
```

#### Prompt 2.3: Vietnamese Language Module
```
Implement Vietnamese text processing:
- Use PhoBERT for Vietnamese embeddings
- Integrate underthesea for tokenization
- Handle code-switching (VN-EN mixed text)
- Implement diacritic normalization
- Support both Northern and Southern dialects
- Create Vietnamese-specific stopwords
- Optimize for CPU inference
Save as ai-module/nlp/vietnamese_processor.py
```

#### Prompt 2.4: Distributed Vector Index
```
Create a scalable vector search system:
- Use Faiss for local CPU search
- Implement index sharding for large datasets
- Add metadata filtering with DuckDB
- Create hybrid search (vector + BM25)
- Implement pre-computed embedding cache
- Support incremental index updates
- Optimize for CPU-only deployment
Save as ai-module/search/vector_index.py
```

#### Prompt 2.5: Enhanced Video Frame Extraction
```
Implement intelligent keyframe extraction:
- Use TransNetV2 for shot boundary detection
- Add PySceneDetect for content-based scene changes
- Implement motion-based sampling for action sequences
- Extract frames at multiple rates (0.5, 1, 2 fps)
- Use GME to score frame importance and filter
- Preserve temporal metadata (timestamp, scene_id)
- Remove near-duplicate frames with perceptual hashing
- Generate frame relationship graph for context
Save as ai-module/video/smart_frame_extractor.py
```

#### Prompt 2.6: GME-Based Scene Understanding
```
Create scene analysis pipeline using GME-Qwen2-VL:
- Generate detailed frame descriptions in Vietnamese/English
- Extract objects, actions, emotions, text in images
- Identify scene types (indoor/outdoor, day/night)
- Create temporal narratives across frame sequences
- Generate searchable tags and keywords
- Build scene transition understanding
- Support custom prompts for specific information extraction
Save as ai-module/analysis/scene_analyzer.py
```

### Phase 3: Search and Retrieval

#### Prompt 3.1: Hybrid Search Engine
```
Implement enhanced search combining GME and vector search:
- Search GME-generated descriptions with BM25/Elasticsearch
- Combine with FAISS vector similarity search
- Implement late fusion of text and vector scores
- Support temporal queries ("red car after 2 minutes")
- Use GME embeddings for semantic search
- Filter by scene types, objects, actions from GME
- Re-rank using cross-encoder for precision
- Cache frequent queries with Redis
Save as ai-module/search/hybrid_search.py
```

#### Prompt 3.2: Query Understanding Module
```
Create a query parser that:
- Identifies query intent (search by description, object, scene, etc.)
- Extracts temporal and spatial constraints
- Handles Vietnamese and English queries
- Implements query reformulation
- Supports complex queries with multiple conditions
- Integrates with LLM for natural language understanding
Save as src/search/query_parser.py
```

#### Prompt 3.3: Result Ranking and Filtering
```
Implement a result post-processor that:
- Re-ranks results based on multiple signals
- Implements diversity in results
- Filters out near-duplicates
- Applies business logic constraints
- Formats results for presentation
- Includes explanation generation for rankings
Save as src/search/result_processor.py
```

### Phase 4: High-Performance Server

#### Prompt 4.1: Go Chat Server
```
Create a high-performance Go chat server using Fiber:
- Implement HTTP client to call Python AI module
- Add Redis for caching and session management
- Create WebSocket handlers for real-time chat
- Implement connection pooling
- Add request validation and rate limiting
- Simple REST API calls to AI module (no gRPC needed)
- Include basic logging and monitoring
Save as chat-module/server/main.go and chat-module/handlers/
```

#### Prompt 4.2: Video Search Handlers
```
Implement Go handlers for video search:
- Parse temporal queries ("red car at 2:30")
- Handle multi-modal search requests
- Stream results as they're found
- Implement result pagination
- Add video preview generation
- Cache frequent queries
- Return results in <50ms for cached queries
Save as chat-module/handlers/video_search.go
```

#### Prompt 4.3: REST API Design
```
Define simple REST API between modules:

// AI Module endpoints (FastAPI)
POST /api/search - Search videos/images
POST /api/embed - Generate embeddings
POST /api/analyze - Analyze video frames
GET /api/health - Health check

// Chat Module endpoints (Go Fiber)
WS /ws/chat - WebSocket for real-time chat
POST /api/chat/message - Send chat message
GET /api/chat/history - Get chat history
POST /api/chat/search - Trigger search from chat

Use JSON for all communication
Save as shared/api-spec.md
```

### Phase 5: Web Interface

#### Prompt 5.1: Next.js 14 High-Performance Frontend
```
Build a high-performance chatbot with Next.js 14:

Frontend Architecture:
- Next.js 14 App Router with Server Components
- WebSocket for real-time chat (Socket.io)
- Server-Sent Events for AI response streaming
- Shadcn/ui + Radix UI for zero-runtime components
- Zustand for lightweight state management
- React Query for data fetching/caching

Key Features:
- Virtual scrolling for chat history (Tanstack Virtual)
- Optimistic updates for instant feedback
- Progressive image loading for video frames
- Lazy loading with Suspense boundaries
- Web Workers for heavy computations
- Service Worker for offline support

Performance Optimizations:
- Bundle splitting per route
- Preload critical resources
- Image optimization with next/image
- Font subsetting for Vietnamese
- Edge runtime for global deployment

Target Metrics:
- First Contentful Paint: <1s
- Time to Interactive: <2s
- Bundle size: <200KB initial

Save as web-ui/
```

#### Prompt 5.2: Node.js BFF Layer
```
Create a Backend-for-Frontend in Node.js:
- Aggregate calls to Go API and Python services
- Implement GraphQL for flexible queries
- Add response caching with Redis
- Handle file uploads to cloud storage
- Implement user session management
- Add request batching for efficiency
- Support Server-Sent Events for progress
Save as bff-server/src/
```

#### Prompt 5.3: Performance-Optimized UI Components
```
Create high-performance React components:

// ChatInterface.tsx
- Virtual scrolling with react-window
- Message grouping by time
- Lazy render images/videos
- Skeleton loading states
- Keyboard shortcuts (Cmd+K for search)

// VideoResultsGrid.tsx  
- Intersection Observer for lazy loading
- Thumbnail generation with Canvas API
- Frame preview on hover
- Batch selection support
- Export to JSON/CSV

// SearchInput.tsx
- Debounced input (300ms)
- Vietnamese IME support
- Voice input with Web Speech API
- Auto-complete with recent searches
- Multi-language placeholders

// Performance utilities
- useDeferredValue for search results
- React.memo for expensive components
- Custom hooks for WebSocket/SSE
- Error boundaries for resilience

Save as web-ui/components/
```

### Phase 6: GME-Qwen2-VL Implementation Example

#### Prompt 6.1: GME Video Analysis Pipeline
```
Implement complete GME-based video analysis:

from transformers import Qwen2VLForConditionalGeneration, AutoTokenizer, AutoProcessor

class GMEVideoAnalyzer:
    def __init__(self):
        self.model = Qwen2VLForConditionalGeneration.from_pretrained(
            "Alibaba-NLP/gme-Qwen2-VL-7B-Instruct",
            torch_dtype=torch.float16,
            device_map="auto"
        )
        self.processor = AutoProcessor.from_pretrained("Alibaba-NLP/gme-Qwen2-VL-7B-Instruct")

    def analyze_frame(self, image, prompt_template):
        # Generate both embedding and description
        # Support Vietnamese prompts
        # Extract structured information

    def batch_process_video(self, video_frames, output_format):
        # Process frames with scene context
        # Generate temporal relationships
        # Save embeddings + descriptions

Example prompts:
- Vietnamese: "Mô tả chi tiết cảnh này, bao gồm người, vật, hành động"
- Structured: "List all objects, their positions, actions, and any text visible"
- Temporal: "Compare this frame with previous, what changed?"

Save as ai-module/gme/video_analyzer.py
```

#### Prompt 6.2: Next.js 14 Chatbot Implementation
```
Implement complete chatbot interface:

// app/api/chat/route.ts - Edge API Route
export const runtime = 'edge'

export async function POST(req: Request) {
  const { message, sessionId } = await req.json()
  
  // Stream response using TransformStream
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  
  // Call Go API server
  processQuery(message, sessionId, writer)
  
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}

// hooks/useChat.ts - Custom hook
export function useChat() {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  
  const sendMessage = async (text: string) => {
    // Optimistic update
    const tempId = generateId()
    setMessages(prev => [...prev, { id: tempId, text, role: 'user' }])
    
    // Stream AI response
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: text }),
    })
    
    // Handle streaming response
    const reader = response.body.getReader()
    // ... streaming logic
  }
  
  return { messages, sendMessage, isStreaming }
}

Save as web-ui/app/ and web-ui/hooks/
```

#### Prompt 6.3: Module Communication Example
```
Show how modules communicate via simple REST:

# AI Module (FastAPI) - ai_module/api/main.py
from fastapi import FastAPI
app = FastAPI()

@app.post("/api/search")
async def search_videos(query: dict):
    # Process search query
    results = await search_engine.search(
        text=query["text"],
        filters=query.get("filters", {})
    )
    return {"results": results}

# Chat Module (Go) - chat_module/handlers/search.go
func handleSearch(c *fiber.Ctx) error {
    // Parse user query from chat
    query := parseSearchQuery(c.Body())
    
    // Call AI module
    resp, err := http.Post(
        "http://localhost:8001/api/search",
        "application/json",
        bytes.NewBuffer(query)
    )
    
    // Stream results back to user
    return streamResults(c, resp)
}

# Docker Compose - shared/docker-compose.yml
services:
  ai-module:
    build: ./ai-module
    ports: ["8001:8001"]
    
  chat-module:
    build: ./chat-module
    ports: ["8000:8000"]
    depends_on: [ai-module]
    
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: vbs_db
```

### Phase 7: Integration and Testing

#### Prompt 7.1: Integration Layer
```
Create an integration module that:
- Orchestrates all components together
- Implements dependency injection
- Handles component lifecycle management
- Provides unified error handling
- Implements circuit breakers for external services
- Includes comprehensive logging
Save as src/core/integration.py
```

#### Prompt 7.2: Testing Suite
```
Implement comprehensive tests that:
- Unit test each component
- Integration test search pipelines
- Load test with simulated users
- Benchmark search performance
- Validate Vietnamese language handling
- Test edge cases and error conditions
Save as tests/test_suite.py
```

#### Prompt 7.3: Performance Monitor
```
Create a monitoring system that:
- Tracks search latency and throughput
- Monitors resource usage (CPU, memory, GPU)
- Logs query patterns and success rates
- Implements alerting for anomalies
- Provides performance dashboards
- Exports metrics for analysis
Save as src/monitoring/performance_monitor.py
```

### Phase 8: Video Processing & Optimization

#### Prompt 8.1: Video Frame Extractor
```
Implement efficient video processing:
- Use FFmpeg with hardware acceleration
- Extract keyframes using scene detection
- Implement adaptive frame sampling (1-5 fps)
- Generate frame thumbnails
- Extract temporal metadata
- Support batch processing of videos
- Handle corrupted video files gracefully
Save as ai-module/video/frame_extractor.py
```

#### Prompt 8.2: Temporal Search Engine
```
Create video-aware search capabilities:
- Index frames with timestamps
- Support temporal queries ("red car after 2 minutes")
- Implement scene-based grouping
- Add motion-based search
- Create video summarization
- Support highlight extraction
- Enable multi-video search
Save as ai-module/search/temporal_search.py
```

#### Prompt 8.3: CPU Performance Optimization
```
Optimize for CPU-only deployment:
- Implement SIMD operations for vector search
- Use memory-mapped files for large indices
- Create tiered caching (RAM -> SSD -> Cloud)
- Implement request batching
- Add query result precomputation
- Profile and optimize hot paths
- Target <100ms search latency
Save as ai-module/optimization/cpu_perf.py
```

### Phase 9: Deployment and Competition

#### Prompt 9.1: Simple Deployment
```
Create production deployment setup:
- Single server deployment with Docker Compose
- Nginx reverse proxy for both modules
- Shared PostgreSQL database
- Redis for caching
- Simple health checks
- Volume mounts for model files
- Environment-based configuration
Save as deploy/docker-compose.prod.yml
```

#### Prompt 9.2: Competition Mode Implementation
```
Build automatic competition mode:
- Implement standard API endpoints
- Add request queuing system
- Support batch query processing
- Implement result caching
- Add performance metrics collection
- Create fallback mechanisms
- Ensure 99.9% uptime
Save as chat-module/competition/
```

#### Prompt 9.3: Integration Testing
```
Create comprehensive test suite:
- End-to-end video search tests
- Load testing with 1000+ concurrent users
- Vietnamese language test cases
- CPU performance benchmarks
- API compatibility tests
- Failure recovery scenarios
- Generate performance reports
Save as tests/integration/
```

---

## Frontend Architecture Deep Dive

### Next.js 14 Performance Strategy

#### Server Components Architecture
```typescript
// app/chat/page.tsx - Server Component
export default async function ChatPage() {
  // Fetch initial data on server
  const config = await getSystemConfig()
  const recentSearches = await getRecentSearches()
  
  return (
    <ChatLayout>
      <Suspense fallback={<ChatSkeleton />}>
        <ChatInterface 
          config={config}
          recentSearches={recentSearches}
        />
      </Suspense>
    </ChatLayout>
  )
}

// components/ChatInterface.tsx - Client Component
'use client'
export function ChatInterface({ config, recentSearches }) {
  // Interactive chat logic here
}
```

#### Real-time Communication Layer
- **WebSocket**: Bidirectional for user messages
- **Server-Sent Events**: Unidirectional for AI streaming
- **HTTP/2 Push**: Proactive resource delivery
- **Long Polling**: Fallback for restricted networks

#### Performance Optimizations
1. **Route-based Code Splitting**: Each page loads only required JS
2. **React Server Components**: 70% less JavaScript to client
3. **Streaming SSR**: Progressive page rendering
4. **Edge Runtime**: Deploy globally for <50ms latency
5. **Prefetching**: Anticipate user navigation

#### Monitoring & Analytics
- Web Vitals tracking (LCP, FID, CLS)
- Custom performance marks
- Error boundary reporting
- User interaction heatmaps

## GME-Qwen2-VL Integration Benefits

### Why GME-Qwen2-VL Over BEiT3
1. **Rich Scene Understanding**: Generates detailed descriptions beyond simple embeddings
2. **Vietnamese Native Support**: Better handling of Vietnamese queries and content
3. **Temporal Reasoning**: Can understand relationships between video frames
4. **Multi-modal Fusion**: Handles image + text in frames naturally
5. **Instruction Following**: Can be prompted for specific information extraction

### Implementation Strategy
- **Cloud Phase**: Use full GME-Qwen2-VL for preprocessing
  - Generate frame descriptions in Vietnamese/English
  - Extract structured information (objects, actions, emotions)
  - Create searchable metadata
- **Local Phase**: Use pre-computed GME outputs
  - Search descriptions with text search
  - Use cached embeddings for similarity
  - Lightweight query encoding only

## Key Considerations

### Modular Architecture Benefits
- **Simpler than Microservices**: No service discovery, no complex orchestration
- **Shared Database**: Both modules access same DB, reducing complexity
- **Easy Deployment**: Single docker-compose, one server deployment
- **Clear Separation**: AI logic isolated from chat/web logic
- **Performance**: Direct HTTP calls between modules on same network
- **Debugging**: Easier to trace requests between just 2 modules

### Hybrid Technology Benefits
- **Python ML Services**: Best-in-class AI models and libraries
- **Go API Server**: 10x better performance than Python for HTTP
- **Cloud Embedding**: Leverage GPUs for batch processing
- **Local CPU Inference**: Cost-effective real-time serving

### Video Processing Challenges
- Large file sizes require streaming processing
- Keyframe selection critical for search quality
- Temporal queries need specialized indexing
- Scene detection improves result relevance

### Vietnamese Language Support
- PhoBERT provides state-of-the-art Vietnamese understanding
- Handle diacritics and tone marks properly
- Support code-switching (Vietnamese-English mixed)
- Consider Northern/Southern dialect differences

### CPU Optimization Strategies
- ONNX Runtime reduces inference time by 3-4x
- INT8 quantization maintains 95%+ accuracy
- Pre-computed embeddings eliminate inference for known data
- Aggressive caching reduces repeated computations

### Competition Requirements
- Response time: <100ms for cached, <500ms for new queries
- Concurrent users: 100+ simultaneous connections
- Automatic mode: Standardized REST API with queuing
- Reliability: 99.9% uptime with graceful degradation

### Performance Targets
- Embedding generation: 1000 images/minute (cloud)
- Search latency: P50 <50ms, P95 <200ms (local)
- Video processing: 10 hours/hour on single GPU
- Memory usage: <8GB for 1M embeddings

---

## Risk Mitigation

### Technical Risks
1. **Model Performance**: Have fallback models ready
2. **Scalability Issues**: Implement caching and load balancing
3. **Integration Failures**: Use circuit breakers and retries

### Timeline Risks
1. **Delays**: Build MVP first, enhance iteratively
2. **Complexity**: Start with simple approaches, optimize later
3. **Testing Time**: Automate testing early

---

## Success Criteria
1. Successfully retrieve relevant content for 80%+ queries
2. Response time under 1 second for standard queries
3. Handle 100+ concurrent users
4. Support both Vietnamese and English queries
5. Pass all competition test cases

---

## Parallel Development Strategy

### API Contract First Development

To enable AI and Backend teams to work in parallel effectively, follow this strategy:

#### Quick Reference for Teams

**AI Team Checklist:**
- [ ] Set up FastAPI with all endpoints (even if returning mock data)
- [ ] Create example responses in JSON files
- [ ] Document expected input/output formats
- [ ] Provide performance benchmarks (response times)
- [ ] Create Postman/Insomnia collection for API testing

**Backend Team Checklist:**
- [ ] Build against mock AI service first
- [ ] Implement retry logic with exponential backoff
- [ ] Add circuit breakers for AI service calls
- [ ] Create fallback UI for slow/failed AI responses
- [ ] Log all AI service interactions for debugging

**Both Teams:**
- [ ] Review API contract before any changes
- [ ] Run integration tests before pushing
- [ ] Update mock services when contract changes
- [ ] Document any assumptions or blockers

#### 1. Day 0: Define API Contracts (Both Teams Together)
```yaml
# shared/api-contracts/openapi.yaml
openapi: 3.0.0
info:
  title: VBS AI Challenge API
  version: 1.0.0

paths:
  /api/v1/search:
    post:
      summary: Search videos/images
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                query: 
                  type: string
                  example: "red car in the morning"
                filters:
                  type: object
                  properties:
                    time_range: 
                      type: string
                      example: "0:30-2:00"
                limit:
                  type: integer
                  default: 10
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  results:
                    type: array
                    items:
                      $ref: '#/components/schemas/SearchResult'

components:
  schemas:
    SearchResult:
      type: object
      properties:
        video_id: string
        frame_number: integer
        timestamp: string
        confidence: number
        description: string
        thumbnail_url: string
```

#### 2. Mock Services Setup

**For Backend Team - Mock AI Service:**
```python
# shared/mocks/mock_ai_service.py
from fastapi import FastAPI
import random
import time

app = FastAPI()

@app.post("/api/v1/search")
async def mock_search(query: dict):
    # Simulate processing delay
    await asyncio.sleep(random.uniform(0.5, 2.0))
    
    # Return mock results
    return {
        "results": [
            {
                "video_id": f"video_{i}",
                "frame_number": random.randint(1, 1000),
                "timestamp": f"{random.randint(0,5)}:{random.randint(0,59):02d}",
                "confidence": random.uniform(0.7, 0.99),
                "description": f"Mock result for: {query['query']}",
                "thumbnail_url": f"/thumbnails/frame_{i}.jpg"
            }
            for i in range(query.get("limit", 10))
        ]
    }

# Run with: uvicorn mock_ai_service:app --port 8001
```

**For AI Team - Mock Chat Client:**
```python
# shared/mocks/test_ai_client.py
import requests
import json

def test_search_endpoint():
    response = requests.post(
        "http://localhost:8001/api/v1/search",
        json={
            "query": "person wearing red shirt",
            "filters": {"time_range": "1:00-3:00"},
            "limit": 5
        }
    )
    print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    test_search_endpoint()
```

#### 3. Shared Data Models
```python
# shared/models/data_models.py
from pydantic import BaseModel
from typing import List, Optional, Dict

class SearchQuery(BaseModel):
    query: str
    filters: Optional[Dict] = {}
    limit: int = 10
    offset: int = 0

class SearchResult(BaseModel):
    video_id: str
    frame_number: int
    timestamp: str
    confidence: float
    description: str
    thumbnail_url: str
    metadata: Optional[Dict] = {}

class ChatMessage(BaseModel):
    id: str
    user_id: str
    message: str
    timestamp: str
    search_results: Optional[List[SearchResult]] = []
```

#### 4. Integration Tests (Both Teams Must Pass)
```python
# tests/integration/test_api_contract.py
import pytest
import requests
from jsonschema import validate

def test_search_api_contract():
    """Test that AI service follows the contract"""
    response = requests.post(
        "http://localhost:8001/api/v1/search",
        json={"query": "test query"}
    )
    
    # Validate response format
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert isinstance(data["results"], list)
    
    # Validate each result
    for result in data["results"]:
        assert all(key in result for key in [
            "video_id", "frame_number", "timestamp",
            "confidence", "description", "thumbnail_url"
        ])
        assert 0 <= result["confidence"] <= 1

def test_search_performance():
    """Test that search responds within SLA"""
    import time
    start = time.time()
    response = requests.post(
        "http://localhost:8001/api/v1/search",
        json={"query": "test", "limit": 10}
    )
    duration = time.time() - start
    assert duration < 3.0  # 3 second SLA
```

#### 5. Git Workflow for Parallel Development
```bash
# Repository structure
main
├── feature/ai-model      # AI team branch
├── feature/backend-chat  # Backend team branch
└── feature/integration   # Integration testing branch

# Daily integration workflow
1. AI team pushes to feature/ai-model
2. Backend team pushes to feature/backend-chat
3. Both teams merge to feature/integration daily
4. Run integration tests on feature/integration
5. Fix any contract violations before continuing
```

#### 6. Environment Configuration
```bash
# .env.development (Backend team)
AI_SERVICE_URL=http://localhost:8001  # Mock AI service
ENABLE_MOCK_MODE=true

# .env.development (AI team)
CHAT_SERVICE_URL=http://localhost:8000  # Mock chat service
ENABLE_MOCK_MODE=true

# .env.integration (Both teams)
AI_SERVICE_URL=http://localhost:8001  # Real AI service
CHAT_SERVICE_URL=http://localhost:8000  # Real chat service
ENABLE_MOCK_MODE=false
```

#### 7. Daily Sync Protocol
```yaml
Daily Standup (15 min):
  - API changes discussion
  - Integration blockers
  - Contract updates needed

Weekly Integration (2 hours):
  - Full system integration test
  - Performance testing
  - Contract refinements
  - Update mock services
```

### Development Timeline with Parallel Work

| Week | AI Team | Backend Team | Integration Points |
|------|---------|--------------|-------------------|
| **Week 1** | - Set up GME model<br>- Create mock API<br>- Define data schemas | - Build chat server<br>- Use mock AI responses<br>- Create WebSocket layer | Day 3: API contract review<br>Day 5: First integration test |
| **Week 2** | - Implement embeddings<br>- Build search logic<br>- Optimize performance | - Complete UI components<br>- Add caching layer<br>- Handle errors gracefully | Day 10: Full integration<br>Day 12: Performance test |
| **Week 3** | - Fine-tune models<br>- Add Vietnamese support<br>- Batch processing | - Polish UX<br>- Add monitoring<br>- Load testing | Day 17: Feature freeze<br>Day 19: Integration testing |
| **Week 4** | - Final optimizations<br>- Bug fixes<br>- Documentation | - Bug fixes<br>- Deployment prep<br>- Documentation | Daily: Full system tests<br>Final integration |

### Key Success Factors for Parallel Development

1. **Contract-First Development**
   - Never change API without team agreement
   - Version all endpoints (/v1/, /v2/)
   - Document breaking changes immediately

2. **Mock Everything**
   - AI team: Mock the chat/frontend requests
   - Backend team: Mock all AI responses
   - Both: Use realistic data volumes and delays

3. **Continuous Integration**
   - Automated tests run on every commit
   - Integration branch tested multiple times daily
   - Performance benchmarks tracked

4. **Communication Channels**
   ```
   Slack/Discord channels:
   - #api-changes (for contract updates)
   - #integration-issues (for blockers)
   - #daily-standup (for progress)
   ```

5. **Shared Development Database**
   - Both teams use same PostgreSQL instance
   - Shared test data for consistency
   - Migration scripts in shared/ folder

## Quick Start Guide

### Week 1 Priority Actions
1. **Day 1**: Set up cloud GPU instance with 40GB+ VRAM for GME-Qwen2-VL
2. **Day 2**: Initialize monorepo with AI and Chat modules + Next.js 14 frontend
3. **Day 3**: Test GME-Qwen2-VL on sample videos for scene understanding
4. **Day 4**: Implement enhanced keyframe extraction pipeline
5. **Day 5**: Build WebSocket/SSE real-time communication layer

### Technology Stack Summary
```yaml
# ML/AI Services (Python)
- Primary Model: GME-Qwen2-VL-7B-Instruct (cloud)
- Embeddings: GME embeddings, MobileCLIP (local)
- Vietnamese: PhoBERT, underthesea
- Video: OpenCV, FFmpeg, PySceneDetect, TransNetV2
- Optimization: ONNX Runtime, 4-bit quantization
- Search: Faiss, DuckDB, Elasticsearch

# API Server (Go)
- Framework: Fiber v2
- Cache: Redis
- RPC: gRPC
- Tracing: OpenTelemetry

# Web Frontend (Next.js 14)
- Framework: Next.js 14 + TypeScript
- UI: Shadcn/ui + Radix UI
- State: Zustand + React Query
- Real-time: Socket.io + SSE
- Video: Video.js + Custom players
- Performance: Virtual scrolling, Web Workers

# Infrastructure
- Container: Docker, Kubernetes
- CI/CD: GitHub Actions
- Monitoring: Prometheus + Grafana
```

### Critical Path Items
1. **GME-Qwen2-VL Setup** (Week 1): Cloud deployment for rich scene understanding
2. **Enhanced Video Pipeline** (Week 1): Smart keyframe extraction
3. **CPU Optimization** (Week 2): Pre-computed GME features for local inference
4. **Hybrid Search** (Week 2): Combine GME descriptions + vector search
5. **Vietnamese Support** (Week 3): Leverage GME's multilingual capabilities

---

*This plan provides a structured approach to building a competition-ready multimedia search system within the 30-day deadline. The integration of GME-Qwen2-VL-7B provides superior scene understanding and Vietnamese support, while the hybrid architecture (Python + Go/JS) and cloud/local split optimize for both performance and resource constraints.*
