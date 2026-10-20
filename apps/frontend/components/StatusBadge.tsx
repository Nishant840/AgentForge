'use client';

// StatusBadge — renders colored badge for repo/task status
// Dot — small colored dot indicator for sidebar

import { RepoStatus, TaskStatus } from '@/lib/api';

type Status = RepoStatus | TaskStatus;

const BADGE_CONFIG: Record<Status, { label: string; cls: string }> = {
  pending:   { label: 'Pending',   cls: 'badge badge-pending'   },
  cloning:   { label: 'Cloning',   cls: 'badge badge-cloning'   },
  indexing:  { label: 'Indexing',  cls: 'badge badge-indexing'  },
  ready:     { label: 'Ready',     cls: 'badge badge-ready'     },
  error:     { label: 'Error',     cls: 'badge badge-error'     },
  running:   { label: 'Running',   cls: 'badge badge-running'   },
  completed: { label: 'Completed', cls: 'badge badge-completed' },
  failed:    { label: 'Failed',    cls: 'badge badge-failed'    },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = BADGE_CONFIG[status] ?? { label: status, cls: 'badge badge-pending' };
  return <span className={config.cls}>{config.label}</span>;
}

export function StatusDot({ status }: { status: Status }) {
  return <span className={`dot dot-${status}`} />;
}
