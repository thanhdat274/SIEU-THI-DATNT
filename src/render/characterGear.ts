/** Đồng phục, mũ và dụng cụ theo nghề của nhân vật chibi + vật liệu dùng chung (tách từ characterModel.ts, GĐ985). */
import * as THREE from 'three';
import type { CharacterArchetype } from './characterTypes';

export type JobArchetype = 'construction_worker' | 'nurse' | 'shipper' | 'chef' | 'young_mom' | 'security_guard' | 'teacher' | 'farmer' | 'athlete'
  | 'barber' | 'mechanic' | 'electrician' | 'police' | 'soldier' | 'barista' | 'doctor' | 'banker'
  | 'monk' | 'fisherman' | 'influencer' | 'taxi_driver' | 'bus_driver' | 'online_seller' | 'tailor';

/** Màu đồng phục theo nghề. */
export const JOB_UNIFORMS: Record<JobArchetype, { top: number; pants: number }> = {
  construction_worker: { top: 0xff7f1e, pants: 0x3b4a5c },
  nurse: { top: 0xf5f8fa, pants: 0xdfe8ee },
  shipper: { top: 0x00a651, pants: 0x2d3436 },
  chef: { top: 0xfafafa, pants: 0x2d3436 },
  young_mom: { top: 0xf8a5c2, pants: 0x546de5 },
  security_guard: { top: 0x4b6043, pants: 0x2f3b2a },
  teacher: { top: 0xffffff, pants: 0xffffff },
  farmer: { top: 0x8e5b3a, pants: 0x1e272e },
  athlete: { top: 0x00b8d4, pants: 0x222f3e },
  barber: { top: 0x7f8c8d, pants: 0x2c3e50 },
  mechanic: { top: 0x34495e, pants: 0x2f3640 },
  electrician: { top: 0xf39c12, pants: 0x2c3e50 },
  police: { top: 0x1a5276, pants: 0x10263c },
  soldier: { top: 0x4a6741, pants: 0x2f3b2a },
  barista: { top: 0x6b3fa0, pants: 0x2d3436 },
  doctor: { top: 0xf8f9fa, pants: 0xdfe8ee },
  banker: { top: 0x2c3e50, pants: 0x17202a },
  monk: { top: 0xf4a742, pants: 0xa04000 },
  fisherman: { top: 0xf1c40f, pants: 0x2c3e50 },
  influencer: { top: 0xff6b9d, pants: 0x2d3436 },
  taxi_driver: { top: 0x00b14f, pants: 0x2d3436 },
  bus_driver: { top: 0x2560ab, pants: 0x1e3a5f },
  online_seller: { top: 0xe67e22, pants: 0x34495e },
  tailor: { top: 0x8e6fb8, pants: 0x2d3436 },
};

export const isJob = (a: CharacterArchetype): a is JobArchetype => a in JOB_UNIFORMS;

export const OUTDOOR_JOBS: CharacterArchetype[] = ['worker_driver', 'construction_worker', 'shipper', 'farmer', 'athlete', 'fisherman'];

// Vật liệu đặc cho nhân vật: dùng CHUNG giữa mọi nhân vật mang cùng màu — nhân vật dựng/hủy
// liên tục quanh ngày mà vẫn tạo cùng số lượng material thì là phí shader; dùng chung thì mỗi
// tổ hợp (màu, nhám, kim loại) chỉ có 1 material.
const matCache = new Map<string, THREE.MeshStandardMaterial>();
const sharedMats = new Set<THREE.Material>();
/** Nhân vật đang chia sẻ vật liệu chung này — dispose không được hủy kẻo trắng mấy nhân vật khác. */
export const isSharedMaterial = (m: THREE.Material) => sharedMats.has(m);
export const mat = (color: number, roughness = 0.5, metalness = 0) => {
  const k = `${color}|${roughness}|${metalness}`;
  let m = matCache.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    matCache.set(k, m);
    sharedMats.add(m);
  }
  return m;
};

/** Mũ / nón đặc trưng của từng nghề. */
export function addJobHeadwear(job: JobArchetype, headGroup: THREE.Group, s: number) {
  const add = (mesh: THREE.Mesh, x: number, y: number, z: number) => {
    mesh.position.set(x * s, y * s, z * s);
    mesh.castShadow = true;
    headGroup.add(mesh);
    return mesh;
  };
  const dome = (color: number) =>
    add(new THREE.Mesh(new THREE.SphereGeometry(0.43 * s, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), mat(color, 0.35)), 0, 0.06, 0);

  if (job === 'construction_worker') {
    dome(0xf9ca24);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.5 * s, 0.03, 20), mat(0xf9ca24, 0.35)), 0, 0.1, 0.02);
  } else if (job === 'shipper') {
    dome(0x00a651);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.14 * s, 0.03), new THREE.MeshStandardMaterial({ color: 0x223344, transparent: true, opacity: 0.6 })), 0, 0.16, 0.4);
  } else if (job === 'chef') {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.36 * s, 0.38 * s, 0.14, 18), mat(0xffffff, 0.8)), 0, 0.34, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.34 * s, 16, 12), mat(0xffffff, 0.8)), 0, 0.58, 0).scale.set(1, 0.8, 1);
  } else if (job === 'nurse') {
    add(new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.12 * s, 0.14 * s), mat(0xffffff, 0.7)), 0, 0.42, 0.1);
    for (const [w, h] of [[0.08, 0.025], [0.025, 0.08]]) add(new THREE.Mesh(new THREE.BoxGeometry(w * s, h * s, 0.01), mat(0xe74c3c)), 0, 0.42, 0.175);
    // Khẩu trang y tế: tấm cong ôm nửa dưới mặt (che mũi, miệng), có nếp gấp và dây đeo ra sau tai.
    // Bán kính phải lớn hơn chóp mũi (≈0.42) để mũi, miệng nằm gọn bên trong; nới ngang theo đầu (×1.05)
    const maskMat = new THREE.MeshStandardMaterial({ color: 0xa8d8ea, roughness: 0.9, side: THREE.DoubleSide });
    const maskR = 0.43;
    add(new THREE.Mesh(new THREE.SphereGeometry(maskR * s, 24, 10, Math.PI / 2 - 0.8, 1.6, 1.6, 0.55), maskMat), 0, 0, 0).scale.x = 1.05;
    for (const t of [1.8, 1.98]) {
      const pleat = add(new THREE.Mesh(new THREE.TorusGeometry(maskR * Math.sin(t) * s + 0.004, 0.006 * s, 4, 24, 1.5), mat(0x86c1d6, 0.9)), 0, maskR * Math.cos(t), 0);
      pleat.rotation.set(Math.PI / 2, 0, -Math.PI / 2 - 0.75);
      pleat.scale.x = 1.05;
    }
    for (const side of [-1, 1]) {
      for (const y of [-0.03, -0.2]) {
        const strap = add(new THREE.Mesh(new THREE.BoxGeometry(0.012 * s, 0.012 * s, 0.32 * s), mat(0xf5f6fa, 0.8)), side * 0.36, y, 0.145);
        strap.rotation.y = -side * 0.39;
      }
    }
  } else if (job === 'security_guard') {
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.44 * s, 0.38 * s, 0.16, 18), mat(0x2f3b2a)), 0, 0.38, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.4 * s, 0.4 * s, 0.02, 16, 1, false, -Math.PI * 0.3, Math.PI * 0.6), mat(0x111111, 0.2)), 0, 0.31, 0.1);
    add(new THREE.Mesh(new THREE.CircleGeometry(0.05 * s, 6), mat(0xf1c40f, 0.3, 0.6)), 0, 0.4, 0.45);
  } else if (job === 'farmer') {
    add(new THREE.Mesh(new THREE.ConeGeometry(0.62 * s, 0.32 * s, 22), mat(0xe9c46a, 0.7)), 0, 0.44, 0);
  } else if (job === 'athlete') {
    add(new THREE.Mesh(new THREE.TorusGeometry(0.39 * s, 0.035, 8, 22), mat(0xff3f34, 0.6)), 0, 0.16, 0).rotation.x = Math.PI / 2;
  } else if (job === 'teacher') {
    add(new THREE.Mesh(new THREE.SphereGeometry(0.04 * s, 8, 8), mat(0xfdfdfd, 0.2, 0.3)), 0.22, 0.3, 0.22); // Kẹp tóc ngọc trai
  } else if (job === 'barber') {
    // Băng đô thợ cắt tóc
    add(new THREE.Mesh(new THREE.TorusGeometry(0.4 * s, 0.02, 6, 18), mat(0xd63031, 0.5)), 0, 0.12, 0).rotation.x = Math.PI / 2;
  } else if (job === 'mechanic') {
    // Mũ lưỡi trai thợ máy
    add(new THREE.Mesh(new THREE.SphereGeometry(0.43 * s, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(0x2f3640, 0.5)), 0, 0.06, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.42 * s, 0.42 * s, 0.015, 16, 1, false, -Math.PI * 0.3, Math.PI * 0.6), mat(0x2f3640, 0.5)), 0, 0.05, 0.15).rotation.x = 0.2;
  } else if (job === 'electrician') {
    // Mũ bảo hộ màu cam với dải sọc phản quang
    add(new THREE.Mesh(new THREE.SphereGeometry(0.45 * s, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), mat(0xf39c12, 0.3)), 0, 0.07, 0);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.44 * s, 0.025, 6, 20, Math.PI * 0.9), mat(0xffffff, 0.5)), 0, 0.09, 0.03).rotation.x = Math.PI / 2;
  } else if (job === 'police') {
    // Mũ kê-pi cảnh sát xanh
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.44 * s, 0.42 * s, 0.14, 18), mat(0x1a5276, 0.4)), 0, 0.3, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.46 * s, 0.46 * s, 0.03, 18), mat(0x154360, 0.3)), 0, 0.06, 0);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.43 * s, 0.02, 6, 20), mat(0xf1c40f, 0.4, 0.5)), 0, 0.23, 0).rotation.x = Math.PI / 2;
    add(new THREE.Mesh(new THREE.CircleGeometry(0.06 * s, 6), mat(0xf1c40f, 0.3, 0.6)), 0, 0.34, 0.42); // Phù hiệu
  } else if (job === 'soldier') {
    // Mũ cối bộ đội
    add(new THREE.Mesh(new THREE.SphereGeometry(0.45 * s, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(0x4a6741, 0.6)), 0, 0.07, 0);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.44 * s, 0.03, 6, 20), mat(0x39523a, 0.5)), 0, 0.12, 0.02).rotation.x = Math.PI / 2;
    add(new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.04 * s, 0.02), mat(0xd63031, 0.5)), 0.22, 0.2, 0.2); // Sao đỏ
  } else if (job === 'barista') {
    // Dải băng đô barista
    add(new THREE.Mesh(new THREE.TorusGeometry(0.4 * s, 0.02, 6, 18), mat(0x34495e, 0.5)), 0, 0.13, 0).rotation.x = Math.PI / 2;
  } else if (job === 'doctor') {
    // Mũ y tá + kẹp tóc, và băng gạc
    add(new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.12 * s, 0.14 * s), mat(0xffffff, 0.7)), 0, 0.42, 0.1);
    for (const [w, h] of [[0.08, 0.025], [0.025, 0.08]]) add(new THREE.Mesh(new THREE.BoxGeometry(w * s, h * s, 0.01), mat(0x27ae60)), 0, 0.42, 0.175);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.05 * s, 10, 8), mat(0xf1c40f, 0.5)), 0.22, 0.34, 0.18);
  } else if (job === 'banker') {
    // Tóc vuốt gọn + kính, chưa cần mũ
    add(new THREE.Mesh(new THREE.TorusGeometry(0.4 * s, 0.015, 6, 18), mat(0x1f3a93, 0.3, 0.4)), 0, 0.16, 0).rotation.x = Math.PI / 2;
  } else if (job === 'fisherman') {
    // Mũ mưa rộng vành vàng cá canh
    add(new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), mat(0xf1c40f, 0.4)), 0, 0.08, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.58 * s, 0.6 * s, 0.03, 22), mat(0xf1c40f, 0.4)), 0, 0.02, 0);
  } else if (job === 'influencer') {
    // Mũ lưỡi trai màu hồng ngược trông chất chơi
    const capMat = mat(0xff6b9d, 0.4);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), capMat), 0, 0.06, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.44 * s, 0.44 * s, 0.02, 16, 1, false, Math.PI * 0.7, Math.PI * 0.6), capMat), 0, 0.08, -0.16).rotation.x = -0.2;
  } else if (job === 'taxi_driver') {
    // Mũ lưỡi trai xanh lá của hãng xe công nghệ
    const capMat = mat(0x00b14f, 0.4);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), capMat), 0, 0.06, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.44 * s, 0.44 * s, 0.02, 16, 1, false, -Math.PI * 0.3, Math.PI * 0.6), capMat), 0, 0.08, 0.16).rotation.x = 0.2;
  } else if (job === 'bus_driver') {
    // Mũ kê-pi đồng phục tài xế
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.44 * s, 0.4 * s, 0.14, 18), mat(0x2560ab, 0.4)), 0, 0.36, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.46 * s, 0.46 * s, 0.03, 18), mat(0x1e3a5f, 0.35)), 0, 0.05, 0);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.43 * s, 0.018, 6, 20), mat(0xf1c40f, 0.4, 0.5)), 0, 0.29, 0).rotation.x = Math.PI / 2;
  } else if (job === 'online_seller') {
    // Băng đô buộc tóc gọn của chị đóng hàng
    add(new THREE.Mesh(new THREE.TorusGeometry(0.4 * s, 0.022, 6, 18), mat(0xd35400, 0.5)), 0, 0.13, 0).rotation.x = Math.PI / 2;
  }
}

/** Đồ nghề: phụ kiện trên người và vật cầm tay (gắn vào cẳng tay nên vung theo bước đi). */
export function addJobGear(job: JobArchetype, outfit: THREE.Group, rightHand: THREE.Group, leftHand: THREE.Group, bh: number, top: number) {
  const hold = (hand: THREE.Group, obj: THREE.Object3D, z = 0.06) => {
    obj.position.set(0, -0.22 * bh, z);
    hand.add(obj);
    return obj;
  };
  const wear = (geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat(color, 0.6));
    m.position.set(x, y * bh, z);
    m.castShadow = true;
    outfit.add(m);
    return m;
  };

  if (job === 'construction_worker') {
    // Sọc phản quang + bay xây
    for (const y of [0.6, 0.78]) wear(new THREE.TorusGeometry(0.27, 0.02, 6, 18), 0xdfe6e9, 0, y, 0).rotation.x = Math.PI / 2;
    const trowel = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.16), mat(0xb2bec3, 0.3, 0.7));
    blade.position.set(0, -0.05, 0.08);
    trowel.add(blade, new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6), mat(0x8b4513)));
    hold(rightHand, trowel);
  } else if (job === 'nurse') {
    // Bìa kẹp hồ sơ: tấm gỗ, tờ giấy có dòng kẻ, kẹp kim loại ở mép trên
    const clipboard = new THREE.Group();
    clipboard.add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.23, 0.012), mat(0xb5835a, 0.7)));
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.004), mat(0xffffff, 0.9));
    paper.position.set(0, -0.015, 0.008);
    clipboard.add(paper);
    for (let i = 0; i < 4; i++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.006, 0.002), mat(0x95a5a6));
      line.position.set(0, -0.03 - i * 0.03, 0.011);
      clipboard.add(line);
    }
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.02), mat(0xb2bec3, 0.3, 0.8));
    clip.position.set(0, 0.1, 0.012);
    clipboard.add(clip);
    hold(leftHand, clipboard, 0.1);
    wear(new THREE.TorusGeometry(0.14, 0.015, 6, 16, Math.PI), 0x2d3436, 0, 0.84, 0.18).rotation.z = Math.PI; // Ống nghe
  } else if (job === 'shipper') {
    wear(new THREE.BoxGeometry(0.42, 0.42, 0.34), 0x00a651, 0, 0.78, -0.36); // Thùng giao hàng
    wear(new THREE.BoxGeometry(0.3, 0.06, 0.01), 0xffffff, 0, 0.84, -0.535);
    hold(rightHand, new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.13, 0.015), mat(0x111111, 0.2)), 0.08); // Điện thoại
  } else if (job === 'chef') {
    wear(new THREE.BoxGeometry(0.4, 0.42, 0.03), 0x2d3436, 0, 0.56, 0.26); // Tạp dề
    const ladle = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6), mat(0xb2bec3, 0.3, 0.8));
    handle.position.y = 0.1;
    const cup = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0xb2bec3, 0.3, 0.8));
    cup.position.y = -0.05;
    ladle.add(handle, cup);
    hold(rightHand, ladle);
  } else if (job === 'young_mom') {
    // Em bé quấn khăn trước ngực + túi bỉm
    const baby = wear(new THREE.CapsuleGeometry(0.1, 0.14, 4, 10), 0xfff3b0, 0.02, 0.72, 0.3);
    baby.rotation.z = Math.PI / 2.4;
    const babyHead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), mat(0xfcd8be));
    babyHead.position.set(0, 0.16, 0.02);
    baby.add(babyHead);
    hold(leftHand, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.1), mat(0x9b59b6)), 0);
  } else if (job === 'security_guard') {
    hold(rightHand, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.34, 8), mat(0x111111, 0.3))).rotation.x = Math.PI / 2.5; // Dùi cui
    wear(new THREE.CircleGeometry(0.04, 5), 0xf1c40f, -0.12, 0.84, 0.26); // Phù hiệu
  } else if (job === 'teacher') {
    // Tà áo dài trước sau buông xuống gối
    wear(new THREE.BoxGeometry(0.36, 0.4, 0.02), top, 0, 0.3, 0.16);
    wear(new THREE.BoxGeometry(0.36, 0.4, 0.02), top, 0, 0.3, -0.16);
    hold(leftHand, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.05), mat(0xc0392b)), 0.08);
  } else if (job === 'farmer') {
    // Đòn gánh trên vai với hai thúng hai đầu
    const pole = wear(new THREE.CylinderGeometry(0.022, 0.022, 1.3, 8), 0xa0743a, 0, 0.98, -0.05);
    pole.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      const basket = wear(new THREE.CylinderGeometry(0.17, 0.12, 0.16, 12), 0xc49a5a, side * 0.6, 0.55, -0.05);
      const rope = wear(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 4), 0x6d4c2f, side * 0.6, 0.78, -0.05);
      basket.castShadow = rope.castShadow = true;
    }
  } else if (job === 'athlete') {
    hold(rightHand, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 10), mat(0x48dbfb, 0.2)), 0.04); // Bình nước
    wear(new THREE.BoxGeometry(0.06, 0.4, 0.02), 0xffffff, 0.1, 0.68, 0.24);
  } else if (job === 'barber') {
    // Lược + tông đơ trong tay
    const comb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.02), mat(0x111111, 0.2));
    hold(leftHand, comb, 0.08);
    const clipper = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.04), mat(0x333333, 0.3));
    body.position.y = -0.03;
    const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.05), mat(0xb2bec3, 0.5, 0.7));
    teeth.position.y = -0.12;
    clipper.add(body, teeth);
    hold(rightHand, clipper);
  } else if (job === 'mechanic') {
    // Quần yếm + dụng cụ
    wear(new THREE.BoxGeometry(0.34, 0.3, 0.02), 0x2f3640, 0, 0.5, 0.26); // Yếm
    wear(new THREE.BoxGeometry(0.08, 0.06, 0.04), 0xb2bec3, 0.18, 0.52, 0.28); // Túi đựng dụng cụ
    const wrench = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.02, 6, 12, Math.PI * 1.3), mat(0x95a5a6, 0.3, 0.8));
    hold(rightHand, wrench, 0.1);
  } else if (job === 'electrician') {
    // Kìm cách điện chỉ đỏ
    const pliers = new THREE.Group();
    const jaws = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.05), mat(0x95a5a6, 0.3, 0.8));
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 6), mat(0xd63031, 0.5));
    handle.position.y = 0.09;
    pliers.add(jaws, handle);
    hold(rightHand, pliers);
    // Túi thắt lưng dụng cụ
    wear(new THREE.BoxGeometry(0.1, 0.12, 0.04), 0x2c3e50, -0.16, 0.5, 0.24);
  } else if (job === 'police') {
    // Dây đeo ngang vai + còng tay
    wear(new THREE.TorusGeometry(0.3, 0.02, 6, 18), 0x111111, 0, 0.78, 0.02).rotation.x = Math.PI / 2;
    hold(rightHand, new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.04), mat(0xdfe6e9, 0.3, 0.7)), 0.1); // Còng tay
  } else if (job === 'soldier') {
    // Dây đeo vai + ba lô quân dụng
    wear(new THREE.TorusGeometry(0.3, 0.02, 6, 18), 0x222d22, 0, 0.78, 0.02).rotation.x = Math.PI / 2;
    wear(new THREE.BoxGeometry(0.34, 0.42, 0.16), 0x39523a, 0, 0.74, -0.22); // Ba lô
  } else if (job === 'barista') {
    // Tạp dề đen + cốc cà phê
    wear(new THREE.BoxGeometry(0.4, 0.4, 0.03), 0x39404a, 0, 0.56, 0.26);
    const cup = new THREE.Group();
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.1, 12), mat(0xf5f6fa, 0.7));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12, Math.PI * 0.7), mat(0xf5f6fa, 0.7));
    handle.position.x = 0.06;
    cup.add(mug, handle);
    hold(rightHand, cup);
  } else if (job === 'doctor') {
    // Cặp thuốc + ống nghe
    hold(leftHand, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.06), mat(0x27ae60)), 0.08);
    wear(new THREE.TorusGeometry(0.14, 0.015, 6, 16, Math.PI), 0x2d3436, 0, 0.84, 0.18).rotation.z = Math.PI; // Ống nghe
  } else if (job === 'banker') {
    // Cà vạt + cặp táp
    wear(new THREE.ConeGeometry(0.045, 0.22, 4), 0x8a2b3b, 0, 0.8, 0.24);
    hold(leftHand, new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.06), mat(0x5a3d2b, 0.5)), 0.08); // Cặp táp nâu
  } else if (job === 'monk') {
    // Tràng hạt ôm trước bụng + túi vải đeo vai
    const beads = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), mat(0x6d4c2f, 0.4));
      bead.position.set(Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0);
      beads.add(bead);
    }
    hold(rightHand, beads);
    wear(new THREE.BoxGeometry(0.12, 0.16, 0.04), 0x8d5524, -0.16, 0.62, 0.24); // Túi vải
  } else if (job === 'fisherman') {
    // Cần câu tre dài vác trên vai + thùng cá
    const rod = wear(new THREE.CylinderGeometry(0.012, 0.008, 1.1, 6), 0x8b6914, 0.24, 1.02, -0.05);
    rod.rotation.z = Math.PI * 0.42;
    wear(new THREE.CylinderGeometry(0.09, 0.07, 0.14, 10), 0x2980b9, -0.3, 0.5, 0.28); // Thùng cá
  } else if (job === 'influencer') {
    // Điện thoại cầm lên live + giá đỡ bỏ túi
    hold(rightHand, new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.13, 0.015), mat(0x111111, 0.2)), 0.1);
    wear(new THREE.BoxGeometry(0.16, 0.05, 0.01), 0xffeaa7, 0.14, 0.62, 0.26); // Túi mini chéo ngực
  } else if (job === 'taxi_driver') {
    // Điện thoại nhận cuốc gắn tay + nước mời khách
    hold(rightHand, new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.13, 0.015), mat(0x111111, 0.2)), 0.1);
    hold(leftHand, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.1, 10), mat(0x5dade2, 0.3)), 0.06);
  } else if (job === 'bus_driver') {
    // Sổ tuyến giờ chạy + còi hụ cầm tay
    hold(leftHand, new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.03), mat(0xecf0f1)), 0.08);
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.055, 0.1, 10), mat(0xd35400, 0.4));
    horn.rotation.x = Math.PI / 2;
    hold(rightHand, horn);
  } else if (job === 'online_seller') {
    // Thùng hàng bọc màng co ôm trước bụng + băng keo trên tay
    const parcel = wear(new THREE.BoxGeometry(0.3, 0.2, 0.2), 0xc49a5a, 0, 0.55, 0.3);
    wear(new THREE.BoxGeometry(0.31, 0.045, 0.205), 0xd4b896, 0, 0.55, 0.3); // Dải băng keo
    parcel.castShadow = true;
    hold(rightHand, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.09, 8), mat(0x8e44ad, 0.3)), 0.08); // Cuộn băng keo
  } else if (job === 'tailor') {
    // Thước dây quàng cổ + kéo cắt trong tay
    wear(new THREE.TorusGeometry(0.2, 0.012, 6, 20, Math.PI), 0xffffff, 0, 0.84, 0.16).rotation.set(Math.PI / 2, 0, Math.PI / 2);
    const scissors = new THREE.Group();
    for (const dir of [-1, 1]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.16, 0.01), mat(0xb2bec3, 0.3, 0.8));
      blade.rotation.z = dir * 0.2;
      blade.position.y = -0.06;
      scissors.add(blade);
    }
    hold(rightHand, scissors);
  }
}
