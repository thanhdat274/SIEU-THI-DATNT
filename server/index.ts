/**
 * Server nhỏ cho Tạp Hóa 3D:
 *  - Lưu cloud: mỗi tài khoản Google một bản lưu trong MongoDB (collection `cloud_saves`).
 *  - Hẻm online: tiệm chung 2–4 người lưu trong MongoDB (collection `alleys`), chơi cùng qua WebSocket.
 * Chạy: npm run server (đọc cấu hình từ server/.env).
 */
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import express from 'express';
import { MongoClient, type Collection } from 'mongodb';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { WebSocketServer, type WebSocket } from 'ws';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '.env') });
const env = process.env;
const PORT = Number(env.PORT ?? 3002);

const auth = getAuth(initializeApp({
  projectId: env.FIREBASE_PROJECT_ID,
  credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: (env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  }),
}));

interface Account { uid: string; name: string }

/**
 * CHỈ ĐỂ THỬ trên máy dev: DEV_AUTH_BYPASS=true cho phép mã giả "dev:<id>" (client mở bằng `?dev=a`)
 * thành tài khoản thử dev_<id>, để test hẻm nhiều người mà không cần nhiều tài khoản Google.
 * Không bao giờ bật trên server thật: ai cũng tự xưng được bất kỳ tài khoản thử nào.
 */
const DEV_AUTH_BYPASS = env.DEV_AUTH_BYPASS === 'true';
if (DEV_AUTH_BYPASS) console.warn('[server] ⚠️ DEV_AUTH_BYPASS đang bật: chấp nhận tài khoản thử ?dev=… (chỉ dùng trên máy dev)');

/** Kiểm tra mã đăng nhập Firebase; nhớ kết quả 1 phút cho đỡ gọi mạng. */
const verified = new Map<string, { account: Account; until: number }>();
async function verify(token: string | undefined): Promise<Account | null> {
  if (!token || token.length > 8192) return null;
  const dev = DEV_AUTH_BYPASS && /^dev:([a-z0-9]{1,12})$/.exec(token);
  if (dev) return { uid: `dev_${dev[1]}`, name: `Thử ${dev[1].toUpperCase()}` };
  const hit = verified.get(token);
  if (hit && hit.until > Date.now()) return hit.account;
  try {
    const d = await auth.verifyIdToken(token);
    const account = { uid: d.uid, name: (d.name as string | undefined) ?? d.email ?? 'Chủ tiệm' };
    if (verified.size > 500) verified.clear();
    verified.set(token, { account, until: Math.min(Date.now() + 60_000, d.exp * 1000) });
    return account;
  } catch {
    return null;
  }
}

interface CloudSave { _id: string; data: unknown; updatedAt: string; day: number; level: number; money: number }
let saves: Collection<CloudSave> | null = null;
async function savesCollection() {
  if (!saves) {
    const client = await new MongoClient(env.MONGO_URI ?? env.MONGODB_URI ?? '').connect();
    saves = client.db(env.MONGODB_DATABASE ?? 'taphoa3d').collection<CloudSave>('cloud_saves');
  }
  return saves;
}

const app = express();
app.use(express.json({ limit: '2mb' }));

// Trang game ở địa chỉ khác (vd. Vercel) gọi sang: cho phép đúng địa chỉ đó (CORS_ORIGIN, cách nhau dấu phẩy)
const corsOrigins = (env.CORS_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  }
  if (req.method === 'OPTIONS') return void res.sendStatus(204);
  next();
});

app.use('/api', async (req, res, next) => {
  const account = await verify(req.headers.authorization?.replace(/^Bearer /, ''));
  if (!account) return void res.status(401).json({ error: 'Chưa đăng nhập.' });
  res.locals.account = account;
  next();
});

const summary = (s: CloudSave) => ({ updatedAt: s.updatedAt, day: s.day, level: s.level, money: s.money });

app.get('/api/save', async (_req, res) => {
  const doc = await (await savesCollection()).findOne({ _id: (res.locals.account as Account).uid });
  if (!doc) return void res.status(404).json({ error: 'Chưa có bản lưu.' });
  res.json({ data: doc.data, ...summary(doc) });
});

/**
 * Ghi lạc quan: máy gửi kèm `expectedUpdatedAt` của bản cloud nó đã thấy (null nếu chưa có).
 * Không khớp nghĩa là máy khác đã ghi sau đó → 409 để game hỏi người chơi giữ bản nào.
 */
app.put('/api/save', async (req, res) => {
  const { uid } = res.locals.account as Account;
  const { data, expectedUpdatedAt, force } = req.body ?? {};
  if (!data || typeof data !== 'object' || typeof data.day !== 'number' || typeof data.money !== 'number') {
    return void res.status(400).json({ error: 'Bản lưu không hợp lệ.' });
  }
  const coll = await savesCollection();
  const doc: CloudSave = { _id: uid, data, updatedAt: new Date().toISOString(), day: data.day, level: data.level, money: data.money };
  if (force) {
    await coll.replaceOne({ _id: uid }, doc, { upsert: true });
  } else if (expectedUpdatedAt == null) {
    try {
      await coll.insertOne(doc);
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
      const cur = await coll.findOne({ _id: uid });
      return void res.status(409).json({ error: 'Đã có bản lưu cloud khác.', cloud: cur && summary(cur) });
    }
  } else {
    const r = await coll.replaceOne({ _id: uid, updatedAt: String(expectedUpdatedAt) }, doc);
    if (r.matchedCount === 0) {
      const cur = await coll.findOne({ _id: uid });
      return void res.status(409).json({ error: 'Bản lưu cloud đã thay đổi từ máy khác.', cloud: cur && summary(cur) });
    }
  }
  res.json(summary(doc));
});

// ---------- Hẻm online (2–4 người) ----------
/**
 * Hẻm là một tiệm chung lưu trên server: mã cố định, tối đa 4 thành viên, ai cũng sửa được như nhau.
 * Người online đầu tiên làm "máy chạy" (chạy mô phỏng, gửi trạng thái cho người khác, ghi tiến trình
 * về server); máy chạy rời đi thì người còn lại kế tiếp nhận quyền. Server chỉ nhận trạng thái/tiến trình
 * từ đúng máy chạy, thao tác của người khác chỉ được chuyển tới máy chạy để làm.
 */
const MAX_MEMBERS = 4;
interface Member { uid: string; name: string }
interface Alley {
  _id: string; name: string; owner: string; members: Member[];
  data: Record<string, unknown> | null; updatedAt: string; day: number; level: number; money: number;
}
let alleys: Collection<Alley> | null = null;
async function alleyCollection() {
  if (!alleys) alleys = (await savesCollection()).db.collection<Alley>('alleys');
  return alleys;
}

const alleySummary = (a: Alley) => ({
  id: a._id, name: a.name, members: a.members, day: a.day, level: a.level, money: a.money, updatedAt: a.updatedAt,
  online: online.get(a._id)?.peers.size ?? 0,
});

// Bỏ chữ dễ nhầm (0/O, 1/I/L) cho mã đọc qua điện thoại
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newAlleyCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

app.get('/api/alleys', async (_req, res) => {
  const { uid } = res.locals.account as Account;
  const list = await (await alleyCollection()).find({ 'members.uid': uid }).sort({ updatedAt: -1 }).toArray();
  res.json(list.map(alleySummary));
});

app.post('/api/alleys', async (req, res) => {
  const { uid, name } = res.locals.account as Account;
  const coll = await alleyCollection();
  if ((await coll.countDocuments({ 'members.uid': uid })) >= 10) {
    return void res.status(400).json({ error: 'Bạn đã ở 10 hẻm, hãy rời bớt trước khi tạo mới.' });
  }
  const title = String(req.body?.name ?? '').trim().slice(0, 30) || `Hẻm của ${name}`;
  for (let i = 0; i < 5; i++) {
    const doc: Alley = {
      _id: newAlleyCode(), name: title, owner: uid, members: [{ uid, name }],
      data: null, updatedAt: new Date().toISOString(), day: 1, level: 1, money: 0,
    };
    try {
      await coll.insertOne(doc);
      return void res.json(alleySummary(doc));
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  }
  res.status(500).json({ error: 'Không tạo được mã hẻm, thử lại.' });
});

app.post('/api/alleys/:id/join', async (req, res) => {
  const { uid, name } = res.locals.account as Account;
  const id = String(req.params.id).toUpperCase();
  const coll = await alleyCollection();
  const alley = await coll.findOne({ _id: id });
  if (!alley) return void res.status(404).json({ error: `Không tìm thấy hẻm ${id}.` });
  if (alley.members.some((m) => m.uid === uid)) return void res.json(alleySummary(alley));
  // Điều kiện "chưa đủ người" nằm trong câu lệnh để hai người vào cùng lúc không vượt quá giới hạn
  const r = await coll.findOneAndUpdate(
    { _id: id, [`members.${MAX_MEMBERS - 1}`]: { $exists: false }, 'members.uid': { $ne: uid } },
    { $push: { members: { uid, name } } },
    { returnDocument: 'after' },
  );
  if (!r) return void res.status(400).json({ error: `Hẻm đã đủ ${MAX_MEMBERS} người.` });
  res.json(alleySummary(r));
});

app.post('/api/alleys/:id/leave', async (req, res) => {
  const { uid } = res.locals.account as Account;
  const id = String(req.params.id).toUpperCase();
  const coll = await alleyCollection();
  await coll.updateOne({ _id: id }, { $pull: { members: { uid } } });
  // Không còn thành viên nào thì xoá hẻm
  await coll.deleteOne({ _id: id, members: { $size: 0 } });
  res.json({ ok: true });
});

app.use(((err, _req, res, _next) => {
  console.error('[api]', err);
  res.status(500).json({ error: 'Lỗi server.' });
}) as express.ErrorRequestHandler);

/** `visible`: tab đang mở trên màn hình (trình duyệt dừng chạy game khi tab bị ẩn). */
interface Peer { id: number; ws: WebSocket; uid: string; name: string; visible: boolean }
interface Room { peers: Map<number, Peer>; runner: number | null; locks: Map<string, number> }
/** Hẻm đang có người online. */
const online = new Map<string, Room>();
let nextPeerId = 1;
const send = (ws: WebSocket | undefined, msg: object) => ws?.readyState === 1 && ws.send(JSON.stringify(msg));
const peerList = (room: Room) => [...room.peers.values()].map((p) => ({ id: p.id, name: p.name }));
const broadcast = (room: Room, msg: object, except?: number) => {
  for (const p of room.peers.values()) if (p.id !== except) send(p.ws, msg);
};
const broadcastLocks = (room: Room, started?: string) => broadcast(room, {
  type: 'locks', started,
  locks: [...room.locks].map(([key, id]) => ({ key, id, name: room.peers.get(id)?.name ?? '' })),
});

/**
 * Máy chạy ẩn tab thì game trên máy đó đứng (trình duyệt ngừng vẽ), cả hẻm đứng theo: giao quyền chạy
 * cho người đang mở tab. Ai cũng ẩn tab thì giữ nguyên (không ai xem, game dừng cũng không sao).
 */
function handOff(room: Room, reason: 'left' | 'hidden', oldName: string) {
  const current = room.runner != null ? room.peers.get(room.runner) : undefined;
  if (current?.visible) return;
  const next = [...room.peers.values()].find((p) => p.visible && p.id !== room.runner)
    ?? (current ? undefined : room.peers.values().next().value);
  if (!next) return;
  if (current) send(current.ws, { type: 'demote' });
  room.runner = next.id;
  send(next.ws, { type: 'promote' });
  const why = reason === 'hidden' ? `${oldName} vừa ẩn tab` : `${oldName} đã rời hẻm`;
  broadcast(room, { type: 'notify', text: `🏪 ${why}, máy ${next.name} đang chạy tiệm` }, next.id);
}

async function saveCheckpoint(alleyId: string, data: unknown) {
  const d = data as Record<string, unknown> | null;
  if (!d || typeof d !== 'object' || typeof d.day !== 'number' || typeof d.money !== 'number') return;
  await (await alleyCollection()).updateOne({ _id: alleyId }, {
    $set: { data: d, updatedAt: new Date().toISOString(), day: d.day, level: Number(d.level) || 1, money: d.money },
  });
}

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 2 * 1024 * 1024 });

wss.on('connection', (ws) => {
  let peer: Peer | null = null;
  let alleyId = '';
  let entering = false;
  ws.on('message', async (raw) => {
    let msg: { type?: string; [k: string]: unknown };
    try { msg = JSON.parse(String(raw)); } catch { return; }
    if (!peer) {
      // Tin nhắn đầu tiên: vào hẻm (phải đăng nhập và là thành viên)
      if (msg.type !== 'enter' || entering) return;
      entering = true;
      const account = await verify(msg.token as string | undefined);
      if (!account) return void send(ws, { type: 'error', error: 'Cần đăng nhập Google để chơi hẻm online.' });
      alleyId = String(msg.alley ?? '').toUpperCase();
      const alley = await (await alleyCollection()).findOne({ _id: alleyId });
      if (!alley || !alley.members.some((m) => m.uid === account.uid)) {
        return void send(ws, { type: 'error', error: 'Bạn chưa là thành viên của hẻm này.' });
      }
      const room: Room = online.get(alleyId) ?? { peers: new Map(), runner: null, locks: new Map() };
      if (room.peers.size >= MAX_MEMBERS) return void send(ws, { type: 'error', error: 'Hẻm đang đủ người online.' });
      online.set(alleyId, room);
      peer = { id: nextPeerId++, ws, uid: account.uid, name: account.name, visible: msg.visible !== false };
      room.peers.set(peer.id, peer);
      const runner = room.runner == null;
      if (runner) room.runner = peer.id;
      send(ws, {
        // Phòng trong nhà chung: theo thứ tự vào hẻm
        type: 'welcome', selfId: peer.id, room: Math.max(0, alley.members.findIndex((m) => m.uid === account.uid)), role: runner ? 'runner' : 'player',
        alley: { id: alley._id, name: alley.name }, peers: peerList(room),
        // Máy chạy nạp tiến trình từ server; người khác chờ trạng thái từ máy chạy
        data: runner ? alley.data : undefined,
      });
      broadcast(room, { type: 'peers', peers: peerList(room), joined: peer.name }, peer.id);
      return;
    }
    const room = online.get(alleyId);
    if (!room) return;
    const isRunner = room.runner === peer.id;
    switch (msg.type) {
      case 'pose':
        broadcast(room, { type: 'pose', from: peer.id, pose: msg.pose, look: String(msg.look ?? '').slice(0, 32) }, peer.id);
        break;
      case 'visibility':
        peer.visible = msg.visible !== false;
        // Máy chạy vừa ẩn tab, hoặc có người vừa mở lại tab trong lúc máy chạy đang ẩn
        handOff(room, 'hidden', room.peers.get(room.runner!)?.name ?? '');
        break;
      case 'act':
        // Thao tác của người khác: chuyển cho máy chạy làm (máy chạy tự làm trực tiếp, không gửi)
        if (!isRunner && room.runner != null) {
          send(room.peers.get(room.runner)?.ws, { type: 'act', from: peer.id, seq: msg.seq, name: msg.name, args: msg.args });
        }
        break;
      case 'result':
        // Kết quả thao tác: máy chạy gửi riêng cho đúng người đã bấm
        if (isRunner) send(room.peers.get(Number(msg.to))?.ws, { type: 'result', seq: msg.seq, ok: msg.ok, messages: msg.messages });
        break;
      case 'lock': {
        // Khoá một việc (vd. 'build' = sửa bố cục) để mỗi lúc chỉ một người làm
        const key = String(msg.key ?? '').slice(0, 32);
        const holder = room.locks.get(key);
        if (msg.on) {
          if (holder != null && holder !== peer.id) {
            send(ws, { type: 'lock-denied', key, by: room.peers.get(holder)?.name ?? 'Người khác' });
            break;
          }
          room.locks.set(key, peer.id);
          broadcastLocks(room, peer.name);
        } else if (holder === peer.id) {
          room.locks.delete(key);
          broadcastLocks(room);
        }
        break;
      }
      case 'state':
        if (isRunner) broadcast(room, { type: 'state', game: msg.game, actors: msg.actors }, peer.id);
        break;
      case 'notify':
        if (isRunner) broadcast(room, { type: 'notify', text: msg.text }, peer.id);
        break;
      case 'checkpoint':
        if (isRunner) await saveCheckpoint(alleyId, msg.data).catch((err) => console.error('[alley]', err));
        break;
    }
  });
  ws.on('close', () => {
    if (!peer) return;
    const room = online.get(alleyId);
    if (!room) return;
    room.peers.delete(peer.id);
    if (!room.peers.size) return void online.delete(alleyId);
    // Người rời đi thì nhả khoá đang giữ
    let released = false;
    for (const [key, id] of room.locks) if (id === peer.id) released = room.locks.delete(key);
    if (released) broadcastLocks(room);
    if (room.runner === peer.id) {
      // Chuyển quyền chạy, ưu tiên người đang mở tab
      room.runner = null;
      handOff(room, 'left', peer.name);
    }
    broadcast(room, { type: 'peers', peers: peerList(room), left: peer.name });
  });
});

// Tự host: đã `npm run build` thì server phục vụ luôn trang game, một cổng là đủ cho cả web lẫn hẻm online
const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api|\/ws).*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')));
}

server.listen(PORT, () => console.log(`[server] http://localhost:${PORT}  (lưu cloud + hẻm online)`));
