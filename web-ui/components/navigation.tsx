'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, MessageSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Navigation - Top navigation bar for the VBS application
 */
export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/',
      label: 'Chat',
      icon: MessageSquare,
      description: 'AI Chat Interface'
    },
    {
      href: '/files',
      label: 'File Browser',
      icon: Database,
      description: 'Browse Video Frames',
      badge: 'New'
    },
    {
      href: '/search',
      label: 'Search Platform',
      icon: Search,
      description: 'Advanced Video Search',
      badge: 'Coming Soon',
      disabled: true
    }
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6">
        {/* Logo */}
        <div className="flex items-center space-x-2 mr-8">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">VBS</span>
          </div>
          <span className="font-semibold text-lg">Video Browser System</span>
        </div>

        {/* Navigation Items */}
        <div className="flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-muted-foreground opacity-50"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <Badge variant="outline" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </div>
              );
            }
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className="flex items-center space-x-2"
                  size="sm"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <Badge 
                      variant={isActive ? "secondary" : "outline"} 
                      className="text-xs ml-1"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Right side - Status */}
        <div className="flex items-center space-x-4 ml-auto">
          <div className="text-sm text-muted-foreground">
            MongoDB File Browser Ready
          </div>
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
        </div>
      </div>
    </nav>
  );
}