import {
  BRAND_DEAL_CUT_AFTER, BRAND_DEAL_REOPEN_DAYS, BRAND_DEALER_UNLOCK, BRAND_FRANCHISE_REP,
  BRAND_FRANCHISE_SETUP, BRAND_FRANCHISE_UNLOCK, BRAND_LINE_SLOTS, BRAND_REP_LATE, BRAND_REP_ONTIME,
  BRAND_RIVAL_OFFER_DAYS, BRAND_RIVAL_STRENGTH_GAIN, BRAND_UNLOCK, BRAND_WORKSHOP_COST,
  BRAND_WORKSHOP_MAX_STAFF, BRAND_WORKSHOP_UNLOCK, BRAND_FRANCHISE_SLOTS,
  brandDealValue, brandDealerById, brandLineEligible, brandLineSlots, brandRivalValue,
  applyBrandRep, type BrandState,
} from '../../data/brand';
import { productById } from '../../data/products';
import type { GameState, GetState, SetState } from '../gameTypes';

/**
 * Hệ 4 (SPEC-CHIEU-SAU §4) — NHÃN HÀNG RIÊNG (cấp ≥ 100).
 * Người chơi lập nhãn mang tên tiệm, chọn những món nhà làm đã thành thạo đưa vào dòng hàng, dán nhãn
 * cho hàng đóng gói ở xưởng, bán lẻ với giá cao hơn theo uy tín nhãn, rồi bỏ mối cho đại lý và nhượng
 * quyền (các lát sau). Slice này lo phần LẬP NHÃN + DÒNG HÀNG (ban đầu 1 dòng, mở dần theo cấp). Mọi
 * thao tác vào `GUARDED` khoá 'brand' (co-op — cả hẻm dùng chung nhãn).
 */
export const createBrandSlice = (set: SetState, get: GetState): Pick<
  GameState,
  'foundBrand' | 'addBrandLine' | 'dropBrandLine' | 'buyBrandWorkshop' | 'hireBrandWorker' | 'fireBrandWorker'
  | 'acceptBrandDeal' | 'commitBrandDeal' | 'releaseBrandDeal' | 'deliverBrandDeal' | 'acceptRivalSupply'
  | 'openFranchise' | 'closeFranchise'
> => ({
  foundBrand: (name) => {
    const s = get();
    if (s.level < BRAND_UNLOCK) return s.notify(`🏷️ Nhãn riêng mở từ cấp ${BRAND_UNLOCK}`);
    if (s.biz.brand) return s.notify(`🏷️ Tiệm đã có nhãn "${s.biz.brand.name}" rồi.`);
    const clean = (name ?? '').trim().slice(0, 24) || 'Nhãn nhà tôi';
    const brand: BrandState = {
      name: clean, lines: [], stock: {}, rep: 0, maxRep: 0, repLog: [],
      workshop: null, lastPackDay: 0, deals: {}, franchises: [], franchiseDue: {},
    };
    set({ biz: { ...s.biz, brand } });
    s.notify(`🏷️ Khai trương nhãn hàng "${clean}"! Đưa món nhà làm thành thạo vào dòng hàng để dán nhãn.`);
  },
  addBrandLine: (productId) => {
    const s = get();
    const b = s.biz.brand;
    if (!b) return s.notify(`🏷️ Hãy lập nhãn trước (mục Nhãn riêng, cấp ${BRAND_UNLOCK}).`);
    if (b.lines.length >= brandLineSlots(s.level)) {
      return s.notify(`🏷️ Đã đủ số dòng nhãn ở cấp này (${BRAND_LINE_SLOTS[b.lines.length] ? `dòng tiếp mở cấp ${BRAND_LINE_SLOTS[b.lines.length]}` : 'tối đa 6 dòng'}).`);
    }
    if (b.lines.some((l) => l.productId === productId)) return s.notify(`🏷️ Dòng này đang mang nhãn rồi.`);
    const batches = s.garden.preserveMade?.[productId] ?? 0;
    const soldEver = s.soldEver?.[productId] ?? 0;
    if (!brandLineEligible(batches, soldEver)) {
      return s.notify(`🏷️ Món này chưa đủ điều kiện dán nhãn: cần ${BRAND_LINE_SLOTS.length ? '100 mẻ nhà làm' : ''} & bán 500 đơn vị (đang: ${batches} mẻ, ${soldEver} bán).`);
    }
    const lines = [...b.lines, { productId, since: s.day, made: 0, sold: 0 }];
    set({ biz: { ...s.biz, brand: { ...b, lines } } });
    s.notify(`🏷️ Đưa "${pname(productId)}" vào dòng nhãn "${b.name}".`);
  },
  dropBrandLine: (productId) => {
    const s = get();
    const b = s.biz.brand;
    if (!b) return;
    const lines = b.lines.filter((l) => l.productId !== productId);
    if (lines.length === b.lines.length) return;
    const stock = { ...b.stock };
    delete stock[productId];
    set({ biz: { ...s.biz, brand: { ...b, lines, stock } } });
    s.notify(`🏷️ Bỏ dòng nhãn "${pname(productId)}".`);
  },

  // ───── XƯỞNG ĐÓNG GÓI (SPEC §4.5a) ─────
  buyBrandWorkshop: () => {
    const s = get();
    const b = s.biz.brand;
    if (!b) return s.notify(`🏷️ Hãy lập nhãn trước (mục Nhãn riêng, cấp ${BRAND_UNLOCK}).`);
    if (s.level < BRAND_WORKSHOP_UNLOCK) return s.notify(`🏭 Xưởng đóng gói mở từ cấp ${BRAND_WORKSHOP_UNLOCK}.`);
    if (b.workshop?.open) return s.notify(`🏭 Xưởng đóng gói đã mở.`);
    if (s.money < BRAND_WORKSHOP_COST) return s.notify(`🏭 Mua xưởng đóng gói cần ${BRAND_WORKSHOP_COST.toLocaleString('vi-VN')}đ — còn thiếu ${(BRAND_WORKSHOP_COST - s.money).toLocaleString('vi-VN')}đ.`);
    set({ money: s.money - BRAND_WORKSHOP_COST, biz: { ...s.biz, brand: { ...b, workshop: { open: true, staff: 0, tier: 0 } } } });
    s.notify(`🏭 Mở xưởng đóng gói! Thuê thợ để mỗi đêm tự đóng hàng mang nhãn (tối đa ${BRAND_WORKSHOP_MAX_STAFF} thợ).`);
  },
  hireBrandWorker: () => {
    const s = get();
    const b = s.biz.brand;
    if (!b?.workshop?.open) return s.notify(`🏭 Chưa có xưởng đóng gói.`);
    if (b.workshop.staff >= BRAND_WORKSHOP_MAX_STAFF) return s.notify(`🏭 Đã đủ ${BRAND_WORKSHOP_MAX_STAFF} thợ (tối đa).`);
    set({ biz: { ...s.biz, brand: { ...b, workshop: { ...b.workshop, staff: b.workshop.staff + 1 } } } });
    s.notify(`🏭 Thuê thêm 1 thợ đóng gói (${b.workshop.staff + 1}/${BRAND_WORKSHOP_MAX_STAFF}). Lương trả mỗi đêm.`);
  },
  fireBrandWorker: () => {
    const s = get();
    const b = s.biz.brand;
    if (!b?.workshop?.open) return;
    if (b.workshop.staff <= 0) return;
    set({ biz: { ...s.biz, brand: { ...b, workshop: { ...b.workshop, staff: b.workshop.staff - 1 } } } });
    s.notify(`🏭 Cho 1 thợ nghỉ (còn ${b.workshop.staff - 1}/${BRAND_WORKSHOP_MAX_STAFF}).`);
  },

  // ───── BỎ MỐI ĐẠI LÝ (SPEC §4.5c) — dùng lại ContractState/chuỗi đúng hẹn ─────
  acceptBrandDeal: (dealerId, productId) => {
    const s = get();
    const b = s.biz.brand;
    if (!b) return s.notify(`🏷️ Hãy lập nhãn trước (mục Nhãn riêng, cấp ${BRAND_UNLOCK}).`);
    if (s.level < BRAND_DEALER_UNLOCK) return s.notify(`🚛 Bỏ mối đại lý mở từ cấp ${BRAND_DEALER_UNLOCK}.`);
    const def = brandDealerById(dealerId);
    if (!def) return;
    if (def.unlock > s.level) return s.notify(`🚛 "${def.title}" mở từ cấp ${def.unlock}.`);
    if (b.rep < def.rep) return s.notify(`🚛 "${def.title}" cần uy tín nhãn ${def.rep}+ (đang ${Math.round(b.rep)}).`);
    if (b.deals[dealerId]) return s.notify(`🚛 Hợp đồng "${def.title}" đang hoạt động rồi.`);
    if (b.reopenDays?.[dealerId] && s.day < b.reopenDays[dealerId]) {
      return s.notify(`🚛 "${def.title}" mới bị cắt, ${b.reopenDays[dealerId] - s.day} ngày nữa mới ký lại.`);
    }
    if (!b.lines.some((l) => l.productId === productId)) return s.notify(`🚛 Chọn đúng dòng đang mang nhãn.`);
    const deal = {
      defId: dealerId, dueDay: s.day + def.periodDays, delivered: 0, pending: true, streak: 0,
      overdue: false, committed: false, locked: {}, productId,
    };
    set({ biz: { ...s.biz, brand: { ...b, deals: { ...b.deals, [dealerId]: deal } } } });
    s.notify(`🚛 Ký bỏ mối "${def.title}": ${def.qty} đơn vị ${pname(productId)} mỗi ${def.periodDays} ngày.`);
  },
  commitBrandDeal: (dealerId) => {
    const s = get();
    const b = s.biz.brand;
    const deal = b?.deals?.[dealerId];
    if (!b || !deal) return s.notify('🚛 Hợp đồng này không hoạt động.');
    if (deal.committed) return s.notify('🚛 Kỳ này đã cam kết trữ hàng rồi.');
    const def = brandDealerById(dealerId)!;
    const have = b.stock[deal.productId] ?? 0;
    if (have < def.qty) return s.notify(`🚛 Kho nhãn chưa đủ ${def.qty} đơn vị để trữ kỳ này (còn ${have}).`);
    set({
      biz: { ...s.biz, brand: { ...b, deals: { ...b.deals, [dealerId]: { ...deal, committed: true, locked: { [deal.productId]: def.qty } } } } },
    });
    s.notify(`🤝 Cam kết "${def.title}": trữ riêng ${def.qty} đơn vị ${pname(deal.productId)} cho kỳ này (thưởng tin cậy khi giao đủ hạn).`);
  },
  releaseBrandDeal: (dealerId) => {
    const s = get();
    const b = s.biz.brand;
    const deal = b?.deals?.[dealerId];
    if (!b || !deal || !deal.committed) return s.notify('🚛 Chưa cam kết kỳ này.');
    set({
      biz: { ...s.biz, brand: { ...b, deals: { ...b.deals, [dealerId]: { ...deal, committed: false, locked: {} } } } },
    });
    s.notify(`↩️ Hủy cam kết "${brandDealerById(dealerId)!.title}": mất thưởng tin cậy kỳ này.`);
  },
  deliverBrandDeal: (dealerId) => {
    const s = get();
    const b = s.biz.brand;
    const deal = b?.deals?.[dealerId];
    if (!b || !deal) return false;
    const def = brandDealerById(dealerId);
    if (!def) return false;
    const committed = deal.committed === true;
    const qty = def.qty;
    const have = b.stock[deal.productId] ?? 0;
    if (have < qty) { s.notify(`🚛 Kho nhãn thiếu ${qty - have} đơn vị ${pname(deal.productId)} — không giao được kỳ này`); return false; }
    const pay = brandDealValue(def, deal.productId);
    const onTime = !deal.overdue;
    // Chuỗi đúng hẹn + uy tín: đúng hẹn +2 · trễ −4; kỳ trễ/thiếu là một kỳ hỏng.
    let nb = onTime
      ? applyBrandRep(b, s.day, BRAND_REP_ONTIME, `giao đúng hẹn "${def.title}"`)
      : applyBrandRep(b, s.day, BRAND_REP_LATE, `giao trễ kỳ "${def.title}"`);
    const newStreak = onTime ? (deal.streak ?? 0) + 1 : 0;
    const missed = onTime ? 0 : (deal.missed ?? 0) + 1;
    // trừ kho nhãn
    const stock = { ...nb.stock, [deal.productId]: have - qty };
    // tăng bán ra của dòng
    const lines = nb.lines.map((l) => l.productId === deal.productId ? { ...l, sold: l.sold + qty } : l);
    const cut = missed >= BRAND_DEAL_CUT_AFTER;
    let deals: Record<string, typeof deal> = { ...nb.deals };
    let reopenDays = nb.reopenDays;
    if (cut) {
      delete deals[dealerId];
      reopenDays = { ...(reopenDays ?? {}), [dealerId]: s.day + BRAND_DEAL_REOPEN_DAYS };
    } else {
      deals[dealerId] = { ...deal, delivered: deal.delivered + 1, dueDay: s.day + def.periodDays, pending: true, streak: newStreak, overdue: false, committed: false, locked: {}, missed, productId: deal.productId };
    }
    set({
      biz: { ...s.biz, brand: { ...nb, stock, lines, deals, reopenDays } },
      money: s.money + pay,
    });
    s.notify(`🚚 Giao xong "${def.title}": +${pay.toLocaleString('vi-VN')}đ` + (onTime ? ` · uy tín +${BRAND_REP_ONTIME}` : ` · giao muộn, uy tín ${BRAND_REP_LATE}`)
      + (cut ? ` · bị cắt hợp đồng (${BRAND_DEAL_CUT_AFTER} kỳ hỏng)` : ` · chuỗi đúng hẹn ${cut ? 0 : newStreak}`));
    return true;
  },

  // ───── Bỏ mối cho đối thủ (SPEC §4.5d, tuỳ chọn) ─────
  acceptRivalSupply: () => {
    const s = get();
    const b = s.biz.brand;
    const rival = s.biz.rival;
    if (!b) return s.notify(`🏷️ Hãy lập nhãn trước.`);
    const offer = b.rivalOffer;
    if (!rival || rival.strength <= 0) return s.notify(`🚛 Không có đối thủ nào để bỏ mối.`);
    if (!offer) return s.notify(`🚛 Rival chưa ngỏ ý mua hàng nhãn đợt này.`);
    if (s.day - offer.day > BRAND_RIVAL_OFFER_DAYS) {
      set({ biz: { ...s.biz, brand: { ...b, rivalOffer: undefined } } });
      return s.notify(`🚛 Lời chào của rival đã hết hạn — họ thôi không mua đợt này.`);
    }
    const have = b.stock[offer.productId] ?? 0;
    if (have < offer.units) return s.notify(`🚛 Kho nhãn ${pname(offer.productId)} không đủ ${offer.units} đơn vị để bán cho rival.`);
    const val = brandRivalValue(offer);
    const stock = { ...b.stock, [offer.productId]: have - offer.units };
    const lines = b.lines.map((l) => l.productId === offer.productId ? { ...l, sold: l.sold + offer.units } : l);
    const rivalB = { ...rival, strength: rival.strength + BRAND_RIVAL_STRENGTH_GAIN };
    set({
      biz: { ...s.biz, brand: { ...b, stock, lines, rivalOffer: undefined, rivalSold: (b.rivalSold ?? 0) + offer.units }, rival: rivalB },
      money: s.money + val,
    });
    s.notify(`🤝 Bán ${offer.units} đơn vị ${pname(offer.productId)} cho đối thủ: +${val.toLocaleString('vi-VN')}đ · nhưng đối thủ +${BRAND_RIVAL_STRENGTH_GAIN} sức mạnh, hàng mình nằm trên kệ họ (tiền nhanh nhưng nuôi đối thủ).`);
  },

  // ───── Nhượng quyền (SPEC §4.5e) ─────
  openFranchise: (defId) => {
    const s = get();
    const b = s.biz.brand;
    if (!b) return s.notify(`🏷️ Hãy lập nhãn trước.`);
    if (s.level < BRAND_FRANCHISE_UNLOCK) return s.notify('🏮 Nhượng quyền mở từ cấp 150.');
    const def = BRAND_FRANCHISE_SLOTS.find((x) => x.id === defId);
    if (!def) return;
    if (def.unlock > s.level) return s.notify(`🏮 "${def.title}" mở từ cấp ${def.unlock}.`);
    if (b.rep < BRAND_FRANCHISE_REP) return s.notify(`🏮 Mở nhượng quyền cần uy tín nhãn ${BRAND_FRANCHISE_REP}+ (đang ${Math.round(b.rep)}).`);
    if (b.franchises.some((f) => f.id === defId)) return s.notify(`🏮 Điểm này đã mở rồi.`);
    if (b.franchises.length >= BRAND_FRANCHISE_SLOTS.length) return s.notify('🏮 Đã đủ 3 điểm nhượng quyền.');
    if (s.money < BRAND_FRANCHISE_SETUP) return s.notify(`🏮 Phí setup mở điểm cần ${BRAND_FRANCHISE_SETUP.toLocaleString('vi-VN')}đ.`);
    const franchises = [...b.franchises, { id: defId, openedDay: s.day, health: 100, missedWeeks: 0 }];
    set({
      money: s.money - BRAND_FRANCHISE_SETUP,
      biz: { ...s.biz, brand: { ...b, franchises, franchiseDue: { ...b.franchiseDue, [defId]: s.day + 7 } } },
    });
    s.notify(`🏮 Mở "${def.title}" (−${BRAND_FRANCHISE_SETUP.toLocaleString('vi-VN')}đ setup): mỗi tuần cần ${def.weekly} đơn vị hàng nhãn, mỗi đêm trả phí nhượng quyền.`);
  },
  closeFranchise: (defId) => {
    const s = get();
    const b = s.biz.brand;
    const f = b?.franchises?.find((x) => x.id === defId);
    if (!b || !f) return s.notify('🏮 Điểm nhượng quyền này không tồn tại.');
    const franchises = b.franchises.filter((x) => x.id !== defId);
    const franchiseDue = { ...b.franchiseDue };
    delete franchiseDue[defId];
    set({ biz: { ...s.biz, brand: { ...b, franchises, franchiseDue } } });
    s.notify(`🏮 Đóng cửa điểm nhượng quyền (mất ${BRAND_FRANCHISE_SETUP.toLocaleString('vi-VN')}đ phí setup đã bỏ).`);
  },
});

/** Tên sản phẩm ngắn cho thông báo. */
const pname = (id: string) => (productById(id)?.name ?? id).replace(/\s*\([^)]*\)\s*$/, '');
