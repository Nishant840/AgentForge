'use client';

// /repos/[id] — repo detail page with status, task creation form, and task history

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, GitFork, Play, Clock, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Repository, Task, repositoryApi, taskApi } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDistanceToNow } from 'date-fns';

function RepoDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [repo, setRepo] = useState<Repository | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskDesc, setTaskDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [taskError, setTaskError] = useState('');

  async function load() {
    try {
      const [r, t] = await Promise.all([
        repositoryApi.get(id),
        taskApi.listByRepo(id),
      ]);
      setRepo(r);
      setTasks(t);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  // Poll status while repo is being cloned/indexed
  useEffect(() => {
    if (!repo || repo.status === 'ready' || repo.status === 'error') return;
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [repo?.status]);

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskDesc.trim()) return;
    setTaskError('');
    setCreating(true);
    try {
      const task = await taskApi.create(id, taskDesc.trim());
      router.push(`/tasks/${task.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setTaskError(msg || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px 48px' }}>
        <div className="skeleton" style={{ height: 24, width: 200, marginBottom: 32 }} />
        <div className="skeleton" style={{ height: 160 }} />
      </div>
    );
  }

  if (!repo) {
    return (
      <div style={{ padding: '40px 48px' }}>
        <p style={{ color: 'var(--red)' }}>Repository not found.</p>
        <Link href="/repos" className="btn-ghost" style={{ marginTop: 16, textDecoration: 'none', display: 'inline-flex' }}>
          <ArrowLeft size={13} /> Back
        </Link>
      </div>
    );
  }

  const isReady = repo.status === 'ready';

  return (
    <div style={{ padding: '40px 48px', maxWidth: 900 }}>
      {/* Back */}
      <Link href="/repos" className="btn-ghost" style={{ textDecoration: 'none', display: 'inline-flex', marginBottom: 28 }}>
        <ArrowLeft size={13} /> All Repositories
      </Link>

      {/* Repo Header */}
      <div className="glass" style={{ padding: '24px 28px', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(124, 58, 237, 0.12)',
              border: '1px solid rgba(124, 58, 237, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GitFork size={18} color="var(--purple-light)" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800 }}>{repo.owner}/{repo.name}</h1>
              <a
                href={repo.github_url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: 'var(--cyan)', textDecoration: 'none' }}
              >
                {repo.github_url} ↗
              </a>
            </div>
          </div>
          <StatusBadge status={repo.status} />
        </div>

        {/* Repo meta */}
        <div style={{ display: 'flex', gap: 32 }}>
          {[
            { label: 'Branch', value: repo.default_branch },
            { label: 'Added', value: formatDistanceToNow(new Date(repo.created_at), { addSuffix: true }) },
            { label: 'Updated', value: formatDistanceToNow(new Date(repo.updated_at), { addSuffix: true }) },
            { label: 'Tasks', value: String(tasks.length) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                {label}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: label === 'Branch' ? 'JetBrains Mono' : 'inherit' }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Processing indicator */}
        {(repo.status === 'cloning' || repo.status === 'indexing') && (
          <div style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(6, 182, 212, 0.06)',
            border: '1px solid rgba(6, 182, 212, 0.15)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <RefreshCw size={13} color="var(--cyan)" style={{ animation: 'spin 1.5s linear infinite' }} />
            <span style={{ fontSize: 13, color: 'var(--cyan)' }}>
              {repo.status === 'cloning' ? 'Cloning repository from GitHub...' : 'Indexing codebase into vector database...'}
            </span>
          </div>
        )}
      </div>

      {/* Create Task */}
      <div className="glass" style={{ padding: '24px 28px', marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Run Agent Task</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          Describe what you want the agent to do in this repository
        </p>

        <form onSubmit={handleCreateTask}>
          <textarea
            className="input"
            placeholder={isReady
              ? 'e.g. "Fix the authentication bug in login.py" or "Add input validation to the user registration endpoint"'
              : 'Repository must be fully indexed before running tasks...'}
            value={taskDesc}
            onChange={e => setTaskDesc(e.target.value)}
            disabled={!isReady}
            rows={3}
            style={{ marginBottom: 12 }}
          />

          {taskError && (
            <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{taskError}</p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={!isReady || creating || !taskDesc.trim()}
            style={{ opacity: !isReady ? 0.5 : 1 }}
          >
            {creating
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Starting Agent...</>
              : <><Play size={14} /> Run Agent</>}
          </button>

          {!isReady && repo.status !== 'error' && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 12 }}>
              Waiting for indexing to complete...
            </span>
          )}
        </form>
      </div>

      {/* Task History */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
          Task History ({tasks.length})
        </h2>

        {tasks.length === 0 ? (
          <div className="glass" style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No tasks yet. Run your first agent task above.</p>
          </div>
        ) : (
          <div className="glass" style={{ overflow: 'hidden' }}>
            {tasks.map((task, i) => {
              const Icon = task.status === 'completed' ? CheckCircle
                : task.status === 'failed' ? XCircle
                : task.status === 'running' ? Loader2
                : Clock;
              const iconColor = task.status === 'completed' ? 'var(--green)'
                : task.status === 'failed' ? 'var(--red)'
                : task.status === 'running' ? 'var(--cyan)'
                : 'var(--text-muted)';
              return (
                <Link key={task.id} href={`/tasks/${task.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      padding: '16px 20px',
                      borderBottom: i < tasks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      display: 'flex', alignItems: 'center', gap: 14,
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Icon
                      size={16}
                      color={iconColor}
                      style={{ flexShrink: 0, animation: task.status === 'running' ? 'spin 1.5s linear infinite' : 'none' }}
                    />
                    <p style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.description}
                    </p>
                    <StatusBadge status={task.status} />
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RepoDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px 48px', color: 'var(--text-muted)' }}>Loading repository...</div>}>
      <RepoDetailContent />
    </Suspense>
  );
}
