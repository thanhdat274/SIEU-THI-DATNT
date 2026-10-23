import * as THREE from 'three';
import { productById, type Product } from '../data/products';

/** Kiểu dáng bày trên kệ; chọn theo tên món, không khớp thì theo ngành hàng. */
type Shape =
  | 'bottle' | 'can' | 'carton' | 'packet' | 'box' | 'jar' | 'cup' | 'tub' | 'bag' | 'roll'
  | 'eggs' | 'fruit' | 'bunch' | 'long' | 'melon' | 'meat' | 'icecream' | 'pot' | 'tube' | 'flat' | 'banana'
  | 'noodle' | 'lollipop' | 'umbrella';

/** Khớp theo nguyên từ (tên đã bỏ dấu), luật trên thắng luật dưới. */
const RULES: [RegExp, Shape][] = [
  // Ưu tiên: tên chứa từ dễ bị luật trái cây/rau bắt nhầm
  [/keo mut/, 'lollipop'],
  [/o du|du che/, 'umbrella'],
  [/mi goi|mi tom|pho goi|pho an lien|hu tieu goi|mien goi|bun kho|mi an lien/, 'noodle'],
  [/fanta|twister|fuze tea|betagen|nuoc ngot|tea|mam tom/, 'bottle'],
  [/snack|tom kho|bim bim|bap rang|kho (bo|ga|muc)|dua nao|xoi \w+ goi/, 'packet'],
  [/ca thu|muc|tom|vien tha|dong lanh/, 'meat'],
  [/dien gia dung|dao cao|nhang/, 'box'],
  [/sua bap/, 'carton'],
  [/xa lach/, 'bunch'],
  [/dau xanh/, 'bag'],
  [/kem que|oc que/, 'icecream'],
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
    for (let i = 0; i < 3; i++) {
      const b = mesh(new THREE.TorusGeometry(w * 0.35, Math.min(h, d) * 0.08, 6, 12, Math.PI * 0.7), mat(0xf6d743, 0.5), 0, h * 0.5, (i - 1) * d * 0.15);
      b.rotation.z = Math.PI * 1.15;
      g.add(b);
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
    const bw = w * 0.8, bh = h * 0.22, bd = Math.min(d, w) * 0.85;
    for (let i = 0; i < 3; i++) {
      g.add(mesh(new THREE.BoxGeometry(bw, bh * 0.9, bd), mat(i % 2 ? WHITE : c, 0.35), 0, bh * (i + 0.5)));
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

/** Mô hình 3D của một món hàng, vừa trong khung w×h×d (dùng chung hình học/vật liệu, clone rẻ). */
export function createProductModel(productId: string, w: number, h: number, d: number): THREE.Group {
  const key = `${productId}|${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
  let tpl = templates.get(key);
  if (!tpl) {
    const p = productById(productId);
    tpl = new THREE.Group();
    BUILD[shapeOf(p)](tpl, p.color, w, h, d);
    tpl.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true;
    });
    templates.set(key, tpl);
  }
  return tpl.clone();
}
