/**
 * useWorldSocket — React hook for connecting to the server's WebSocket gateway.
 *
 * Usage:
 *   const { connected, connectionState, reconnectAttempt } = useWorldSocket({ worldId, token, onWorldUpdate });
 *
 * Events received from server:
 *   - 'session:joined'  → full GameSnapshot on connect (initial or after reconnect)
 *   - 'world:update'    → { revision, receipt } when partner commits
 *   - 'world:snapshot'  → authoritative snapshot (position/time interpolation input)
 *
 * Connection lifecycle:
 *   - Connects on mount / worldId+token change
 *   - Sends 'heartbeat' every 10s to keep session alive
 *   - Exponential backoff with jitter on reconnect (1s → 2s → 4s → 8s → 16s → max 30s)
 *   - Max 20 retry attempts; after that, enters 'disconnected' state (no more auto-retry)
 *   - Disconnects on unmount or when worldId/token becomes null
 *   - Exposes connectionState ('connected'|'connecting'|'reconnecting'|'disconnected')
 *     and reconnectAttempt (0 when connected, N when reconnecting) for UI status display
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { devGuestHeader } from '../services/dev-guest';

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001')
  .replace(/^http/, 'ws');

/** Connection state machine values for UI feedback. */
export type ConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export interface WorldSocketOptions {
  worldId: string | null;
  token: string | null;
  onWorldUpdate?: (data: { revision: number; receipt: unknown }) => void;
  onSnapshot?: (snapshot: unknown) => void;
  onAvatars?: (avatars: unknown) => void;
  onTimeVote?: (data: unknown) => void;
  /** Phiếu khoản chi đất (open-world-coop-land D3): mở/đóng/kết quả. */
  onLandVote?: (data: unknown) => void;
  onSessionEnded?: (event: 'kicked' | 'replaced' | 'timeout', data: unknown) => void;
  /** Voice chat: tín hiệu offer/answer/candidate từ người kia (`from` do server gán). */
  onVoiceSignal?: (data: unknown) => void;
  /** Voice chat: người kia vào/ra hẻm. */
  onVoicePeer?: (data: unknown) => void;
  /** Called when connection state changes (for side-effects like setting serverAuthoritative on simulation). */
  onConnectionStateChange?: (state: ConnectionState) => void;
}

/** Exponential backoff constants */
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30000;
const BACKOFF_JITTER_FACTOR = 0.5; // ±50% jitter
const MAX_RETRIES = 20;

export function useWorldSocket({ worldId, token, onWorldUpdate, onSnapshot, onAvatars, onTimeVote, onLandVote, onSessionEnded, onVoiceSignal, onVoicePeer, onConnectionStateChange }: WorldSocketOptions) {
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onWorldUpdateRef = useRef(onWorldUpdate);
  const onSnapshotRef = useRef(onSnapshot);
  const onAvatarsRef = useRef(onAvatars);
  const onTimeVoteRef = useRef(onTimeVote);
  const onLandVoteRef = useRef(onLandVote);
  const onSessionEndedRef = useRef(onSessionEnded);
  const onVoiceSignalRef = useRef(onVoiceSignal);
  const onVoicePeerRef = useRef(onVoicePeer);
  const onConnectionStateChangeRef = useRef(onConnectionStateChange);
  const sequenceRef = useRef(0);
  const lockWaitersRef = useRef<Array<(granted: boolean) => void>>([]);
  const [layoutLockHolderId, setLayoutLockHolderId] = useState<string | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const cancelledRef = useRef(false);

  // Keep callbacks up to date without re-triggering the effect
  useEffect(() => { onWorldUpdateRef.current = onWorldUpdate; }, [onWorldUpdate]);
  useEffect(() => { onSnapshotRef.current = onSnapshot; }, [onSnapshot]);
  useEffect(() => { onAvatarsRef.current = onAvatars; }, [onAvatars]);
  useEffect(() => { onTimeVoteRef.current = onTimeVote; }, [onTimeVote]);
  useEffect(() => { onLandVoteRef.current = onLandVote; }, [onLandVote]);
  useEffect(() => { onSessionEndedRef.current = onSessionEnded; }, [onSessionEnded]);
  useEffect(() => { onVoiceSignalRef.current = onVoiceSignal; }, [onVoiceSignal]);
  useEffect(() => { onVoicePeerRef.current = onVoicePeer; }, [onVoicePeer]);
  useEffect(() => { onConnectionStateChangeRef.current = onConnectionStateChange; }, [onConnectionStateChange]);

  /** Calculate backoff delay with jitter */
  const calculateBackoff = useCallback((attempt: number): number => {
    if (attempt >= MAX_RETRIES) return BACKOFF_MAX_MS; // won't be used, but safeguard
    const exponentialDelay = BACKOFF_BASE_MS * 2 ** attempt;
    const jitter = exponentialDelay * BACKOFF_JITTER_FACTOR * (Math.random() * 2 - 1);
    return Math.max(BACKOFF_BASE_MS, Math.min(BACKOFF_MAX_MS, Math.round(exponentialDelay + jitter)));
  }, []);

  const setSocketState = useCallback((state: ConnectionState, isConnected: boolean) => {
    setConnectionState(state);
    setConnected(isConnected);
    onConnectionStateChangeRef.current?.(state);
  }, []);

  const disconnect = useCallback(() => {
    cancelledRef.current = true;
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }
    setConnectionState('disconnected');
    setConnected(false);
    setReconnectAttempt(0);
  }, []);

  useEffect(() => {
    if (!worldId || !token) return disconnect;

    cancelledRef.current = false;
    retryCountRef.current = 0;

    const apiBase = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');

    /** Connect to the server with exponential backoff and jitter */
    const connect = () => {
      if (cancelledRef.current) return;

      if (retryCountRef.current > 0) {
        setSocketState('reconnecting', false);
        setReconnectAttempt(retryCountRef.current);
      } else {
        setSocketState('connecting', false);
        setReconnectAttempt(0);
      }

      fetch(`${apiBase}/api/v1/ws-ticket`, {
        method: 'POST',
        headers: { ...devGuestHeader(), Authorization: `Bearer ${token}` },
      })
        .then(async response => {
          if (!response.ok) throw new Error('Không thể xác thực phiên realtime.');
          const body = await response.json() as { ticket: string };
          if (cancelledRef.current) return;
          const socket = new WebSocket(`${WS_BASE}/ws?worldId=${encodeURIComponent(worldId)}`, `ticket.${body.ticket}`);
          wsRef.current = socket;

          socket.onopen = () => {
            retryCountRef.current = 0;
            setSocketState('connected', true);
            setReconnectAttempt(0);
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
              } else if (msg.event === 'land-vote:update') {
                onLandVoteRef.current?.(msg.data);
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
            if (wsRef.current === socket) wsRef.current = null;

            // If cancelled (unmount), don't retry
            if (cancelledRef.current) {
              setSocketState('disconnected', false);
              return;
            }

            // Schedule reconnect with exponential backoff
            const attempt = ++retryCountRef.current;
            if (attempt > MAX_RETRIES) {
              // Max retries reached — enter permanent disconnected state
              console.warn(`[WS] Đã hết ${MAX_RETRIES} lần nối lại — mất kết nối hẻm chung.`);
              setSocketState('disconnected', false);
              return;
            }

            const delay = calculateBackoff(attempt - 1);
            console.log(`[WS] Nối lại lần ${attempt}/${MAX_RETRIES} sau ${delay}ms`);
            reconnectTimerRef.current = setTimeout(() => {
              reconnectTimerRef.current = null;
              if (!cancelledRef.current) connect();
            }, delay);
          };

          socket.onerror = (e) => {
            console.warn('[WS] Connection error:', e);
          };
        })
        .catch(error => {
          if (cancelledRef.current) return;
          console.warn('[WS] Ticket acquisition failed:', error);
          const attempt = ++retryCountRef.current;
          if (attempt > MAX_RETRIES) {
            console.warn(`[WS] Đã hết ${MAX_RETRIES} lần nối lại — mất kết nối hẻm chung.`);
            setSocketState('disconnected', false);
            return;
          }
          const delay = calculateBackoff(attempt - 1);
          console.log(`[WS] Nối lại lần ${attempt}/${MAX_RETRIES} sau ${delay}ms (ticket fail)`);
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            if (!cancelledRef.current) connect();
          }, delay);
        });
    };

    connect();

    return () => {
      cancelledRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }
    };
  }, [worldId, token, disconnect, calculateBackoff, setSocketState]);

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

  /** Giữ chỗ quy hoạch đất (thay giữ chỗ cũ của mình); server hết hạn sau 60 s nếu không gia hạn. */
  const reservePlanning = useCallback((targets: { kind: 'parcels'; parcelIds: string[] } | { kind: 'wave'; waveId: string } | { kind: 'tiles'; tiles: Array<{ x: number; y: number }> } | { kind: 'placement'; placement: { buildingId: string; parcelId: string; originX: number } }) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ event: 'planning:reserve', data: targets }));
    return true;
  }, []);

  const extendPlanning = useCallback(() => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ event: 'planning:extend', data: {} }));
    return true;
  }, []);

  /** Trả lời phiếu đất của người kia (đồng ý/từ chối). */
  const respondLandVote = useCallback((agree: boolean) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ event: 'land-vote:respond', data: { agree } }));
    return true;
  }, []);

  const cancelLandVote = useCallback(() => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ event: 'land-vote:cancel', data: {} }));
    return true;
  }, []);

  const releasePlanning = useCallback(() => {
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ event: 'planning:release', data: {} }));
  }, []);

  return {
    connected,
    connectionState,
    reconnectAttempt,
    layoutLockHolderId,
    reservePlanning,
    extendPlanning,
    releasePlanning,
    respondLandVote,
    cancelLandVote,
    acquireLayoutLock,
    releaseLayoutLock,
    sendVoiceSignal,
    sendInput,
    sendPosition,
    submitTimeVote,
    cancelTimeVote,
  };
}
