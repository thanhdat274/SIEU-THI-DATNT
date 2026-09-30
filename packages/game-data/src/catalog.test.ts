import { ALL_PRODUCTS, SEASONAL_PRODUCTS, STARTER_PRODUCTS, ADDITIONAL_PRODUCTS, CURATED_PRODUCTS, PRODUCT_MAP, PRODUCT_CATEGORY_LABELS } from './products';
import { CATALOG_SOURCE_MANIFEST } from './catalog-manifest';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ TEST FAILED: ${message}`);
  }
  console.log(`  ✓ Passed: ${message}`);
}

export function runCatalogTests(): void {
  console.log('\n--- Test Group 3: B — Catalog chọn lọc (56 sản phẩm gốc + sản phẩm theo mùa) ---');

  // 1. Kiểm tra tổng số lượng 56 sản phẩm và không mất 36 món legacy
  assert(ALL_PRODUCTS.length === 56 + SEASONAL_PRODUCTS.length, `Catalog tổng = 56 món gốc + ${SEASONAL_PRODUCTS.length} món theo mùa (hiện có ${ALL_PRODUCTS.length})`);
  assert(SEASONAL_PRODUCTS.length === 7, 'Có đúng 7 sản phẩm theo mùa/thời tiết');
  assert(STARTER_PRODUCTS.length === 5, 'Có đúng 5 sản phẩm khởi đầu');
  assert(ADDITIONAL_PRODUCTS.length === 31, 'Có đúng 31 sản phẩm mở rộng ban đầu');
  assert(CURATED_PRODUCTS.length === 20, 'Có đúng 20 sản phẩm chọn lọc từ game tham khảo');

  // 2. Kiểm tra tính duy nhất của ID sản phẩm
  const idSet = new Set(ALL_PRODUCTS.map((p) => p.id));
  assert(idSet.size === ALL_PRODUCTS.length, 'Toàn bộ mã ID sản phẩm không trùng lặp');

  // 3. Kiểm tra tính toàn vẹn của 36 sản phẩm legacy
  const legacyIds = [...STARTER_PRODUCTS, ...ADDITIONAL_PRODUCTS].map((p) => p.id);
  assert(legacyIds.length === 36, 'Đủ 36 món legacy');
  for (const legId of legacyIds) {
    assert(!!PRODUCT_MAP[legId], `Món legacy '${legId}' phải tồn tại nguyên vẹn trong PRODUCT_MAP`);
  }

  // 4. Kiểm tra metadata của toàn bộ 20 sản phẩm curated mới
  for (const prod of CURATED_PRODUCTS) {
    assert(prod.id.length > 0, `Sản phẩm ${prod.id} có ID hợp lệ`);
    assert(prod.name.length > 0, `Sản phẩm ${prod.id} có tên tiếng Việt`);
    assert(prod.purchasePrice > 0, `Sản phẩm ${prod.id} có giá nhập > 0`);
    assert(
      prod.baseSellingPrice > prod.purchasePrice,
      `Sản phẩm ${prod.id} có giá bán (${prod.baseSellingPrice}đ) sinh lời so với giá nhập (${prod.purchasePrice}đ)`
    );
    assert(prod.shelfCapacity >= 10 && prod.shelfCapacity <= 30, `Sản phẩm ${prod.id} có sức chứa kệ hợp lý (${prod.shelfCapacity})`);
    assert(prod.unlockLevel >= 1 && prod.unlockLevel <= 5, `Sản phẩm ${prod.id} có cấp mở khóa hợp lệ (${prod.unlockLevel})`);
    assert(!!prod.expirationRules && prod.expirationRules.daysToSpoil >= 20, `Sản phẩm ${prod.id} có hạn dùng hợp lệ (${prod.expirationRules?.daysToSpoil} ngày)`);
    assert(prod.storageType === 'ambient', `Sản phẩm curated ${prod.id} bảo quản khô (ambient) tương thích`);
    assert(!!PRODUCT_CATEGORY_LABELS[prod.category], `Sản phẩm ${prod.id} thuộc nhóm danh mục hợp lệ: ${prod.category}`);
  }

  // 5. Kiểm tra manifest đối chiếu 335 dòng từ catalog nguồn
  assert(CATALOG_SOURCE_MANIFEST.length === 335, `Manifest nguồn đối chiếu đủ 335 dòng (hiện có ${CATALOG_SOURCE_MANIFEST.length})`);
  
  const curatedInManifest = CATALOG_SOURCE_MANIFEST.filter((m) => m.disposition === 'curated_new');
  assert(curatedInManifest.length === 20, `Manifest đánh dấu đúng 20 món curated_new (hiện có ${curatedInManifest.length})`);

  const legacyInManifest = CATALOG_SOURCE_MANIFEST.filter((m) => m.disposition === 'legacy_match');
  assert(legacyInManifest.length >= 25, `Manifest đối chiếu các món trùng nghĩa legacy_match`);

  const unsupportedCount = CATALOG_SOURCE_MANIFEST.filter((m) => m.disposition === 'unsupported').length;
  assert(unsupportedCount > 0, 'Các món đòi hỏi tủ đông/bếp/sự kiện được phân loại unsupported đúng đắn');

  const deferredCount = CATALOG_SOURCE_MANIFEST.filter((m) => m.disposition === 'deferred').length;
  assert(deferredCount > 0, 'Các món tiềm năng được ghi nhận deferred cho các giai đoạn tương lai');
}
