'use client';

// /tasks/[id] — task detail page with live WebSocket agent stream + final result

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, GitFork, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Task, Repository, taskApi, repositoryApi } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import AgentStream from '@/components/AgentStream';
import { formatDistanceToNow } from 'date-fns';

function TaskDetailContent() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [repo, setRepo] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadTask() {
    try {
      const t = await taskApi.get(id);
      setTask(t);
      if (!repo) {
        const r = await repositoryApi.get(t.repository_id);
        setRepo(r);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { loadTask(); }, [id]);

  // Called when AgentStream reports complete — refresh task to get final result
  const handleStreamComplete = useCallback(() => {
    setTimeout(loadTask, 1000); // slight delay so backend finishes writing
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '40px 48px' }}>
        <div className="skeleton" style={{ height: 24, width: 200, marginBottom: 32 }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ padding: '40px 48px' }}>
        <p style={{ color: 'var(--red)' }}>Task not found.</p>
        <Link href="/tasks" className="btn-ghost" style={{ marginTop: 16, textDecoration: 'none', display: 'inline-flex' }}>
          <ArrowLeft size={13} /> Back
        </Link>
      </div>
    );
  }

  const StatusIcon = task.status === 'completed' ? CheckCircle
    : task.status === 'failed' ? XCircle
    : RefreshCw;
  const statusColor = task.status === 'completed' ? 'var(--green)'
    : task.status === 'failed' ? 'var(--red)'
    : 'var(--cyan)';

  return (
    <div style={{ padding: '40px 48px', maxWidth: 900 }}>
      {/* Back */}
      {repo && (
        <Link href={`/repos/${repo.id}`} className="btn-ghost" style={{ textDecoration: 'none', display: 'inline-flex', marginBottom: 28 }}>
          <ArrowLeft size={13} /> Back to {repo.owner}/{repo.name}
        </Link>
      )}

      {/* Task Header */}
      <div className="glass" style={{ padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: `${statusColor}18`,
              border: `1px solid ${statusColor}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <StatusIcon
                size={16}
                color={statusColor}
                style={{ animation: task.status === 'running' ? 'spin 1.5s linear infinite' : 'none' }}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                Agent Task
              </p>
              <p style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4 }}>{task.description}</p>
            </div>
          </div>
          <StatusBadge status={task.status} />
        </div>

        {/* Task meta */}
        <div style={{ display: 'flex', gap: 32 }}>
          {repo && (
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                Repository
              </p>
              <Link href={`/repos/${repo.id}`} style={{ fontSize: 13, color: 'var(--cyan)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                <GitFork size={11} /> {repo.owner}/{repo.name}
              </Link>
            </div>
          )}
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
              Created
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} />
              {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
              Task ID
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              {task.id.slice(0, 8)}...
            </p>
          </div>
        </div>
      </div>

      {/* Live Stream — show while running or pending */}
      {(task.status === 'running' || task.status === 'pending') && (
        <div style={{ marginBottom: 24 }}>
          <AgentStream taskId={task.id} onComplete={handleStreamComplete} />
        </div>
      )}

      {/* Final Result */}
      {task.status === 'completed' && task.result && (
        <div className="glass" style={{ marginBottom: 24, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <CheckCircle size={14} color="var(--green)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Task Completed</span>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {task.result}
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {task.status === 'failed' && (
        <div className="glass" style={{ marginBottom: 24, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <XCircle size={14} color="var(--red)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>Task Failed</span>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: 13, color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap' }}>
              {task.error_message || 'Unknown error occurred'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TaskDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px 48px', color: 'var(--text-muted)' }}>Loading task...</div>}>
      <TaskDetailContent />
    </Suspense>
  );
}
