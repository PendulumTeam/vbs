import Link from 'next/link';
import { Database, Search, MessageSquare, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Video Browser System
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Intelligent video frame navigation and search platform with MongoDB integration 
            and advanced AI-powered discovery capabilities.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Link href="/vbs-search">
              <Button size="lg" className="gap-2">
                <Search className="h-5 w-5" />
                Visual Search
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            
            <Link href="/files">
              <Button variant="outline" size="lg" className="gap-2">
                <Database className="h-5 w-5" />
                File Browser
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* File Browser */}
          <div className="p-6 bg-card rounded-lg border">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">File Browser</h3>
                <Badge variant="default" className="text-xs">Ready</Badge>
              </div>
            </div>
            <p className="text-muted-foreground mb-4">
              Hierarchical navigation through video frames with intelligent tree structure. 
              Browse Groups → Videos → Frames with performance optimization.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                MongoDB integration with aggregation pipelines
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Virtual scrolling for large datasets
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Smart caching and lazy loading
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Responsive design with mobile support
              </li>
            </ul>
          </div>

          {/* Search Platform */}
          <div className="p-6 bg-card rounded-lg border">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Search className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Visual Search</h3>
                <Badge variant="default" className="text-xs">Ready</Badge>
              </div>
            </div>
            <p className="text-muted-foreground mb-4">
              Advanced multi-modal search with text queries, visual canvas, OCR text detection, 
              and ML-powered similarity discovery.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                React-Konva spatial query canvas
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Text-based image search
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                OCR text-in-image detection
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Similarity-based discovery
              </li>
            </ul>
          </div>

          {/* Chat Interface */}
          <div className="p-6 bg-card rounded-lg border opacity-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold">AI Chat</h3>
                <Badge variant="outline" className="text-xs">Planned</Badge>
              </div>
            </div>
            <p className="text-muted-foreground mb-4">
              Conversational interface for natural language video queries with context-aware 
              AI assistance and guided discovery.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 border rounded-full"></div>
                Natural language processing
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 border rounded-full"></div>
                Context-aware conversations
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 border rounded-full"></div>
                Guided discovery workflows
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 border rounded-full"></div>
                Real-time collaboration
              </li>
            </ul>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-card rounded-lg border p-6">
          <h3 className="font-semibold mb-4">System Status</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">MongoDB Database</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">File Browser API</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Tree Navigation</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Visual Search</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-4">
            Ready to explore your video collection?
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/vbs-search">
              <Button size="lg" className="gap-2">
                <Search className="h-5 w-5" />
                Start Visual Search
              </Button>
            </Link>
            <Link href="/files">
              <Button size="lg" variant="outline" className="gap-2">
                <Database className="h-5 w-5" />
                Browse Files
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}