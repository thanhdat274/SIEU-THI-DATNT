import { type GameState, type SetState, type GetState } from '../gameTypes';
import { copyStock, putStock } from '../stock';
import { REP_CAP } from '../../data/reputation';
import { emptySocial2 } from '../../data/biz';

/**
 * Hệ 6 — Cộng đồng online không đồng bộ (SPEC-CHIEU-RONG §6.5). Các mutation có ĐỤNG KINH TẾ/trạng thái
 * đặt ở đây để test được; đọc (bảng, chợ, thư) thì panel gọi thẳng src/net/socialApi. Lớp mạng được
 * dynamic-import (import('../../net/socialApi')) để không kéo firebase vào bundle ban đầu.
 *
 * Lập trường: simGolden / chơi khách / chưa bật scope `public_card` → không gọi mạng, không đổi một byte
 * kinh tế. Mọi thứ có trần phía server (§6.3), state này chỉ là bộ nhớ nhanh phía máy người chơi.
 */

/** Lẵng hoa: +5 điểm trang trí trong 3 ngày (khớp server/socialRules). */
const FLOWER_DECOR_DAYS = 3;
const FLOWER_MAX_ACTIVE = 5;

/** Khoá ngày thật dạng YYYY-MM-DD (UTC) — đúng server. */
const dayKey = () => new Date().toISOString().slice(0, 10);
/** Khoá tuần thật (thứ Hai) dạng YYYY-MM-DD — đúng server weekKey(). */
function weekKeyLocal(): string {
  const d = new Date();
  const dow = (d.getUTCDay() + 6) % 7; // 0 = thứ Hai
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export const createSocial2Slice = (set: SetState, get: GetState): Pick<
  GameState, 'toggleCardPublic' | 'pushCard' | 'claimInbox' | 'postMarketLot' | 'buyMarketLot'
> => {
  /** Xây danh thiếp từ trạng thái hiện tại (level/day/tên tiệm/bố trí). */
  const buildCardBody = (s: GameState) => ({
    shopName: s.shopName,
    level: s.level,
    day: s.day,
    shopTier: s.shopTier,
    titles: (s.titles ?? []).slice(0, 3),
    topDishes: [],
    layout: s.furniture.map((f) => ({ type: f.type, x: f.x, z: f.z, rot: f.rot })).slice(0, 240),
  });

  return {
    toggleCardPublic: async (on) => {
      const anyOn = !!get().biz.social2?.cardPublic;
      if (on === anyOn) return;
      const api = await import('../../net/socialApi');
      try {
        if (on) {
          const { code } = await api.putCard(buildCardBody(get()));
          const cur = get().biz.social2 ?? emptySocial2();
          set({ biz: { ...get().biz, social2: { ...cur, cardPublic: true, code, card: { shopName: get().shopName, ownerName: '', level: get().level, day: get().day } } } });
        } else {
          await api.deleteCard();
          const cur = get().biz.social2 ?? emptySocial2();
          set({ biz: { ...get().biz, social2: { ...cur, cardPublic: false, code: undefined, card: undefined } } });
        }
      } catch (e) {
        get().notify(`❌ Cộng đồng: ${(e as Error).message}`);
      }
    },

    pushCard: async () => {
      const s = get();
      if (!s.biz.social2?.cardPublic) return;
      const api = await import('../../net/socialApi');
      try {
        const res = await api.putCard(buildCardBody(s));
        const cur = s.biz.social2;
        set({ biz: { ...s.biz, social2: { ...cur, code: cur.code ?? res.code, card: { shopName: s.shopName, ownerName: cur.card?.ownerName ?? '', level: s.level, day: s.day } } } });
      } catch { /* bỏ qua lỗi đẩy định kỳ — lần sau đẩy lại */ }
    },

    claimInbox: (items) => {
      if (!items.length) return;
      const s = get();
      const cur = s.biz.social2 ?? emptySocial2();
      const pending = items.filter((i) => !cur.claimed.includes(i.id));
      if (!pending.length) return;
      // Gộp mọi thay đổi vào một set(): không để mỗi thư một lần set gây nhiều render + sai race.
      let money = s.money;
      const k = copyStock(s);
      let flowers = cur.flowers;
      let repLog = s.repLog;
      const claimed = [...cur.claimed, ...pending.map((i) => i.id)].slice(-200);
      const today = s.day;
      for (const it of pending) {
        const p = it.payload ?? {};
        if (it.kind === 'flower') {
          flowers = [...flowers.filter((f) => f.until >= today), { until: today + FLOWER_DECOR_DAYS }].slice(-FLOWER_MAX_ACTIVE);
          repLog = [...repLog, { quality: 1 }].slice(-REP_CAP);
        } else if (it.kind === 'praise') {
          repLog = [...repLog, { quality: 1 }].slice(-REP_CAP);
        } else if (it.kind === 'lot_sold' && typeof p.money === 'number' && p.money > 0) {
          money += p.money;
        } else if (it.kind === 'lot_bought' && p.productId && typeof p.qty === 'number' && p.qty > 0) {
          putStock(k, p.productId, p.qty);
        }
      }
      set({
        money, repLog, ...k,
        biz: { ...s.biz, social2: { ...cur, flowers, claimed } },
      });
      // Đánh dấu đã nhận trên server (lỗi thì lần sau nhận thư mới sẽ đụng lại; id đã local-claim nên không nhân đôi).
      import('../../net/socialApi').then((api) => api.claimInbox(pending.map((i) => i.id))).catch(() => {});
    },

    postMarketLot: async (input) => {
      const s = get();
      const cur = s.biz.social2 ?? emptySocial2();
      const wk = weekKeyLocal();
      const n = cur.lotsWeek.week === wk ? cur.lotsWeek.n : 0;
      if (n >= 3) { get().notify('Tuần này đăng đủ 3 lô rồi.'); return; }
      const api = await import('../../net/socialApi');
      try {
        await api.postMarket({ ...input, level: s.level });
        const fresh = get().biz.social2 ?? emptySocial2();
        const freshN = fresh.lotsWeek.week === wk ? fresh.lotsWeek.n : 0;
        set({ biz: { ...get().biz, social2: { ...fresh, lotsWeek: { week: wk, n: freshN + 1 } } } });
        get().notify('📦 Đã đăng lô lên chợ liên hẻm.');
      } catch (e) {
        get().notify(`❌ Chợ: ${(e as Error).message}`);
      }
    },

    buyMarketLot: async (lot) => {
      const s = get();
      const total = lot.price * lot.qty;
      if (s.money < total) { get().notify('❌ Két không đủ tiền mua lô này.'); return; }
      const cur = s.biz.social2 ?? emptySocial2();
      const dk = dayKey();
      const n = cur.buysDay.date === dk ? cur.buysDay.n : 0;
      if (n >= 2) { get().notify('Hôm nay mua đủ 2 lô rồi.'); return; }
      const api = await import('../../net/socialApi');
      try {
        await api.buyMarket(lot.id, s.level);
        const fresh = get().biz.social2 ?? emptySocial2();
        const freshN = fresh.buysDay.date === dk ? fresh.buysDay.n : 0;
        set({ money: get().money - total, biz: { ...get().biz, social2: { ...fresh, buysDay: { date: dk, n: freshN + 1 } } } });
        get().notify('🛒 Đã mua lô — hàng về kho sáng sớm mai (check thư).');
      } catch (e) {
        get().notify(`❌ Chợ: ${(e as Error).message}`);
      }
    },
  };
};
