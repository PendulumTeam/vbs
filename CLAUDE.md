# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VBS (Video Search Assistant) is a comprehensive AI-powered video search and retrieval system with a microservices architecture consisting of:

- **Web UI**: Next.js frontend with TypeScript, TailwindCSS, and shadcn/ui components
- **Chat Module**: Go-based API server (referenced but not in this workspace)
- **AI Module**: Python ML services for video analysis (referenced but not in this workspace)
- **Database**: MongoDB for metadata, embeddings, and search history
- **Storage**: MinIO for object storage, Redis for caching

## Development Commands

### Web UI Development
```bash
cd web-ui
pnpm dev          # Start development server on port 3000
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm type-check   # Run TypeScript checks
pnpm format       # Format code with Prettier
```

### Docker Services
```bash
cd shared
docker-compose up -d              # Start all services
docker-compose up -d mongodb      # Start specific service
docker-compose logs web-ui        # View logs
docker-compose down               # Stop all services
```

## Architecture Overview

### Frontend Architecture (Next.js App Router)
- **App Directory Structure**: Uses Next.js 15 with App Router
- **Component System**: 
  - shadcn/ui components in `/components/ui/`
  - Domain-specific VBS components in `/components/vbs/`
  - Features organized by domain (search-results, symbol-grid)
- **State Management**: 
  - TanStack Query for server state and caching
  - Zustand for client state management
  - React Context for component-level state
- **API Integration**: Next.js API routes proxy to backend services

### Search System Architecture
The system supports three types of search:

1. **Text Search** (`/api/search/route.ts`): Uses CLIP/BLIP2 embeddings for semantic video frame search
2. **OCR Search** (`/api/search-ocr/route.ts`): Searches text content extracted from video frames  
3. **Visual Search** (`/api/search-detections/route.ts`): Object-based spatial search using bounding boxes

### Key Components

#### VBS Search Results (`/components/vbs/search-results/`)
- **SearchResults.tsx**: Main component with context provider pattern
- **VideoGroup.tsx**: Groups frames by video with lazy loading
- **SearchResultsContext.tsx**: Manages search state and image loading
- **hooks/useSearchResults.ts**: Custom hook for search result logic

#### VBS Symbol Grid (`/components/vbs/symbol-grid/`)
- **SymbolGrid.tsx**: Interactive canvas for visual search composition
- **CanvasGrid.tsx**: Konva.js-based canvas for object positioning
- **SymbolPalette.tsx**: Draggable object palette for visual search
- **SymbolGridContext.tsx**: Manages canvas state and object placement

### Database Schema (MongoDB)
Key collections defined in `/shared/database/mongo-init.js`:
- **videos**: Video metadata, duration, frame counts
- **embeddings**: Video frame embeddings with timestamps and object detection
- **file_metadata**: S3/MinIO file storage metadata with hierarchical indexing
- **search_history**: Query logging and performance metrics
- **chat_sessions**: Conversation history and user interactions

### File Organization Patterns
- **Context Provider Pattern**: Each major component has its own context and custom hook
- **Domain-Driven Structure**: Features organized by business domain rather than technical layer
- **Barrel Exports**: Each domain exports its public API through `index.ts` files
- **Type Safety**: Comprehensive TypeScript coverage with strict configuration

### API Routing Strategy
- **Hybrid Routing**: Next.js API routes for file operations, proxied routes for AI/chat services
- **Environment-Aware**: Different base URLs for development vs. production
- **Error Handling**: Consistent error responses and client-side error boundaries

### Styling and UI Framework
- **shadcn/ui**: Component library with Radix UI primitives
- **TailwindCSS**: Utility-first CSS with custom theme configuration  
- **Design System**: Consistent spacing, colors, and component variants
- **Responsive Design**: Mobile-first approach with responsive breakpoints

## Key Dependencies

### Core Framework
- **Next.js 15**: React framework with App Router
- **React 19**: Latest React with concurrent features
- **TypeScript**: Full type coverage and strict configuration

### UI and Styling
- **shadcn/ui**: Pre-built component library
- **TailwindCSS**: Utility-first CSS framework
- **Radix UI**: Primitive components for accessibility
- **Lucide React**: Icon library

### State and Data
- **TanStack Query**: Server state management and caching
- **Zustand**: Lightweight client state management
- **React Hook Form**: Form handling with validation
- **Zod**: Runtime type validation

### Canvas and Visualization  
- **Konva/React-Konva**: 2D canvas library for visual search interface
- **React DnD**: Drag and drop functionality

### Development Tools
- **ESLint**: Code linting with TypeScript support
- **Prettier**: Code formatting with TailwindCSS plugin
- **TypeScript**: Static type checking

## Testing and Quality

The project uses TypeScript for compile-time type checking. Run `pnpm type-check` to verify types before commits.

## Environment Configuration

### Development Environment Variables
- `NEXT_PUBLIC_API_URL`: Backend API base URL (default: http://localhost:3000)
- `NEXT_PUBLIC_VBS_API_URL`: VBS service URL for search operations

### Docker Environment
All services run in Docker containers with service discovery through the `vbs-network`. The web UI proxies API calls to backend services running on different ports.