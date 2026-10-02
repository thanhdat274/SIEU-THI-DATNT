import assert from 'node:assert/strict';
import { validateSupplierCart, type SupplierCartContext } from './supplier-cart';

const ctx = (over: Partial<SupplierCartContext> = {}): SupplierCartContext => ({
  level: 1, money: 1_000_000, day: 1, supplierState: undefined,
  coldCapacity: 120, reservedColdCount: 0, ambientUnitsOf: () => 0, ambientFreeCells: 100, ...over,
});

export function runSupplierCartTests(): void {
  const ok = validateSupplierCart('dai_ly_dau_hem', [{ productId: 'mi_hao_hao', quantity: 10 }], ctx());
  assert.equal(ok.valid, true, ok.reasons.join('; '));
  assert.equal(ok.itemCount, 10);
  assert.equal(ok.lines?.length, 1);
  assert.equal(ok.totalCost, ok.subtotal - ok.discountAmount);

  const unknown = validateSupplierCart('khong_co', [{ productId: 'mi_hao_hao', quantity: 1 }], ctx());
  assert.equal(unknown.valid, false);
  assert.ok(unknown.reasons.some(r => r.includes('không tồn tại')));

  assert.ok(validateSupplierCart('dai_ly_dau_hem', [], ctx()).reasons.includes('Giỏ hàng trống'));
  for (const quantity of [0, -3, 1.5, Number.NaN]) {
    const bad = validateSupplierCart('dai_ly_dau_hem', [{ productId: 'mi_hao_hao', quantity }], ctx());
    assert.equal(bad.valid, false, `Số lượng ${quantity} phải bị từ chối`);
  }
  assert.ok(validateSupplierCart('dai_ly_dau_hem', [{ productId: 'sp_khong_co', quantity: 1 }], ctx()).reasons.some(r => r.includes('không tồn tại')));

  assert.ok(validateSupplierCart('cho_dau_moi', [{ productId: 'mi_hao_hao', quantity: 50 }], ctx({ level: 1 })).reasons.some(r => r.includes('mở khóa ở cấp')), 'Chặn nhà cung cấp chưa mở khóa');
  assert.ok(validateSupplierCart('cho_dau_moi', [{ productId: 'mi_hao_hao', quantity: 1 }], ctx({ level: 5 })).reasons.some(r => r.includes('tối thiểu')), 'Đơn dưới mức tối thiểu');

  const broke = validateSupplierCart('dai_ly_dau_hem', [{ productId: 'mi_hao_hao', quantity: 10 }], ctx({ money: 0 }));
  assert.ok(broke.reasons.some(r => r.includes('Không đủ tiền')));

  const full = validateSupplierCart('dai_ly_dau_hem', [{ productId: 'mi_hao_hao', quantity: 10 }], ctx({ ambientFreeCells: 0 }));
  assert.ok(full.reasons.some(r => r.includes('Kho thường không đủ chỗ')));

  const stock = { day: 1, indexByCategory: {}, priceIndex: {}, stockCap: {}, stockLeft: { mi_hao_hao: 5 }, unavailable: [], reasons: {} } as never;
  const short = validateSupplierCart('dai_ly_dau_hem', [{ productId: 'mi_hao_hao', quantity: 10 }], ctx({ supplierState: stock }));
  assert.ok(short.reasons.some(r => r.includes('chỉ còn 5')), 'Vượt tồn của nhà cung cấp');

  // Cùng sản phẩm hai dòng: gộp số lượng khi kiểm tồn/kho
  const split = validateSupplierCart('dai_ly_dau_hem', [{ productId: 'mi_hao_hao', quantity: 3 }, { productId: 'mi_hao_hao', quantity: 4 }], ctx({ supplierState: stock }));
  assert.ok(split.reasons.some(r => r.includes('cần 7')), 'Gộp dòng trùng sản phẩm');
  console.log('  ✓ Passed: Giỏ hàng nhà cung cấp — hợp lệ, cấp, tối thiểu, tiền, kho, tồn, dòng trùng');
}
