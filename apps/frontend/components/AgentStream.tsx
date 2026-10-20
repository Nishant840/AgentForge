'use client';

// AgentStream — connects to WebSocket and streams agent events live
// Shows a terminal-style panel with step-by-step agent activity

import { useEffect, useRef, useState } from 'react';
import { createTaskStream, StreamEvent } from '@/lib/api';
import { Terminal, Circle } from 'lucide-react';

interface AgentStreamProps {
  taskId: string;
  onComplete?: () => void;
}

const EVENT_PREFIX: Record<string, string> = {
  start:       '▶ ',
  thinking:    '⋯ ',
  tool_call:   '⚡ ',
  tool_result: '← ',
  response:    '✦ ',
  complete:    '✓ ',
  error:       '✗ ',
};

export default function AgentStream({ taskId, onComplete }: AgentStreamProps) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = createTaskStream(taskId);

    ws.onopen = () => setConnected(true);

    ws.onmessage = (msg) => {
      try {
        const event: StreamEvent = JSON.parse(msg.data);
        setEvents(prev => [...prev, event]);

        if (event.event_type === 'complete' || event.event_type === 'error') {
          setDone(true);
          ws.close();
          onComplete?.();
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => {
      setEvents(prev => [...prev, {
        event_type: 'error', step: 0,
        content: 'WebSocket connection error. Is the backend running?',
      }]);
      setDone(true);
    };

    ws.onclose = () => setConnected(false);

    return () => ws.close();
  }, [taskId, onComplete]);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div className="glass" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Terminal size={14} color="var(--text-muted)" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Live Agent Stream
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {done ? (
            <span style={{ fontSize: 11, color: 'var(--green)' }}>● Done</span>
          ) : connected ? (
            <span style={{ fontSize: 11, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Circle size={6} fill="currentColor" stroke="none" style={{ animation: 'pulse 1.5s infinite' }} />
              Live
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Connecting...</span>
          )}
        </div>
      </div>

      {/* Terminal output */}
      <div className="terminal" style={{ height: 380 }}>
        {events.length === 0 && (
          <span style={{ color: 'var(--text-muted)' }}>Waiting for agent to start...</span>
        )}
        {events.map((ev, i) => (
          <div key={i} className={`log-${ev.event_type} fade-in`}>
            <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>
              [{String(ev.step).padStart(2, '0')}]
            </span>
            <span>{EVENT_PREFIX[ev.event_type] ?? '  '}</span>
            {ev.event_type === 'tool_call' && ev.data?.tool ? (
              <>
                <span style={{ color: 'var(--cyan)' }}>{String(ev.data.tool)}</span>
                <span style={{ color: 'var(--text-muted)' }}> → {ev.content}</span>
              </>
            ) : (
              <span>{ev.content}</span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
