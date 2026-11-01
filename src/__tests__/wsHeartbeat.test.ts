import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocketServer, type WebSocket as ServerWS } from 'ws';
import WebSocket from 'ws';
import { heartbeatStep } from '../../server/room';

/**
 * GĐ686 — hồi quy heartbeat hẻm online.
 *
 * Bug thật (tìm bằng probe: client im lặng bị terminate ~49 s, code 1006): pong trong index.ts cũ
 * ghi `peer.isAlive` (object Peer) trong khi heartbeat đọc `ws.isAlive` (object WebSocket) → cờ sống
 * không bao giờ được set → MỌI kết nối hẻm online bị ngắt sau ~60 giây, máy khách tự reload về màn
 * chính — co-op không thể kéo dài quá một phút.
 *
 * Test này dựng WSS thật (chu kỳ heartbeat nhanh) + client `ws` thật (tự động pong) và bắt buộc
 * cặp "pong ghi — heartbeat đọc" phải là CÙNG một cờ.
 */

const CYCLE_MS = 40;

function bootServer(pongField: 'ws' | 'peer-different') {
  const wss = new WebSocketServer({ port: 0 });
  let terminated = 0;
  const wssState = { dead: false };
  const timer = setInterval(() => {
    for (const ws of wss.clients) {
      if (heartbeatStep(ws as unknown as { isAlive?: boolean }) === 'terminate') {
        terminated++;
        ws.terminate();
        continue;
      }
      ws.ping();
    }
  }, CYCLE_MS);
  wss.on('connection', (ws: ServerWS) => {
    if (pongField === 'ws') {
      // đúng như index.ts sau fix: pong ghi cờ MÀ heartbeat đọc
      ws.on('pong', () => { (ws as unknown as { isAlive?: boolean }).isAlive = true; });
    } else {
      // biến thể BUG cũ: pong ghi cờ trên object khác (Peer) — heartbeat không bao giờ thấy sống
      const ghost = { isAlive: true };
      ws.on('pong', () => { ghost.isAlive = true; });
    }
  });
  const port = (wss.address() as { port: number }).port;
  const stop = async () => {
    clearInterval(timer);
    wssState.dead = true;
    await new Promise<void>((r) => wss.close(() => r()));
  };
  return { wss, port, stop, terminatedCount: () => terminated };
}

function openClient(port: number) {
  return new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('heartbeat hẻm online — pong ghi đúng cờ heartbeat đọc (GĐ686)', () => {
  let server: ReturnType<typeof bootServer>;

  afterEach(async () => { await server?.stop(); });

  it('heartbeatStep thuần: kết nối mới là ping; không pong trong chu kỳ → terminate', () => {
    const ws: { isAlive?: boolean } = {};
    expect(heartbeatStep(ws)).toBe('ping'); // kết nối mới: chưa từng chết → ping
    expect(heartbeatStep(ws)).toBe('terminate'); // chuỗi ping không thấy pong → chết
  });

  it('client im lặng sống qua ≥6 chu kỳ heartbeat (pong tự động của ws được ghi đúng cờ)', async () => {
    server = bootServer('ws');
    const ws = await openClient(server.port);
    await wait(CYCLE_MS * 6);
    expect(ws.readyState).toBe(WebSocket.OPEN);
    expect(server.terminatedCount()).toBe(0);
    ws.close();
  });

  it('biến thể BUG cũ (pong ghi object khác): client bị terminate ở chu kỳ 2 — test phải bắt được', async () => {
    server = bootServer('peer-different');
    const ws = await openClient(server.port);
    await wait(CYCLE_MS * 4);
    expect(server.terminatedCount()).toBeGreaterThan(0);
    expect(ws.readyState).not.toBe(WebSocket.OPEN);
  });
});
