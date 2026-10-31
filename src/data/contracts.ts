import { productById } from './products';
import type { RepNeed } from './reputation';
import type { ContractState } from '../core/gameTypes';

/**
 * Khách sỉ / đơn buôn số lượng lớn (hợp đồng cung cấp dài hạn, có hợp đồng giá).
 * Khách đặt số lượng lớn theo chu kỳ định kỳ; giá mua lại THẤP HƠN giá gợi ý (pricePerUnit < 1)
 * nhưng bù lại số lượng nhiều và đều đặn.
 */
export interface SupplyContract {
  id: string;
  icon: string;
  title: string;
  /** Người/quán đặt (khớp tên khách quen cho có hồn). */
  from: string;
  description: string;
  unlock: number;
  /** Chủ mối chỉ ký khi tiệm đủ uy tín ở mặt họ quan tâm. */
  rep?: RepNeed;
  /** Chu kỳ giao hàng định kỳ (VD 3 ngày một lần). */
  periodDays: number;
  /** Sản phẩm cần giao mỗi kỳ. */
  items: Record<string, number>;
  /** Hệ số giá mua lại — giá sỉ THẤP HƠN giá gợi ý một chút (VD 0.9 = 90% giá gợi ý). */
  pricePerUnit: number;
  xp: number;
}

export const SUPPLY_CONTRACTS: SupplyContract[] = [
  {
    id: 'quan_nhau', icon: '🍻', title: 'Quán nhậu cuối hẻm', from: 'Anh Minh', unlock: 14, rep: { factor: 'stock', min: 3.5 }, periodDays: 3,
    description: 'Tối nào cũng đông khách nhậu, đặt bia với nước ngọt và đồ nhấm cho cả tuần.',
    items: { bia: 12, ngot: 10, nuoc: 8, snack: 10 }, pricePerUnit: 0.9, xp: 120,
  },
  {
    id: 'xuong_go', icon: '🪵', title: 'Xưởng gỗ bên sông', from: 'Chú Ba', unlock: 22, rep: { factor: 'price', min: 3.5 }, periodDays: 5,
    description: 'Thợ xưởng gỗ làm suốt ca, cần gạo, dầu ăn và mì cho bếp ăn tập thể.',
    items: { gao: 3, dauan: 4, mi: 20, nuocmam: 3 }, pricePerUnit: 0.88, xp: 150,
  },
  {
    id: 'bep_an_cong_nhan', icon: '🍲', title: 'Bếp ăn công nhân', from: 'Chị Lan', unlock: 30, rep: { factor: 'quality', min: 3.8 }, periodDays: 4,
    description: 'Nhà máy may đầu khu phục vụ hàng trăm công nhân, đặt tươi sống hằng kỳ.',
    items: { gao: 5, rau: 20, thit: 8, ca: 6 }, pricePerUnit: 0.9, xp: 200,
  },
  {
    id: 'quan_ca_phe', icon: '☕', title: 'Quán cà phê đầu ngõ', from: 'Bà Ba', unlock: 38, rep: { factor: 'speed', min: 3.8 }, periodDays: 3,
    description: 'Quán cà phê cóc đông khách, đặt sữa, cà phê và đồ bán kèm.',
    items: { caphe: 8, sua: 15, sua_tuoi: 6, xucxich: 10 }, pricePerUnit: 0.9, xp: 180,
  },
  {
    id: 'cho_gia_vi', icon: '🌶️', title: 'Chợ gia vị tỉnh', from: 'Bác Tám', unlock: 46, rep: { factor: 'price', min: 4 }, periodDays: 7,
    description: 'Tiểu thương bán buôn gom gia vị, nước mắm về bỏ mối cho các quán ăn nhỏ.',
    items: { giavi: 15, nuocmam: 8, dauan: 6, pho: 20 }, pricePerUnit: 0.87, xp: 240,
  },
  {
    id: 'cua_hang_banh', icon: '🥐', title: 'Cửa hàng bánh bông lan', from: 'Bà Năm', unlock: 55, rep: { min: 4 }, periodDays: 3,
    description: 'Lò bánh mới mở cần trứng, dầu ăn, sữa và bánh mì để làm bánh giao cho các quán.',
    items: { trung: 15, dauan: 6, sua_tuoi: 10, banhmi: 12, tra: 8 }, pricePerUnit: 0.86, xp: 300,
  },
];

export const supplyContractById = (id: string) => SUPPLY_CONTRACTS.find((c) => c.id === id);

/** Tổng tiền một kỳ = tổng (giá bán gợi ý của món * số lượng) * pricePerUnit. */
export function contractValue(def: SupplyContract) {
  return Object.entries(def.items).reduce((n, [id, q]) => n + productById(id).sell * q, 0) * def.pricePerUnit;
}

/** Hợp đồng đã mở khóa theo cấp tiệm. */
export function activeContractsFor(level: number) {
  return SUPPLY_CONTRACTS.filter((c) => c.unlock <= level);
}

/** Thiếu những món nào trong kho để giao kỳ này. */
export function missingForContract(def: SupplyContract, storage: Record<string, number>) {
  return Object.entries(def.items).filter(([id, q]) => (storage[id] ?? 0) < q).map(([id, q]) => ({ id, need: q - (storage[id] ?? 0) }));
}

// ───── Chuỗi giao đúng hẹn ─────
// Giao mỗi kỳ đúng hạn (không trễ) sẽ cộng chuỗi; cứ đủ N kỳ đúng hẹn liên tiếp lại có thưởng mốc
// hậu hĩnh — cho người chơi lý do "quay lại đúng ngày để giữ chuỗi" (câu giữ chân, không đổi kinh tế).

/** Cứ N kỳ đúng hẹn liên tiếp thì lần giao đó được thưởng mốc. */
export const CONTRACT_STREAK_EVERY = 5;
/** Thưởng mốc bằng bao nhiêu % giá kỳ giao (tròn nghìn). */
export const CONTRACT_STREAK_BONUS = 0.25;

/** Kỳ giao này có đủ N chuỗi đúng hẹn để được thưởng mốc không. */
export const contractMilestoneDue = (streak: number) => streak > 0 && streak % CONTRACT_STREAK_EVERY === 0;

// ───── Cam kết kỳ ─────
// Quyết định mới mỗi kỳ: người chủ trữ SẴN đúng số hàng kỳ này (chuyển khỏi kho bán chung sang ngăn
// riêng) để nhận THƯỞNG TIN CẬY + là cam kết thu, đổi lại phải cọc một khoản và mất cơ hội bán lẻ
// chừng đó hàng. Hoặc giữ linh hoạt: giao từ kho chung lúc tới kỳ (chịu rủi ro giá thị trường/thất toán).

/** Thưởng tin cậy khi cam kết = % giá kỳ giao. */
export const CONTRACT_COMMIT_BONUS = 0.06;
/** Tiền cọc khi cam kết = % giá kỳ giao (hoàn lại khi hủy / trừ khi giao đủ). */
export const CONTRACT_COMMIT_DEPOSIT = 0.1;

/** Thưởng tin cậy khi cam kết (tròn nghìn). */
export const commitBonusValue = (def: SupplyContract) => Math.round((contractValue(def) * CONTRACT_COMMIT_BONUS) / 1000) * 1000;

/** Tiền cọc phải đặt khi cam kết (tròn nghìn). */
export const commitDeposit = (def: SupplyContract) => Math.round((contractValue(def) * CONTRACT_COMMIT_DEPOSIT) / 1000) * 1000;

/** Còn thiếu mấy món trong ngăn đã cam kết để đủ kỳ (khi cam kết trước khi trữ đủ hàng). */
export function reservedMissing(def: SupplyContract, locked: Record<string, number> | undefined): { id: string; need: number }[] {
  const bucket = locked ?? {};
  return Object.entries(def.items).filter(([id, q]) => (bucket[id] ?? 0) < q).map(([id, q]) => ({ id, need: q - (bucket[id] ?? 0) }));
}

// ───── Sổ chuỗi hợp đồng (GĐ125) ─────
// Vòng quyết định "quay lại đúng ngày giữ chuỗi" hiện bị đứt: người chơi không thấy còn bao nhiêu kỳ
// nữa tới mốc thưởng +25%, và không được cảnh báo sớm khi chuỗi sắp đứt. Helper NÀY thuần đọc state
// có sẵn (streak/delivered/dueDay/overdue) — không thêm persist, không đổi công thức kinh tế.

/** Báo cáo tiến tới mốc chuỗi + rủi ro đứt chuỗi cho một hợp đồng (thuần đọc, để UI/test). */
export interface ContractStreakProgress {
  /** Số kỳ giao đúng hẹn liên tiếp hiện tại. */
  streak: number;
  /** Vị trí trong chu kỳ mốc (streak % EVERY: 0..4) — 0 nghĩa là vừa đủ mốc hoặc chưa giao. */
  cycle: number;
  /** Đã đủ một mốc thưởng ở kỳ này chưa (streak % EVERY === 0 với streak > 0). */
  atMilestone: boolean;
  /** Còn bao nhiêu kỳ giao nữa tới mốc thưởng. */
  toMilestone: number;
  /** Số ngày tới hạn giao kỳ này (đúng hôm nay = 0, đã qua = âm). */
  daysLeft: number;
  /** Đã quá hạn chưa (overdue) — giao lần này sẽ không tính đúng hẹn. */
  overdue: boolean;
  /** Phân loại rủi ro đứt chuỗi để UI phân cấp màu. */
  risk: 'overdue' | 'due_soon' | 'ok';
  /** Tiền thưởng mốc nếu đủ chuỗi (tròn nghìn — hiển thị, không áp). */
  milestoneBonus: number;
}

/** Còn bao nhiêu ngày trước hạn thì coi là "sắp tới kỳ" cần cảnh báo đếm ngược. */
export const CONTRACT_RISK_DAYS = 3;

// ───── ROI nhận hợp đồng (GĐ151) ─────
// Quyết định "CÓ NÊN ký hợp đồng này không" hiện là hộp đen: ContractsPanel chỉ show tổng giá kỳ
// (contractValue — doanh thu thô) mà không cho thấy người chơi đang nhượng bao nhiêu margin so với
// bán lẻ cùng lô, và lời THẬT sau tiền vốn là bao nhiêu mỗi kỳ/ngày. Helper THUẦN đọc định nghĩa hợp
// đồng (không đụng state/save/kinh tế) — cùng mô-típ GĐ143 (mối rẻ THẬT) / GĐ131 (hết hàng bỏ lỡ):
// đưa con số ra để quyết định ký/thôi có dữ liệu. Giá vốn lấy theo giá mua MỐI gốc (productById.buy)
// — ước lượng trung thực, dùng "~".

export interface ContractAcceptRoi {
  /** Giá trị bán lẻ hết lô hàng kỳ này (Σ sell×q). */
  retailValue: number;
  /** Tiền vốn nhập lô hàng kỳ này theo giá mua gốc (Σ buy×q). */
  costOfGoods: number;
  /** Lãi nếu bán lẻ hết lô (retailValue − cost). */
  retailNet: number;
  /** Lãi THẬT mỗi kỳ nếu giao sỉ (contractValue − cost). */
  contractNet: number;
  /** Margin nhượng lại so với bán lẻ cùng lô (retailNet − contractNet ≥ 0 — chính là chiết khấu sỉ). */
  giveUp: number;
  /** Tỉ lệ nhượng giá so với bán lẻ (1 − pricePerUnit). */
  giveUpPct: number;
  /** Lãi thật quy đổi mỗi ngày (contractNet / periodDays, tròn nghìn để hiển thị). */
  netPerDay: number;
  /** Phân loại để UI tô chip: đáng ký / cân nhắc / suy nghĩ lại. */
  verdict: 'worth' | 'tight' | 'skip';
}

export function contractAcceptRoi(def: SupplyContract): ContractAcceptRoi {
  let retailValue = 0;
  let cost = 0;
  for (const [id, q] of Object.entries(def.items)) {
    const p = productById(id);
    retailValue += p.sell * q;
    cost += p.buy * q;
  }
  const contractValue = def.pricePerUnit * retailValue;
  const retailNet = retailValue - cost;
  const contractNet = contractValue - cost;
  const giveUp = retailNet - contractNet;
  const giveUpPct = 1 - def.pricePerUnit;
  const netPerDay = Math.round(contractNet / def.periodDays / 1000) * 1000;
  const verdict = giveUpPct <= 0.1 ? 'worth' : giveUpPct <= 0.14 ? 'tight' : 'skip';
  return { retailValue, costOfGoods: cost, retailNet, contractNet, giveUp, giveUpPct, netPerDay, verdict };
}

export function contractStreakProgress(cs: ContractState, day: number): ContractStreakProgress {
  const streak = cs.streak ?? 0;
  const cycle = ((streak % CONTRACT_STREAK_EVERY) + CONTRACT_STREAK_EVERY) % CONTRACT_STREAK_EVERY;
  const atMilestone = streak > 0 && cycle === 0;
  const toMilestone = cycle === 0 ? CONTRACT_STREAK_EVERY : CONTRACT_STREAK_EVERY - cycle;
  const daysLeft = cs.dueDay - day;
  const overdue = cs.overdue === true;
  const def = supplyContractById(cs.defId);
  const milestoneBonus = def ? Math.round((contractValue(def) * CONTRACT_STREAK_BONUS) / 1000) * 1000 : 0;
  let risk: ContractStreakProgress['risk'];
  if (overdue) risk = 'overdue';
  else if (daysLeft <= CONTRACT_RISK_DAYS) risk = 'due_soon';
  else risk = 'ok';
  return { streak, cycle, atMilestone, toMilestone, daysLeft, overdue, risk, milestoneBonus };
}


