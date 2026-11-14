/**
 * Tên hàng tiếng Anh theo id (i18n bước 5). Chỉ là lớp hiển thị: mô phỏng/save/golden dùng id nên không đổi.
 * Thiếu id → giữ tên tiếng Việt. Món Việt đặc trưng giữ tên gốc + chú thích Anh (vd. "Phở — instant pho").
 */
import { EN_CATALOG } from './catalog';
import { EN_HOMEMADE } from './homemade';
export const EN_CATEGORIES: Record<string, string> = {
  dry: 'Dry goods', drink: 'Drinks', cold: 'Chilled', frozen: 'Frozen',
  household: 'Household', fresh: 'Fresh produce', meat: 'Fresh meat & fish',
};

export const EN_PRODUCTS: Record<string, string> = {
  ...EN_CATALOG,
  ...EN_HOMEMADE,
  // ── Hàng gốc (products.ts) ──
  mi: 'Instant noodles', nuoc: 'Bottled water', banh: 'Snacks & candy',
  ngot: 'Soft drinks', diem: 'Matches & lighters', sua: 'Boxed milk',
  giavi: 'Spices', giay: 'Toilet paper', trung: 'Eggs (tray)',
  gao: 'Rice (5kg bag)', dauan: 'Cooking oil', kem: 'Ice pops',
  snack: 'Potato chips', bia: 'Canned beer', tangluc: 'Energy drink',
  suachua: 'Yogurt', botgiat: 'Laundry powder', daugoi: 'Shampoo',
  caphe: 'Packaged coffee', rau: 'Vegetables', traicay: 'Fruit',
  thit: 'Frozen meat', ca: 'Frozen fish', mypham: 'Cosmetics',
  vo: 'School supplies', banhmi: 'Fresh bánh mì', dochin: 'Ready-to-eat food',
  noichao: 'Pots & pans', diengiadung: 'Small appliances', keomut: 'Lollipops',
  tranhanh: 'Bottled lemon tea', xaphong: 'Soap', bimbim: 'Stick snacks',
  nuocmam: 'Fish sauce', banhgao: 'Rice crackers', kemdanhrang: 'Toothpaste',
  miy: 'Pasta', xucxich: 'Sausages', nuocrua: 'Dish soap',
  sinhto: 'Bottled smoothie', banhbao: 'Bánh bao — steamed buns', pho: 'Instant phở',
  phomai: 'Cheese', tra: 'Tea bags', sua_tuoi: 'Fresh milk (pack)',
  hotvit: 'Hột vịt lộn — balut', dua: 'Watermelon', cha: 'Chả giò — spring rolls',
  nuocgiat: 'Liquid detergent', ruou: 'Wine', hat: 'Cashews',
  banhkem: 'Small cake', hai_san: 'Frozen shrimp', tachen: 'Dinnerware set',
  thitbo: 'Australian beef', quatet: 'Gift basket', aomua: 'Raincoat',
  o: 'Umbrella', banh_pia: 'Bánh pía — mung bean cakes (box of 4)', yen_mach: 'Oats (box)',
  mi_tuoi: 'Fresh noodles', sua_hat: 'Nut milk (4-pack)', cha_bong: 'Pork floss (jar)',
  bia_chai: 'Bottled beer', nho_kho: 'Raisins (box)', sua_chua_hop: 'Sticky rice yogurt (cup)',
  ca_phe_lon: 'Instant coffee (tin)', tra_atiso: 'Artichoke tea (bags)', lap_xuong: 'Lạp xưởng — Chinese sausage (kg)',
  hat_dieu_muoi: 'Salted cashews (jar)', kem_cay_hop: 'Ice cream bars (box of 10)', ruou_gao: 'Rice wine',
  tom_kho: 'Dried shrimp (pack)', keo_mut_hop: 'Candied fruit gift jar', muc_kho: 'Dried squid',
  mut_tet: 'Tết candied fruit (box)', trung_muoi: 'Salted eggs (box of 6)', thit_ga: 'Whole chicken',
  banhtrang: 'Rice paper', dau_xanh: 'Mung beans', bap: 'Corn',
  botmi: 'Flour', nep: 'Sticky rice (5kg bag)', mia: 'Sugarcane',
  cam_ga: 'Chicken feed (1kg bag)', cam_heo: 'Pig feed (5kg sack)', cam_bo: 'Cattle feed (5kg sack)',
  cam_de: 'Goat feed (5kg sack)', trung_vit: 'Duck eggs (tray of 10)', trung_goos: 'Goose eggs (tray of 10)',
  sua_de: 'Goat milk (pack)', thit_ga_dt: 'Đông Tảo chicken', x_nhan: 'Longan',
  ca_hoi: 'Salmon fillet (pack)', thit_cu: 'Lamb (pack)', ngheu: 'Fresh clams (bag)',
  ruou_vang_nhap: 'Imported wine', tra_thao_moc: 'Herbal tea (box)', jambon: 'Ham (pack)',
  pate: 'Liver pâté (tin)', bo_sua: 'Salted butter (tub)', ca_phe_xay: 'Pure ground coffee',
  banh_quy_nhap: 'Imported cookies', to_yen: "Bird's nest (jar)", so_diep: 'Frozen scallops',
  ngu_coc: 'Granola (box)', thit_bo_nhat: 'Japanese beef tenderloin (pack)', nep_cam: 'Black sticky rice (bag)',
  ot_hien: 'Fresh chilies (basket)', ca_basa: 'Basa fillet (kg)', sua_yeu: 'Oat milk (carton)',
  hat_sen: 'Fresh lotus seeds', bia_nhap: 'Imported beer (bottle)', cha_ca: 'Featherback fish cake (kg)',
  bun: 'Fresh rice vermicelli (pack)', hut_tieu: 'Hủ tiếu noodles (pack)', thit_heo_tuoi: 'Fresh pork',
  ca_loc_tuoi: 'Fresh snakehead fish', ga_ta_tuoi: 'Dressed free-range chicken', ca_ro_phi_tuoi: 'Fresh tilapia',
  thit_bo_tuoi: 'Fresh beef', tom_su_tuoi: 'Fresh tiger prawns', muc_ong_tuoi: 'Fresh squid',
  cua_bien_tuoi: 'Live sea crab', ruou_whisky: 'Whisky', mat_ong_rung: 'Wild honey (bottle)',
  hat_macca: 'Roasted macadamias (box)', ruou_remy: 'Rémy XO (bottle)', yen_sao: "Refined bird's nest (jar)",
  ruou_dam_100: '100-year rice spirit (bottle)', phan_bon: 'NPK fertilizer (5kg sack)',
};
