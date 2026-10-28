import { describe, it, expect } from 'vitest';
import {
  REST_RATE, REST_BURST, BUCKET_MAX, WS_POSE_RATE, WS_MSG_RATE, WS_WINDOW_MS, WS_STRIKE_WINDOW_MS, WS_MAX_STRIKES,
  MAX_SAVE_VERSION, ALLEY_TTL_MS, ALLEY_SWEEP_MS,
  takeToken, pruneBuckets, newWsRate, wsAllow, invalidSaveReason, sweepStaleAlleys, nextOwner,
  type TokenBucket,
} from '../../server/room';
import { SAVE_VERSION } from '../core/save';

// Giờ gốc chung cho các test có thao tác thời gian (bucket/window đều tính bằng ms epoch)
const T = 10_000;

describe('REST rate limit — token bucket theo uid', () => {
  it('hằng số cấu hình đúng chuẩn đề ra', () => {
    expect(REST_RATE).toBe(30);
    expect(REST_BURST).toBe(10);
  });

  it('12 request nhanh trong 1 phút với burst 10 → request thứ 11+ bị chặn kèm Retry-After', () => {
    const bucket = new Map<string, TokenBucket>();
    const verdicts = Array.from({ length: 12 }, () => takeToken(bucket, 'u1', T));
    expect(verdicts.slice(0, 10).every((v) => v.ok)).toBe(true);
    expect(verdicts[10].ok).toBe(false);
    expect(verdicts[11].ok).toBe(false);
    expect(verdicts[10].retryAfter).toBeGreaterThan(0);
  });

  it('mỗi uid một xô riêng: người này cạn xô không ảnh hưởng người kia', () => {
    const bucket = new Map<string, TokenBucket>();
    for (let i = 0; i < REST_BURST; i++) takeToken(bucket, 'u1', T);
    expect(takeToken(bucket, 'u1', T).ok).toBe(false);
    expect(takeToken(bucket, 'u2', T).ok).toBe(true);
  });

  it('thời gian trôi nạp lại token (30 req/phút = 0.5 token/giây)', () => {
    const bucket = new Map<string, TokenBucket>();
    for (let i = 0; i < REST_BURST; i++) takeToken(bucket, 'u1', T);
    expect(takeToken(bucket, 'u1', T + 500).ok).toBe(false); // 0.5s chưa đủ 1 token
    expect(takeToken(bucket, 'u1', T + 2000).ok).toBe(true); // 2s nạp đủ 1 token
  });

  it('pruneBuckets: không đụng Map nhỏ; quá BUCKET_MAX thì bỏ xô lâu không dùng, giữ xô mới', () => {
    const small = new Map<string, TokenBucket>([['u1', { tokens: 0, updatedAt: 0 }]]);
    pruneBuckets(small, T);
    expect(small.size).toBe(1);

    const big = new Map<string, TokenBucket>();
    for (let i = 0; i < BUCKET_MAX; i++) big.set(`u${i}`, { tokens: REST_BURST, updatedAt: 0 });
    big.set('fresh', { tokens: REST_BURST, updatedAt: 60_000 });
    pruneBuckets(big, 60_000); // xô cũ đủ lâu để nạp đầy token → xoá cũng như reset, không lỏng hạn mức
    expect(big.size).toBe(1);
    expect(big.has('fresh')).toBe(true);
  });
});

describe('WS rate limit — mỗi kết nối một bộ đếm', () => {
  it('hằng số cấu hình đúng chuẩn đề ra', () => {
    expect(WS_POSE_RATE).toBe(240);
    expect(WS_MSG_RATE).toBe(60);
    expect(WS_WINDOW_MS).toBe(5000);
    expect(WS_STRIKE_WINDOW_MS).toBe(30_000);
    expect(WS_MAX_STRIKES).toBe(3);
  });

  it('pose: 240 tin/5s thoải mái, tin 241 bị bỏ', () => {
    const rate = newWsRate();
    for (let i = 0; i < WS_POSE_RATE; i++) expect(wsAllow(rate, 'pose', T)).toBe('allow');
    expect(wsAllow(rate, 'pose', T)).toBe('drop');
  });

  it('tin thường: 60 tin/5s, tin 61 bị bỏ', () => {
    const rate = newWsRate();
    for (let i = 0; i < WS_MSG_RATE; i++) expect(wsAllow(rate, 'act', T)).toBe('allow');
    expect(wsAllow(rate, 'act', T)).toBe('drop');
  });

  it('pose và tin thường có bucket riêng, không trừ lẫn nhau', () => {
    const rate = newWsRate();
    for (let i = 0; i < WS_POSE_RATE; i++) wsAllow(rate, 'pose', T);
    expect(wsAllow(rate, 'pose', T)).toBe('drop');
    expect(wsAllow(rate, 'act', T)).toBe('allow'); // bucket tin thường còn nguyên
  });

  it('hết cửa sổ 5s thì đếm lại từ đầu', () => {
    const rate = newWsRate();
    for (let i = 0; i < WS_MSG_RATE; i++) wsAllow(rate, 'act', T);
    expect(wsAllow(rate, 'act', T)).toBe('drop');
    expect(wsAllow(rate, 'act', T + WS_WINDOW_MS)).toBe('allow');
  });

  it('vi phạm 3 lần trong 30s thì terminate', () => {
    const rate = newWsRate();
    for (let i = 0; i < WS_MSG_RATE; i++) wsAllow(rate, 'act', T);
    expect(wsAllow(rate, 'act', T)).toBe('drop'); // vi phạm 1
    expect(wsAllow(rate, 'act', T)).toBe('drop'); // vi phạm 2
    expect(wsAllow(rate, 'act', T)).toBe('terminate'); // vi phạm 3
  });

  it('vi phạm trộn loại tin (pose + thường) vẫn cộng dồn về một bộ đếm vi phạm', () => {
    const rate = newWsRate();
    for (let i = 0; i < WS_POSE_RATE; i++) wsAllow(rate, 'pose', T);
    expect(wsAllow(rate, 'pose', T)).toBe('drop'); // vi phạm 1 (pose)
    for (let i = 0; i < WS_MSG_RATE; i++) wsAllow(rate, 'act', T);
    expect(wsAllow(rate, 'act', T)).toBe('drop'); // vi phạm 2 (thường)
    expect(wsAllow(rate, 'ready', T)).toBe('terminate'); // vi phạm 3
  });

  it('qua 30s không vi phạm thì bộ đếm vi phạm reset, vi phạm sau đó chỉ bị drop chứ chưa terminate', () => {
    const rate = newWsRate();
    for (let i = 0; i < WS_MSG_RATE; i++) wsAllow(rate, 'act', T);
    wsAllow(rate, 'act', T); // vi phạm 1
    wsAllow(rate, 'act', T); // vi phạm 2
    // Cửa sổ tin và cửa sổ vi phạm đều đã qua
    const later = T + WS_STRIKE_WINDOW_MS;
    for (let i = 0; i < WS_MSG_RATE; i++) wsAllow(rate, 'act', later);
    expect(wsAllow(rate, 'act', later)).toBe('drop'); // vi phạm đếm lại từ 1, chưa terminate
  });
});

describe('PUT /api/save — kiểm tra dữ liệu bản lưu', () => {
  const ok = { saveVersion: 2, day: 5, money: 123_000, level: 3 };

  it('MAX_SAVE_VERSION đồng bộ với SAVE_VERSION phía client', () => {
    expect(MAX_SAVE_VERSION).toBe(SAVE_VERSION);
  });

  it('bản lưu chuẩn thì hợp lệ', () => {
    expect(invalidSaveReason(ok)).toBeNull();
  });

  it('thiếu saveVersion → 400 lý do rõ ràng', () => {
    const { saveVersion: _omit, ...rest } = ok;
    expect(invalidSaveReason(rest)).toMatch(/saveVersion/);
  });

  it(`saveVersion vượt MAX_SAVE_VERSION (${MAX_SAVE_VERSION}) → chặn`, () => {
    expect(invalidSaveReason({ ...ok, saveVersion: MAX_SAVE_VERSION + 1 })).toMatch(/saveVersion/);
    expect(invalidSaveReason({ ...ok, saveVersion: 0 })).toMatch(/saveVersion/);
  });

  it("saveVersion dạng chuỗi '2' → chặn (không ép kiểu ngầm)", () => {
    expect(invalidSaveReason({ ...ok, saveVersion: '2' })).toMatch(/saveVersion/);
  });

  it('saveVersion số lẻ (1.5) → chặn vì không phải số nguyên', () => {
    expect(invalidSaveReason({ ...ok, saveVersion: 1.5 })).toMatch(/saveVersion/);
  });

  it('day/money/level phải là số hữu hạn', () => {
    expect(invalidSaveReason({ ...ok, day: '5' })).toMatch(/day/);
    expect(invalidSaveReason({ ...ok, money: Number.NaN })).toMatch(/money/);
    expect(invalidSaveReason({ ...ok, money: Number.POSITIVE_INFINITY })).toMatch(/money/);
    expect(invalidSaveReason({ ...ok, level: undefined })).toMatch(/level/);
  });

  it('data không phải đối tượng (mảng, null, số) → chặn', () => {
    expect(invalidSaveReason([ok])).toMatch(/đối tượng/);
    expect(invalidSaveReason(null)).toMatch(/đối tượng/);
    expect(invalidSaveReason(42)).toMatch(/đối tượng/);
  });
});

describe('TTL dọn hẻm bỏ hoang', () => {
  it('hằng số: TTL 48h, quét mỗi 30 phút', () => {
    expect(ALLEY_TTL_MS).toBe(48 * 60 * 60 * 1000);
    expect(ALLEY_SWEEP_MS).toBe(30 * 60 * 1000);
  });

  const now = 1_000_000_000_000;
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();

  it('hẻm members rỗng, lastActive 49h trước → bị xoá', () => {
    const stale = sweepStaleAlleys([{ _id: 'ABC234', members: [], lastActive: now - 49 * 60 * 60 * 1000 }], now);
    expect(stale).toEqual(['ABC234']);
  });

  it('hẻm rỗng thành viên nhưng mới hoạt động gần đây → giữ', () => {
    const stale = sweepStaleAlleys([{ _id: 'ABC234', members: [], lastActive: now - 47 * 60 * 60 * 1000 }], now);
    expect(stale).toEqual([]);
  });

  it('hẻm còn thành viên thì không xoá dù lâu không hoạt động', () => {
    const stale = sweepStaleAlleys([{ _id: 'ABC234', members: [{ uid: 'a', name: 'A' }], lastActive: now - 100 * 60 * 60 * 1000 }], now);
    expect(stale).toEqual([]);
  });

  it('hẻm cũ chưa có lastActive thì dựa vào updatedAt', () => {
    expect(sweepStaleAlleys([{ _id: 'OLD1', members: [], updatedAt: hoursAgo(49) }], now)).toEqual(['OLD1']);
    expect(sweepStaleAlleys([{ _id: 'NEW1', members: [], updatedAt: hoursAgo(2) }], now)).toEqual([]);
  });

  it('quét một loạt hẻm: chỉ trả về đúng các hẻm cần xoá', () => {
    const docs = [
      { _id: 'KEEP1', members: [{ uid: 'a' }], lastActive: now - 100 * 60 * 60 * 1000 },
      { _id: 'DROP1', members: [], lastActive: now - 49 * 60 * 60 * 1000 },
      { _id: 'DROP2', members: [], updatedAt: hoursAgo(60) },
      { _id: 'KEEP2', members: [], lastActive: now - 60_000 },
    ];
    expect(sweepStaleAlleys(docs, now)).toEqual(['DROP1', 'DROP2']);
  });
});

describe('chủ hẻm rời — kế nhiệm', () => {
  it('chủ hẻm rời → người vào sớm nhất còn lại làm chủ mới', () => {
    const members = [{ uid: 'a', name: 'A' }, { uid: 'b', name: 'B' }, { uid: 'c', name: 'C' }];
    expect(nextOwner(members, 'a')).toBe('b'); // chủ là người đầu tiên
    expect(nextOwner(members, 'b')).toBe('a'); // chủ ở giữa: người vào sớm nhất còn lại
    expect(nextOwner(members, 'c')).toBe('a');
  });

  it('người cuối cùng rời → không còn chủ (hẻm sẽ bị xoá)', () => {
    expect(nextOwner([{ uid: 'a', name: 'A' }], 'a')).toBeNull();
  });
});
