import { CATALOG_PRODUCTS } from './catalog';
import { COOKED_PRODUCTS } from './recipes';

/** Ngành hàng: quyết định bày ở đâu (kệ thường, tủ mát, tủ đông). */
export type Category = 'dry' | 'drink' | 'cold' | 'frozen' | 'household' | 'fresh';

export const CATEGORIES: Record<Category, string> = {
  dry: 'Đồ khô',
  drink: 'Đồ uống',
  cold: 'Hàng mát',
  frozen: 'Đông lạnh',
  household: 'Gia dụng',
  fresh: 'Tươi sống',
};

export interface Product {
  id: string;
  name: string;
  category: Category;
  /** Giá nhập (đ). */
  buy: number;
  /** Giá bán gợi ý (đ). */
  sell: number;
  /** Màu hộp hàng trên kệ. */
  color: number;
  /** Cấp mở khóa. */
  unlock: number;
}

const p = (
  id: string, name: string, category: Category, buy: number, sell: number, color: number, unlock: number,
): Product => ({ id, name, category, buy, sell, color, unlock });

export const PRODUCTS: Product[] = [
  p('mi', 'Mì gói', 'dry', 3000, 5000, 0xe67e22, 1),
  p('nuoc', 'Nước suối', 'drink', 4000, 6000, 0x5dade2, 1),
  p('banh', 'Bánh kẹo', 'dry', 5000, 8000, 0xe84393, 1),
  p('ngot', 'Nước ngọt', 'drink', 7000, 10000, 0xc0392b, 2),
  p('diem', 'Diêm, bật lửa', 'household', 2000, 4000, 0x7f8c8d, 4),
  p('sua', 'Sữa hộp', 'drink', 6000, 9000, 0xecf0f1, 5),
  p('giavi', 'Gia vị', 'dry', 8000, 12000, 0xf1c40f, 7),
  p('giay', 'Giấy vệ sinh', 'household', 10000, 15000, 0xfdfefe, 9),
  p('trung', 'Trứng gà (vỉ)', 'dry', 25000, 33000, 0xf5cba7, 11),
  p('gao', 'Gạo (túi 5kg)', 'dry', 80000, 100000, 0xfaf3e0, 12),
  p('dauan', 'Dầu ăn', 'dry', 40000, 52000, 0xf4d03f, 13),
  p('kem', 'Kem que', 'frozen', 6000, 10000, 0xff9ff3, 14),
  p('snack', 'Snack khoai tây', 'dry', 8000, 12000, 0xffc312, 15),
  p('bia', 'Bia lon', 'drink', 12000, 17000, 0xd4ac0d, 16),
  p('tangluc', 'Nước tăng lực', 'drink', 9000, 13000, 0x1abc9c, 18),
  p('suachua', 'Sữa chua', 'cold', 5000, 8000, 0xfadbd8, 19),
  p('botgiat', 'Bột giặt', 'household', 35000, 48000, 0x3498db, 20),
  p('daugoi', 'Dầu gội', 'household', 45000, 62000, 0x8e44ad, 22),
  p('caphe', 'Cà phê gói', 'dry', 30000, 42000, 0x6e2c00, 24),
  p('rau', 'Rau củ', 'fresh', 10000, 16000, 0x27ae60, 26),
  p('traicay', 'Trái cây', 'fresh', 25000, 38000, 0xe74c3c, 28),
  p('thit', 'Thịt đông lạnh', 'frozen', 60000, 85000, 0xc0392b, 30),
  p('ca', 'Cá đông lạnh', 'frozen', 50000, 72000, 0x85c1e9, 32),
  p('mypham', 'Mỹ phẩm', 'household', 80000, 120000, 0xf8c471, 34),
  p('vo', 'Đồ dùng học tập', 'household', 15000, 25000, 0x5499c7, 36),
  p('banhmi', 'Bánh mì tươi', 'fresh', 8000, 15000, 0xdc7633, 38),
  p('dochin', 'Đồ ăn chín', 'cold', 30000, 50000, 0xa04000, 42),
  p('noichao', 'Nồi chảo', 'household', 150000, 220000, 0x515a5a, 45),
  p('diengiadung', 'Điện gia dụng nhỏ', 'household', 300000, 420000, 0x2c3e50, 48),
  // Mẫu hàng mở rộng: gần như cấp nào cũng có món mới để tiệm luôn đa dạng
  p('keomut', 'Kẹo mút', 'dry', 1000, 2000, 0xff6b81, 3),
  p('tranhanh', 'Trà chanh chai', 'drink', 6000, 9000, 0xbadc58, 3),
  p('xaphong', 'Xà phòng', 'household', 7000, 11000, 0x7ed6df, 6),
  p('bimbim', 'Bim bim que', 'dry', 3000, 5000, 0xf0932b, 6),
  p('nuocmam', 'Nước mắm', 'dry', 18000, 26000, 0x8e5a2b, 8),
  p('banhgao', 'Bánh gạo', 'dry', 12000, 18000, 0xf6e58d, 10),
  p('kemdanhrang', 'Kem đánh răng', 'household', 20000, 29000, 0x22a6b3, 10),
  p('miy', 'Mì ý', 'dry', 22000, 32000, 0xe1b12c, 12),
  p('xucxich', 'Xúc xích', 'cold', 15000, 22000, 0xe55039, 14),
  p('nuocrua', 'Nước rửa chén', 'household', 22000, 32000, 0xa3cb38, 15),
  p('sinhto', 'Sinh tố đóng chai', 'cold', 14000, 21000, 0xfd79a8, 17),
  p('banhbao', 'Bánh bao', 'frozen', 9000, 15000, 0xf5f6fa, 17),
  p('pho', 'Phở ăn liền', 'dry', 8000, 12000, 0xd35400, 19),
  p('phomai', 'Phô mai', 'cold', 25000, 36000, 0xf9ca24, 21),
  p('tra', 'Trà túi lọc', 'dry', 20000, 30000, 0x6ab04c, 23),
  p('sua_tuoi', 'Sữa tươi lốc', 'cold', 28000, 38000, 0xdff9fb, 25),
  p('hotvit', 'Hột vịt lộn', 'fresh', 4000, 7000, 0xc7ecee, 27),
  p('dua', 'Dưa hấu', 'fresh', 30000, 45000, 0x6ab04c, 29),
  p('cha', 'Chả giò', 'frozen', 35000, 50000, 0xe58e26, 31),
  p('nuocgiat', 'Nước giặt', 'household', 70000, 95000, 0x4834d4, 33),
  p('ruou', 'Rượu vang', 'drink', 120000, 170000, 0x6d214f, 35),
  p('hat', 'Hạt điều', 'dry', 60000, 85000, 0xcc8e35, 37),
  p('banhkem', 'Bánh kem nhỏ', 'cold', 60000, 90000, 0xffdde1, 40),
  p('hai_san', 'Tôm đông lạnh', 'frozen', 90000, 130000, 0xff7f50, 43),
  p('tachen', 'Bộ chén đĩa', 'household', 90000, 130000, 0xdfe6e9, 46),
  p('thitbo', 'Thịt bò Úc', 'frozen', 180000, 250000, 0x8b0000, 50),
  p('quatet', 'Giỏ quà biếu', 'household', 250000, 360000, 0xd63031, 55),
  p('aomua', 'Áo mưa', 'household', 5000, 9000, 0x0984e3, 1),
  p('o', 'Ô dù', 'household', 15000, 25000, 0x6c5ce7, 1),
  // Đợt mở rộng danh mục: đồ cao cấp/hàng biếu cho giai đoạn sau (giá sỉ tạp hóa VN 2026)
  p('banh_pia', 'Bánh pía', 'dry', 28000, 40000, 0xd9a66c, 40),
  p('yen_mach', 'Yến mạch hộp', 'dry', 45000, 65000, 0xd8b998, 40),
  p('mi_tuoi', 'Mì tươi vắt', 'fresh', 6000, 9000, 0xe8d8c0, 40),
  p('sua_hat', 'Sữa hạt lốc 4', 'cold', 42000, 58000, 0xe4c9a0, 41),
  p('cha_bong', 'Chà bông hũ', 'dry', 32000, 46000, 0xc0392b, 41),
  p('bia_chai', 'Bia chai', 'drink', 15000, 21000, 0x996633, 42),
  p('nho_kho', 'Nho khô hộp', 'dry', 55000, 78000, 0x8e5a2b, 42),
  p('sua_chua_hop', 'Sữa chua nếp cốc', 'cold', 12000, 18000, 0xd4a76a, 43),
  p('ca_phe_lon', 'Cà phê hòa tan hộp thiếc', 'dry', 85000, 118000, 0x4a2c0a, 44),
  p('tra_atiso', 'Trà atiso túi', 'dry', 38000, 55000, 0x9b59b6, 44),
  p('lap_xuong', 'Lạp xưởng', 'frozen', 72000, 100000, 0xa93226, 44),
  p('hat_dieu_muoi', 'Hạt điều rang muối hũ', 'dry', 78000, 108000, 0xb5651d, 45),
  p('kem_cay_hop', 'Kem cây hộp 10', 'frozen', 48000, 68000, 0xffb6c1, 45),
  p('ruou_gao', 'Rượu gạo', 'drink', 45000, 65000, 0xc0c0c0, 46),
  p('tom_kho', 'Tôm khô gói', 'dry', 65000, 92000, 0xe67e22, 47),
  p('keo_mut_hop', 'Kẹo mứt hũ biếu', 'dry', 48000, 69000, 0xe74c3c, 48),
  p('muc_kho', 'Mực khô', 'dry', 120000, 168000, 0xd5aa6f, 49),
  p('mut_tet', 'Mứt Tết hộp', 'dry', 62000, 88000, 0xd35400, 50),
  p('trung_muoi', 'Trứng muối hộp 6', 'dry', 30000, 42000, 0xe8d8c0, 51),
  p('thit_ga', 'Gà nguyên con', 'fresh', 130000, 175000, 0xd5aa6f, 52),
  // Nguyên liệu chế biến đúng nghĩa cho các món nấu
  p('banhtrang', 'Bánh tráng', 'dry', 5000, 8000, 0xd9b38c, 1),
  p('dau_xanh', 'Đậu xanh', 'dry', 15000, 22000, 0x9acd32, 1),
  p('bap', 'Bắp ngô', 'fresh', 8000, 12000, 0xf1c40f, 1),
  p('botmi', 'Bột mì', 'dry', 18000, 26000, 0xf5e6c8, 1),
  p('nep', 'Gạo nếp (túi 5kg)', 'dry', 30000, 42000, 0xe8d8c0, 1),
  p('mia', 'Mía', 'fresh', 12000, 18000, 0x84c639, 1),
  p('cam_ga', 'Cám gà (túi 1kg)', 'dry', 15000, 22000, 0xc9a86a, 1),
  p('cam_heo', 'Cám heo (bao 5kg)', 'dry', 65000, 92000, 0xc9a86a, 1),
  p('cam_bo', 'Cám bò (bao 5kg)', 'dry', 55000, 78000, 0xc9a86a, 1),
  p('cam_de', 'Cám dê (bao 5kg)', 'dry', 58000, 80000, 0xc9a86a, 27),
  p('trung_vit', 'Trứng vịt (vỉ 10)', 'dry', 32000, 45000, 0xeef0e2, 1),
  p('trung_goos', 'Trứng ngỗng (vỉ 10)', 'dry', 280000, 350000, 0xf4f1e8, 18),
  p('sua_de', 'Sữa dê (lốc)', 'cold', 45000, 60000, 0xfdf6ec, 27),
  p('thit_ga_dt', 'Thịt gà Đông Tảo', 'fresh', 380000, 450000, 0xb03a2e, 30),
  p('x_nhan', 'Nhãn', 'fresh', 24000, 34000, 0xcbc04d, 30),
  p('phan_bon', 'Phân bón NPK (bao 5kg)', 'dry', 22000, 32000, 0x8d6e63, 1),
];

/** Cấp sớm nhất bày được từng ngành (cần tủ mát, tủ đông, quầy rau quả). fresh=21 để khớp trạm nấu mở ở 21. */
const SHELF_READY: Partial<Record<Category, number>> = { cold: 5, frozen: 14, fresh: 21 };

// Thêm mẫu hàng nhập từ catalog tham khảo; món chưa có chỗ bày thì lùi tới lúc có tủ/quầy
PRODUCTS.push(...CATALOG_PRODUCTS.map((it) => ({ ...it, unlock: Math.max(it.unlock, SHELF_READY[it.category] ?? 1) })));

// Món nhà làm (recipes.ts): không nhập được ở nhà cung cấp, chỉ có bằng cách nấu từ nguyên liệu
PRODUCTS.push(...COOKED_PRODUCTS.map((it) => ({ ...it, unlock: Math.max(it.unlock, SHELF_READY[it.category] ?? 1) })));

export const productById = (id: string) => PRODUCTS.find((it) => it.id === id)!;
export const unlockedProducts = (level: number) => PRODUCTS.filter((it) => it.unlock <= level);

/** Số món mỗi thùng theo ngành; hàng đắt thì thùng nhỏ lại cho vừa túi tiền (một thùng tối đa ~400k). */
const CASE_BASE: Record<Category, number> = { dry: 24, drink: 24, household: 12, cold: 12, frozen: 10, fresh: 10 };
const CASE_OVERRIDE: Record<string, number> = {
  mi: 30, sua: 48, trung: 10, gao: 4, dauan: 12, banhmi: 20, keomut: 50, diem: 50, giay: 10, rau: 10, traicay: 10,
};
const CASE_STEPS = [1, 2, 4, 6, 10, 12, 20, 24, 30, 48, 50];
const CASE_BUDGET = 400000;

export function caseSize(productId: string): number {
  if (CASE_OVERRIDE[productId]) return CASE_OVERRIDE[productId];
  const p = productById(productId);
  const fit = Math.min(CASE_BASE[p.category], Math.floor(CASE_BUDGET / p.buy));
  return [...CASE_STEPS].reverse().find((n) => n <= fit) ?? 1;
}

/** Số chỗ thùng trong kho mà `units` món chiếm (thùng đã khui vẫn chiếm một chỗ). */
export const casesFor = (productId: string, units: number) => Math.ceil(units / caseSize(productId));

/** Ví dụ "2 thùng + 5 lẻ", "5 lẻ", "3 thùng". */
export function describeUnits(productId: string, units: number): string {
  if (units <= 0) return 'hết';
  const size = caseSize(productId);
  const full = Math.floor(units / size);
  const loose = units - full * size;
  if (size === 1 || !full) return size === 1 ? `${units} thùng` : `${loose} lẻ`;
  return loose ? `${full} thùng + ${loose} lẻ` : `${full} thùng`;
}

export const formatMoney = (v: number) => `${Math.round(v).toLocaleString('vi-VN')}đ`;
