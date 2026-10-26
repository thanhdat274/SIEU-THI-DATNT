/**
 * Dịch vụ ở quầy: không cần kệ, mua thiết bị một lần là mở. Khách dịch vụ đi thẳng tới quầy,
 * lãi mỗi lượt ít nhưng hay tiện tay mua kèm vài món.
 * Vé số: khách mua thì lời nhỏ, nhưng thỉnh thoảng có người trúng → tiệm phải trả thưởng (fee âm).
 */
export type ServiceId = 'topup' | 'bills' | 'lottery' | 'parking' | 'parcel';

export interface ServiceDef {
  id: ServiceId;
  icon: string;
  name: string;
  desc: string;
  /** Giá thiết bị / phí đăng ký, trả một lần. */
  price: number;
  unlock: number;
  /** Phần người đi đường ghé tiệm chỉ để dùng dịch vụ này. */
  draw: number;
  /** Tiền lời một lượt. Vé số trả fee ÂM khi khách trúng (tiệm bỏ tiền trả thưởng). */
  fee: () => { amount: number; fee: number };
  /** Chuỗi gợi ý khi khách tới quầy. */
  line: (amount: number) => string;
}

/** Khách dịch vụ có chừng này phần mua kèm (1–2 món). */
export const SERVICE_BUY_ALONG = 0.45;
/** Thu hộ dồn vào mấy ngày đầu tháng (tháng 30 ngày). */
export const BILL_RUSH_DAYS = 5;
export const MONTH_DAYS = 30;

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

export const SERVICES: ServiceDef[] = [
  {
    id: 'topup', icon: '📱', name: 'Nạp tiền điện thoại',
    desc: 'Máy POS nhỏ nạp mọi nhà mạng. Học sinh, xe ôm ghé nạp suốt ngày; lời 3% mỗi lần nạp.',
    price: 300000, unlock: 3, draw: 0.12,
    fee: () => {
      const amount = pick([10000, 20000, 20000, 50000, 50000, 100000, 200000]);
      return { amount, fee: Math.round((amount * 0.03) / 100) * 100 };
    },
    line: (a) => `Nạp ${a / 1000}k`,
  },
  {
    id: 'bills', icon: '💡', name: 'Thu hộ tiền điện nước',
    desc: 'Làm đại lý thu hộ: phí 3.000đ mỗi hóa đơn. Đầu tháng cả xóm kéo tới đóng tiền.',
    price: 500000, unlock: 6, draw: 0.03,
    fee: () => ({ amount: pick([180000, 250000, 320000, 450000, 600000]), fee: 3000 }),
    line: () => 'Đóng tiền điện nước',
  },
  {
    id: 'lottery', icon: '🎟️', name: 'Bán vé số',
    desc: 'Lấy cạo vé số về bán, lời mỗi tờ tầm 10%: khách mua rất đều. Thỉnh thoảng có người trúng — tiệm trả thưởng.',
    price: 200000, unlock: 12, draw: 0.06,
    fee: () => {
      const amount = 20000; // khách điển hình mua ~20k vé số
      // 0.5% khách trúng giải, tiệm phải trả 400k — nhịp lời đều nhưng có ngày "xịt"
      return Math.random() < 0.005
        ? { amount, fee: -400000 }
        : { amount, fee: 3000 };
    },
    line: () => 'Mua vé số',
  },
  {
    id: 'parking', icon: '🛵', name: 'Gửi xe ngoài cửa',
    desc: 'Vài chỗ dựng xe trước cửa, khách gửi rồi vào mua đồ. Mỗi lượt gửi bỏ túi 3k — ai ghé cũng gửi nên nhiều.',
    price: 150000, unlock: 12, draw: 0.10,
    fee: () => ({ amount: 3000, fee: 3000 }),
    line: () => 'Gửi xe',
  },
  {
    id: 'parcel', icon: '📦', name: 'Nhận hộ bưu kiện',
    desc: 'Làm điểm nhận bưu kiện cho cả hẻm: bưu tá gửi tới, bà con qua lấy. Mỗi kiện cước giữ vài nghìn.',
    price: 200000, unlock: 16, draw: 0.05,
    fee: () => ({ amount: pick([50000, 100000, 150000]), fee: 4000 }),
    line: () => 'Lấy bưu kiện',
  },
];

export const serviceById = (id: string) => SERVICES.find((s) => s.id === id);

/** Ngày thứ mấy trong tháng (1–30). */
export const dayOfMonth = (day: number) => ((day - 1) % MONTH_DAYS) + 1;

/** Phần người đi đường ghé để dùng dịch vụ hôm nay; thu hộ đông gấp 4 mấy ngày đầu tháng. */
export function serviceDraw(def: ServiceDef, day: number) {
  if (def.id === 'bills' && dayOfMonth(day) <= BILL_RUSH_DAYS) return def.draw * 4;
  return def.draw;
}

/** Chọn một dịch vụ cho người đi đường này (hoặc không). */
export function rollService(owned: string[], day: number, roll: number): ServiceDef | undefined {
  let acc = 0;
  for (const id of owned) {
    const def = serviceById(id);
    if (!def) continue;
    acc += serviceDraw(def, day);
    if (roll < acc) return def;
  }
  return undefined;
}
