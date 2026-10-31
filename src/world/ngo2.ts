import * as THREE from 'three';
import { asphaltTexture } from './world';

/**
 * Ngõ 2 (GĐ500, bước 2 mở rộng bản đồ): mặt đất x 80..120, đường chính nối dài, rào chắn + biển RAO BÁN
 * ở ranh x=80 khi chưa mở; mở rồi thì bỏ rào, hiện các lô trống chờ sạp hàng rong (bước 3).
 * Tải lười, chỉ hình ảnh — chặn đi lại do `zoneBlockRects` lo.
 */
export interface Ngo2View { group: THREE.Group; setOpen(open: boolean): void; /** GĐ501: số lô đã có sạp hàng rong. */ setStalls(n: number): void }

const mat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });

function signTexture(text: string, bg: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#fff';
    ctx.font = '800 34px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 44);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function board(text: string, bg: string) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 0.1), mat(0x8b5a2b));
  post.position.y = 0.65;
  const b = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.38), new THREE.MeshStandardMaterial({ map: signTexture(text, bg), side: THREE.DoubleSide }));
  b.position.y = 1.2;
  b.rotation.y = -Math.PI / 2;
  g.add(post, b);
  return g;
}

export function createNgo2(): Ngo2View {
  const group = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 80), mat(0x86b862));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(100, -0.005, 0);
  ground.receiveShadow = true;
  const roadTex = asphaltTexture();
  roadTex.repeat.set(40 / 8, 1);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 6), new THREE.MeshStandardMaterial({ map: roadTex }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(100, 0.01, 6);
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(40, 1.6), mat(0xbdb5a6));
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(100, 0.02, 2.2);
  group.add(ground, road, walk);

  // Rào chắn sọc đỏ trắng ngang đường ở x=80 + biển RAO BÁN
  const gate = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 2), mat(i % 2 ? 0xffffff : 0xd63031));
    bar.position.set(80, 0.8, 2 + i * 2);
    gate.add(bar);
  }
  for (const z of [1, 9]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, 0.15), mat(0x636e72));
    p.position.set(80, 0.5, z);
    gate.add(p);
  }
  const sale = board('RAO BÁN NGÕ 2', '#c0392b');
  sale.position.set(79.4, 0, 1.2);
  gate.add(sale);

  // Lô trống bên vỉa hè (bước 3 đặt sạp hàng rong)
  const lots = new THREE.Group();
  const signs: THREE.Group[] = [];
  const stalls: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const stall = new THREE.Group();
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 0.9), mat(0x9c6b3c));
    table.position.y = 0.4;
    const goods = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 0.6), mat([0xe17055, 0xfdcb6e, 0x00b894, 0x74b9ff][i]));
    goods.position.y = 0.88;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2), mat(0x636e72));
    pole.position.y = 1.1;
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.5, 8), mat([0xd63031, 0x0984e3, 0xe84393, 0x00cec9][i]));
    umb.position.y = 2.25;
    stall.add(table, goods, pole, umb);
    stall.position.set(86 + i * 8, 0, -0.5);
    stall.visible = false;
    stalls.push(stall);
    lots.add(stall);
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), mat(0xc8a96a));
    lot.rotation.x = -Math.PI / 2;
    lot.position.set(86 + i * 8, 0.015, -0.5);
    const sign = board('LÔ TRỐNG', '#27ae60');
    sign.position.set(84.3 + i * 8, 0, 0.6);
    signs.push(sign);
    lots.add(lot, sign);
  }
  group.add(gate, lots);
  return {
    group,
    setOpen(open) {
      gate.visible = !open;
      lots.visible = open;
    },
    setStalls(n) {
      stalls.forEach((s, i) => { s.visible = i < n; signs[i].visible = i >= n; });
    },
  };
}
