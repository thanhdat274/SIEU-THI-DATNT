import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import type { Server, WebSocket } from 'ws';
import { worldRepository } from './world.repository.js';
import { WorldRuntime } from '@game/core';
import type { BusinessState } from '@game/shared';
import { consumeWebSocketTicket } from './firebase-admin.js';
import { readRuntimeConfig } from './runtime-config.js';
import { MAX_WS_PAYLOAD_BYTES, RATE_LIMITS, RateLimiter } from './rate-limit.js';

/**
 * WS gateway for real-time world sessions.
 *
 * Flow:
 *  1. Client exchanges Firebase ID token for a short-lived single-use ticket
 *  2. Client connects with ticket subprotocol and worldId
 *  3. Server consumes ticket → registers session in WorldRuntime
 *  4. Server sends 'session:joined' and broadcasts snapshots every 500ms
 *  5. Client sends 'heartbeat' every 10s
 *  6. On any 'commit' that changes revision, server broadcasts 'world:update' to room
 *  7. On disconnect, server unregisters session
 *
 * The WorldRuntime in-process instance is shared per world (stored in worldRuntimes map).
 * On startup, worlds with active sessions are loaded on first connect.
 */

interface AuthenticatedSocket extends WebSocket {
  _worldId?: string;
  _accountId?: string;
  _sessionOk?: boolean;
}

const socketLimits = new WeakMap<object, { limiter: RateLimiter; violations: number; windowStart: number }>();

/** Giới hạn tần suất thông điệp theo kết nối; vượt hạn mức bị bỏ qua, lặp lại nhiều lần thì đóng kết nối. */
export function allowSocketMessage(socket: { close: (code?: number, reason?: string) => void }, now = Date.now()): boolean {
  let state = socketLimits.get(socket);
  if (!state) {
    state = { limiter: new RateLimiter(RATE_LIMITS.wsMessagesPerSocketPerSec, 1000), violations: 0, windowStart: now };
    socketLimits.set(socket, state);
  }
  if (state.limiter.take('m', now)) return true;
  if (now - state.windowStart > 10_000) { state.windowStart = now; state.violations = 0; }
  state.violations += 1;
  if (state.violations >= RATE_LIMITS.wsViolationsBeforeClose) socket.close(1008, 'Too many messages');
  return false;
}

export function acceptWebSocketOrigin(origin: string | undefined, allowedOrigin: string): boolean {
  return !origin || origin === allowedOrigin;
}

/** Tracks runtime, live sockets and serialized persistence for each loaded world. */
const worldRuntimes = new Map<string, {
  runtime: WorldRuntime;
  sockets: Set<AuthenticatedSocket>;
  checkpointQueue: Promise<void>;
  checkpointError: unknown | null;
}>();
const checkpointQueues = new Map<string, Promise<void>>();

/** Tick interval for all active runtimes (shared, 250ms per tick = 4fps headless sim) */
const TICK_INTERVAL_MS = 250;
const SNAPSHOT_INTERVAL_MS = 250;
/** Bản phát gần nhất theo hẻm: không gửi lại khi mô phỏng không đổi (không ai làm gì, đang tạm dừng...). */
const lastSnapshotPayload = new Map<string, string>();
let tickTimer: ReturnType<typeof setInterval> | null = null;
let snapshotTimer: ReturnType<typeof setInterval> | null = null;

function startTickLoop() {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    const elapsedSeconds = TICK_INTERVAL_MS / 1000;
    for (const [, entry] of worldRuntimes) {
      const timedOut = entry.runtime.tick(elapsedSeconds);
      for (const accountId of timedOut) {
        for (const socket of entry.sockets) {
          if (socket._accountId !== accountId) continue;
          try {
            socket.send(JSON.stringify({ event: 'session:timeout', data: { reason: 'Heartbeat timed out' } }));
            socket.close(4005, 'Heartbeat timeout');
          } catch { /* ignore closed sockets */ }
        }
      }
    }
  }, TICK_INTERVAL_MS);
  snapshotTimer = setInterval(() => {
    for (const [worldId, entry] of worldRuntimes) {
      if (!entry.sockets.size) continue;
      // serverTime đổi mỗi lần nên để trống khi so sánh; avatar đi kênh riêng 'avatars:update' nên không làm snapshot đổi liên tục.
      const snapshot = entry.runtime.getSnapshot('');
      const body = JSON.stringify(snapshot);
      if (lastSnapshotPayload.get(worldId) === body) continue;
      lastSnapshotPayload.set(worldId, body);
      broadcastToWorld(worldId, 'world:snapshot', { ...snapshot, serverTime: new Date().toISOString() });
    }
  }, SNAPSHOT_INTERVAL_MS);
}

function stopTickLoop() {
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  if (snapshotTimer) { clearInterval(snapshotTimer); snapshotTimer = null; }
}

function broadcastToWorld(worldId: string, event: string, data: unknown) {
  const entry = worldRuntimes.get(worldId);
  if (!entry) return;
  const payload = JSON.stringify({ event, data });
  for (const sock of entry.sockets) {
    if (sock.readyState === 1 /* OPEN */) sock.send(payload);
  }
}

@WebSocketGateway({
  path: '/ws',
  maxPayload: MAX_WS_PAYLOAD_BYTES, // thông điệp lớn hơn bị ws đóng kết nối (mã 1009)
  cors: { origin: '*' }, // narrowed by main.ts CORS for HTTP; WS has separate origin handling
})
export class WorldGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  /** Authenticate a short-lived single-use ticket supplied as a WebSocket subprotocol. */
  async handleConnection(socket: AuthenticatedSocket, req: { url?: string }) {
    try {
      const headers = (req as { headers?: Record<string, string | undefined> }).headers;
      const allowedOrigin = readRuntimeConfig().webOrigin;
      if (!acceptWebSocketOrigin(headers?.origin, allowedOrigin)) throw new Error('Origin not allowed');
      const url = new URL(req.url ?? '', 'ws://localhost');
      const worldId = url.searchParams.get('worldId');
      const ticketProtocol = headers?.['sec-websocket-protocol'] ?? '';
      const offeredTicket = ticketProtocol.split(',').map(value => value.trim()).find(value => value.startsWith('ticket.')) ?? '';
      const ticket = offeredTicket.slice('ticket.'.length);
      if (!ticket || !worldId) throw new Error('Missing ticket or worldId');

      const account = await consumeWebSocketTicket(ticket);
      if (!account) throw new Error('Invalid or expired WebSocket ticket');
      socket._accountId = account.uid;
      socket._worldId = worldId;

      // Load or create runtime for this world
      let entry = worldRuntimes.get(worldId);
      if (!entry) {
        const worldData = await worldRepository.getForMember(worldId, account.uid);
        const runtime = new WorldRuntime(worldData.world, worldData.businesses[0], {
          heartbeatTimeoutMs: 15000,
          checkpointIntervalSeconds: 5,
          onCheckpoint: (world, business) => {
            const current = worldRuntimes.get(worldId);
            if (!current) return;
            const checkpoint = structuredClone({ world, business });
            current.checkpointQueue = current.checkpointQueue.then(() =>
              worldRepository.saveCheckpoint(worldId, checkpoint.world, checkpoint.business)
            ).then(() => { current.checkpointError = null; }).catch(err => {
              current.checkpointError = err;
              console.error('[WorldRuntime] Checkpoint save failed:', err);
            });
            checkpointQueues.set(worldId, current.checkpointQueue);
          },
        });
        entry = { runtime, sockets: new Set(), checkpointQueue: Promise.resolve(), checkpointError: null };
        worldRuntimes.set(worldId, entry);
        startTickLoop();
      }

      // Luôn đối chiếu với bản đã lưu: người vào hẻm bằng HTTP sau khi runtime nạp phải có mặt trong snapshot
      // gửi cho mọi người, nếu không bạn cùng hẻm sẽ biến mất khỏi màn hình của nhau.
      const fresh = await worldRepository.getForMember(worldId, account.uid);
      entry.runtime.syncMembers(fresh.world);
      const joined = entry.runtime.registerSession(account.uid);
      if (!joined) {
        socket.close(4003, 'Not a member of this world');
        return;
      }

      const replaced = [...entry.sockets].filter(active => active._accountId === account.uid);
      for (const previous of replaced) entry.sockets.delete(previous);
      entry.sockets.add(socket);
      socket._sessionOk = true;
      for (const previous of replaced) {
        try {
          previous.send(JSON.stringify({ event: 'session:replaced', data: { reason: 'Đăng nhập từ phiên khác' } }));
          previous.close(4004, 'Session replaced');
        } catch { /* ignore closed sockets */ }
      }

      // Send initial snapshot
      const snapshot = entry.runtime.getSnapshot();
      socket.send(JSON.stringify({ event: 'session:joined', data: snapshot }));

      console.log(`[WS] ${account.uid} joined world ${worldId} (${entry.sockets.size} active)`);
    } catch (err) {
      console.warn('[WS] Auth failed:', err instanceof Error ? err.message : err);
      socket.close(4001, 'Unauthorized');
    }
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    const { _worldId: worldId, _accountId: accountId } = socket;
    if (!worldId || !accountId) return;

    const entry = worldRuntimes.get(worldId);
    if (!entry) return;

    const removed = entry.sockets.delete(socket);
    if (removed && ![...entry.sockets].some(active => active._accountId === accountId)) {
      entry.runtime.unregisterSession(accountId);
    }

    // Evict only after the last paused checkpoint succeeds. If a new session joins
    // while the write is pending, evictIdleRuntime sees its socket and keeps runtime.
    if (entry.sockets.size === 0) void WorldGateway.evictIdleRuntime(worldId);

    console.log(`[WS] ${accountId} left world ${worldId} (${entry.sockets.size} remaining)`);
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() socket: AuthenticatedSocket) {
    if (!allowSocketMessage(socket)) return;
    if (!socket._worldId || !socket._accountId || !socket._sessionOk) return;
    const entry = worldRuntimes.get(socket._worldId);
    if (entry) entry.runtime.heartbeat(socket._accountId);
  }

  @SubscribeMessage('input')
  handleInput(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() body: unknown) {
    if (!allowSocketMessage(socket)) return;
    if (!socket._worldId || !socket._accountId || !socket._sessionOk) return;
    const entry = worldRuntimes.get(socket._worldId);
    if (!entry) return;
    const snapshot = entry.runtime.applyInputIntent(socket._accountId, body);
    if (snapshot) broadcastToWorld(socket._worldId, 'avatars:update', { avatars: snapshot.world.avatars });
  }

  /** Client báo vị trí thật của chính mình (~10 lần/giây); server kiểm rồi phát gọn danh sách avatar cho cả hẻm. */
  @SubscribeMessage('position')
  handlePosition(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() body: unknown) {
    if (!allowSocketMessage(socket)) return;
    if (!socket._worldId || !socket._accountId || !socket._sessionOk || !body || typeof body !== 'object') return;
    const entry = worldRuntimes.get(socket._worldId);
    if (!entry) return;
    const report = body as { position?: { x?: unknown; y?: unknown }; direction?: unknown };
    const position = report.position;
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') return;
    if (!entry.runtime.reportPosition(socket._accountId, { x: position.x, y: position.y }, report.direction)) return;
    broadcastToWorld(socket._worldId, 'avatars:update', { avatars: entry.runtime.getAvatars() });
  }

  @SubscribeMessage('time-vote')
  handleTimeVote(@ConnectedSocket() socket: AuthenticatedSocket, @MessageBody() body: unknown) {
    if (!allowSocketMessage(socket)) return;
    if (!socket._worldId || !socket._accountId || !socket._sessionOk || !body || typeof body !== 'object') return;
    const entry = worldRuntimes.get(socket._worldId);
    if (!entry) return;
    const vote = body as { type?: unknown; targetSpeed?: unknown };
    if (vote.type !== 'advance_day' && vote.type !== 'change_speed') return;
    if (vote.type === 'change_speed' && vote.targetSpeed !== 1 && vote.targetSpeed !== 2 && vote.targetSpeed !== 4) return;
    const result = entry.runtime.submitTimeVote(socket._accountId, {
      type: vote.type,
      ...(vote.type === 'change_speed' ? { targetSpeed: vote.targetSpeed as number } : {}),
    });
    broadcastToWorld(socket._worldId, 'time-vote:update', {
      result,
      status: entry.runtime.getActiveTimeVote(),
      snapshot: entry.runtime.getSnapshot(),
    });
  }

  @SubscribeMessage('time-vote:cancel')
  handleCancelTimeVote(@ConnectedSocket() socket: AuthenticatedSocket) {
    if (!allowSocketMessage(socket)) return;
    if (!socket._worldId || !socket._accountId || !socket._sessionOk) return;
    const entry = worldRuntimes.get(socket._worldId);
    if (!entry) return;
    entry.runtime.cancelTimeVote(socket._accountId);
    broadcastToWorld(socket._worldId, 'time-vote:update', {
      status: entry.runtime.getActiveTimeVote(),
      snapshot: entry.runtime.getSnapshot(),
    });
  }

  /** Called by HTTP commitCommand after a successful commit to push update to all WS clients */
  static notifyCommit(worldId: string, snapshot: unknown, committed?: { revision: number; business: BusinessState }) {
    const entry = worldRuntimes.get(worldId);
    // Runtime phải theo kịp bản vừa commit rồi mới phát, để người kia nhận ngay trạng thái mới (tiền, hàng, kệ...) không chờ vòng hỏi lại.
    if (entry && committed) entry.runtime.adoptCommitted(committed.revision, committed.business);
    if (entry) {
      lastSnapshotPayload.delete(worldId);
      broadcastToWorld(worldId, 'world:snapshot', entry.runtime.getSnapshot());
    }
    broadcastToWorld(worldId, 'world:update', snapshot);
  }

  /** Kick a member socket immediately when they are removed from world or revoked */
  static kickMemberSession(worldId: string, accountId: string, reason = 'Kicked from world') {
    const entry = worldRuntimes.get(worldId);
    if (!entry) return;
    for (const sock of entry.sockets) {
      if (sock._accountId === accountId) {
        try {
          sock.send(JSON.stringify({ event: 'session:kicked', data: { reason } }));
          sock.close(4003, reason);
        } catch {
          // ignore already closed
        }
      }
    }
  }

  /** Runtime đang chạy của hẻm (nguồn sự thật duy nhất khi có người online); undefined nếu chưa ai kết nối. */
  static getLiveRuntime(worldId: string): WorldRuntime | undefined {
    return worldRuntimes.get(worldId)?.runtime;
  }

  /** Đóng mọi kết nối và bỏ runtime của hẻm đã bị xóa (không checkpoint nữa, document đã mất). */
  static async closeWorld(worldId: string, reason: string): Promise<void> {
    const entry = worldRuntimes.get(worldId);
    if (!entry) return;
    worldRuntimes.delete(worldId);
    lastSnapshotPayload.delete(worldId);
    checkpointQueues.delete(worldId);
    for (const sock of entry.sockets) {
      try {
        sock.send(JSON.stringify({ event: 'session:kicked', data: { reason } }));
        sock.close(4003, reason);
      } catch { /* ignore already closed */ }
    }
    entry.sockets.clear();
    if (worldRuntimes.size === 0) stopTickLoop();
  }

  /** Get active session count for a world (used by WorldRepository to include in health/status) */
  static getActiveSessionCount(worldId: string): number {
    return worldRuntimes.get(worldId)?.runtime.getActiveSessionsCount() ?? 0;
  }

  /** Wait for persistence queued by the current runtime (used by shutdown/integration tests). */
  static async flushCheckpoints(worldId: string): Promise<void> {
    await checkpointQueues.get(worldId);
  }

  /** Clears only an idle runtime after its final checkpoint has been persisted. */
  static async evictIdleRuntime(worldId: string): Promise<void> {
    const entry = worldRuntimes.get(worldId);
    if (!entry || entry.sockets.size > 0 || entry.runtime.getActiveSessionsCount() > 0) return;
    await entry.checkpointQueue;
    if (entry.checkpointError) return;
    if (worldRuntimes.get(worldId) !== entry || entry.sockets.size > 0) return;
    worldRuntimes.delete(worldId);
    lastSnapshotPayload.delete(worldId);
    if (checkpointQueues.get(worldId) === entry.checkpointQueue) checkpointQueues.delete(worldId);
    if (worldRuntimes.size === 0) stopTickLoop();
  }
}
