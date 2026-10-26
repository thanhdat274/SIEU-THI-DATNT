import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { productById, type Product } from '../data/products';

/** Kiểu dáng bày trên kệ; chọn theo tên món, không khớp thì theo ngành hàng. */
type Shape =
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
  dry: 'packet', drink: 'bottle', cold: 'tub', frozen: 'meat', household: 'box', fresh: 'fruit',
};

const plain = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();

const wordCache = new Map<RegExp, RegExp>();
const wordRe = (re: RegExp) => {
  let w = wordCache.get(re);
  if (!w) wordCache.set(re, (w = new RegExp(`\\b(?:${re.source})\\b`)));
  return w;
};

function shapeOf(p: Product): Shape {
  const name = plain(p.name);
  return RULES.find(([re]) => wordRe(re).test(name))?.[1] ?? BY_CATEGORY[p.category];
}

const mats = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: number, rough = 0.6, metal = 0): THREE.MeshStandardMaterial {
  const key = `${color}|${rough}|${metal}`;
  let m = mats.get(key);
  if (!m) mats.set(key, (m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })));
  return m;
}

const tint = (c: number, k: number) => new THREE.Color(c).multiplyScalar(k).getHex();
const light = (c: number) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.6).getHex();
const WHITE = 0xf7f7f2;

const glasses = new Map<string, THREE.MeshStandardMaterial>();
/** Nhựa/thuỷ tinh trong (chai nước, hũ kẹo). */
function glass(color: number, opacity = 0.45): THREE.MeshStandardMaterial {
  const key = `${color}|${opacity}`;
  let m = glasses.get(key);
  if (!m) glasses.set(key, (m = new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.08, metalness: 0.1 })));
  return m;
}

/** Chai nhựa PET: thân, vai, cổ, nắp, đai nhãn và gờ quanh thân; có thể có nước màu bên trong. */
function petBottle(g: THREE.Group, body: THREE.Material, label: number, cap: number, w: number, h: number, d: number, liquid?: number) {
  const r = Math.min(w, d) * 0.4;
  const bodyH = h * 0.6;
  g.add(mesh(new THREE.CylinderGeometry(r, r, bodyH, 16), body, 0, bodyH / 2));
  if (liquid !== undefined) g.add(mesh(new THREE.CylinderGeometry(r * 0.94, r * 0.94, bodyH * 0.96, 16), mat(liquid, 0.3), 0, bodyH * 0.49));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.3, r, h * 0.2, 16), body, 0, bodyH + h * 0.1));
  g.add(mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, bodyH * 0.36, 16), mat(label, 0.45), 0, bodyH * 0.52));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.3, h * 0.06, 10), body, 0, h * 0.83));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.34, r * 0.34, h * 0.09, 10), mat(cap, 0.5), 0, h * 0.9));
  for (const y of [0.2, 0.85]) {
    const ring = mesh(new THREE.TorusGeometry(r * 0.99, r * 0.03, 4, 16), body, 0, bodyH * y);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }
}

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  return o;
}

/** Mỗi hàm vẽ một món nằm gọn trong hộp w×h×d, đáy ở y=0, mặt nhãn quay +z. */
const BUILD: Record<Shape, (g: THREE.Group, c: number, w: number, h: number, d: number) => void> = {
  bottle(g, c, w, h, d) {
    const r = Math.min(w, d) * 0.42;
    const bodyH = h * 0.62;
    g.add(mesh(new THREE.CylinderGeometry(r, r, bodyH, 14), mat(light(c), 0.15), 0, bodyH / 2));
    g.add(mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, bodyH * 0.42, 14), mat(c, 0.4), 0, bodyH * 0.55));
    g.add(mesh(new THREE.CylinderGeometry(r * 0.35, r, h * 0.2, 14), mat(light(c), 0.15), 0, bodyH + h * 0.1));
    g.add(mesh(new THREE.CylinderGeometry(r * 0.38, r * 0.38, h * 0.12, 10), mat(tint(c, 0.6), 0.5), 0, h * 0.88));
  },
  can(g, c, w, h, d) {
    const r = Math.min(w, d) * 0.45;
    const ch = Math.min(h, r * 3.4);
    g.add(mesh(new THREE.CylinderGeometry(r, r, ch * 0.9, 16), mat(c, 0.35, 0.3), 0, ch * 0.45));
    g.add(mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, ch * 0.22, 16), mat(WHITE, 0.4), 0, ch * 0.5));
    g.add(mesh(new THREE.CylinderGeometry(r * 0.85, r, ch * 0.1, 16), mat(0xc8ccd0, 0.3, 0.8), 0, ch * 0.95));
  },
  carton(g, c, w, h, d) {
    const bw = w * 0.85, bd = Math.min(d, w) * 0.85, bh = h * 0.78;
    g.add(mesh(new THREE.BoxGeometry(bw, bh, bd), mat(WHITE), 0, bh / 2));
    g.add(mesh(new THREE.BoxGeometry(bw * 1.01, bh * 0.45, bd * 1.01), mat(c), 0, bh * 0.4));
    const roof = mesh(new THREE.CylinderGeometry(0.001, bw * 0.72, h * 0.18, 4, 1), mat(WHITE), 0, bh + h * 0.09);
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = bd / bw;
    g.add(roof);
  },
  packet(g, c, w, h, d) {
    const bw = w * 0.9, bh = h * 0.9, bd = Math.min(d, w) * 0.5;
    const bag = mesh(new THREE.SphereGeometry(0.5, 14, 10), mat(c, 0.35), 0, bh / 2);
    bag.scale.set(bw, bh, bd);
    g.add(bag);
    g.add(mesh(new THREE.BoxGeometry(bw * 0.8, bh * 0.08, bd * 0.3), mat(tint(c, 0.75)), 0, bh * 0.94));
    const label = mesh(new THREE.CircleGeometry(bw * 0.2, 12), mat(WHITE), 0, bh * 0.55, bd / 2 + 0.002);
    g.add(label);
  },
  box(g, c, w, h, d) {
    const bw = w * 0.85, bh = h * 0.75, bd = Math.min(d, w) * 0.7;
    g.add(mesh(new THREE.BoxGeometry(bw, bh, bd), mat(c), 0, bh / 2));
    g.add(mesh(new THREE.PlaneGeometry(bw * 0.7, bh * 0.35), mat(WHITE), 0, bh * 0.6, bd / 2 + 0.002));
  },
  jar(g, c, w, h, d) {
    const r = Math.min(w, d) * 0.42;
    g.add(mesh(new THREE.CylinderGeometry(r, r, h * 0.7, 14), mat(c, 0.2), 0, h * 0.35));
    g.add(mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, h * 0.12, 14), mat(tint(c, 0.5)), 0, h * 0.76));
  },
  cup(g, c, w, h, d) {
    const r = Math.min(w, d) * 0.45;
    const ch = Math.min(h * 0.8, r * 2.4);
    g.add(mesh(new THREE.CylinderGeometry(r, r * 0.75, ch, 14), mat(c, 0.5), 0, ch / 2));
    g.add(mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, ch * 0.06, 14), mat(WHITE), 0, ch));
  },
  tub(g, c, w, h, d) {
    const r = Math.min(w, d) * 0.45;
    const ch = Math.min(h * 0.6, r * 1.3);
    g.add(mesh(new THREE.CylinderGeometry(r, r * 0.85, ch, 14), mat(WHITE, 0.5), 0, ch / 2));
    g.add(mesh(new THREE.CylinderGeometry(r * 1.01, r * 0.9, ch * 0.4, 14), mat(c), 0, ch * 0.45));
    g.add(mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.03, ch * 0.08, 14), mat(tint(c, 0.8), 0.3, 0.4), 0, ch));
  },
  bag(g, c, w, h, d) {
    const bw = w * 0.9, bh = h * 0.85, bd = Math.min(d, w) * 0.75;
    const body = mesh(new THREE.BoxGeometry(bw, bh, bd, 2, 2, 2), mat(c, 0.8), 0, bh / 2);
    g.add(body);
    g.add(mesh(new THREE.PlaneGeometry(bw * 0.75, bh * 0.4), mat(WHITE), 0, bh * 0.5, bd / 2 + 0.002));
    g.add(mesh(new THREE.BoxGeometry(bw * 0.95, bh * 0.08, bd * 0.4), mat(tint(c, 0.7)), 0, bh * 1.02));
  },
  roll(g, c, w, h, d) {
    const r = Math.min(w / 2, d) * 0.48;
    for (const x of [-r, r]) {
      g.add(mesh(new THREE.CylinderGeometry(r, r, h * 0.45, 14), mat(WHITE, 0.9), x, h * 0.225));
      g.add(mesh(new THREE.CylinderGeometry(r, r, h * 0.45, 14), mat(WHITE, 0.9), x, h * 0.675));
    }
    g.add(mesh(new THREE.BoxGeometry(r * 4.1, h * 0.25, r * 2.05), mat(c, 0.3), 0, h * 0.45));
  },
  eggs(g, c, w, h, d) {
    const tray = Math.min(d, w);
    g.add(mesh(new THREE.BoxGeometry(w * 0.9, h * 0.15, tray * 0.9), mat(0xbfa98a, 0.95), 0, h * 0.075));
    const r = Math.min(w, tray) * 0.16;
    for (const x of [-1, 0, 1]) for (const z of [-0.5, 0.5]) {
      const egg = mesh(new THREE.SphereGeometry(r, 10, 8), mat(c, 0.7), x * r * 2.1, h * 0.15 + r, z * r * 2.1);
      egg.scale.y = 1.25;
      g.add(egg);
    }
  },
  fruit(g, c, w, h, d) {
    const r = Math.min(w, d, h) * 0.26;
    const spots: [number, number, number][] = [[-r, r, -r * 0.5], [r, r, -r * 0.5], [0, r, r * 0.8], [0, r * 2.6, 0]];
    for (const [x, y, z] of spots) {
      g.add(mesh(new THREE.SphereGeometry(r, 12, 10), mat(c, 0.45), x, y, z));
      g.add(mesh(new THREE.CylinderGeometry(r * 0.08, r * 0.08, r * 0.4, 5), mat(0x5d4037), x, y + r, z));
    }
  },
  bunch(g, c, w, h, d) {
    g.add(mesh(new THREE.CylinderGeometry(w * 0.12, w * 0.15, h * 0.35, 8), mat(0xd6e9b0), 0, h * 0.175));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const leaf = mesh(new THREE.SphereGeometry(w * 0.22, 8, 6), mat(c, 0.7), Math.cos(a) * w * 0.15, h * 0.5, Math.sin(a) * w * 0.12);
      leaf.scale.y = 1.6;
      g.add(leaf);
    }
  },
  long(g, c, w, h, d) {
    const r = Math.min(h, d) * 0.18;
    for (const [z, y] of [[-r, r], [r, r], [0, r * 2.7]]) {
      const item = mesh(new THREE.CapsuleGeometry(r, w * 0.75 - r * 2, 4, 10), mat(c, 0.55), 0, y, z);
      item.rotation.z = Math.PI / 2;
      g.add(item);
    }
  },
  melon(g, c, w, h, d) {
    const r = Math.min(w, d, h) * 0.45;
    const m = mesh(new THREE.SphereGeometry(r, 16, 12), mat(c, 0.5), 0, r * 0.95);
    m.scale.set(1, 0.9, 1);
    g.add(m);
    g.add(mesh(new THREE.TorusGeometry(r * 0.99, r * 0.04, 6, 20), mat(tint(c, 0.6)), 0, r * 0.95));
  },
  banana(g, c, w, h, d) {
    // Nải chuối: 4 quả cong to, chụm cuống nâu ở một đầu
    const R = w * 0.42, t = Math.min(w, d) * 0.11;
    for (let i = 0; i < 4; i++) {
      const b = mesh(new THREE.TorusGeometry(R, t, 8, 14, Math.PI * 0.75), mat(0xf6d743, 0.5), 0, h * 0.62, (i - 1.5) * t * 1.8);
      b.rotation.z = Math.PI * 1.12;
      g.add(b);
    }
    g.add(mesh(new THREE.CylinderGeometry(t * 0.6, t * 0.8, t * 2, 6), mat(0x6d4c41), -R * 0.95, h * 0.5, 0));
  },
  cone(g, c, w, h, d) {
    // Hai cây kem ốc quế dựng trong đế giấy: vỏ ốc quế vàng nâu, viên kem màu món
    const r = Math.min(w, d) * 0.2;
    for (const x of [-r * 1.15, r * 1.15]) {
      const cone = mesh(new THREE.ConeGeometry(r, h * 0.55, 12), mat(0xd9a05b, 0.8), x, h * 0.3);
      cone.rotation.x = Math.PI;
      g.add(cone);
      g.add(mesh(new THREE.SphereGeometry(r * 1.05, 12, 10), mat(c, 0.4), x, h * 0.62));
      g.add(mesh(new THREE.SphereGeometry(r * 0.3, 8, 6), mat(0xc0392b, 0.3), x, h * 0.62 + r));
    }
  },
  meat(g, c, w, h, d) {
    const tray = Math.min(d, w * 1.2);
    g.add(mesh(new THREE.BoxGeometry(w * 0.9, h * 0.12, tray * 0.85), mat(0xf2f2f2, 0.9), 0, h * 0.06));
    const piece = mesh(new THREE.SphereGeometry(0.5, 12, 8), mat(c, 0.6), 0, h * 0.2);
    piece.scale.set(w * 0.75, h * 0.25, tray * 0.65);
    g.add(piece);
    const film = mesh(new THREE.BoxGeometry(w * 0.92, h * 0.3, tray * 0.87), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.1 }), 0, h * 0.15);
    g.add(film);
  },
  icecream(g, c, w, h, d) {
    // Ba que kem cắm trong khay giấy: thân kem màu món nhúng sô-cô-la, que gỗ
    const r = Math.min(w, d) * 0.13;
    const tray = h * 0.18;
    g.add(mesh(new THREE.BoxGeometry(w * 0.85, tray, Math.min(d, w) * 0.5), mat(0x1e6fd9, 0.6), 0, tray / 2));
    for (const x of [-r * 2.3, 0, r * 2.3]) {
      g.add(mesh(new THREE.BoxGeometry(r * 0.5, h * 0.25, r * 0.25), mat(0xd9b07a, 0.8), x, tray + h * 0.08));
      const pop = mesh(new THREE.CapsuleGeometry(r, h * 0.32, 4, 10), mat(c, 0.35), x, tray + h * 0.42);
      pop.scale.z = 0.6;
      g.add(pop);
      const dip = mesh(new THREE.CapsuleGeometry(r * 1.04, h * 0.08, 4, 10), mat(0x5d3a1a, 0.4), x, tray + h * 0.58);
      dip.scale.z = 0.62;
      g.add(dip);
    }
  },
  pot(g, c, w, h, d) {
    const r = Math.min(w, d) * 0.45;
    const ph = Math.min(h * 0.55, r * 1.4);
    g.add(mesh(new THREE.CylinderGeometry(r, r * 0.9, ph, 16), mat(c, 0.3, 0.7), 0, ph / 2));
    g.add(mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.03, ph * 0.1, 16), mat(tint(c, 0.7), 0.3, 0.7), 0, ph + ph * 0.05));
    g.add(mesh(new THREE.SphereGeometry(r * 0.15, 8, 6), mat(0x222222), 0, ph * 1.15));
  },
  tube(g, c, w, h, d) {
    const r = Math.min(w, d) * 0.38;
    const bh = h * 0.7;
    g.add(mesh(new THREE.CylinderGeometry(r * 0.75, r, bh, 12), mat(c, 0.3), 0, bh / 2));
    g.add(mesh(new THREE.CylinderGeometry(r * 0.75, r * 0.75, bh * 0.08, 12), mat(WHITE, 0.3), 0, bh * 0.5));
    g.add(mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.5, h * 0.18, 10), mat(WHITE, 0.4), 0, bh + h * 0.09));
  },
  flat(g, c, w, h, d) {
    const bw = w * 0.85, bh = h * 0.8, bd = Math.min(d, w) * 0.15;
    for (let i = 0; i < 3; i++) {
      const card = mesh(new THREE.BoxGeometry(bw, bh, bd), mat(i === 1 ? tint(c, 0.85) : c, 0.6), 0, bh / 2, (i - 1) * bd * 1.1);
      card.rotation.x = -0.12;
      g.add(card);
    }
    g.add(mesh(new THREE.PlaneGeometry(bw * 0.6, bh * 0.25), mat(WHITE), 0, bh * 0.6, bd * 1.7));
  },
  noodle(g, c, w, h, d) {
    // Gói mì dẹt nằm chồng, mép răng cưa hai đầu, mặt trước có ô hình tô mì
    const bw = w * 0.9, bd = Math.min(d, w * 1.1) * 0.85, ph = Math.min(h * 0.22, bw * 0.22);
    for (let i = 0; i < 3; i++) {
      const y = ph * (i + 0.5);
      const pack = mesh(new THREE.BoxGeometry(bw * 0.86, ph * 0.92, bd), mat(c, 0.35), 0, y);
      pack.rotation.y = (i - 1) * 0.06;
      g.add(pack);
      for (const x of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(bw * 0.07, ph * 0.45, bd * 0.98), mat(tint(c, 0.8), 0.35), x * bw * 0.46, y));
      g.add(mesh(new THREE.PlaneGeometry(bw * 0.4, ph * 0.6), mat(0xffe08a, 0.5), -bw * 0.12, y, bd / 2 + 0.002));
      g.add(mesh(new THREE.PlaneGeometry(bw * 0.18, ph * 0.5), mat(0xc0392b, 0.5), bw * 0.24, y, bd / 2 + 0.002));
    }
  },
  lollipop(g, c, w, h, d) {
    // Hũ nhựa trong cắm đầy kẹo mút nhiều màu
    const r = Math.min(w, d) * 0.4;
    const jh = h * 0.4;
    g.add(mesh(new THREE.CylinderGeometry(r, r * 0.9, jh, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.1 }), 0, jh / 2));
    g.add(mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.03, jh * 0.12, 14), mat(tint(c, 0.8), 0.4), 0, jh));
    const colors = [c, 0xffd32a, 0x0be881, 0x48dbfb, 0xff9f43, 0xa29bfe];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const rr = i === 6 ? 0 : r * 0.5;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      const top = jh + h * (i === 6 ? 0.42 : 0.3);
      g.add(mesh(new THREE.CylinderGeometry(r * 0.04, r * 0.04, top, 5), mat(WHITE, 0.5), x, top / 2, z));
      const candy = mesh(new THREE.SphereGeometry(r * 0.3, 10, 8), mat(colors[i % colors.length], 0.3), x, top + r * 0.2, z);
      candy.scale.z = 0.6;
      g.add(candy);
    }
  },
  water(g, c, w, h, d) {
    // Chai nước suối trong suốt xanh nhạt, nhãn theo màu món, nắp xanh dương
    petBottle(g, glass(0xcfeefc, 0.5), c, 0x1e6fd9, w, h, d);
  },
  soda(g, c, w, h, d) {
    // Chai nước ngọt: nước nâu sẫm bên trong, nhãn và nắp theo màu món
    petBottle(g, glass(0xffffff, 0.3), c, c, w, h, d, 0x3b1f12);
  },
  oil(g, c, w, h, d) {
    // Can dầu ăn vàng óng, nhãn xanh lá, nắp đỏ và quai xách
    const bw = w * 0.7, bd = Math.min(d, w) * 0.5, bh = h * 0.72;
    g.add(mesh(new THREE.BoxGeometry(bw, bh, bd), glass(0xffd54f, 0.8), 0, bh / 2));
    g.add(mesh(new THREE.BoxGeometry(bw * 1.01, bh * 0.4, bd * 1.01), mat(0x2e7d32, 0.5), 0, bh * 0.45));
    g.add(mesh(new THREE.PlaneGeometry(bw * 0.5, bh * 0.2), mat(c, 0.4), 0, bh * 0.45, bd * 0.51 + 0.002));
    g.add(mesh(new THREE.CylinderGeometry(bw * 0.12, bw * 0.12, h * 0.1, 10), mat(0xd32f2f, 0.5), -bw * 0.22, bh + h * 0.05));
    g.add(mesh(new THREE.TorusGeometry(bw * 0.16, bw * 0.04, 6, 10, Math.PI), glass(0xffd54f, 0.9), bw * 0.15, bh));
  },
  sauce(g, c, w, h, d) {
    // Chai nước chấm cao thon, nước sẫm theo màu món, nhãn trắng viền màu, nắp đỏ
    const r = Math.min(w, d) * 0.3;
    const bodyH = h * 0.62;
    g.add(mesh(new THREE.CylinderGeometry(r, r, bodyH, 14), glass(tint(c, 0.6), 0.85), 0, bodyH / 2));
    g.add(mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, bodyH * 0.45, 14), mat(WHITE, 0.5), 0, bodyH * 0.5));
    g.add(mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.03, bodyH * 0.12, 14), mat(c, 0.5), 0, bodyH * 0.5));
    g.add(mesh(new THREE.CylinderGeometry(r * 0.35, r, h * 0.18, 14), glass(tint(c, 0.6), 0.85), 0, bodyH + h * 0.09));
    g.add(mesh(new THREE.CylinderGeometry(r * 0.38, r * 0.38, h * 0.14, 10), mat(0xc62828, 0.5), 0, h * 0.88));
  },
  candy(g, c, w, h, d) {
    // Hũ nhựa trong đầy kẹo bọc giấy nhiều màu, nắp theo màu món
    const r = Math.min(w, d) * 0.42;
    const jh = h * 0.72;
    g.add(mesh(new THREE.CylinderGeometry(r, r, jh, 16), glass(0xffffff, 0.3), 0, jh / 2));
    g.add(mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.05, h * 0.12, 16), mat(c, 0.4), 0, jh + h * 0.06));
    const colors = [c, 0xffd32a, 0x0be881, 0x48dbfb, 0xff9f43, 0xa29bfe];
    let i = 0;
    for (let y = r * 0.25; y < jh * 0.85; y += r * 0.42) {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + y * 7;
        const piece = mesh(new THREE.SphereGeometry(r * 0.2, 8, 6), mat(colors[i++ % colors.length], 0.3), Math.cos(a) * r * 0.55, y, Math.sin(a) * r * 0.55);
        piece.scale.x = 1.5;
        g.add(piece);
      }
    }
  },
  biscuit(g, c, w, h, d) {
    // Hộp bánh nằm ngang: vỏ màu món, mặt trước có chồng bánh vàng và ô nhãn trắng
    const bw = w * 0.9, bh = h * 0.5, bd = Math.min(d, w) * 0.75;
    g.add(mesh(new THREE.BoxGeometry(bw, bh, bd), mat(c, 0.45), 0, bh / 2));
    g.add(mesh(new THREE.BoxGeometry(bw * 1.01, bh * 0.18, bd * 1.01), mat(tint(c, 0.7), 0.45), 0, bh * 0.91));
    for (let i = 0; i < 4; i++) {
      const cookie = mesh(new THREE.CylinderGeometry(bh * 0.26, bh * 0.26, bw * 0.05, 14), mat(0xd9a05b, 0.8), -bw * 0.2 + i * bw * 0.13, bh * 0.45, bd / 2 + 0.004);
      cookie.rotation.z = Math.PI / 2;
      g.add(cookie);
    }
    g.add(mesh(new THREE.PlaneGeometry(bw * 0.28, bh * 0.3), mat(WHITE, 0.5), bw * 0.3, bh * 0.45, bd / 2 + 0.002));
  },
  shaker(g, c, w, h, d) {
    // Cặp lọ gia vị: thân trong thấy bột theo màu món, nắp rắc đỏ, nhãn trắng
    const r = Math.min(w, d) * 0.3;
    const bh = h * 0.6;
    for (const x of [-r * 1.1, r * 1.1]) {
      g.add(mesh(new THREE.CylinderGeometry(r, r, bh, 12), glass(0xffffff, 0.35), x, bh / 2));
      g.add(mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, bh * 0.75, 12), mat(c, 0.9), x, bh * 0.38));
      g.add(mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.05, h * 0.14, 12), mat(0xc62828, 0.4), x, bh + h * 0.07));
      g.add(mesh(new THREE.PlaneGeometry(r * 1.4, bh * 0.35), mat(WHITE, 0.5), x, bh * 0.45, r + 0.003));
    }
  },
  soap(g, c, w, h, d) {
    // Chồng bánh xà phòng gói giấy, bánh trên cùng để trần bo tròn
    const bw = w * 0.75, bd = Math.min(d, w) * 0.55, sh = h * 0.18;
    for (let i = 0; i < 2; i++) {
      g.add(mesh(new THREE.BoxGeometry(bw, sh, bd), mat(WHITE, 0.6), 0, sh * (i + 0.5)));
      g.add(mesh(new THREE.BoxGeometry(bw * 0.4, sh * 1.01, bd * 1.01), mat(c, 0.5), 0, sh * (i + 0.5)));
    }
    const bar = mesh(new THREE.CapsuleGeometry(bd * 0.4, bw * 0.45, 4, 10), mat(light(c), 0.3), 0, sh * 2.45);
    bar.rotation.z = Math.PI / 2;
    bar.scale.set(1, 0.55, 1);
    g.add(bar);
  },
  pump(g, c, w, h, d) {
    // Chai dẹt có vòi nhấn (dầu gội, sữa tắm, nước rửa chén)
    const bw = w * 0.6, bd = Math.min(d, w) * 0.4, bh = h * 0.65;
    const body = mesh(new THREE.CylinderGeometry(bw / 2, bw / 2, bh, 16), mat(c, 0.25), 0, bh / 2);
    body.scale.z = bd / bw;
    g.add(body);
    g.add(mesh(new THREE.PlaneGeometry(bw * 0.6, bh * 0.4), mat(WHITE, 0.5), 0, bh * 0.5, bd / 2 + 0.003));
    g.add(mesh(new THREE.CylinderGeometry(bw * 0.18, bw * 0.22, h * 0.08, 10), mat(WHITE, 0.4), 0, bh + h * 0.04));
    g.add(mesh(new THREE.CylinderGeometry(bw * 0.05, bw * 0.05, h * 0.14, 6), mat(WHITE, 0.4), 0, bh + h * 0.15));
    g.add(mesh(new THREE.BoxGeometry(bw * 0.45, h * 0.05, bw * 0.12), mat(WHITE, 0.4), bw * 0.15, bh + h * 0.22));
  },
  lighter(g, c, w, h, d) {
    // Khay trưng bày cắm hai hàng bật lửa nhiều màu, đầu bánh xe bạc
    const bw = w * 0.9, bd = Math.min(d, w) * 0.7, th = h * 0.3;
    g.add(mesh(new THREE.BoxGeometry(bw, th, bd), mat(c, 0.6), 0, th / 2));
    const colors = [0xe74c3c, 0xf1c40f, 0x3498db, 0x2ecc71, 0x9b59b6];
    for (let i = 0; i < 5; i++) for (const z of [-0.22, 0.22]) {
      const x = -bw * 0.36 + i * bw * 0.18;
      g.add(mesh(new THREE.BoxGeometry(bw * 0.13, h * 0.4, bd * 0.3), mat(colors[(i + (z > 0 ? 2 : 0)) % 5], 0.3), x, th + h * 0.15, z * bd));
      g.add(mesh(new THREE.BoxGeometry(bw * 0.13, h * 0.1, bd * 0.3), mat(0xb2bec3, 0.3, 0.7), x, th + h * 0.4, z * bd));
    }
  },
  battery(g, c, w, h, d) {
    // Vỉ pin: tấm bìa màu món, 4 viên pin đen đầu đồng
    const bw = w * 0.8, bh = h * 0.85, bd = Math.min(d, w) * 0.1;
    g.add(mesh(new THREE.BoxGeometry(bw, bh, bd), mat(c, 0.6), 0, bh / 2));
    for (let i = 0; i < 4; i++) {
      const x = -bw * 0.3 + i * bw * 0.2;
      g.add(mesh(new THREE.CylinderGeometry(bw * 0.07, bw * 0.07, bh * 0.45, 10), mat(0x2d3436, 0.3, 0.5), x, bh * 0.4, bd));
      g.add(mesh(new THREE.CylinderGeometry(bw * 0.071, bw * 0.071, bh * 0.15, 10), mat(0xf39c12, 0.3, 0.6), x, bh * 0.58, bd));
    }
  },
  toothpaste(g, c, w, h, d) {
    // Ba hộp kem đánh răng dựng đứng: nền trắng, dải màu món, sọc đỏ
    const bw = Math.min(w, d) * 0.3;
    for (const x of [-bw * 1.1, 0, bw * 1.1]) {
      g.add(mesh(new THREE.BoxGeometry(bw, h * 0.85, bw), mat(WHITE, 0.5), x, h * 0.425));
      g.add(mesh(new THREE.BoxGeometry(bw * 1.01, h * 0.5, bw * 1.01), mat(c, 0.4), x, h * 0.45));
      g.add(mesh(new THREE.BoxGeometry(bw * 1.02, h * 0.08, bw * 1.02), mat(0xe74c3c, 0.4), x, h * 0.75));
    }
  },
  chips(g, c, w, h, d) {
    // Túi snack phồng bóng: hai mép răng cưa trên dưới, mặt trước có miếng khoai vàng
    const bw = w * 0.85, bh = h * 0.85, bd = Math.min(d, w) * 0.45;
    const bag = mesh(new THREE.CapsuleGeometry(0.5, 0.6, 6, 12), mat(c, 0.3, 0.2), 0, bh / 2);
    bag.scale.set(bw, bh / 1.6, bd);
    g.add(bag);
    for (const y of [bh * 0.05, bh * 0.95]) g.add(mesh(new THREE.BoxGeometry(bw * 0.9, bh * 0.07, bd * 0.15), mat(tint(c, 0.75), 0.4, 0.3), 0, y));
    const chip = mesh(new THREE.CircleGeometry(bw * 0.2, 10), mat(0xf6c453, 0.6), 0, bh * 0.45, bd / 2 + 0.005);
    chip.scale.y = 0.7;
    g.add(chip);
    g.add(mesh(new THREE.PlaneGeometry(bw * 0.55, bh * 0.12), mat(WHITE, 0.5), 0, bh * 0.72, bd * 0.47 + 0.004));
  },
  sack(g, c, w, h, d) {
    // Bao nhựa đứng (gạo, đường, bột): thân trắng, dải màu món, miệng may chỉ
    const bw = w * 0.85, bh = h * 0.85, bd = Math.min(d, w) * 0.6;
    g.add(mesh(new THREE.BoxGeometry(bw, bh, bd), mat(WHITE, 0.85), 0, bh / 2));
    g.add(mesh(new THREE.BoxGeometry(bw * 1.01, bh * 0.35, bd * 1.01), mat(c, 0.7), 0, bh * 0.42));
    g.add(mesh(new THREE.BoxGeometry(bw * 0.95, bh * 0.06, bd * 0.5), mat(tint(c, 0.6), 0.8), 0, bh * 1.01));
    g.add(mesh(new THREE.PlaneGeometry(bw * 0.45, bh * 0.12), mat(0xc0392b, 0.6), 0, bh * 0.75, bd / 2 + 0.002));
  },
  notebook(g, c, w, h, d) {
    // Chồng vở bìa màu, gáy giấy trắng, bút bi đặt trên cùng
    const bw = w * 0.8, bd = Math.min(d, w) * 0.85, th = h * 0.08;
    for (let i = 0; i < 4; i++) {
      const book = mesh(new THREE.BoxGeometry(bw, th, bd), mat(i % 2 ? c : light(c), 0.7), 0, th * (i + 0.5));
      book.rotation.y = (i % 2 ? 1 : -1) * 0.05;
      g.add(book);
    }
    const pen = mesh(new THREE.CylinderGeometry(th * 0.25, th * 0.25, bw * 0.8, 8), mat(0x1e6fd9, 0.4), 0, th * 4.3);
    pen.rotation.z = Math.PI / 2;
    g.add(pen);
  },
  coffee(g, c, w, h, d) {
    // Túi cà phê/trà đáy đứng: nếp gập miệng túi, ô nhãn kem, van thoát hơi
    const bw = w * 0.7, bh = h * 0.78, bd = Math.min(d, w) * 0.45;
    g.add(mesh(new THREE.BoxGeometry(bw, bh, bd), mat(c, 0.5, 0.15), 0, bh / 2));
    g.add(mesh(new THREE.BoxGeometry(bw * 1.02, bh * 0.1, bd * 0.4), mat(tint(c, 0.7), 0.5), 0, bh * 1.04));
    g.add(mesh(new THREE.PlaneGeometry(bw * 0.7, bh * 0.3), mat(0xf5e6c8, 0.6), 0, bh * 0.45, bd / 2 + 0.002));
    g.add(mesh(new THREE.CircleGeometry(bw * 0.08, 10), mat(0x2d3436, 0.4), 0, bh * 0.78, bd / 2 + 0.003));
  },
  umbrella(g, c, w, h, d) {
    // Ô gấp dựng đứng: thân vải bó lại, cán cong
    const r = Math.min(w, d) * 0.2;
    for (const x of [-r * 1.3, r * 1.3]) {
      const body = mesh(new THREE.CylinderGeometry(r * 0.25, r, h * 0.62, 8), mat(c, 0.7), x, h * 0.31 + h * 0.08);
      g.add(body);
      g.add(mesh(new THREE.BoxGeometry(r * 1.6, h * 0.04, r * 0.3), mat(tint(c, 0.6)), x, h * 0.42));
      g.add(mesh(new THREE.CylinderGeometry(r * 0.12, r * 0.12, h * 0.22, 6), mat(0x2d3436, 0.4), x, h * 0.82));
      const hook = mesh(new THREE.TorusGeometry(r * 0.35, r * 0.12, 6, 10, Math.PI), mat(0x2d3436, 0.4), x + r * 0.35, h * 0.93);
      g.add(hook);
      g.add(mesh(new THREE.ConeGeometry(r * 0.25, h * 0.08, 6), mat(0xb2bec3, 0.3, 0.6), x, h * 0.04));
    }
  },
};

const templates = new Map<string, THREE.Group>();

/**
 * Gộp các mesh cùng vật liệu của mẫu thành đúng 1 hình mỗi vật liệu.
 * Một kệ có thể bày cả nghìn hộp hàng: không gộp thì mỗi hộp tốn vài draw call,
 * gộp xong mỗi hộp chỉ còn 1–2. Trả về nhóm mới, mẫu gốc bị hủy hình cũ.
 */
function bakeTemplate(tpl: THREE.Group): THREE.Group {
  tpl.updateMatrixWorld(true);
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  tpl.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const list = byMat.get(o.material) ?? [];
    list.push(o.geometry.clone().applyMatrix4(o.matrixWorld));
    byMat.set(o.material, list);
  });
  const baked = new THREE.Group();
  try {
    for (const [material, geos] of byMat) {
      const merged = geos.length > 1 ? mergeGeometries(geos, false) : geos[0];
      if (!merged) throw new Error('geometry không gộp được');
      baked.add(new THREE.Mesh(merged, material));
      if (geos.length > 1) for (const geo of geos) geo.dispose();
    }
  } catch {
    // Hình dáng lạ không gộp được (thuộc tính lẻ loi): dùng nguyên mẫu gốc cho an toàn
    return tpl;
  }
  tpl.traverse((o) => {
    if (o instanceof THREE.Mesh) o.geometry.dispose();
  });
  return baked;
}

/** Mô hình 3D của một món hàng, vừa trong khung w×h×d (dùng chung hình học/vật liệu, clone rẻ). */
export function createProductModel(productId: string, w: number, h: number, d: number): THREE.Group {
  const key = `${productId}|${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
  let tpl = templates.get(key);
  if (!tpl) {
    const p = productById(productId);
    const raw = new THREE.Group();
    BUILD[shapeOf(p)](raw, p.color, w, h, d);
    // Hàng nhỏ xíu trên kệ không cần đổ bóng: bỏ để nửa số draw call của cả đống hàng
    tpl = bakeTemplate(raw);
    tpl.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = false;
    });
    templates.set(key, tpl);
  }
  return tpl.clone();
}

/** Các phần (geometry + vật liệu) của mẫu đã bake cho một món hàng — dùng chung, KHÔNG dispose theo từng kệ. */
export function productParts(productId: string, w: number, h: number, d: number): { geometry: THREE.BufferGeometry; material: THREE.Material }[] {
  const key = `${productId}|${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
  if (!templates.has(key)) createProductModel(productId, w, h, d);
  const parts: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];
  templates.get(key)!.traverse((o) => {
    if (o instanceof THREE.Mesh) parts.push({ geometry: o.geometry, material: o.material });
  });
  return parts;
}
