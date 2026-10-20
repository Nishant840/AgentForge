'use client';

// SidebarWrapper — client component that fetches repos and passes to Sidebar
// Lives separately so layout.tsx can remain a Server Component

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { Repository, repositoryApi } from '@/lib/api';

export default function SidebarWrapper() {
  const [repos, setRepos] = useState<Repository[]>([]);

  useEffect(() => {
    repositoryApi.list().then(setRepos).catch(() => {});
    // Refresh every 10 seconds so sidebar shows updated status
    const interval = setInterval(() => {
      repositoryApi.list().then(setRepos).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return <Sidebar repos={repos} />;
}
