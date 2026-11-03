import type { Product } from '../data/products';

/** Kiểu dáng bày trên kệ; chọn theo tên món, không khớp thì theo ngành hàng. */
export type Shape =
  | 'bottle' | 'can' | 'carton' | 'packet' | 'box' | 'jar' | 'cup' | 'tub' | 'bag' | 'roll'
  | 'eggs' | 'fruit' | 'bunch' | 'long' | 'melon' | 'meat' | 'icecream' | 'pot' | 'tube' | 'flat' | 'banana'
  | 'noodle' | 'lollipop' | 'umbrella'
  | 'water' | 'soda' | 'oil' | 'sauce' | 'candy' | 'biscuit' | 'shaker' | 'soap' | 'pump' | 'lighter' | 'battery'
  | 'toothpaste' | 'chips' | 'sack' | 'notebook' | 'coffee' | 'cone';

/** Khớp theo nguyên từ (tên đã bỏ dấu), luật trên thắng luật dưới. */
const RULES: [RegExp, Shape][] = [
  // Ưu tiên: tên chứa từ dễ bị luật trái cây/rau bắt nhầm
  [/keo mut/, 'lollipop'],
  // Sửa các món bị từ khoá chung bắt nhầm (lộn → lon, dưỡng → đường, muỗi → muối…)
  [/hot vit lon/, 'eggs'],
  [/coca cola khong duong|milkis chuoi|nuoc cot dua hop|sua dac|sua bot|gas mini/, 'can'],
  [/kem duong da|sua rua mat/, 'tube'],
  [/nhang muoi|mieng rua chen|ban chai danh rang|la chuoi|khoai tay chien dong lanh|pizza dong lanh|rau cu thap cam dong lanh|bap non dong lanh/, 'box'],
  [/hat huong duong/, 'packet'],
  [/(?:sinh to|tra sua) dong chai|cot tra tac/, 'bottle'],
  [/tra tac|ca phe sua da|nuoc mia|sinh to|tra sua|tra da/, 'cup'],
  [/nuoc da/, 'bag'],
  [/mam tom|sa te/, 'sauce'],
  [/mat ong|bo dau phong|sot mayonnaise/, 'jar'],
  [/nuoc giat|nuoc rua tay|nuoc lau kinh|nuoc tay bon cau|nuoc suc mieng/, 'pump'],
  [/sua so[ -]co[ -]la hop|sua dau phong/, 'carton'],
  [/uc ga|suon heo|ca ro phi|ca hoi phi le/, 'meat'],
  [/chao goi|mi y kho|mi y/, 'noodle'],
  [/banh choco[ -]pie|banh so[ -]co[ -]la|banh pia|banh mochi|banh cracker/, 'biscuit'],
  [/so[ -]co[ -]la thanh/, 'flat'],
  // Món chủ lực: mô hình riêng sát với tên
  [/nuoc suoi|aquafina chai|la vie chai|nuoc dien giai/, 'water'],
  [/nuoc ngot|number 1 chai|revive chai/, 'soda'],
  [/dau an/, 'oil'],
  [/nuoc mam|nuoc tuong|dau hao|giam|tuong ot|tuong ca/, 'sauce'],
  [/banh keo|keo deo|keo lac|keo|keo cao su|keo bac ha/, 'candy'],
  [/banh quy|banh xop|banh que|banh socola|banh bong lan|banh dau xanh|banh gao/, 'biscuit'],
  [/gia vi|tieu xay|tieu hat|ot bot|bot ngot|hat nem|bot canh|^muoi/, 'shaker'],
  [/xa phong/, 'soap'],
  [/dau goi|sua tam|nuoc rua chen|nuoc lau san|nuoc xa vai/, 'pump'],
  [/diem|bat lua/, 'lighter'],
  [/pin/, 'battery'],
  [/kem danh rang/, 'toothpaste'],
  [/snack|bim bim|bap rang|que cay/, 'chips'],
  [/^gao|nep cai|bot mi|^duong|bot giat|bot gao/, 'sack'],
  [/do dung hoc tap|tap vo|but bi/, 'notebook'],
  [/ca phe goi|ca phe hoa tan|ca phe bot|tra tui loc/, 'coffee'],
  [/banh chung|banh trung thu/, 'box'],
  [/long den/, 'melon'],
  [/o du|du che/, 'umbrella'],
  [/mi goi|mi tom|pho goi|pho an lien|hu tieu goi|mien goi|bun kho|mi an lien/, 'noodle'],
  [/fanta|twister|fuze tea|betagen|nuoc ngot|tea|mam tom/, 'bottle'],
  [/snack|tom kho|bim bim|bap rang|kho (bo|ga|muc)|dua nao|xoi \w+ goi/, 'packet'],
  [/ca thu|muc|tom|vien tha|dong lanh/, 'meat'],
  [/dien gia dung|dao cao|nhang/, 'box'],
  [/sua bap/, 'carton'],
  [/xa lach/, 'bunch'],
  [/dau xanh/, 'bag'],
  [/oc que/, 'cone'],
  [/kem que/, 'icecream'],
  [/kem danh rang|kem chong nang|sua tam|dau goi|my pham/, 'tube'],
  [/kem hop|sua chua(?! uong)|dau hu|pho mai|banh kem/, 'tub'],
  [/lon|bia|sting|7up|pepsi|coca|sprite|mirinda|nuoc yen|ca phe lon|dua cot|ca hop|pate/, 'can'],
  [/sua hop|sua tuoi|sua dau nanh|sua lua mach|sua chua uong|nuoc dua hop|nuoc cam/, 'carton'],
  [/nuoc|chai|ruou|dau an|dau hao|giam|tuong|soda|tra xanh|tra o long|tra chanh|sinh to|dien giai|ca phe sua|tra sua|tra tac|tra da|nuoc mam/, 'bottle'],
  [/mi ly|ly|ca phe hoa tan|sua dac/, 'cup'],
  [/^trung|trung (ga|vit)|hot vit/, 'eggs'],
  [/gao|bot giat|bot mi|nep|tui rac|ta giay|gas/, 'bag'],
  [/giay ve sinh|khan giay/, 'roll'],
  [/noi|chao|chen|bong den/, 'pot'],
  [/thit|ca basa|ca dong|canh ga|tom dong|cha lua|thit bo|cha gio|bo vien|ca vien|ha cao|banh bao|xuc xich|lap xuong/, 'meat'],
  [/dua hau|bi do|buoi|mit$|thom|du du|bap cai/, 'melon'],
  [/chuoi/, 'banana'],
  [/ca rot|dua leo|kho qua|bap|mia|banh mi|hanh la/, 'long'],
  [/rau|cai|mui|gia do|bong cai/, 'bunch'],
  [/trai cay|tao|cam$|xoai|oi$|bo$|na$|mang cut|nho|thanh long|chom|vai|chanh|ca chua|khoai tay|toi|hanh kho|gung|hot vit/, 'fruit'],
  [/the cao|sim|bao li xi|tap vo|vo$|banh trang|rong bien|khau trang|bang ve sinh/, 'flat'],
  [/pin|but|ban chai|dao cao|diem|bat lua|nhang|keo mut/, 'box'],
  [/mi|pho|hu tieu|chao|bun|mien|nui|snack|bim|banh|keo|hat|que cay|bot|tieu|muoi|duong|kho|say|com chay|bap rang|dau phong|dau xanh|cha bong|hanh phi|mut|ca phe|tra/, 'packet'],
];

const BY_CATEGORY: Record<Product['category'], Shape> = {
  dry: 'packet', drink: 'bottle', cold: 'tub', frozen: 'meat', household: 'box', fresh: 'fruit', meat: 'meat',
};

const plain = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();

const wordCache = new Map<RegExp, RegExp>();
const wordRe = (re: RegExp) => {
  let w = wordCache.get(re);
  if (!w) wordCache.set(re, (w = new RegExp(`\\b(?:${re.source})\\b`)));
  return w;
};

export function shapeOf(p: Product): Shape {
  const name = plain(p.name);
  return RULES.find(([re]) => wordRe(re).test(name))?.[1] ?? BY_CATEGORY[p.category];
}
