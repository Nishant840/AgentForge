'use client';

// AddRepoModal — modal dialog to submit a new GitHub repository URL

import { useState } from 'react';
import { X, GitFork, Loader2 } from 'lucide-react';
import { repositoryApi } from '@/lib/api';

interface AddRepoModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddRepoModal({ onClose, onSuccess }: AddRepoModalProps) {
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await repositoryApi.create(url.trim(), branch.trim() || 'main');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Failed to add repository. Check the URL and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Modal box */}
      <div
        onClick={e => e.stopPropagation()}
        className="glass fade-in"
        style={{ width: '100%', maxWidth: 480, padding: 28, position: 'relative' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="btn-ghost"
          style={{ position: 'absolute', top: 16, right: 16, padding: '4px 8px' }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'rgba(124, 58, 237, 0.15)',
            border: '1px solid rgba(124, 58, 237, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GitFork size={18} color="var(--purple-light)" />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Add Repository</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              AgentForge will clone and index the codebase
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              GitHub URL *
            </label>
            <input
              className="input"
              type="url"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Default Branch
            </label>
            <input
              className="input"
              type="text"
              placeholder="main"
              value={branch}
              onChange={e => setBranch(e.target.value)}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: 'var(--red)', background: 'rgba(239,68,68,0.08)', padding: '10px 14px', borderRadius: 8 }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {loading ? 'Adding...' : 'Add Repository'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
