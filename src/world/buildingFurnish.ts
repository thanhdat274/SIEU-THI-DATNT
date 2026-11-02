import * as THREE from 'three';
import { qrTexture, screenTexture, signTexture } from './buildingTextures';

/** Màu hộp/chai hàng lặt vặt bày ở mặt quầy phía khách (kẹo, dầu gội, khăn giấy...). */
const IMPULSE_COLORS = [0xe84393, 0x0984e3, 0x00b894, 0xfdcb6e, 0xe17055, 0x6c5ce7, 0xffffff, 0xd63031];

/**
 * Quầy thu ngân kiểu siêu thị mini: chân đế trắng, thân gỗ sáng, mặt khách là các ô kệ bày hàng lặt vặt,
 * giữa quầy có tấm bảng "THU NGÂN" nhô cao, máy tính tiền và khay đặt hàng trên mặt quầy.
 * Gốc ở sàn; dài theo x (`w`), khách đứng phía −z, thu ngân đứng phía +z.
 */
/** Quạt trần: ty treo, bầu motor và 4 cánh gỗ (nhóm 'blades' để quay). */
export function createCeilingFan(h: number): THREE.Group {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.35, metalness: 0.6 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8d5a3b, roughness: 0.7 });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8), metal);
  rod.position.y = h - 0.2;
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.05, 14), metal);
  canopy.position.y = h - 0.03;
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.14, 16), metal);
  motor.position.y = h - 0.45;
  const blades = new THREE.Group();
  blades.name = 'blades';
  blades.position.y = h - 0.48;
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.rotation.y = (i / 4) * Math.PI * 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.15), wood);
    blade.position.x = 0.45;
    blade.rotation.x = 0.12;
    arm.add(blade);
    blades.add(arm);
  }
  g.add(rod, canopy, motor, blades);
  return g;
}

/** Máy lạnh treo tường: dàn lạnh trắng, khe gió, cánh đảo gió, đèn báo xanh; mặt quay vào phòng (+z). */
export function createAirCon(): THREE.Group {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf7f8fa, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.22), white);
  body.position.z = 0.11;
  const vent = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0x9aa3ab }));
  vent.position.set(0, -0.1, 0.225);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.02, 0.06), white);
  flap.position.set(0, -0.15, 0.21);
  flap.rotation.x = -0.4;
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.015, 0.01), new THREE.MeshStandardMaterial({ color: 0x2ecc71, emissive: 0x2ecc71, emissiveIntensity: 1.5 }));
  led.position.set(0.38, 0.05, 0.225);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 8), white);
  pipe.position.set(0.42, -0.55, 0.03);
  g.add(body, vent, flap, led, pipe);
  return g;
}

export function createCounter(w = 1.6, d = 0.7): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0xf0c890, roughness: 0.7 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0xd9a865, roughness: 0.75 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.6 });
  const box = (bw: number, bh: number, bd: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = g) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);
    b.position.set(x, y, z);
    b.castShadow = true;
    b.receiveShadow = true;
    parent.add(b);
    return b;
  };
  const H = 0.95; // mặt quầy
  const base = 0.12;
  // Chân đế trắng thụt vào một chút như ảnh mẫu
  box(w - 0.04, base, d - 0.04, white, 0, base / 2, 0);
  // Thân: lưng gỗ ở giữa, hai bên là ô kệ mở về phía khách
  const bodyH = H - base - 0.04;
  const bodyY = base + bodyH / 2;
  box(w, bodyH, 0.04, wood, 0, bodyY, 0.02); // vách giữa ngăn đôi quầy
  box(w, bodyH, d / 2 - 0.02, woodDark, 0, bodyY, d / 4 + 0.03); // nửa phía thu ngân: tủ kín
  // Mặt tủ phía thu ngân: hai cánh ngăn kéo có tay nắm
  for (const x of [-w / 4, w / 4]) {
    box(w / 2 - 0.06, bodyH * 0.42, 0.01, wood, x, base + bodyH * 0.72, d / 2 + 0.005);
    box(0.16, 0.025, 0.02, white, x, base + bodyH * 0.72, d / 2 + 0.015);
  }
  // Ô kệ phía khách: 2 tầng × 3 cột, có vách ngăn và hàng bày sẵn
  const cols = 3;
  const shelfD = d / 2 - 0.02;
  const zShelf = -shelfD / 2;
  for (let i = 0; i <= cols; i++) box(0.035, bodyH, shelfD, wood, -w / 2 + 0.0175 + (i * (w - 0.035)) / cols, bodyY, zShelf);
  const rows = [base + 0.02, base + bodyH / 2];
  for (const y of rows) box(w, 0.025, shelfD, wood, 0, y, zShelf);
  const cellW = (w - 0.035 * (cols + 1)) / cols;
  let k = 0;
  for (let c = 0; c < cols; c++) {
    const cx = -w / 2 + 0.035 + cellW / 2 + c * (cellW + 0.035);
    for (const y of rows) {
      const n = 4;
      const itemW = cellW / n - 0.015;
      const bottle = (c + Math.round(y * 10)) % 2 === 0;
      const ih = bottle ? bodyH / 2 - 0.12 : bodyH / 2 - 0.16;
      for (let j = 0; j < n; j++) {
        const m = new THREE.MeshStandardMaterial({ color: IMPULSE_COLORS[k++ % IMPULSE_COLORS.length], roughness: 0.5 });
        const x = cx - cellW / 2 + itemW / 2 + 0.0075 + j * (itemW + 0.015);
        if (bottle) {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(itemW * 0.42, itemW * 0.45, ih, 8), m);
          b.position.set(x, y + 0.0125 + ih / 2, zShelf - 0.02);
          b.castShadow = true;
          g.add(b);
        } else {
          box(itemW, ih, shelfD * 0.7, m, x, y + 0.0125 + ih / 2, zShelf - 0.01);
        }
      }
    }
  }
  // Thanh chắn hàng phía trước mỗi tầng
  for (const y of rows) box(w, 0.02, 0.01, white, 0, y + 0.07, -d / 2 + 0.01);
  // Mặt quầy gỗ, chìa ra một chút
  box(w + 0.06, 0.04, d + 0.06, wood, 0, H - 0.02, 0);
  // Bảng "THU NGÂN" nhô cao giữa quầy, quay về phía khách
  const towerW = Math.min(0.5, w * 0.3);
  box(towerW, 0.32, 0.05, wood, -0.1, H + 0.16, -d / 2 + 0.06);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(towerW - 0.06, 0.16), new THREE.MeshBasicMaterial({ map: signTexture('THU NGÂN') }));
  sign.position.set(-0.1, H + 0.2, -d / 2 + 0.034);
  sign.rotation.y = Math.PI;
  g.add(sign);
  // Máy tính tiền ở đầu quầy phía thu ngân
  // Hai máy tính tiền, mỗi máy đúng chỗ một thu ngân đứng (xem cashierSpot trong staff.ts: lệch ±0.4 so với giữa quầy)
  // Mẫu máy tính tiền cũng lấy +z làm phía thu ngân nên giữ nguyên chiều: màn chính quay về thu ngân, màn phụ về khách
  for (const rx of [-0.4, 0.4]) {
    const pos = createRegister();
    pos.position.set(rx, H, 0.1);
    g.add(pos);
  }
  // Khay đặt hàng của khách (phía khách) và bảng mã QR thanh toán
  box(0.5, 0.012, d * 0.35, new THREE.MeshStandardMaterial({ color: 0x2d3436 }), 0.1, H + 0.006, -0.12);
  const qr = new THREE.Group();
  qr.position.set(-0.1 + towerW / 2 + 0.12, H, -d / 2 + 0.12);
  qr.rotation.x = -0.25;
  box(0.12, 0.16, 0.012, new THREE.MeshStandardMaterial({ color: 0x00b894 }), 0, 0.08, 0, qr);
  const code = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), new THREE.MeshBasicMaterial({ map: qrTexture() }));
  code.position.set(0, 0.07, -0.007);
  code.rotation.y = Math.PI;
  qr.add(code);
  g.add(qr);
  return g;
}

/**
 * Máy tính tiền kiểu quầy ngoài đời: màn hình cảm ứng cho thu ngân, màn phụ quay về khách,
 * ngăn kéo đựng tiền, máy in hóa đơn, máy quẹt thẻ và súng quét mã vạch.
 * Gốc ở mặt quầy, thu ngân đứng phía +z.
 */
export function createRegister(): THREE.Group {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.5 });
  const grey = new THREE.MeshStandardMaterial({ color: 0xb2bec3, roughness: 0.6 });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = true;
    g.add(b);
    return b;
  };
  // Ngăn kéo tiền, có tay nắm phía thu ngân
  box(0.46, 0.1, 0.42, dark, 0, 0.05, 0);
  box(0.16, 0.02, 0.02, grey, 0, 0.05, 0.215);
  // Chân + màn hình chính nghiêng về thu ngân, hiện số tiền
  box(0.06, 0.18, 0.06, grey, 0, 0.19, -0.05);
  const screen = new THREE.Group();
  screen.position.set(0, 0.36, -0.03);
  screen.rotation.x = -0.35;
  g.add(screen);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.03), dark);
  frame.castShadow = true;
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.26), new THREE.MeshBasicMaterial({ map: screenTexture('#0984e3', 'TỔNG', '125.000đ') }));
  display.position.z = 0.016;
  screen.add(frame, display);
  // Màn phụ nhỏ quay về phía khách
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.12), new THREE.MeshBasicMaterial({ map: screenTexture('#00b894', 'CẢM ƠN', 'QUÝ KHÁCH') }));
  back.position.set(0, 0.03, -0.016);
  back.rotation.y = Math.PI;
  screen.add(back);
  // Máy in hóa đơn bên phải, có cuộn giấy thò ra
  box(0.16, 0.12, 0.18, grey, 0.33, 0.06, 0);
  box(0.08, 0.004, 0.1, new THREE.MeshStandardMaterial({ color: 0xffffff }), 0.33, 0.123, 0.08);
  // Máy quẹt thẻ bên trái
  box(0.08, 0.03, 0.14, dark, -0.32, 0.015, 0.08);
  box(0.06, 0.003, 0.04, new THREE.MeshBasicMaterial({ color: 0x55efc4 }), -0.32, 0.032, 0.05);
  // Súng quét mã vạch nằm cạnh
  const gun = box(0.05, 0.05, 0.16, new THREE.MeshStandardMaterial({ color: 0xfdcb6e }), -0.32, 0.025, -0.12);
  gun.rotation.y = 0.4;
  return g;
}
