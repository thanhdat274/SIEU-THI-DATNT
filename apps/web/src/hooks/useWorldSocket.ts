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
 *   - Tự nối lại (backoff 1 s → 10 s) khi mất kết nối
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
  onAvatars?: (avatars: unknown) => void;
  onTimeVote?: (data: unknown) => void;
  onSessionEnded?: (event: 'kicked' | 'replaced' | 'timeout', data: unknown) => void;
  /** Voice chat: tín hiệu offer/answer/candidate từ người kia (`from` do server gán). */
  onVoiceSignal?: (data: unknown) => void;
  /** Voice chat: người kia vào/ra hẻm. */
  onVoicePeer?: (data: unknown) => void;
}

export function useWorldSocket({ worldId, token, onWorldUpdate, onSnapshot, onAvatars, onTimeVote, onSessionEnded, onVoiceSignal, onVoicePeer }: WorldSocketOptions) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onWorldUpdateRef = useRef(onWorldUpdate);
  const onSnapshotRef = useRef(onSnapshot);
  const onAvatarsRef = useRef(onAvatars);
  const onTimeVoteRef = useRef(onTimeVote);
  const onSessionEndedRef = useRef(onSessionEnded);
  const onVoiceSignalRef = useRef(onVoiceSignal);
  const onVoicePeerRef = useRef(onVoicePeer);
  const sequenceRef = useRef(0);
  const lockWaitersRef = useRef<Array<(granted: boolean) => void>>([]);
  const [layoutLockHolderId, setLayoutLockHolderId] = useState<string | null>(null);

  // Keep callbacks up to date without re-triggering the effect
  useEffect(() => { onWorldUpdateRef.current = onWorldUpdate; }, [onWorldUpdate]);
  useEffect(() => { onSnapshotRef.current = onSnapshot; }, [onSnapshot]);
  useEffect(() => { onAvatarsRef.current = onAvatars; }, [onAvatars]);
  useEffect(() => { onTimeVoteRef.current = onTimeVote; }, [onTimeVote]);
  useEffect(() => { onSessionEndedRef.current = onSessionEnded; }, [onSessionEnded]);
  useEffect(() => { onVoiceSignalRef.current = onVoiceSignal; }, [onVoiceSignal]);
  useEffect(() => { onVoicePeerRef.current = onVoicePeer; }, [onVoicePeer]);

  const disconnect = useCallback(() => {
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }
    setConnected(false);
  }, []);

  useEffect(() => {
    if (!worldId || !token) return disconnect;

    let cancelled = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const apiBase = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
    // Mạng chớp hoặc server khởi động lại: thử nối lại với độ trễ tăng dần 1 s → 10 s, ticket mới mỗi lần.
    const scheduleRetry = () => {
      if (cancelled || retryTimer) return;
      const delay = Math.min(10_000, 1000 * 2 ** attempt++);
      retryTimer = setTimeout(() => { retryTimer = null; if (!cancelled) connect(); }, delay);
    };
    const connect = () => void fetch(`${apiBase}/api/v1/ws-ticket`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    }).then(async response => {
      if (!response.ok) throw new Error('Không thể xác thực phiên realtime.');
      const body = await response.json() as { ticket: string };
      if (cancelled) return;
      const socket = new WebSocket(`${WS_BASE}/ws?worldId=${encodeURIComponent(worldId)}`, `ticket.${body.ticket}`);
      wsRef.current = socket;

    socket.onopen = () => {
      attempt = 0;
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
        } else if (msg.event === 'avatars:update') {
          onAvatarsRef.current?.((msg.data as { avatars?: unknown })?.avatars);
        } else if (msg.event === 'world:update') {
          onWorldUpdateRef.current?.(msg.data as { revision: number; receipt: unknown });
        } else if (msg.event === 'layout-lock:result') {
          const granted = !!(msg.data as { granted?: boolean })?.granted;
          lockWaitersRef.current.splice(0).forEach(resolve => resolve(granted));
        } else if (msg.event === 'layout-lock:update') {
          setLayoutLockHolderId((msg.data as { holderId?: string | null })?.holderId ?? null);
        } else if (msg.event === 'time-vote:update') {
          onTimeVoteRef.current?.(msg.data);
        } else if (msg.event === 'voice:signal') {
          onVoiceSignalRef.current?.(msg.data);
        } else if (msg.event === 'voice:peer') {
          onVoicePeerRef.current?.(msg.data);
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
      if (wsRef.current === socket) wsRef.current = null;
      scheduleRetry();
    };

    socket.onerror = (e) => {
      console.warn('[WS] Connection error:', e);
    };

    }).catch(error => {
      if (!cancelled) {
        console.warn('[WS] Ticket acquisition failed:', error);
        setConnected(false);
        scheduleRetry();
      }
    });

    connect();

    return () => { cancelled = true; if (retryTimer) clearTimeout(retryTimer); disconnect(); };
  }, [worldId, token, disconnect]);

  const sendInput = useCallback((direction: { x: number; y: number }) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ event: 'input', data: { sequence: ++sequenceRef.current, direction } }));
    return true;
  }, []);

  /** Báo vị trí thật của mình (mô phỏng chạy cục bộ); server kiểm rồi phát cho bạn cùng hẻm. */
  const sendPosition = useCallback((position: { x: number; y: number }, direction: string) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ event: 'position', data: { position, direction } }));
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

  /** Voice chat: gửi offer/answer/candidate cho người kia qua server. */
  const sendVoiceSignal = useCallback((kind: 'offer' | 'answer' | 'candidate', payload: object) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ event: 'voice:signal', data: { kind, payload } }));
    return true;
  }, []);

  /** Xin khóa sửa bố cục của hẻm; false nếu người kia đang giữ, mất kết nối hoặc server không trả lời trong 3 s. */
  const acquireLayoutLock = useCallback((): Promise<boolean> => new Promise(resolve => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) { resolve(false); return; }
    const timer = setTimeout(() => finish(false), 3000);
    const finish = (granted: boolean) => { clearTimeout(timer); lockWaitersRef.current = lockWaitersRef.current.filter(w => w !== finish); resolve(granted); };
    lockWaitersRef.current.push(finish);
    socket.send(JSON.stringify({ event: 'layout-lock:acquire', data: {} }));
  }), []);

  const releaseLayoutLock = useCallback(() => {
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ event: 'layout-lock:release', data: {} }));
  }, []);

  return { connected, layoutLockHolderId, acquireLayoutLock, releaseLayoutLock, sendVoiceSignal, sendInput, sendPosition, submitTimeVote, cancelTimeVote };
}
