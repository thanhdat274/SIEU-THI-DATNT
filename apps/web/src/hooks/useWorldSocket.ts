/**
 * useWorldSocket — React hook for connecting to the server's WebSocket gateway.
 *
 * Usage:
 *   const { connected } = useWorldSocket({ worldId, token, onWorldUpdate });
 *
 * Events received from server:
 *   - 'session:joined'  → full GameSnapshot on connect
 *   - 'world:update'    → { revision, receipt } when partner commits
 *   - 'world:snapshot'  → authoritative snapshot (position/time interpolation input)
 *
 * The hook:
 *   - Connects on mount / worldId+token change
 *   - Sends 'heartbeat' every 10s to keep session alive
 *   - Disconnects on unmount
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001')
  .replace(/^http/, 'ws');

export interface WorldSocketOptions {
  worldId: string | null;
  token: string | null;
  onWorldUpdate?: (data: { revision: number; receipt: unknown }) => void;
  onSnapshot?: (snapshot: unknown) => void;
  onTimeVote?: (data: unknown) => void;
  onSessionEnded?: (event: 'kicked' | 'replaced' | 'timeout', data: unknown) => void;
}

export function useWorldSocket({ worldId, token, onWorldUpdate, onSnapshot, onTimeVote, onSessionEnded }: WorldSocketOptions) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onWorldUpdateRef = useRef(onWorldUpdate);
  const onSnapshotRef = useRef(onSnapshot);
  const onTimeVoteRef = useRef(onTimeVote);
  const onSessionEndedRef = useRef(onSessionEnded);
  const sequenceRef = useRef(0);

  // Keep callbacks up to date without re-triggering the effect
  useEffect(() => { onWorldUpdateRef.current = onWorldUpdate; }, [onWorldUpdate]);
  useEffect(() => { onSnapshotRef.current = onSnapshot; }, [onSnapshot]);
  useEffect(() => { onTimeVoteRef.current = onTimeVote; }, [onTimeVote]);
  useEffect(() => { onSessionEndedRef.current = onSessionEnded; }, [onSessionEnded]);

  const disconnect = useCallback(() => {
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }
    setConnected(false);
  }, []);

  useEffect(() => {
    if (!worldId || !token) return disconnect;

    let cancelled = false;
    const apiBase = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
    void fetch(`${apiBase}/api/v1/ws-ticket`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    }).then(async response => {
      if (!response.ok) throw new Error('Không thể xác thực phiên realtime.');
      const body = await response.json() as { ticket: string };
      if (cancelled) return;
      const socket = new WebSocket(`${WS_BASE}/ws?worldId=${encodeURIComponent(worldId)}`, `ticket.${body.ticket}`);
      wsRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      // Heartbeat every 10s
      heartbeatRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ event: 'heartbeat', data: {} }));
        }
      }, 10000);
    };

    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as { event: string; data: unknown };
        if (msg.event === 'session:joined') {
          onSnapshotRef.current?.(msg.data);
        } else if (msg.event === 'world:snapshot') {
          onSnapshotRef.current?.(msg.data);
        } else if (msg.event === 'world:update') {
          onWorldUpdateRef.current?.(msg.data as { revision: number; receipt: unknown });
        } else if (msg.event === 'time-vote:update') {
          onTimeVoteRef.current?.(msg.data);
        } else if (msg.event === 'session:kicked') {
          onSessionEndedRef.current?.('kicked', msg.data);
        } else if (msg.event === 'session:replaced') {
          onSessionEndedRef.current?.('replaced', msg.data);
        } else if (msg.event === 'session:timeout') {
          onSessionEndedRef.current?.('timeout', msg.data);
        }
      } catch {
        // ignore malformed messages
      }
    };

    socket.onclose = () => {
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      setConnected(false);
    };

    socket.onerror = (e) => {
      console.warn('[WS] Connection error:', e);
    };

    }).catch(error => {
      if (!cancelled) {
        console.warn('[WS] Ticket acquisition failed:', error);
        setConnected(false);
      }
    });

    return () => { cancelled = true; disconnect(); };
  }, [worldId, token, disconnect]);

  const sendInput = useCallback((direction: { x: number; y: number }) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ event: 'input', data: { sequence: ++sequenceRef.current, direction } }));
    return true;
  }, []);

  const submitTimeVote = useCallback((vote: { type: 'advance_day' } | { type: 'change_speed'; targetSpeed: 1 | 2 | 4 }) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ event: 'time-vote', data: vote }));
    return true;
  }, []);

  const cancelTimeVote = useCallback(() => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ event: 'time-vote:cancel', data: {} }));
    return true;
  }, []);

  return { connected, sendInput, submitTimeVote, cancelTimeVote };
}
