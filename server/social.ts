/**
 * Route của "Online không đồng bộ" (SPEC-CHIEU-RONG §6.5) — tách khỏi server/index.ts cho không phình.
 * Gọi các hàm thuần trong socialRules.ts. Mọi route đi qua middleware xác thực + giới hạn tần suất
 * đã đặt ở index.ts (res.locals.account sẵn có).
 *
 * Lập trường gian lận (§6.3): server không hiểu nội dung bản lưu và không cố chống ai sửa máy mình;
 * chỉ thiết kế để gian lận vô nghĩa (mọi thứ có trần) + kiểm tốc độ tiến nhẹ (ẩn mềm).
 */
import type { Express, Request, Response } from 'express';
import { MongoClient, type Collection, type Document } from 'mongodb';
import {
  FLOWER_MAX_ACTIVE, GIFT_MAX_DAY, GIFT_PER_FRIEND_DAY, MARKET_BUY_MAX_DAY, MARKET_MAX_LOTS_WEEK,
  MARKET_MAX_QTY, MARKET_MAX_RATIO, MARKET_MIN_RATIO, MARKET_TTL_DAYS, MAX_FRIENDS, bandForLevel,
  newFriendCode, normalizeCard, progressionSuspicious, sanitizeOwnerName, seasonKey,
  scorePoints, weekKey, type ShopCardData,
} from './socialRules';

const MONGO = () => (process.env.MONGO_URI ?? process.env.MONGODB_URI ?? '');
const DBNAME = () => (process.env.MONGODB_DATABASE ?? 'taphoa3d');

let client: MongoClient | null = null;
let dbp: Promise<import('mongodb').Db> | null = null;
function db() {
  if (!dbp) {
    const c = new MongoClient(MONGO());
    client = c;
    dbp = c.connect().then(() => c.db(DBNAME()));
  }
  return dbp;
}
/** Cho phép test đóng client (không bắt buộc). */
export function __closeSocialDb() { client?.close().catch(() => {}); client = null; dbp = null; }

interface CardDoc extends Document {
  _id: string;              // uid
  code: string;             // mã bạn bè 6 ký tự
  shopName: string; ownerName: string;
  level: number; shopTier: number; day: number;
  titles: string[]; stance?: string; brandName?: string; alleyBond?: number;
  topDishes: { id: string; stars: number }[];
  layout: { type: string; x: number; z: number; rot: number }[];
  flagged?: boolean; updatedAt: string; createdAt: string;
}
interface CardHistoryDoc extends Document { _id: string; seq: { day: number; level: number; at: number }[] }
interface FriendDoc extends Document { _id: string; a: string; b: string; at: number }
interface InboxDoc extends Document { _id: string; to: string; kind: string; from: string; payload: unknown; createdAt: number; claimedAt?: number }
interface MarketLotDoc extends Document {
  _id: string; seller: string; productId: string; qty: number; unit: number;
  price: number; band: string; createdAt: number; buyer?: string; boughtAt?: number; returned?: boolean;
}
interface WeekDoc extends Document {
  _id: string;              // `${week}:${uid}`
  week: string; uid: string; band: string; group: string;
  score: number; parts: Record<string, number>; reachedAt: number; flagged?: boolean;
}
interface SeasonDoc extends Document { _id: string; season: string; uid: string; band: string; score: number }
interface AlleyCardDoc extends Document { _id: string; name: string; level: number; band: string; members: { uid: string; name: string }[]; layout: unknown; updatedAt: string }
interface ReportDoc extends Document { _id: string; kind: string; target: string; by: string; reason: string; createdAt: number }
interface FairDoc extends Document { _id: string; name: string; from: string; to: string; metric: string; target: number; milestones: number[]; total: number; icon?: string }
interface FairContribDoc extends Document { _id: string; fair: string; uid: string; n: number }

type C<T extends Document> = Collection<T>;
async function coll<T extends Document>(name: string): Promise<C<T>> { return (await db()).collection<T>(name); }

const auth = (res: Response) => (res.locals.account as { uid: string; name: string });

/** Là sự kiện hội chợ đang diễn ra theo giờ server (đã cấu hình trong `fairs`). */
async function currentFair(now = Date.now()): Promise<FairDoc | null> {
  const fairs = await coll<FairDoc>('fairs');
  const doc = await fairs.findOne({ from: { $lte: new Date(now).toISOString() }, to: { $gte: new Date(now).toISOString() } });
  return doc ?? null;
}

export function registerSocial(app: Express) {
  // ───────────────── Danh thiếp tiệm (§6.4a, L2) ─────────────────
  app.put('/api/card', async (req: Request, res: Response) => {
    const { uid, name } = auth(res);
    const cards = await coll<CardDoc>('shop_cards');
    const existing = await cards.findOne({ _id: uid });
    // Nếu chưa bao giờ có code thì sinh; có rồi giữ mã (mã ổn định để bạn bè kết).
    const code = existing?.code ?? newFriendCode();
    if (existing && existing.code !== code) { /* giữ nguyên */ }
    const card = normalizeCard({ ownerName: name, ...req.body });
    if (!card) return void res.status(400).json({ error: 'Danh thiếp trống.' });
    const nowStr = new Date().toISOString();
    // Kiểm tốc độ tiến (day/level) trước khi ghi, cập nhật lịch sử.
    const hist = await coll<CardHistoryDoc>('card_history');
    let flagged = existing?.flagged ?? false;
    const seq = existing ? ((await hist.findOne({ _id: uid }))?.seq ?? []) : [];
    const prev = seq.length ? seq[seq.length - 1] : null;
    const at = Date.now();
    const chk = progressionSuspicious(prev ? { day: prev.day, level: prev.level, at: prev.at } : null, { day: card.day, level: card.level, at });
    if (chk.suspicious) flagged = true;
    const nextSeq = [...seq.slice(-200), { day: card.day, level: card.level, at }];
    await hist.replaceOne({ _id: uid }, { _id: uid, seq: nextSeq }, { upsert: true });
    await cards.replaceOne({ _id: uid }, {
      _id: uid, code, ...card, flagged, updatedAt: nowStr, createdAt: existing?.createdAt ?? nowStr,
    }, { upsert: true });
    res.json({ ok: true, code });
  });

  app.delete('/api/card', async (_req: Request, res: Response) => {
    const { uid } = auth(res);
    await (await coll<CardDoc>('shop_cards')).deleteOne({ _id: uid });
    await (await coll<CardHistoryDoc>('card_history')).deleteOne({ _id: uid });
    res.json({ ok: true });
  });

  app.get('/api/card/:code', async (req: Request, res: Response) => {
    const card = await (await coll<CardDoc>('shop_cards')).findOne({ code: String(req.params.code ?? '').trim().toUpperCase() });
    if (!card) return void res.status(404).json({ error: 'Không tìm thấy.' });
    // Ẩn mềm (§6.3.6): người bị gắn cờ vẫn thấy mình, người khác không thấy.
    if (card.flagged && card._id !== auth(res).uid) return void res.status(404).json({ error: 'Không tìm thấy.' });
    const { _id, code, ...pub } = card;
    res.json({ uid: _id, code, ...pub });
  });

  // ───────────────── Bạn bè bằng mã (§6.4a/6.4b, L3) ─────────────────
  const friendId = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  // Đảm bảo 1 hướng: doc `${a}:${b}` với a<b. Trả uid bạn của uid này.
  async function friendUids(uid: string): Promise<string[]> {
    const f = await coll<FriendDoc>('friends');
    const rows = await f.find({ $or: [{ a: uid }, { b: uid }] }).toArray();
    return rows.map((r) => (r.a === uid ? r.b : r.a));
  }

  app.post('/api/friends/:code', async (req: Request, res: Response) => {
    const { uid } = auth(res);
    const code = String(req.params.code ?? '').trim().toUpperCase();
    if (!/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(code)) return void res.status(400).json({ error: 'Mã sai.' });
    const card = await (await coll<CardDoc>('shop_cards')).findOne({ code });
    if (!card) return void res.status(404).json({ error: 'Không có tiệm nào với mã này.' });
    const target = card._id;
    if (target === uid) return void res.status(400).json({ error: 'Không kết bạn với chính mình.' });
    const friends = await coll<FriendDoc>('friends');
    if (await friends.findOne({ _id: friendId(uid, target) })) return void res.json({ ok: true, already: true });
    const mine = await friendUids(uid);
    if (mine.length >= MAX_FRIENDS) return void res.status(400).json({ error: `Tối đa ${MAX_FRIENDS} bạn.` });
    const [a, b] = uid < target ? [uid, target] : [target, uid];
    await friends.replaceOne({ _id: friendId(uid, target) }, { _id: `${a}:${b}`, a, b, at: Date.now() }, { upsert: true });
    res.json({ ok: true, code });
  });

  app.delete('/api/friends/:uid', async (req: Request, res: Response) => {
    const { uid } = auth(res);
    const target = String(req.params.uid ?? '');
    if (!target) return void res.status(400).json({ error: 'Thiếu bạn.' });
    await (await coll<FriendDoc>('friends')).deleteOne({ _id: friendId(uid, target) });
    res.json({ ok: true });
  });

  app.get('/api/friends', async (_req: Request, res: Response) => {
    const { uid } = auth(res);
    const uids = await friendUids(uid);
    const cards = await (await coll<CardDoc>('shop_cards')).find({ _id: { $in: uids } }).toArray();
    const byUid = new Map(cards.map((c) => [c._id, c]));
    const list = uids.map((u) => {
      const c = byUid.get(u);
      return c ? { uid: u, shopName: c.shopName, ownerName: c.ownerName, level: c.level, code: c.code, flagged: c.flagged } : { uid: u, closed: true };
    });
    res.json({ friends: list });
  });

  // ───────────────── Thư + lẵng hoa + lời khen (§6.4b, L4) ─────────────────
  const INBOX_TTL = 30 * 86400_000;
  let inboxIndexed = false;
  async function ensureInboxIndex() {
    const inbox = await coll<InboxDoc>('inbox');
    if (!inboxIndexed) { await inbox.createIndex({ createdAt: 1 }, { expireAfterSeconds: INBOX_TTL / 1000 }); inboxIndexed = true; }
    return inbox;
  }

  /** Gửi lẵng hoa / lời khen cho bạn (§6.4b). Mọi trần tính phía người gửi VÀ người nhận. */
  app.post('/api/gift/:uid', async (req: Request, res: Response) => {
    const { uid } = auth(res);
    const target = String(req.params.uid ?? '');
    const kind = String(req.body?.kind ?? '');
    if (!target || target === uid) return void res.status(400).json({ error: 'Người nhận không hợp lệ.' });
    if (!['flower', 'praise'].includes(kind)) return void res.status(400).json({ error: 'Loại quà sai.' });
    const inbox = await ensureInboxIndex();
    const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
    const dayKey = dayStart.getTime();
    // Gửi: mỗi ngày thật tối đa GIFT_MAX_DAY lẵng (chỉ đếm lẵng hoa).
    if (kind === 'flower') {
      const sentToday = await inbox.countDocuments({ from: uid, kind: 'flower', createdAt: { $gte: dayKey } });
      if (sentToday >= GIFT_MAX_DAY) return void res.status(429).json({ error: 'Hôm nay đã gửi đủ 3 lẵng hoa.' });
      // Nhận: mỗi ngày 1 lẵng cho mỗi bạn (server phóng đại: chặn quá nhiều lẵng cùng lúc).
      const active = await inbox.countDocuments({ to: target, kind: 'flower', claimedAt: { $exists: false } });
      if (active >= FLOWER_MAX_ACTIVE) return void res.status(429).json({ error: 'Bạn ấy đang có nhiều lẵng hoa rồi.' });
      const fromToday = await inbox.countDocuments({ to: target, from: uid, kind: 'flower', createdAt: { $gte: dayKey } });
      if (fromToday >= GIFT_PER_FRIEND_DAY) return void res.status(429).json({ error: 'Hôm nay đã gửi cho bạn này 1 lẵng.' });
    }
    await inbox.insertOne({ _id: undefined as unknown as string, to: target, kind, from: uid, payload: req.body?.payload ?? null, createdAt: Date.now() });
    res.json({ ok: true });
  });

  app.get('/api/inbox', async (_req: Request, res: Response) => {
    const { uid } = auth(res);
    const inbox = await ensureInboxIndex();
    const items = await inbox.find({ to: uid, claimedAt: { $exists: false } }).sort({ createdAt: -1 }).limit(50).toArray();
    res.json({ items: items.map((i) => ({ id: i._id, kind: i.kind, from: i.from, payload: i.payload, createdAt: i.createdAt })) });
  });

  app.post('/api/inbox/claim', async (req: Request, res: Response) => {
    const { uid } = auth(res);
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
    if (!ids.length) return void res.json({ items: [] });
    const inbox = await ensureInboxIndex();
    const r = await inbox.updateMany({ _id: { $in: ids }, to: uid, claimedAt: { $exists: false } }, { $set: { claimedAt: Date.now() } });
    res.json({ ok: true, claimed: r.modifiedCount });
  });

  // ───────────────── Chợ liên hẻm (§6.4c, L7) ─────────────────
  // Danh sách mã hàng hợp lệ sinh ra server/marketWhitelist.json (script build). Không import game.
  let whitelist: Set<string> | null = null;
  let marketIndexed = false;
  async function loadWhitelist(): Promise<Set<string>> {
    if (whitelist) return whitelist;
    try {
      const { readFileSync } = await import('node:fs');
      const { resolve, dirname } = await import('node:path');
      const { fileURLToPath } = await import('node:url');
      const p = resolve(dirname(fileURLToPath(import.meta.url)), 'marketWhitelist.json');
      whitelist = new Set(JSON.parse(readFileSync(p, 'utf8')).productIds);
    } catch { whitelist = new Set(); }
    return whitelist;
  }
  async function ensureMarketIndex() {
    const lots = await coll<MarketLotDoc>('market_lots');
    if (!marketIndexed) { await lots.createIndex({ createdAt: 1 }, { expireAfterSeconds: MARKET_TTL_DAYS * 86400 }); marketIndexed = true; }
    return lots;
  }

  app.get('/api/market', async (req: Request, res: Response) => {
    const { uid } = auth(res);
    const band = bandForLevel(Number(req.query?.level) || 30);
    const lots = await ensureMarketIndex();
    const open = await lots.find({ buyer: { $exists: false }, returned: { $ne: true } }).sort({ createdAt: -1 }).limit(60).toArray();
    const friends = new Set(await friendUids(uid));
    const mine = open.filter((l) => l.seller === uid);
    const fromFriends = open.filter((l) => friends.has(l.seller) && l.seller !== uid);
    const others = open.filter((l) => !friends.has(l.seller) && l.seller !== uid && l.band === band).slice(0, 30);
    const items = (l: MarketLotDoc) => ({ id: l._id, seller: l.seller, productId: l.productId, qty: l.qty, unit: l.unit, price: l.price, band: l.band, createdAt: l.createdAt });
    res.json({ mine: mine.map(items), fromFriends: fromFriends.map(items), others: others.map(items) });
  });

  app.post('/api/market', async (req: Request, res: Response) => {
    const { uid } = auth(res);
    const productId = String(req.body?.productId ?? '');
    const qty = Number(req.body?.qty) || 0;
    const unit = Number(req.body?.unit) || Number(req.body?.price) || 0;
    const level = Number(req.body?.level) || 30;
    const suggest = Number(req.body?.suggestPrice) || 0;
    const lots = await ensureMarketIndex();
    const wl = await loadWhitelist();
    if (!wl.has(productId)) return void res.status(400).json({ error: 'Mặt hàng này không được ra chợ liên hẻm (chỉ hàng khô không theo mùa).' });
    if (qty < 1 || qty > MARKET_MAX_QTY) return void res.status(400).json({ error: `Mỗi lô ${MARKET_MAX_QTY} đơn vị trở xuống.` });
    if (suggest <= 0) return void res.status(400).json({ error: 'Thiếu giá gợi ý.' });
    // Giá trong [60%, 95%] giá bán gợi ý (server kiểm, §6.4c).
    if (unit < suggest * MARKET_MIN_RATIO || unit > suggest * MARKET_MAX_RATIO) {
      return void res.status(400).json({ error: 'Giá phải trong 60–95% giá bán gợi ý.' });
    }
    const week = weekKey();
    const weekStart = new Date(week + 'T00:00:00Z').getTime();
    const soldThisWeek = await lots.countDocuments({ seller: uid, createdAt: { $gte: weekStart } });
    if (soldThisWeek >= MARKET_MAX_LOTS_WEEK) return void res.status(429).json({ error: 'Tuần này đăng đủ 3 lô rồi.' });
    const lot: MarketLotDoc = { _id: undefined as unknown as string, seller: uid, productId, qty, unit, price: unit, band: bandForLevel(level), createdAt: Date.now() };
    const { insertedId } = await lots.insertOne(lot);
    res.json({ ok: true, id: insertedId });
  });

  app.post('/api/market/:id/buy', async (req: Request, res: Response) => {
    const { uid } = auth(res);
    const id = String(req.params.id ?? '');
    const level = Number(req.body?.level) || 30;
    const lots = await ensureMarketIndex();
    const inbox = await ensureInboxIndex();
    const lot = await lots.findOne({ _id: id });
    if (!lot || lot.buyer || lot.seller === uid) return void res.status(404).json({ error: 'Lô không còn bán.' });
    const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0);
    const boughtToday = await lots.countDocuments({ buyer: uid, boughtAt: { $gte: dayStart.getTime() } });
    if (boughtToday >= MARKET_BUY_MAX_DAY) return void res.status(429).json({ error: 'Hôm nay mua đủ 2 lô rồi.' });
    await lots.updateOne({ _id: id, buyer: { $exists: false } }, { $set: { buyer: uid, boughtAt: Date.now() } });
    // Người bán nhận tiền qua thư khi vào game (§6.4c); người mua: hàng về kho sáng hôm sau qua thư.
    const money = lot.price * lot.qty;
    await inbox.insertOne({ _id: undefined as unknown as string, to: lot.seller, kind: 'lot_sold', from: 'chophien', payload: { lotId: id, productId: lot.productId, qty: lot.qty, money }, createdAt: Date.now() });
    await inbox.insertOne({ _id: undefined as unknown as string, to: uid, kind: 'lot_bought', from: 'chophien', payload: { lotId: id, productId: lot.productId, qty: lot.qty, unit: lot.price, level }, createdAt: Date.now() });
    res.json({ ok: true, money });
  });

  // ───────────────── Thi đua tuần (§6.4d, L6/L6b) ─────────────────
  const groupOf = (week: string, band: string, uid: string) => `${week}:${band}:${stableHash(uid) % 1019}`;

  app.post('/api/week/score', async (req: Request, res: Response) => {
    const { uid } = auth(res);
    const level = Number(req.body?.level) || 30;
    const partsIn = (req.body?.parts ?? {}) as Record<string, number>;
    if (!partsIn || typeof partsIn !== 'object') return void res.status(400).json({ error: 'Thiếu điểm.' });
    const { parts, total } = scorePoints(partsIn as never);
    const week = weekKey();
    const band = bandForLevel(level);
    const ws = await coll<WeekDoc>('week_scores');
    const season = await coll<SeasonDoc>('season_scores');
    const now = Date.now();
    const card = await (await coll<CardDoc>('shop_cards')).findOne({ _id: uid });
    const flagged = card?.flagged ?? false;
    const doc: WeekDoc = { _id: `${week}:${uid}`, week, uid, band, group: groupOf(week, band, uid), score: total, parts, reachedAt: now, flagged };
    await ws.replaceOne({ _id: doc._id }, doc, { upsert: true });
    const sk = seasonKey();
    const seasonBand = band;
    await season.updateOne(
      { _id: `${sk}:${uid}`, band: bandForLevel(level) },
      { $inc: { score: total }, $setOnInsert: { season: sk, uid, band: seasonBand } },
      { upsert: true },
    );
    res.json({ ok: true, week, band, group: doc.group, score: total });
  });

  function scoreRow(d: WeekDoc | SeasonDoc) { return { uid: d.uid, band: d.band, score: d.score, flagged: (d as WeekDoc).flagged }; }

  app.get('/api/week', async (req: Request, res: Response) => {
    const { uid } = auth(res);
    const level = Number(req.query?.level) || 30;
    const week = weekKey();
    const band = bandForLevel(level);
    const ws = await coll<WeekDoc>('week_scores');
    const group = groupOf(week, band, uid);
    const mine = await ws.findOne({ _id: `${week}:${uid}` });
    // Tổ của mình: 20 người gần mình nhất theo điểm (đủ 20 bù tiệm mẫu ở client).
    const cohort = await ws.find({ week, band, group: groupOf(week, band, uid) }).sort({ score: -1, reachedAt: 1 }).limit(20).toArray();
    res.json({ week, band, group, mine: mine ? scoreRow(mine) : null, cohort: cohort.map(scoreRow) });
  });

  // ───────────────── Bảng xếp hạng (§6.4d/6.4e-f, L6b/L6c/L6d) ─────────────────
  app.get('/api/board', async (req: Request, res: Response) => {
    const { uid } = auth(res);
    const scope = String(req.query?.scope ?? 'friends');   // friends | server
    const band = String(req.query?.band ?? bandForLevel(Number(req.query?.level) || 30));
    const period = String(req.query?.period ?? 'week');    // week | season
    const week = weekKey();
    const season = seasonKey();
    const ws = await coll<WeekDoc>('week_scores');
    const ss = await coll<SeasonDoc>('season_scores');
    const query = period === 'season' ? { season } : { week };
    const rows = period === 'season'
      ? (await ss.find(query).sort({ score: -1 }).limit(200).toArray())
      : (await ws.find(query).sort({ score: -1, reachedAt: 1 }).limit(200).toArray());
    // Bạn bè: chỉ các dòng của bạn.
    const friends = scope === 'friends' ? new Set(await friendUids(uid)) : null;
    let ranked = rows.map((r, i) => ({ ...scoreRow(r), rank: i + 1 }));
    if (friends) ranked = ranked.filter((r) => friends.has(r.uid) || r.uid === uid);
    else ranked = ranked.filter((r) => r.band === band);
    const mine = ranked.find((r) => r.uid === uid);
    const total = ranked.length;
    const self = mine
      ? { rank: mine.rank, score: mine.score, percent: total ? Math.max(1, Math.round((mine.rank / total) * 100)) : 100 }
      : null;
    const top = ranked.slice(0, scope === 'friends' ? 50 : 100).map((r) => ({ rank: r.rank, uid: r.uid, score: r.score, flagged: r.flagged }));
    res.json({ scope, band, period, top, self, total });
  });

  // Bảng hẻm (§6.4f): điểm kèm checkpoint + điểm chung sức do server đo → đặt trong index.ts nhánh checkpoint.
  app.get('/api/board/alleys', async (req: Request, res: Response) => {
    const scope = String(req.query?.scope ?? 'server');
    const band = String(req.query?.band ?? '1-29');
    const aws = await coll<Document>('alley_week_scores');
    const week = weekKey();
    const rows = await aws.find({ week, ...(scope === 'server' ? { band } : {}) }).sort({ score: -1 }).limit(50).toArray();
    res.json({ week, rows: rows.map((r) => ({ alley: r.alley, band: r.band, score: r.score, together: r.together })) });
  });

  // ───────────────── Danh thiếp hẻm + đồng ý hiện tên (§6.4f, L6c) ─────────────────
  app.put('/api/alleys/:id/card', async (req: Request, res: Response) => {
    const alleyId = String(req.params.id ?? '');
    const { uid } = auth(res);
    // Chỉ thành viên hẻm được đặt danh thiếp hẻm (kiểm qua collection alleys trong index — ở đây kiểm cứng).
    const alleyColl = await coll<Document>('alleys');
    const alley = await alleyColl.findOne({ _id: alleyId });
    if (!alley) return void res.status(404).json({ error: 'Không có hẻm.' });
    const members = (alley.members as { uid: string }[]) ?? [];
    if (!members.some((m) => m.uid === uid)) return void res.status(403).json({ error: 'Không phải thành viên.' });
    const ac = await coll<AlleyCardDoc>('alley_cards');
    const consumers: AlleyCardDoc = {
      _id: alleyId, name: String(req.body?.name ?? '').trim().slice(0, 40) || (alley.name ?? 'Hẻm'),
      level: Number(req.body?.level) || alley.level || 1, band: bandForLevel(Number(req.body?.level) || alley.level || 1),
      members: (req.body?.members ?? []).slice(0, 4), layout: req.body?.layout ?? null, updatedAt: new Date().toISOString(),
    };
    await ac.replaceOne({ _id: alleyId }, consumers, { upsert: true });
    res.json({ ok: true });
  });

  app.post('/api/alleys/:id/card/consent', async (req: Request, res: Response) => {
    const alleyId = String(req.params.id ?? '');
    const { uid } = auth(res);
    const show = Boolean(req.body?.show);
    const cons = await coll<Document>('alley_card_consents');
    if (show) await cons.replaceOne({ _id: `${alleyId}:${uid}` }, { _id: `${alleyId}:${uid}`, alley: alleyId, uid, at: Date.now() }, { upsert: true });
    else await cons.deleteOne({ _id: `${alleyId}:${uid}` });
    res.json({ ok: true });
  });

  // ───────────────── Báo cáo + kiểm duyệt tên (§6.4-L8) ─────────────────
  app.post('/api/report', async (req: Request, res: Response) => {
    const { uid } = auth(res);
    const kind = String(req.body?.kind ?? '');
    const target = String(req.body?.target ?? '');
    const reason = String(req.body?.reason ?? '').slice(0, 200);
    if (!['card', 'board'].includes(kind) || !target) return void res.status(400).json({ error: 'Báo cáo sai.' });
    const r = await coll<ReportDoc>('reports');
    await r.insertOne({ _id: undefined as unknown as string, kind, target, by: uid, reason, createdAt: Date.now() });
    // Bị báo cáo ≥ 3 lần → gạch tên (hiện "Tiệm tạp hóa" cho tới khi đổi, §6.5).
    const n = await r.countDocuments({ kind, target });
    if (n >= 3) {
      const cards = await coll<CardDoc>('shop_cards');
      await cards.updateOne({ _id: target }, { $set: { shopName: 'Tiệm tạp hóa' } });
    }
    res.json({ ok: true });
  });

  // ───────────────── Hội chợ toàn server (§6.4e, L5) ─────────────────
  /** Seed các kỳ hội chợ theo LỊCH THẬT (§6.4e: 4–6 kỳ/năm trùng dịp thật). Gọi một lần khi khởi động. */
  const FAIRS_YEAR: { name: string; icon: string; month: number; day: number; durationDays: number; metric: string; target: number; milestones: number[] }[] = [
    { name: 'Hội chợ Tết', icon: '🧧', month: 0, day: 26, durationDays: 10, metric: 'festival_goods', target: 400000, milestones: [100000, 200000, 300000, 400000] },
    { name: 'Hội chợ Thống nhất', icon: '🇻🇳', month: 3, day: 29, durationDays: 7, metric: 'cooked', target: 300000, milestones: [75000, 150000, 225000, 300000] },
    { name: 'Hội chợ Trung thu', icon: '🏮', month: 7, day: 10, durationDays: 12, metric: 'homemade', target: 350000, milestones: [87500, 175000, 262500, 350000] },
    { name: 'Hội chợ Nhà giáo', icon: '📚', month: 10, day: 17, durationDays: 7, metric: 'region', target: 250000, milestones: [62500, 125000, 187500, 250000] },
    { name: 'Hội chợ Giáng sinh', icon: '🎄', month: 11, day: 18, durationDays: 10, metric: 'festival_goods', target: 300000, milestones: [75000, 150000, 225000, 300000] },
  ];
  let fairsSeeded = false;
  async function seedFairs(): Promise<void> {
    if (fairsSeeded) return;
    fairsSeeded = true;
    const fairs = await coll<FairDoc>('fairs');
    const now = new Date();
    for (const f of FAIRS_YEAR) {
      for (let y = now.getUTCFullYear(); y <= now.getUTCFullYear(); y++) {
        const start = new Date(Date.UTC(y, f.month, f.day));
        const end = new Date(start.getTime() + f.durationDays * 86400_000);
        const id = `fair_${y}_${f.month}_${f.day}`;
        await fairs.replaceOne({ _id: id }, {
          _id: id, name: f.name, icon: f.icon, from: start.toISOString(), to: end.toISOString(),
          metric: f.metric, target: f.target, milestones: f.milestones, total: 0,
        }, { upsert: true });
      }
    }
    console.log('[social] đã seed kỳ hội chợ theo lịch thật');
  }

  app.get('/api/fair', async (_req: Request, res: Response) => {
    await seedFairs();
    const fair = await currentFair();
    const contrib = await coll<FairContribDoc>('fair_contrib');
    if (!fair) return void res.json({ fair: null });
    const mine = await contrib.findOne({ _id: `${fair._id}:${auth(res).uid}` });
    res.json({ fair: { id: fair._id, name: fair.name, metric: fair.metric, target: fair.target, milestones: fair.milestones, total: fair.total, from: fair.from, to: fair.to, icon: fair.icon }, mine: mine?.n ?? 0 });
  });

  /** Mỗi lần sang ngày game, client gửi số món thuộc metric đã bán hôm đó; server chặn trần theo cấp. */
  app.post('/api/fair/contribute', async (req: Request, res: Response) => {
    await seedFairs();
    const { uid } = auth(res);
    const level = Number(req.body?.level) || 30;
    const n = Math.max(0, Math.min(Number(req.body?.n) || 0, 1000));
    const fair = await currentFair();
    if (!fair) return void res.status(404).json({ error: 'Không có hội chợ nào đang diễn ra.' });
    // Chặn trần hợp lý theo cấp: tối đa ~4× khách/ngày của cấp (1000 là trần cứng an toàn).
    const cap = Math.min(1000, (20 + 4 * level) * 4);
    const add = Math.min(n, cap);
    const contrib = await coll<FairContribDoc>('fair_contrib');
    await contrib.updateOne({ _id: `${fair._id}:${uid}` }, { $inc: { n: add }, $setOnInsert: { fair: fair._id, uid } }, { upsert: true });
    const fairs = await coll<FairDoc>('fairs');
    await fairs.updateOne({ _id: fair._id }, { $inc: { total: add } });
    res.json({ ok: true, accepted: add, total: fair.total + add, milestones: fair.milestones });
  });
}

/** Băm chuỗi ổn định (không cần crypto) để phân tổ đều theo uid. */
function stableHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}
