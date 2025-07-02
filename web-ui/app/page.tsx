import { Suspense } from 'react'
import { ChatInterface } from '@/components/chat-interface'
import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { SearchProvider } from '@/hooks/use-search'

export default function HomePage() {
  return (
    <SearchProvider>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card">
          <Suspense fallback={<div className="p-4">Loading...</div>}>
            <Sidebar />
          </Suspense>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <Header />
          
          {/* Chat Interface */}
          <main className="flex-1 overflow-hidden">
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="loading-pulse">Loading chat interface...</div>
              </div>
            }>
              <ChatInterface />
            </Suspense>
          </main>
        </div>
      </div>
    </SearchProvider>
  )
}