import React from 'react';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { useHealthCheck } from '../api/queries';
import { Badge } from '../components/ui/badge';

function RootComponent() {
  const { data: health } = useHealthCheck();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                <a href="/" className="hover:text-blue-600 transition-colors">
                  VBS Search
                </a>
              </h1>
              {health && (
                <Badge 
                  variant={health.status === 'healthy' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {health.status}
                </Badge>
              )}
            </div>
            
            {/* Navigation */}
            <nav className="flex items-center gap-4">
              <a href="/" className="text-sm text-gray-600 hover:text-gray-900">
                Search
              </a>
              <a href="/videos" className="text-sm text-gray-600 hover:text-gray-900">
                Videos
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      
      {/* DevTools */}
      <TanStackRouterDevtools />
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});