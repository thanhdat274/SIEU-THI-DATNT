import { ALL_PRODUCTS, SEASONAL_PRODUCTS, STARTER_PRODUCTS, ADDITIONAL_PRODUCTS, CURATED_PRODUCTS, PRODUCT_MAP, PRODUCT_CATEGORY_LABELS } from './products';
import { EXPANSION_PRODUCTS, EXTRA_EXPANSION_PRODUCTS } from './products-expansion';
import { CATALOG_SOURCE_MANIFEST, EXPANSION_MANIFEST } from './catalog-manifest';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ TEST FAILED: ${message}`);
  }
  console.log(`  ✓ Passed: ${message}`);
}

export function runCatalogTests(): void {
  console.log('\n--- Test Group 3: B — Catalog chọn lọc toàn diện (291 sản phẩm gốc + 11 sản phẩm theo mùa = 302 món) ---');

  // 1. Kiểm tra tổng số lượng 291 sản phẩm gốc (290 + sữa tươi thanh trùng 04/10/2026) và không mất 36 món legacy
  assert(ALL_PRODUCTS.length === 291 + SEASONAL_PRODUCTS.length + EXPANSION_PRODUCTS.length + EXTRA_EXPANSION_PRODUCTS.length, `Catalog tổng gồm hàng gốc, theo mùa và ${EXPANSION_PRODUCTS.length + EXTRA_EXPANSION_PRODUCTS.length} món mở rộng (hiện có ${ALL_PRODUCTS.length})`);
  assert(EXPANSION_PRODUCTS.length === 182, `Có đúng 182 sản phẩm mở rộng ban đầu (hiện có ${EXPANSION_PRODUCTS.length})`);
  assert(EXTRA_EXPANSION_PRODUCTS.length === 217, `Có đúng 217 SKU mới (200 + 17 hàng lạnh; hiện có ${EXTRA_EXPANSION_PRODUCTS.length})`);
  assert(SEASONAL_PRODUCTS.length === 11, `Có đúng 11 sản phẩm theo mùa/lễ hội (hiện có ${SEASONAL_PRODUCTS.length})`);
  assert(STARTER_PRODUCTS.length === 5, 'Có đúng 5 sản phẩm khởi đầu');
  assert(ADDITIONAL_PRODUCTS.length === 31, 'Có đúng 31 sản phẩm mở rộng ban đầu');
  assert(CURATED_PRODUCTS.length === 255, `Có đúng 255 sản phẩm chọn lọc từ game tham khảo (hiện có ${CURATED_PRODUCTS.length})`);

  // 2. Kiểm tra tính duy nhất của ID sản phẩm
  const idSet = new Set(ALL_PRODUCTS.map((p) => p.id));
  assert(idSet.size === ALL_PRODUCTS.length, 'Toàn bộ mã ID sản phẩm không trùng lặp');
  assert(EXTRA_EXPANSION_PRODUCTS.every((p) => !p.caseSize), 'SKU mới nhập lẻ đến khi xác minh đúng thương hiệu, dung lượng/khối lượng và đơn vị đóng gói');

  // 3. Kiểm tra tính toàn vẹn của 36 sản phẩm legacy
  const legacyIds = [...STARTER_PRODUCTS, ...ADDITIONAL_PRODUCTS].map((p) => p.id);
  assert(legacyIds.length === 36, 'Đủ 36 món legacy');
  for (const legId of legacyIds) {
    assert(!!PRODUCT_MAP[legId], `Món legacy '${legId}' phải tồn tại nguyên vẹn trong PRODUCT_MAP`);
  }

  // 4. Kiểm tra metadata của toàn bộ 256 sản phẩm curated mới
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
    assert(!!prod.expirationRules && prod.expirationRules.daysToSpoil >= 3, `Sản phẩm ${prod.id} có hạn dùng hợp lệ (${prod.expirationRules?.daysToSpoil} ngày)`);
    assert(prod.storageType === 'ambient' || prod.storageType === 'cold', `Sản phẩm curated ${prod.id} bảo quản phù hợp (${prod.storageType})`);
    assert(!!PRODUCT_CATEGORY_LABELS[prod.category], `Sản phẩm ${prod.id} thuộc nhóm danh mục hợp lệ: ${prod.category}`);
  }

  // 5. Kiểm tra manifest đối chiếu 335 dòng từ catalog nguồn
  assert(CATALOG_SOURCE_MANIFEST.length === 335, `Manifest nguồn đối chiếu đủ 335 dòng (hiện có ${CATALOG_SOURCE_MANIFEST.length})`);
  
  const curatedInManifest = CATALOG_SOURCE_MANIFEST.filter((m) => m.disposition === 'curated_new');
  assert(curatedInManifest.length === 254, `Manifest đánh dấu đúng 254 món curated_new (hiện có ${curatedInManifest.length})`);

  const legacyInManifest = CATALOG_SOURCE_MANIFEST.filter((m) => m.disposition === 'legacy_match');
  assert(legacyInManifest.length === 30, `Manifest đối chiếu đúng 30 món trùng nghĩa legacy_match (hiện có ${legacyInManifest.length})`);

  const unsupportedCount = CATALOG_SOURCE_MANIFEST.filter((m) => m.disposition === 'unsupported').length;
  assert(unsupportedCount === 51, `Các món đòi hỏi bàn ăn/bếp chế biến nóng được phân loại unsupported đúng đắn (51 món)`);

  const deferredCount = CATALOG_SOURCE_MANIFEST.filter((m) => m.disposition === 'deferred').length;
  assert(deferredCount === 0, 'Toàn bộ 100% sản phẩm bán lẻ từ game tham khảo đã được chuyển giao thành công (0 deferred)');
}

export function runExpansionCatalogTests(): void {
  console.log('\n--- Catalog mở rộng: nhóm mới, hàng cao cấp cấp 5–30 ---');
  const newCategories = ['personal_care', 'frozen', 'fresh_produce', 'health', 'toys_stationery', 'alcohol'] as const;
  for (const category of newCategories) {
    assert(!!PRODUCT_CATEGORY_LABELS[category], `Nhóm mới ${category} có nhãn`);
    assert(ALL_PRODUCTS.filter((p) => p.category === category).length >= 15, `Nhóm ${category} có tối thiểu 15 sản phẩm`);
  }
  for (const category of Object.keys(PRODUCT_CATEGORY_LABELS)) {
    const share = ALL_PRODUCTS.filter((p) => p.category === category).length / ALL_PRODUCTS.length;
    assert(share < 0.25, `Nhóm ${category} không chiếm quá 25% catalog (${Math.round(share * 100)}%)`);
  }
  for (const p of EXPANSION_PRODUCTS) {
    assert(p.unlockLevel >= 5 && p.unlockLevel <= 30, `${p.id} mở khóa trong cấp 5–30 (${p.unlockLevel})`);
    assert(p.baseSellingPrice > p.purchasePrice, `${p.id} có lãi`);
    assert(Number.isInteger(p.purchasePrice) && Number.isInteger(p.baseSellingPrice), `${p.id} giá là số nguyên`);
    assert(p.storageType === 'cold' ? (p.expirationRules?.daysToSpoil ?? 0) > 0 : true, `${p.id} hạn dùng hợp lệ`);
  }
  for (let level = 5; level <= 30; level += 5) {
    assert(ALL_PRODUCTS.some((p) => p.unlockLevel > level - 5 && p.unlockLevel <= level), `Có hàng mới mở khóa trong khoảng cấp ${level - 4}–${level}`);
  }
}

export function runExpansionManifestTests(): void {
  console.log('\n--- Manifest catalog mở rộng ---');
  assert(EXPANSION_MANIFEST.length === EXPANSION_PRODUCTS.length, `Manifest mở rộng phủ đủ ${EXPANSION_PRODUCTS.length} món (hiện có ${EXPANSION_MANIFEST.length})`);
  // Món nguồn từng bị đánh dấu unsupported (thiếu tủ đông, vd. pizza_dong_lanh) nay được phép có bản triển khai ở đợt mở rộng.
  const sourceIds = new Set(CATALOG_SOURCE_MANIFEST.filter((m) => m.disposition !== 'unsupported').map((m) => m.alias ?? m.sourceId));
  for (const entry of EXPANSION_MANIFEST) {
    assert(!!PRODUCT_MAP[entry.productId], `Manifest mở rộng: ${entry.productId} có trong PRODUCT_MAP`);
    assert(PRODUCT_MAP[entry.productId].category === entry.targetCategory, `Manifest mở rộng: nhóm của ${entry.productId} khớp catalog`);
    assert(!sourceIds.has(entry.productId), `Manifest mở rộng: ${entry.productId} không trùng món của catalog nguồn`);
  }
  assert(new Set(EXPANSION_MANIFEST.map((m) => m.productId)).size === EXPANSION_MANIFEST.length, 'Manifest mở rộng không trùng id');
}
