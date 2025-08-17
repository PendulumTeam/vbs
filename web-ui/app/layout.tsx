import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/lib/query-provider'
import { Toaster } from "@/components/ui/sonner";
import { Navigation } from "@/components/navigation";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VBS - Video Search Assistant",
  description:
    "AI-powered video search and retrieval system for multimedia content",
  keywords: "video search, AI, multimedia, Vietnamese, search engine",
  authors: [{ name: "VBS Team" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <div className="min-h-screen bg-background">
            <Navigation />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
