import { Suspense } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import SidebarWrapper from '@/components/SidebarWrapper';

export const metadata: Metadata = {
  title: 'AgentForge — Autonomous Software Engineering',
  description: 'AI-powered autonomous software engineering agent that clones, indexes, and modifies GitHub repositories.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ display: 'flex', minHeight: '100vh' }}>
        <Suspense fallback={<aside style={{ width: 240, height: '100vh', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', position: 'fixed', left: 0, top: 0 }} />}>
          <SidebarWrapper />
        </Suspense>
        <main style={{ marginLeft: 240, flex: 1, minHeight: '100vh', overflowY: 'auto' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
