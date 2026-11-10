import { BRAND_LINE_SLOTS, BRAND_UNLOCK, BRAND_WORKSHOP_COST, BRAND_WORKSHOP_MAX_STAFF, BRAND_WORKSHOP_UNLOCK, brandLineEligible, brandLineSlots, type BrandState } from '../../data/brand';
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
});

/** Tên sản phẩm ngắn cho thông báo. */
const pname = (id: string) => (productById(id)?.name ?? id).replace(/\s*\([^)]*\)\s*$/, '');
