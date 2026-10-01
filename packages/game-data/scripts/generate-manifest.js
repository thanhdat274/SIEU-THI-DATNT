const fs = require('fs');
const path = require('path');

const srcPath = 'C:/Users/Admin/Desktop/GAME/tap-hoa-dau-hem/src/data/products.json';
const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

// 1. Generate catalog-source.csv
const csvHeader = 'id,name,category,cost,price,size,unlockLevel,shelfLifeDays,storage,requiresCold,behindCounter';
const csvRows = src.map(p => [
  p.id,
  '"' + (p.name || '').replace(/"/g, '""') + '"',
  p.category || '',
  p.cost || 0,
  p.price || 0,
  p.size || 1,
  p.unlockLevel || 1,
  p.shelfLifeDays ?? '',
  p.storage ?? '',
  p.requiresCold ?? '',
  p.behindCounter ? 'true' : 'false'
].join(','));

const csvContent = [csvHeader, ...csvRows].join('\n');
fs.writeFileSync(path.join(__dirname, '../catalog-source.csv'), csvContent, 'utf8');
console.log('Written catalog-source.csv with', csvRows.length, 'rows');

// 2. Curated 20 items list
const CURATED_20 = [
  { id: 'nuoc_rua_tay', name: 'Nước rửa tay diệt khuẩn', category: 'household', purchasePrice: 18000, baseSellingPrice: 26000, shelfCapacity: 12, storageType: 'ambient', daysToSpoil: 365, unlockLevel: 2, desc: 'Chai nước rửa tay sạch khuẩn, hương táo thanh mát thơm tho.' },
  { id: 'nuoc_lau_kinh', name: 'Nước lau kính sáng bóng', category: 'household', purchasePrice: 15000, baseSellingPrice: 22000, shelfCapacity: 12, storageType: 'ambient', daysToSpoil: 365, unlockLevel: 2, desc: 'Bình xịt lau kính gương sạch bóng không để lại vệt mờ.' },
  { id: 'nuoc_tay_bon_cau', name: 'Nước tẩy bồn cầu đậm đặc', category: 'household', purchasePrice: 22000, baseSellingPrice: 32000, shelfCapacity: 10, storageType: 'ambient', daysToSpoil: 365, unlockLevel: 3, desc: 'Chai dung dịch tẩy rửa vệ sinh diệt khuẩn mạnh mẽ.' },
  { id: 'mang_boc_thuc_pham', name: 'Màng bọc thực phẩm PE', category: 'household', purchasePrice: 14000, baseSellingPrice: 20000, shelfCapacity: 16, storageType: 'ambient', daysToSpoil: 365, unlockLevel: 2, desc: 'Cuộn màng bọc giữ độ tươi ngon cho món ăn gia đình.' },
  { id: 'khan_uot', name: 'Khăn ướt tiệt trùng em bé', category: 'household', purchasePrice: 9000, baseSellingPrice: 14000, shelfCapacity: 18, storageType: 'ambient', daysToSpoil: 180, unlockLevel: 1, desc: 'Gói khăn giấy ướt không cồn, dịu nhẹ cho da nhạy cảm.' },
  { id: 'thuc_an_cho', name: 'Thức ăn hạt cho chó', category: 'household', purchasePrice: 25000, baseSellingPrice: 36000, shelfCapacity: 12, storageType: 'ambient', daysToSpoil: 180, unlockLevel: 3, desc: 'Túi hạt dinh dưỡng cho cún cưng bổ sung canxi và thịt bò.' },
  { id: 'thuc_an_meo', name: 'Thức ăn hạt cho mèo', category: 'household', purchasePrice: 24000, baseSellingPrice: 35000, shelfCapacity: 12, storageType: 'ambient', daysToSpoil: 180, unlockLevel: 3, desc: 'Túi hạt thơm mùi cá ngừ yêu thích của các chú mèo đầu hẻm.' },
  { id: 'sot_mayonnaise', name: 'Sốt Mayonnaise chai', category: 'cooking_ingredients', purchasePrice: 19000, baseSellingPrice: 27000, shelfCapacity: 12, storageType: 'ambient', daysToSpoil: 90, unlockLevel: 2, desc: 'Chai xốt béo ngậy chấm bánh mì, khoai tây chiên hay trộn salad.' },
  { id: 'ca_moi_hop', name: 'Cá mòi xốt cà đóng hộp', category: 'cooking_ingredients', purchasePrice: 16000, baseSellingPrice: 23000, shelfCapacity: 14, storageType: 'ambient', daysToSpoil: 180, unlockLevel: 2, desc: 'Hộp cá mòi xốt cà thơm lừng quen thuộc của bữa sáng bánh mì.' },
  { id: 'bot_ca_cao', name: 'Bột ca cao nguyên chất', category: 'cooking_ingredients', purchasePrice: 28000, baseSellingPrice: 40000, shelfCapacity: 12, storageType: 'ambient', daysToSpoil: 180, unlockLevel: 3, desc: 'Hũ bột ca cao đậm đà để pha thức uống ngọt ngào ấm áp.' },
  { id: 'bot_ca_ri', name: 'Bột cà ri Ấn Độ', category: 'cooking_ingredients', purchasePrice: 8000, baseSellingPrice: 12000, shelfCapacity: 20, storageType: 'ambient', daysToSpoil: 180, unlockLevel: 2, desc: 'Gói bột gia vị nấu cà ri gà hay bánh mì thơm lừng góc phố.' },
  { id: 'ngu_vi_huong', name: 'Bột ngũ vị hương gia vị', category: 'cooking_ingredients', purchasePrice: 5000, baseSellingPrice: 8000, shelfCapacity: 24, storageType: 'ambient', daysToSpoil: 180, unlockLevel: 2, desc: 'Gia vị tẩm ướp thịt nướng ngũ vị đậm phong vị ẩm thực Việt.' },
  { id: 'sa_te_tom', name: 'Sa tế tôm cay nồng', category: 'cooking_ingredients', purchasePrice: 11000, baseSellingPrice: 16000, shelfCapacity: 16, storageType: 'ambient', daysToSpoil: 120, unlockLevel: 2, desc: 'Hũ sa tế tôm cay xé lưỡi ăn kèm bún bò, hủ tiếu hay lẩu.' },
  { id: 'dau_do', name: 'Đậu đỏ hạt đóng gói', category: 'cooking_ingredients', purchasePrice: 13000, baseSellingPrice: 19000, shelfCapacity: 16, storageType: 'ambient', daysToSpoil: 180, unlockLevel: 2, desc: 'Bịch đậu đỏ hạt mẩy để nấu chè đậu đỏ cầu duyên thanh mát.' },
  { id: 'banh_pia', name: 'Bánh pía Sóc Trăng sầu riêng', category: 'snacks', purchasePrice: 22000, baseSellingPrice: 32000, shelfCapacity: 12, storageType: 'ambient', daysToSpoil: 30, unlockLevel: 3, desc: 'Bánh pía vỏ ngàn lớp nhân đậu xanh sầu riêng trứng muối béo thơm.' },
  { id: 'kho_ga', name: 'Khô gà lá chanh cay cay', category: 'snacks', purchasePrice: 24000, baseSellingPrice: 35000, shelfCapacity: 14, storageType: 'ambient', daysToSpoil: 45, unlockLevel: 2, desc: 'Hũ khô gà xé sợi vàng ươm thơm mùi lá chanh giòn rụm.' },
  { id: 'banh_mochi', name: 'Bánh mochi dẻo mềm nhân kem', category: 'snacks', purchasePrice: 16000, baseSellingPrice: 24000, shelfCapacity: 14, storageType: 'ambient', daysToSpoil: 25, unlockLevel: 2, desc: 'Bánh dẻo mochi phong cách Nhật Bản mềm tan đầu lưỡi.' },
  { id: 'hat_bi_rang', name: 'Hạt bí rang củi ngày Tết', category: 'snacks', purchasePrice: 15000, baseSellingPrice: 22000, shelfCapacity: 16, storageType: 'ambient', daysToSpoil: 90, unlockLevel: 2, desc: 'Gói hạt bí trắng ngà rang giòn ăn vặt nhâm nhi bên tách trà.' },
  { id: 'dau_ha_lan_say', name: 'Đậu Hà Lan sấy giòn vị tỏi ớt', category: 'snacks', purchasePrice: 12000, baseSellingPrice: 18000, shelfCapacity: 16, storageType: 'ambient', daysToSpoil: 60, unlockLevel: 2, desc: 'Hạt đậu Hà Lan sấy xanh giòn đậm vị cay mặn bắt miệng.' },
  { id: 'khoai_tay_que', name: 'Khoai tây cọng que giòn rụm', category: 'snacks', purchasePrice: 10000, baseSellingPrice: 15000, shelfCapacity: 18, storageType: 'ambient', daysToSpoil: 60, unlockLevel: 1, desc: 'Lon khoai tây que giòn tan mằn mặn cho các buổi xem phim.' },
];

// 3. 36 Legacy items matching dictionary
const _LEGACY_36 = [
  'mi_hao_hao', 'xa_xi_chuong_duong', 'keo_big_babol', 'sua_ong_tho', 'banh_mi_que',
  'mi_omachi', 'mi_ba_mien', 'pho_goi', 'hu_tieu_goi', 'banh_poca',
  'bim_bim_oishi', 'banh_gao', 'dau_phong_rang', 'keo_dua', 'keo_me',
  'socola_thanh', 'nuoc_suoi', 'nuoc_khoang', 'nuoc_tinh_khiet', 'nuoc_cam',
  'tra_xanh', 'sua_tuoi', 'sua_chua', 'sua_dau_nanh', 'banh_mi_goi',
  'banh_bao', 'trung_ga', 'trung_vit', 'nuoc_mam', 'duong_cat',
  'bot_ngot', 'dau_an', 'xa_phong', 'nuoc_rua_chen', 'giay_ve_sinh', 'kem_danh_rang'
];

const legacyMapping = {
  'mi_goi': 'mi_hao_hao',
  'gao': null, // dry
  'nuoc_mam': 'nuoc_mam',
  'dau_an': 'dau_an',
  'duong': 'duong_cat',
  'muoi': null,
  'snack': 'banh_poca',
  'keo': 'keo_big_babol',
  'banh_quy': null,
  'que_cay': null,
  'xa_phong': 'xa_phong',
  'kem_danh_rang': 'kem_danh_rang',
  'giay_vs': 'giay_ve_sinh',
  'nuoc_ngot': 'xa_xi_chuong_duong',
  'nuoc_suoi': 'nuoc_suoi',
  'tra_xanh': 'tra_xanh',
  'sua_hop': null,
  'trung_ga': 'trung_ga',
  'banh_mi': 'banh_mi_que',
  'sua_tuoi': 'sua_tuoi',
  'bot_ngot': 'bot_ngot',
  'hu_tieu_goi': 'hu_tieu_goi',
  'sua_dac': 'sua_ong_tho',
  'banh_gao': 'banh_gao',
  'dau_phong': 'dau_phong_rang',
  'keo_dua': 'keo_dua',
  'socola_thanh': 'socola_thanh',
  'banh_bao': 'banh_bao',
  'trung_vit': 'trung_vit',
  'sua_chua': 'sua_chua',
  'sua_dau_nanh': 'sua_dau_nanh',
  'nuoc_rua_chen': 'nuoc_rua_chen',
  'banh_mi_goi': 'banh_mi_goi',
};

const curatedMap = new Map(CURATED_20.map(c => [c.id, c]));

// Generate Manifest entries
const manifestEntries = src.map(item => {
  let disposition = 'deferred';
  let alias = null;
  let targetCategory = null;
  let reason = '';

  if (curatedMap.has(item.id)) {
    disposition = 'curated_new';
    alias = item.id;
    targetCategory = curatedMap.get(item.id).category;
    reason = 'Selected as 1 of 20 high-value curated products for Phase 3 expansion';
  } else if (legacyMapping[item.id]) {
    disposition = 'legacy_match';
    alias = legacyMapping[item.id];
    targetCategory = item.category;
    reason = `Matches existing legacy item ${alias}`;
  } else if (item.requiresCold === 'freezer' || item.category === 'frozen') {
    disposition = 'unsupported';
    reason = 'Requires freezer storage which is not supported in Phase 3';
  } else if (item.behindCounter) {
    disposition = 'unsupported';
    reason = 'Behind-counter item reserved for future dedicated register mechanic';
  } else if (item.recipeOnly || item.eventOnly) {
    disposition = 'unsupported';
    reason = 'Special craft or seasonal event item out of scope';
  } else {
    disposition = 'deferred';
    reason = 'Valid item deferred for future retail expansion';
  }

  return {
    sourceId: item.id,
    sourceName: item.name,
    sourceCategory: item.category,
    sourceCost: item.cost,
    sourcePrice: item.price,
    disposition,
    alias,
    targetCategory,
    reason,
  };
});

const tsCode = `export interface CatalogManifestEntry {
  sourceId: string;
  sourceName: string;
  sourceCategory: string;
  sourceCost: number;
  sourcePrice: number;
  disposition: 'legacy_match' | 'curated_new' | 'unsupported' | 'deferred';
  alias: string | null;
  targetCategory: string | null;
  reason: string;
}

export const CATALOG_SOURCE_MANIFEST: CatalogManifestEntry[] = ${JSON.stringify(manifestEntries, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/catalog-manifest.ts'), tsCode, 'utf8');
console.log('Written catalog-manifest.ts with', manifestEntries.length, 'entries');

console.log('Curated 20 items:');
CURATED_20.forEach((c, i) => console.log(`${i+1}. ${c.id}: ${c.name} (${c.category}) - ${c.purchasePrice}đ / ${c.baseSellingPrice}đ`));
