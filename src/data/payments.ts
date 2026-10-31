/**
 * Hình thức thanh toán ở quầy: khách tự chọn tiền mặt / chuyển khoản / ví điện tử / thẻ;
 * đơn càng lớn càng nghiêng về thanh toán không tiền mặt. Tiền mặt về két ngay, hình thức
 * còn lại về "tài khoản" nhưng tiệm mất một chút phí — xem sổ chi tiết ở bảng tổng kết ngày.
 * Ghi sổ (khách quen quên ví) là một luồng riêng của credit.ts, vẫn thống kê chung ở đây.
 */

import { simRng } from '../core/rand';

export type PaymentMethod = 'cash' | 'bank' | 'wallet' | 'card' | 'credit';
export interface PaymentDef {
  id: PaymentMethod;
  icon: string;
  name: string;
  desc: string;
  /** Cấp tiệm để hình thức này xuất hiện. */
  unlock: number;
  /** Phí giao dịch tính trên tiền khách trả (0.01 = 1%). */
  fee: number;
  /** Trọng số khi khách tự chọn (0 = khách không tự chọn, vd ghi sổ). */
  weight: number;
}

export const PAYMENTS: PaymentDef[] = [
  { id: 'cash', icon: '💵', name: 'Tiền mặt', desc: 'Trả thẳng vào két, không phí.', unlock: 1, fee: 0, weight: 1 },
  { id: 'bank', icon: '🏦', name: 'Chuyển khoản', desc: 'Quét mã QR của tiệm, tiền về tài khoản ngay, không phí.', unlock: 1, fee: 0, weight: 0.35 },
  { id: 'wallet', icon: '📱', name: 'Ví điện tử', desc: 'MoMo, ZaloPay…: khách trẻ hay dùng, tiệm mất 1% phí.', unlock: 8, fee: 0.01, weight: 0.3 },
  { id: 'card', icon: '💳', name: 'Thẻ ngân hàng', desc: 'Quẹt máy POS: đơn lớn hay dùng, tiệm mất 1,5% phí.', unlock: 15, fee: 0.015, weight: 0.2 },
  { id: 'credit', icon: '📒', name: 'Ghi sổ', desc: 'Khách quen quên ví: tiền tính vào sổ nợ, lần ghé sau trả.', unlock: 1, fee: 0, weight: 0 },
];

export const paymentById = (id: PaymentMethod): PaymentDef => PAYMENTS.find((p) => p.id === id) ?? PAYMENTS[0];

/** Khách chọn hình thức thanh toán: đơn càng lớn càng ngại đưa tiền mặt. */
export function pickPayment(total: number, level: number, rng: () => number = simRng()): PaymentMethod {
  // Đơn lớn: tiền mặt giảm thế, chuyển khoản/thẻ/ví tăng thế
  const bigBill = total >= 150000 ? 2.2 : total >= 80000 ? 1.6 : total >= 30000 ? 1.2 : 1;
  const pool = PAYMENTS.filter((p) => p.weight > 0 && level >= p.unlock);
  const weights = pool.map((p) => (p.id === 'cash' ? p.weight / bigBill : p.weight * bigBill));
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i].id;
  }
  return 'cash';
}
