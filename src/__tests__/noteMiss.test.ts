import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { missKey } from '../data/advice';
import { productById } from '../data/products';

/**
 * Bộ test GĐ1030 — `core/slices/sales.noteMiss` (dòng 111–116 TRƯỚC ĐÂY 1 lệnh 0%):
 * ghi nhận khách bỏ về/lỡ bán + chỉ BÁO một lần mỗi ngày (lần đầu khách tìm món kệ hết).
 *
 * Hợp đồng:
 * - Ghi lost vào stats.missed theo reason + missLog theo missKey(reason, productId).
 * - reason==='stock' && có productId && CHƯA báo hỏng hôm nay → báo lời; còn hàng trong kho
 *   thì nhắc "bày lên kệ", hết cả kho thì nhắc "nhớ nhập thêm".
 * - Đã báo hỏng 1 lần hôm nay rồi → lần sau KHÔNG báo lại nữa, NHƯNG vẫn ghi lost (đếm tăng).
 */

const prep = (storage: Record<string, number> = {}, toasts: string[] = []) =>
  useGame.setState({
    ...newGameData(),
    storage,
    notify: (m) => void toasts.push(m),
  });

beforeEach(() => useGame.setState({ ...newGameData() }));

describe('noteMiss — báo kệ/kho hết hàng', () => {
  it('kệ hết nhưng trong kho còn → nhắc "bày lên kệ ngay!", ghi lost', () => {
    const toasts: string[] = [];
    prep({ mi: 5 }, toasts);
    useGame.getState().noteMiss('stock', 'mi');
    const a = useGame.getState();
    expect(a.stats.missed?.stock).toBe(1);
    expect(a.stats.missLog?.[missKey('stock', 'mi')]).toBe(1);
    expect(toasts[0]).toContain('Kệ hết Mì gói');
    expect(toasts[0]).toContain('trong kho còn');
  });

  it('hết cả kho → nhắc "nhớ nhập thêm", vẫn ghi lost', () => {
    const toasts: string[] = [];
    prep({}, toasts);
    useGame.getState().noteMiss('stock', 'mi');
    const a = useGame.getState();
    expect(a.stats.missed?.stock).toBe(1);
    expect(toasts[0]).toContain('Khách tìm Mì gói mà hết hàng');
    expect(toasts[0]).toContain('nhớ nhập thêm');
  });

  it('chỉ BÁO một lần mỗi ngày — lần 2 vẫn ghi lost nhưng không báo nữa', () => {
    const toasts: string[] = [];
    prep({ mi: 5 }, toasts);
    useGame.getState().noteMiss('stock', 'mi');
    useGame.getState().noteMiss('stock', 'mi');
    const a = useGame.getState();
    expect(a.stats.missed?.stock).toBe(2); // vẫn đếm mỗi lượt
    expect(a.stats.missLog?.[missKey('stock', 'mi')]).toBe(2);
    expect(toasts.length).toBe(1); // chỉ 1 lời báo
  });

  it('reason khác stock (vd price) → ghi lost nhưng KHÔNG báo kệ', () => {
    const toasts: string[] = [];
    prep({ mi: 5 }, toasts);
    useGame.getState().noteMiss('price', 'mi');
    const a = useGame.getState();
    expect(a.stats.missed?.price).toBe(1);
    expect(a.stats.missLog?.[missKey('price', 'mi')]).toBe(1);
    expect(toasts.length).toBe(0);
  });

  it('không có productId → ghi lost rỗng, không báo', () => {
    const toasts: string[] = [];
    prep({}, toasts);
    useGame.getState().noteMiss('stock');
    const a = useGame.getState();
    expect(a.stats.missed?.stock).toBe(1);
    expect(a.stats.missLog?.['stock:']).toBe(1);
    expect(toasts.length).toBe(0);
  });
});
