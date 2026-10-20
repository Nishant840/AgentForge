// Central API client — all backend calls go through here
// Base URL reads from environment variable, falls back to localhost

import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── Types ─────────────────────────────────────────────────────────

export type RepoStatus = 'pending' | 'cloning' | 'indexing' | 'ready' | 'error';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Repository {
  id: string;
  github_url: string;
  owner: string;
  name: string;
  description: string | null;
  default_branch: string;
  status: RepoStatus;
  local_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  repository_id: string;
  description: string;
  status: TaskStatus;
  result: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface StreamEvent {
  event_type: string;
  step: number;
  content: string;
  data?: Record<string, unknown>;
}

// ── Repository API ─────────────────────────────────────────────────

export const repositoryApi = {
  list: () => api.get<Repository[]>('/repositories/').then(r => r.data),
  get: (id: string) => api.get<Repository>(`/repositories/${id}`).then(r => r.data),
  create: (github_url: string, default_branch = 'main') =>
    api.post<Repository>('/repositories/', { github_url, default_branch }).then(r => r.data),
};

// ── Task API ───────────────────────────────────────────────────────

export const taskApi = {
  create: (repository_id: string, description: string) =>
    api.post<Task>('/tasks/', { repository_id, description }).then(r => r.data),
  get: (id: string) => api.get<Task>(`/tasks/${id}`).then(r => r.data),
  listByRepo: (repo_id: string) => api.get<Task[]>(`/tasks/repo/${repo_id}`).then(r => r.data),
};

// ── WebSocket helper ──────────────────────────────────────────────

export const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/v1';

export function createTaskStream(taskId: string): WebSocket {
  return new WebSocket(`${WS_BASE}/tasks/${taskId}/stream`);
}
