'use client';

// /repos — lists all repositories with status and navigation to detail

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, GitFork, ArrowRight, RefreshCw } from 'lucide-react';
import { Repository, repositoryApi } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import AddRepoModal from '@/components/AddRepoModal';
import { formatDistanceToNow } from 'date-fns';

export default function ReposPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const r = await repositoryApi.list();
      setRepos(r);
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  function handleRefresh() {
    setRefreshing(true);
    load();
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>Repositories</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {repos.length} repo{repos.length !== 1 ? 's' : ''} connected
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Add Repository
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72 }} />)}
        </div>
      ) : repos.length === 0 ? (
        <div className="glass" style={{ padding: '64px', textAlign: 'center' }}>
          <GitFork size={36} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600 }}>No repositories yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
            Add a GitHub repository to start using AgentForge
          </p>
          <button className="btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: 24 }}>
            <Plus size={14} /> Add First Repository
          </button>
        </div>
      ) : (
        <div className="glass" style={{ overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px',
            padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            {['Repository', 'Branch', 'Status', 'Added', ''].map(h => (
              <p key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {h}
              </p>
            ))}
          </div>

          {/* Rows */}
          {repos.map((repo, i) => (
            <Link key={repo.id} href={`/repos/${repo.id}`} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px',
                  padding: '16px 20px', alignItems: 'center',
                  borderBottom: i < repos.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <GitFork size={14} color="var(--text-muted)" />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{repo.owner}/{repo.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{repo.github_url}</p>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {repo.default_branch}
                </p>
                <StatusBadge status={repo.status} />
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {formatDistanceToNow(new Date(repo.created_at), { addSuffix: true })}
                </p>
                <ArrowRight size={14} color="var(--text-muted)" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && <AddRepoModal onClose={() => setShowModal(false)} onSuccess={load} />}
    </div>
  );
}
