'use client';

// Dashboard — main landing page showing stats + repo cards + quick actions

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, GitBranch, CheckCircle, Loader2, GitFork, ArrowRight, Zap } from 'lucide-react';
import { Repository, Task, repositoryApi, taskApi } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import AddRepoModal from '@/components/AddRepoModal';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    try {
      const r = await repositoryApi.list();
      setRepos(r);
      // Fetch tasks for first 3 repos to show recent activity
      const taskPromises = r.slice(0, 3).map(repo => taskApi.listByRepo(repo.id));
      const taskResults = await Promise.all(taskPromises);
      const allTasks = taskResults.flat().sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRecentTasks(allTasks.slice(0, 5));
    } catch { /* backend might be starting */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const stats = {
    total: repos.length,
    ready: repos.filter(r => r.status === 'ready').length,
    activeTasks: recentTasks.filter(t => t.status === 'running').length,
    completed: recentTasks.filter(t => t.status === 'completed').length,
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1100 }}>

      {/* Hero */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
            borderRadius: 10, padding: '6px 8px',
            display: 'inline-flex',
          }}>
            <Zap size={16} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
            Platform
          </span>
        </div>
        <h1 className="gradient-text" style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1 }}>
          AgentForge
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginTop: 8 }}>
          Autonomous Software Engineering Agent — submit a repo, describe a task, watch it work.
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
        {[
          { label: 'Total Repos', value: stats.total, icon: GitBranch, color: 'var(--purple-light)' },
          { label: 'Ready Repos', value: stats.ready, icon: CheckCircle, color: 'var(--green)' },
          { label: 'Active Tasks', value: stats.activeTasks, icon: Loader2, color: 'var(--cyan)' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'var(--green)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</p>
              <Icon size={14} color={color} />
            </div>
            <p style={{ fontSize: 28, fontWeight: 700, marginTop: 8, color: 'var(--text-primary)' }}>
              {loading ? '—' : value}
            </p>
          </div>
        ))}
      </div>

      {/* Repositories section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Repositories</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/repos" className="btn-ghost" style={{ textDecoration: 'none' }}>
            View all <ArrowRight size={13} />
          </Link>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Add Repository
          </button>
        </div>
      </div>

      {/* Repo Cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: 100 }} />
          ))}
        </div>
      ) : repos.length === 0 ? (
        <div className="glass" style={{
          padding: '48px', textAlign: 'center',
        }}>
          <GitFork size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500 }}>No repositories yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            Add your first GitHub repository to get started
          </p>
          <button className="btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: 20 }}>
            <Plus size={14} /> Add Repository
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {repos.slice(0, 6).map(repo => (
            <Link key={repo.id} href={`/repos/${repo.id}`} style={{ textDecoration: 'none' }}>
              <div className="glass fade-in" style={{ padding: '20px 24px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GitFork size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{repo.owner}/{repo.name}</span>
                  </div>
                  <StatusBadge status={repo.status} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {repo.github_url}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Added {formatDistanceToNow(new Date(repo.created_at), { addSuffix: true })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Recent Tasks */}
      {recentTasks.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '40px 0 16px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Tasks</h2>
            <Link href="/tasks" className="btn-ghost" style={{ textDecoration: 'none' }}>
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="glass" style={{ overflow: 'hidden' }}>
            {recentTasks.map((task, i) => (
              <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '14px 20px',
                  borderBottom: i < recentTasks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 14,
                  transition: 'background 0.15s', cursor: 'pointer',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <StatusBadge status={task.status} />
                  <p style={{ fontSize: 13, flex: 1, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {task.description}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                  </p>
                  <ArrowRight size={13} color="var(--text-muted)" />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <AddRepoModal onClose={() => setShowModal(false)} onSuccess={load} />
      )}
    </div>
  );
}
