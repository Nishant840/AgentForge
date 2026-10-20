'use client';

// /tasks — lists all tasks across all repositories

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, RefreshCw, ListTodo } from 'lucide-react';
import { Task, Repository, taskApi, repositoryApi } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDistanceToNow } from 'date-fns';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [repoMap, setRepoMap] = useState<Record<string, Repository>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const repos = await repositoryApi.list();
      const map: Record<string, Repository> = {};
      repos.forEach(r => { map[r.id] = r; });
      setRepoMap(map);

      const allTaskArrays = await Promise.all(repos.map(r => taskApi.listByRepo(r.id)));
      const all = allTaskArrays.flat().sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setTasks(all);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  function handleRefresh() { setRefreshing(true); load(); }

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>Tasks</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button className="btn-ghost" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 64 }} />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
          <ListTodo size={36} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600 }}>No tasks yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
            Go to a repository and run your first agent task
          </p>
          <Link href="/repos" className="btn-primary" style={{ marginTop: 24, textDecoration: 'none', display: 'inline-flex' }}>
            Browse Repositories
          </Link>
        </div>
      ) : (
        <div className="glass" style={{ overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 40px',
            padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            {['Description', 'Repository', 'Status', 'Created', ''].map(h => (
              <p key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {h}
              </p>
            ))}
          </div>

          {tasks.map((task, i) => {
            const repo = repoMap[task.repository_id];
            return (
              <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 40px',
                    padding: '14px 20px', alignItems: 'center',
                    borderBottom: i < tasks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <p style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 16 }}>
                    {task.description}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {repo ? `${repo.owner}/${repo.name}` : '—'}
                  </p>
                  <StatusBadge status={task.status} />
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                  </p>
                  <ArrowRight size={14} color="var(--text-muted)" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
