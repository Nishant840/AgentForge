'use client';

// Sidebar — fixed left navigation with logo, nav links, and repo list

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, GitBranch, ListTodo, Zap } from 'lucide-react';
import { Repository } from '@/lib/api';
import { StatusDot } from './StatusBadge';

interface SidebarProps {
  repos: Repository[];
}

const NAV = [
  { href: '/',            label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/repos',       label: 'Repositories',  icon: GitBranch       },
  { href: '/tasks',       label: 'Tasks',          icon: ListTodo        },
];

export default function Sidebar({ repos }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 240,
      minHeight: '100vh',
      background: '#0C0C14',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      flexShrink: 0,
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 50,
    }}>

      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={16} color="white" fill="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>AgentForge</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-link ${pathname === href ? 'active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Connected Repos */}
      <div style={{ padding: '0 12px', flex: 1, overflowY: 'auto' }}>
        <p style={{
          fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
          letterSpacing: '1px', textTransform: 'uppercase',
          padding: '8px 4px 10px',
        }}>
          Connected Repos
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {repos.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px' }}>
              No repos yet
            </p>
          )}
          {repos.map(repo => (
            <Link
              key={repo.id}
              href={`/repos/${repo.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px', borderRadius: 7, textDecoration: 'none',
                transition: 'background 0.15s',
              }}
              className="nav-link"
            >
              <StatusDot status={repo.status} />
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {repo.owner}/{repo.name}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {repo.status}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>AgentForge v0.1.0</p>
      </div>
    </aside>
  );
}
