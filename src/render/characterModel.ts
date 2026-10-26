import * as THREE from 'three';

export type CharacterGender = 'male' | 'female';
export type CharacterArchetype =
  | 'gentleman'     // Thanh niên công sở / thư sinh lịch lãm (như hình mẫu)
  | 'student_boy'   // Học sinh nam / thiếu niên năng động (áo đồng phục, balo, tóc ngắn)
  | 'student_girl'  // Học sinh nữ / bé gái đáng yêu (tóc 2 chùm/cột nơ, váy/yếm)
  | 'elder_man'     // Cụ ông / Bác tổ trưởng (tóc bạc, râu ria, áo sơ mi/gile lớn tuổi, dáng hơi khom)
  | 'elder_woman'   // Cụ bà / Bà Năm bán xôi (khăn rằn/búi tóc bà già, áo bà ba/hoa văn, tóc muối tiêu)
  | 'worker_driver' // Chú xe ôm / thợ lao động (áo khoác bảo hộ/áo gió, nón lưỡi trai/mũ bảo hiểm)
  | 'office_lady'   // Chị gái văn phòng / hiện đại (váy công sở, tóc uốn nữ tính)
  | 'coder_guy'     // Anh lập trình viên / Cú đêm (áo hoodie/phông, tai nghe trùm đầu, dép/sneaker)
  | 'construction_worker' // Công nhân xây dựng (áo phản quang cam, mũ bảo hộ, cầm bay xây)
  | 'nurse'         // Y tá (áo blouse trắng, mũ y tá, khẩu trang, cầm bìa hồ sơ)
  | 'shipper'       // Shipper (áo khoác giao hàng, mũ bảo hiểm, thùng hàng sau lưng)
  | 'chef'          // Đầu bếp quán ăn (mũ đầu bếp cao, tạp dề, cầm muôi)
  | 'young_mom'     // Mẹ bỉm sữa (áo hồng, bế em bé, túi đồ trẻ em)
  | 'security_guard' // Bảo vệ (đồng phục xanh rêu, mũ kê-pi, dùi cui)
  | 'teacher'       // Giáo viên (áo dài trắng, cầm sách)
  | 'farmer'        // Người bán chợ (áo bà ba nâu, nón lá, quang gánh)
  | 'athlete'       // Dân chạy bộ (đồ thể thao, băng đô, bình nước)
  | 'barber'        // Thợ cắt tóc (áo choàng, lược, tông đơ)
  | 'mechanic'      // Thợ sửa xe (quần yếm, mũ lưỡi trai, chìa khóa ống)
  | 'electrician'   // Thợ điện (mũ bảo hộ, kìm cách điện)
  | 'police'        // Công an (đồng phục xanh, mũ kê-pi, còng tay)
  | 'soldier'       // Bộ đội (quân phục xanh lá, mũ cối)
  | 'barista'       // Pha chế quán nước (tạp dề, cốc pha cà phê)
  | 'doctor'        // Bác sĩ (blouse trắng, ống nghe, cặp thuốc)
  | 'banker'        // Nhân viên ngân hàng (vest, cà vạt, cặp táp)
  | 'monk'         // Sư thầy (áo vàng sa môn, đầu trần, cầm tràng hạt)
  | 'fisherman'    // Ngư dân (áo mưa vàng, mũ rộng vành, cần câu)
  | 'influencer'   // Influencer (đồ trendy, mũ lưỡi trai, điện thoại selfie)
  | 'taxi_driver'  // Tài xế công nghệ (áo xanh lá đặc trưng, mũ lưỡi trai, điện thoại nhận cuốc)
  | 'bus_driver'   // Tài xế xe bus (đồng phục xanh dương, mũ kê-pi, sổ tuyến)
  | 'online_seller'// Chị bán hàng online (tạp dề, băng đô, thùng hàng bọc màng co)
  | 'tailor'       // Thợ may (thước dây quàng cổ, kéo cắt)
  | 'player';      // Người chơi chính

/** Kiểu tóc; mặc định suy ra từ archetype. */
export type HairStyle = 'side_part' | 'spiky' | 'pigtails' | 'bun' | 'long' | 'ponytail' | 'buzz' | 'curly' | 'plain';

/** Đạo cụ riêng của khách quen (cầm tay, đội đầu hoặc vác vai). */
export type PropKind =
  | 'non_la' | 'xoi_basket' | 'phone' | 'lollipop' | 'notebook' | 'handbag' | 'laptop' | 'oil_can'
  | 'flowers' | 'cable_coil' | 'meat_bag' | 'beer_crate' | 'megaphone' | 'wood_plank' | 'flag' | 'cake_box'
  | 'stethoscope';

export interface CharacterMeshOptions {
  archetype?: CharacterArchetype;
  hairStyle?: HairStyle;
  /** Ép màu áo, kể cả khi archetype có đồng phục. */
  topColor?: number;
  props?: PropKind[];
  gender?: CharacterGender;
  profession?: 'player' | 'customer' | 'cashier' | 'stocker';
  bodyColor?: THREE.ColorRepresentation;
  hatColor?: number;
  hasGlasses?: boolean;
  skinColor?: number;
  hairColor?: number;
  scale?: number;
}

export interface CharacterParts {
  root: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  head: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftShin: THREE.Group;
  rightShin: THREE.Group;
  faceGroup: THREE.Group;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  archetype: CharacterArchetype;
}

// Bảng màu da phong phú
export const SKIN_TONES = {
  fair: 0xffe6d5,
  natural: 0xfcd8be,
  tanned: 0xdfa980,
  elder: 0xe8ba97,
};

type JobArchetype = 'construction_worker' | 'nurse' | 'shipper' | 'chef' | 'young_mom' | 'security_guard' | 'teacher' | 'farmer' | 'athlete'
  | 'barber' | 'mechanic' | 'electrician' | 'police' | 'soldier' | 'barista' | 'doctor' | 'banker'
  | 'monk' | 'fisherman' | 'influencer' | 'taxi_driver' | 'bus_driver' | 'online_seller' | 'tailor';

/** Màu đồng phục theo nghề. */
const JOB_UNIFORMS: Record<JobArchetype, { top: number; pants: number }> = {
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

const isJob = (a: CharacterArchetype): a is JobArchetype => a in JOB_UNIFORMS;

const OUTDOOR_JOBS: CharacterArchetype[] = ['worker_driver', 'construction_worker', 'shipper', 'farmer', 'athlete', 'fisherman'];

// Vật liệu đặc cho nhân vật: dùng CHUNG giữa mọi nhân vật mang cùng màu — nhân vật dựng/hủy
// liên tục quanh ngày mà vẫn tạo cùng số lượng material thì là phí shader; dùng chung thì mỗi
// tổ hợp (màu, nhám, kim loại) chỉ có 1 material.
const matCache = new Map<string, THREE.MeshStandardMaterial>();
const sharedMats = new Set<THREE.Material>();
/** Nhân vật đang chia sẻ vật liệu chung này — dispose không được hủy kẻo trắng mấy nhân vật khác. */
export const isSharedMaterial = (m: THREE.Material) => sharedMats.has(m);
const mat = (color: number, roughness = 0.5, metalness = 0) => {
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
function addJobHeadwear(job: JobArchetype, headGroup: THREE.Group, s: number) {
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
function addJobGear(job: JobArchetype, outfit: THREE.Group, rightHand: THREE.Group, leftHand: THREE.Group, bh: number, top: number) {
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

function defaultHairStyle(a: CharacterArchetype): HairStyle {
  if (a === 'gentleman' || a === 'player' || a === 'taxi_driver' || a === 'bus_driver') return 'side_part';
  if (a === 'student_boy' || a === 'coder_guy' || a === 'athlete' || a === 'fisherman') return 'spiky';
  if (a === 'student_girl') return 'pigtails';
  if (a === 'elder_woman' || a === 'tailor') return 'bun';
  if (a === 'office_lady' || a === 'nurse' || a === 'young_mom' || a === 'teacher' || a === 'influencer') return 'long';
  if (a === 'online_seller') return 'ponytail';
  return 'plain';
}

/**
 * Biến thể giới tính cho các archetype trung tính: cùng một kiểu người nhưng đổi kiểu tóc
 * theo `gender`. Archetype đã lây nam/nữ rõ ràng (elder, y tá, bảo vệ...) giữ nguyên.
 */
function genderHairStyle(a: CharacterArchetype, g: CharacterGender | undefined): HairStyle {
  if (g === 'female') {
    if (a === 'gentleman' || a === 'player') return 'long';
    if (a === 'coder_guy' || a === 'worker_driver') return 'ponytail';
    if (a === 'student_boy') return 'pigtails';
  } else if (g === 'male') {
    if (a === 'office_lady' || a === 'student_girl') return 'side_part';
    if (a === 'online_seller') return 'side_part';
  }
  return defaultHairStyle(a);
}

/** Đạo cụ riêng: mặc định cầm tay trái, để tay phải còn đồ nghề. */
function addProp(prop: PropKind, headGroup: THREE.Group, outfit: THREE.Group, rightHand: THREE.Group, leftHand: THREE.Group, bh: number, s: number) {
  const hold = (obj: THREE.Object3D, hand = leftHand, z = 0.08) => {
    obj.position.set(0, -0.22 * bh, z);
    obj.traverse((o) => { o.castShadow = true; });
    hand.add(obj);
    return obj;
  };
  const box = (w: number, h: number, d: number, color: number, r = 0.6) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, r));
  const group = (...parts: [THREE.Mesh, number, number, number][]) => {
    const g = new THREE.Group();
    for (const [m, x, y, z] of parts) { m.position.set(x, y, z); g.add(m); }
    return g;
  };
  const onBody = (m: THREE.Mesh, x: number, y: number, z: number) => {
    m.position.set(x, y * bh, z);
    m.castShadow = true;
    outfit.add(m);
    return m;
  };

  if (prop === 'non_la') {
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.62 * s, 0.32 * s, 22), mat(0xe9c46a, 0.7));
    hat.position.set(0, 0.44 * s, 0);
    hat.castShadow = true;
    headGroup.add(hat);
  } else if (prop === 'xoi_basket') {
    // Thúng xôi tre phủ lá chuối
    hold(group(
      [new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.12, 12), mat(0xc49a5a, 0.8)), 0, 0, 0],
      [new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 12), mat(0x27ae60, 0.6)), 0, 0.07, 0],
    ), leftHand, 0.12);
  } else if (prop === 'phone') {
    hold(box(0.07, 0.13, 0.015, 0x111111, 0.2), rightHand);
  } else if (prop === 'lollipop') {
    hold(group(
      [new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 6), mat(0xffffff)), 0, 0, 0],
      [new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), mat(0xff477e, 0.3)), 0, 0.1, 0],
    ), rightHand);
  } else if (prop === 'notebook') {
    hold(box(0.16, 0.22, 0.03, 0x1e3799));
  } else if (prop === 'handbag') {
    hold(group(
      [box(0.2, 0.15, 0.08, 0xfdcb6e, 0.4), 0, -0.04, 0],
      [new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 12, Math.PI), mat(0xfdcb6e, 0.4)), 0, 0.04, 0],
    ), leftHand, 0.06);
  } else if (prop === 'laptop') {
    hold(group([box(0.26, 0.02, 0.19, 0xb2bec3, 0.3), 0, 0, 0], [box(0.08, 0.004, 0.08, 0x74b9ff, 0.2), 0, 0.012, 0]), leftHand, 0.1).rotation.x = Math.PI / 2;
  } else if (prop === 'oil_can') {
    hold(group(
      [new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.14, 12), mat(0xc0392b, 0.4, 0.4)), 0, 0, 0],
      [new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, 0.12, 6), mat(0xb2bec3, 0.3, 0.8)), 0.06, 0.1, 0],
    ));
  } else if (prop === 'flowers') {
    const stems = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 8), mat(0x27ae60));
    stems.rotation.x = Math.PI;
    const bunch = group([stems, 0, -0.04, 0]);
    for (const [c, x, z] of [[0xff477e, -0.04, 0], [0xfdcb6e, 0.04, 0], [0xffffff, 0, 0.04], [0xe84393, 0, -0.04]] as const) {
      bunch.add(group([new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat(c, 0.5)), x, 0.09, z]));
    }
    hold(bunch);
  } else if (prop === 'cable_coil') {
    hold(new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.022, 6, 16), mat(0x2d3436, 0.5))).rotation.y = Math.PI / 2;
  } else if (prop === 'meat_bag') {
    hold(box(0.16, 0.18, 0.1, 0xe74c3c, 0.3), leftHand, 0.04);
  } else if (prop === 'beer_crate') {
    // Két bia vàng ôm trước bụng
    onBody(box(0.34, 0.18, 0.22, 0xf1c40f, 0.5), 0, 0.55, 0.32);
    for (let i = -1; i <= 1; i++) onBody(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 8), mat(0x6d4c2f, 0.3)), i * 0.1, 0.67, 0.32);
  } else if (prop === 'megaphone') {
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 0.18, 12, 1, true), mat(0xf5f6fa, 0.4));
    horn.material.side = THREE.DoubleSide;
    hold(horn, rightHand, 0.12).rotation.x = Math.PI / 2;
  } else if (prop === 'wood_plank') {
    // Tấm ván gỗ vác vai
    onBody(box(0.12, 0.04, 0.9, 0xb5835a, 0.8), 0.28, 1.0, 0);
  } else if (prop === 'flag') {
    hold(group(
      [new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), mat(0x6d4c2f)), 0, 0.15, 0],
      [box(0.2, 0.13, 0.01, 0xd63031, 0.5), 0.1, 0.33, 0],
    ), rightHand);
  } else if (prop === 'cake_box') {
    hold(group([box(0.22, 0.12, 0.22, 0xffeaa7, 0.6), 0, 0, 0], [box(0.23, 0.02, 0.04, 0xe84393, 0.4), 0, 0.06, 0]), leftHand, 0.12);
  } else if (prop === 'stethoscope') {
    // Ống nghe quàng cổ, hai ống nhỏ xuống ngực và mảnh nghe bạc trước ngực
    const tubeMat = mat(0x2d3436, 0.4);
    const arc = onBody(new THREE.Mesh(new THREE.TorusGeometry(0.14 * s, 0.014 * s, 6, 16, Math.PI), tubeMat), 0, 0.86, 0.17);
    arc.rotation.z = Math.PI;
    const left = onBody(new THREE.Mesh(new THREE.CylinderGeometry(0.008 * s, 0.008 * s, 0.2 * s, 6), tubeMat), -0.08 * s, 0.72, 0.27);
    left.rotation.z = 0.15;
    const right = onBody(new THREE.Mesh(new THREE.CylinderGeometry(0.008 * s, 0.008 * s, 0.2 * s, 6), tubeMat), 0.08 * s, 0.72, 0.27);
    right.rotation.z = -0.15;
    onBody(new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.015 * s, 12), mat(0xb2bec3, 0.3, 0.8)), 0, 0.6, 0.29).rotation.x = Math.PI / 2;
  }
}

/**
 * Xây dựng đa dạng nhân vật 3D phong cách Chibi cao cấp:
 * - Trai, gái, học sinh, người già, bác tổ trưởng, chú xe ôm, anh coder, dân văn phòng...
 */
export function buildChibiCharacter(options: CharacterMeshOptions = {}): CharacterParts {
  const root = new THREE.Group();
  const torso = new THREE.Group();
  root.add(torso);

  // Xác định Archetype nếu chưa có
  let archetype = options.archetype;
  if (!archetype) {
    if (options.profession === 'player') archetype = 'player';
    else if (options.profession === 'cashier') archetype = Math.random() < 0.5 ? 'office_lady' : 'gentleman';
    else if (options.profession === 'stocker') archetype = 'worker_driver';
    else {
      const pool: CharacterArchetype[] = [
        'gentleman',
        'student_boy',
        'student_girl',
        'elder_man',
        'elder_woman',
        'worker_driver',
        'office_lady',
        'coder_guy',
      ];
      pool.push(...(Object.keys(JOB_UNIFORMS) as JobArchetype[]));
      archetype = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  // Tỷ lệ cơ thể (Scale) theo độ tuổi
  let bodyHeight = 1.0;
  let headScale = 1.0;
  let isChild = false;
  let isElder = false;

  if (archetype === 'student_boy' || archetype === 'student_girl') {
    isChild = true;
    bodyHeight = 0.85;
    headScale = 1.08; // Trẻ em đầu to hơn tí
  } else if (archetype === 'elder_man' || archetype === 'elder_woman') {
    isElder = true;
    bodyHeight = 0.94;
  }

  // Tông màu tóc & da theo độ tuổi / nghề
  let skinHex = options.skinColor ?? (isElder ? SKIN_TONES.elder : (OUTDOOR_JOBS.includes(archetype) ? SKIN_TONES.tanned : SKIN_TONES.natural));
  let hairHex = options.hairColor;
  if (!hairHex) {
    if (isElder) {
      hairHex = Math.random() < 0.6 ? 0xd0d5dd : 0x8a929a; // Tóc bạc / muối tiêu
    } else {
      const normalHair = [0x1a1e24, 0x332219, 0x4e311f, 0x222222, 0x6e472e];
      hairHex = normalHair[Math.floor(Math.random() * normalHair.length)];
    }
  }

  const skinMat = mat(skinHex, 0.55, 0.05);
  const hairMat = mat(hairHex, 0.5, 0.08);

  // 1. ================= ĐẦU VÀ KHUÔN MẶT =================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.34 * bodyHeight, 0);
  torso.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.38, 28, 24);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.scale.set(1.05 * headScale, 0.98 * headScale, 0.98 * headScale);
  head.castShadow = true;
  headGroup.add(head);

  // Tai Chibi 3D
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.11 * headScale, 12, 12), skinMat);
    ear.scale.set(0.35, 1.05, 0.85);
    ear.position.set(side * 0.4 * headScale, 0.02, -0.02);
    ear.rotation.y = side * 0.25;
    headGroup.add(ear);
  }

  // Má hồng (đặc biệt đậm hơn cho trẻ em / bạn nữ)
  if (archetype === 'student_girl' || archetype === 'student_boy' || archetype === 'office_lady' || archetype === 'gentleman' || archetype === 'influencer') {
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xff6b81, transparent: true, opacity: isChild ? 0.45 : 0.28 });
    for (const side of [-1, 1]) {
      const blush = new THREE.Mesh(new THREE.CircleGeometry(0.065 * headScale, 14), blushMat);
      blush.position.set(side * 0.21 * headScale, -0.08 * headScale, 0.36 * headScale);
      blush.rotation.y = side * 0.35;
      headGroup.add(blush);
    }
  }

  // Mắt 3D Anime / Cartoon
  const faceGroup = new THREE.Group();
  headGroup.add(faceGroup);

  const eyeWhiteMat = mat(0xffffff, 0.2);
  const irisMat = mat(isElder ? 0x423832 : 0x221a15, 0.3);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x05070a });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  let leftEyeMesh!: THREE.Mesh;
  let rightEyeMesh!: THREE.Mesh;

  for (const side of [-1, 1]) {
    const eyePivot = new THREE.Group();
    eyePivot.position.set(side * 0.165 * headScale, 0.04 * headScale, 0.32 * headScale);
    eyePivot.rotation.y = side * 0.18;

    const eyeRadius = isElder ? 0.075 : (isChild ? 0.095 : 0.088);
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 16, 14), eyeWhiteMat);
    eyeWhite.scale.set(1.1, isElder ? 0.9 : 1.25, 0.45);
    eyePivot.add(eyeWhite);
    if (side === -1) leftEyeMesh = eyeWhite;
    else rightEyeMesh = eyeWhite;

    const iris = new THREE.Mesh(new THREE.CylinderGeometry(eyeRadius * 0.72, eyeRadius * 0.72, 0.02, 16), irisMat);
    iris.rotation.x = Math.PI / 2;
    iris.position.set(side * 0.005, 0, 0.038);
    eyePivot.add(iris);

    const pupil = new THREE.Mesh(new THREE.CylinderGeometry(eyeRadius * 0.45, eyeRadius * 0.45, 0.022, 12), pupilMat);
    pupil.rotation.x = Math.PI / 2;
    pupil.position.set(side * 0.005, 0, 0.042);
    eyePivot.add(pupil);

    // Điểm sáng mắt long lanh
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.018 * headScale, 8, 8), glintMat);
    glint.position.set(side * 0.005 - 0.02, 0.025, 0.05);
    eyePivot.add(glint);

    faceGroup.add(eyePivot);

    // Lông mày
    const browMat = mat(hairHex, 0.8);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.11 * headScale, isElder ? 0.035 : 0.024, 0.03), browMat);
    brow.position.set(side * 0.17 * headScale, 0.18 * headScale, 0.33 * headScale);
    brow.rotation.y = side * 0.18;
    brow.rotation.z = side * (isElder ? -0.05 : -0.15);
    faceGroup.add(brow);
  }

  // Mũi & Miệng
  const noseMat = mat(new THREE.Color(skinHex).offsetHSL(0, 0.1, -0.06).getHex(), 0.5);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(isElder ? 0.048 : 0.036, 12, 12), noseMat);
  nose.position.set(0, -0.02 * headScale, 0.38 * headScale);
  faceGroup.add(nose);

  const mouthMat = mat(0x9b3c3c, 0.5);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.045 * headScale, 0.012, 6, 14, Math.PI * 0.7), mouthMat);
  mouth.position.set(0, -0.13 * headScale, 0.37 * headScale);
  mouth.rotation.x = Math.PI * 0.5;
  mouth.rotation.z = Math.PI * 0.65;
  faceGroup.add(mouth);
  if (archetype === 'nurse') mouth.visible = false; // Khẩu trang che miệng

  // Râu bạc cho Cụ ông / Bác tổ trưởng
  if (archetype === 'elder_man') {
    const beardMat = mat(hairHex, 0.9);
    // Ria mép
    const mustache = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.14, 4, 8), beardMat);
    mustache.rotation.z = Math.PI / 2;
    mustache.position.set(0, -0.08, 0.39);
    faceGroup.add(mustache);
  }

  // Kính mắt: Cho Quý ông, Cụ ông, Bác tổ trưởng, Coder
  const wearGlasses = options.hasGlasses ?? (archetype === 'gentleman' || archetype === 'elder_man' || archetype === 'coder_guy' || Math.random() < 0.4);
  if (wearGlasses) {
    const glassesGroup = new THREE.Group();
    const frameColor = archetype === 'elder_man' ? 0xd4af37 : (archetype === 'coder_guy' ? 0x111111 : 0x221f1e);
    const frameMat = mat(frameColor, 0.3, 0.3);

    for (const side of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11 * headScale, 0.015, 8, 20), frameMat);
      ring.position.set(side * 0.165 * headScale, 0.04 * headScale, 0.38 * headScale);
      ring.rotation.y = side * 0.12;
      glassesGroup.add(ring);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.07 * headScale, 8), frameMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.05 * headScale, 0.395 * headScale);
    glassesGroup.add(bridge);
    faceGroup.add(glassesGroup);
  }

  // Tóc đa dạng theo Archetype
  const hairGroup = new THREE.Group();
  headGroup.add(hairGroup);

  const hairStyle: HairStyle = options.hairStyle ?? genderHairStyle(archetype, options.gender);
  const shortCap = archetype === 'elder_man' || hairStyle === 'buzz';
  // Sư thầy đầu trần: không mọc tóc
  if (archetype !== 'monk') {
    const hairCapGeo = new THREE.SphereGeometry((hairStyle === 'buzz' ? 0.395 : 0.405) * headScale, 20, 16, 0, Math.PI * 2, 0, Math.PI * (shortCap ? 0.45 : 0.65));
    const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
    hairCap.position.set(0, 0.04 * headScale, -0.04 * headScale);
    hairCap.castShadow = true;
    hairGroup.add(hairCap);
  }

  if (hairStyle === 'side_part') {
    // Tóc vuốt side-part quý ông bồng bềnh
    const strand = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), hairMat);
    strand.scale.set(1.4, 0.85, 0.85);
    strand.position.set(-0.12, 0.33, 0.22);
    strand.rotation.set(0.2, 0.3, -0.4);
    hairGroup.add(strand);

    const strandR = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), hairMat);
    strandR.scale.set(1.2, 0.8, 0.8);
    strandR.position.set(0.16, 0.33, 0.2);
    strandR.rotation.set(0.1, -0.2, 0.4);
    hairGroup.add(strandR);
  } else if (hairStyle === 'spiky') {
    // Tóc ngắn vuốt nhọn trẻ trung năng động
    for (let i = -2; i <= 2; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), hairMat);
      spike.position.set(i * 0.08, 0.36, 0.18);
      spike.rotation.x = -0.5;
      spike.rotation.z = -i * 0.15;
      hairGroup.add(spike);
    }
  } else if (hairStyle === 'pigtails') {
    // Tóc 2 chùm cột nơ đáng yêu
    const ribbonMat = mat(0xff477e, 0.4);
    for (const side of [-1, 1]) {
      const pigtail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), hairMat);
      pigtail.scale.set(0.8, 1.4, 0.8);
      pigtail.position.set(side * 0.38, 0.22, -0.05);
      pigtail.rotation.z = side * 0.4;
      hairGroup.add(pigtail);

      const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.018, 6, 12), ribbonMat);
      ribbon.position.set(side * 0.35, 0.3, -0.05);
      hairGroup.add(ribbon);
    }
    // Mái ngố ngang trán
    const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.08), hairMat);
    bangs.position.set(0, 0.28, 0.32);
    bangs.rotation.x = 0.2;
    hairGroup.add(bangs);
  } else if (hairStyle === 'bun') {
    // Búi tóc củ tỏi bà cụ truyền thống phía sau
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 14), hairMat);
    bun.position.set(0, 0.1, -0.38);
    hairGroup.add(bun);
    // Trâm cài tóc
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 8), mat(0x27ae60));
    pin.rotation.z = 1.1;
    pin.position.set(0, 0.1, -0.38);
    hairGroup.add(pin);
  } else if (hairStyle === 'long') {
    // Tóc dài uốn lượn ngang vai thanh lịch: mái ngố phủ đều trán, hai lọn thả sau vai
    for (const side of [-1, 1]) {
      const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 4, 10), hairMat);
      lock.position.set(side * 0.34, -0.1, -0.04);
      lock.rotation.z = side * 0.12;
      hairGroup.add(lock);
    }
    const bangs = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), hairMat);
    bangs.scale.set(1.55, 0.55, 0.8);
    bangs.position.set(0, 0.3, 0.25);
    hairGroup.add(bangs);
  } else if (hairStyle === 'ponytail') {
    // Tóc cột đuôi ngựa sau gáy
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.02, 6, 12), mat(0xfdcb6e, 0.4));
    tie.position.set(0, 0.2, -0.4);
    hairGroup.add(tie);
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.3, 4, 10), hairMat);
    tail.position.set(0, 0.02, -0.44);
    tail.rotation.x = 0.35;
    hairGroup.add(tail);
  } else if (hairStyle === 'curly') {
    // Tóc xoăn uốn lọn quanh đầu
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const curl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), hairMat);
      curl.position.set(Math.cos(a) * 0.3, 0.26 + (i % 2) * 0.06, Math.sin(a) * 0.3 - 0.04);
      hairGroup.add(curl);
    }
  }

  // Mũ & Phụ kiện đặc thù ngành nghề:
  const uniform = isJob(archetype) ? JOB_UNIFORMS[archetype] : undefined;
  if (isJob(archetype)) {
    addJobHeadwear(archetype, headGroup, headScale);
  } else if (archetype === 'worker_driver' || options.hatColor !== undefined) {
    // Chú xe ôm: Nón bảo hiểm / mũ lưỡi trai nửa đầu
    const capMat = mat(options.hatColor ?? 0x1e3799, 0.4);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42 * headScale, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), capMat);
    cap.position.set(0, 0.06 * headScale, 0);
    headGroup.add(cap);

    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.44 * headScale, 0.44 * headScale, 0.02, 16, 1, false, -Math.PI * 0.3, Math.PI * 0.6), capMat);
    visor.position.set(0, 0.08 * headScale, 0.14 * headScale);
    visor.rotation.x = 0.2;
    headGroup.add(visor);
  } else if (archetype === 'coder_guy') {
    // Tai nghe Headphone trùm đầu đậm chất IT/Cú đêm
    const hpMat = mat(0xd63031, 0.4);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.42 * headScale, 0.025, 8, 20, Math.PI), hpMat);
    band.position.set(0, 0.06 * headScale, 0);
    headGroup.add(band);
    for (const side of [-1, 1]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12), mat(0x111111, 0.5));
      cup.rotation.z = Math.PI / 2;
      cup.position.set(side * 0.42 * headScale, 0.04 * headScale, 0);
      headGroup.add(cup);
    }
  } else if (archetype === 'player' && options.hatColor === undefined) {
    // Nón lá người chơi
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.24, 20), mat(0xf4d03f, 0.65));
    hat.position.set(0, 0.36, 0);
    hat.scale.set(1.25, 0.7, 1.25);
    headGroup.add(hat);
  }

  // 2. ================= THÂN TRANG PHỤC (OUTFIT) =================
  const outfitGroup = new THREE.Group();
  torso.add(outfitGroup);

  let shirtColor = 0xffffff;
  let topColor = options.bodyColor ?? 0x2b4c7e;
  let pantsColor = 0x22313f;

  if (archetype === 'student_boy' || archetype === 'student_girl') {
    shirtColor = 0xffffff; // Áo trắng học sinh
    topColor = 0xffffff;
    pantsColor = archetype === 'student_girl' ? 0x2c3e50 : 0x1e3799; // Váy/Quần xanh đen
  } else if (archetype === 'worker_driver') {
    topColor = 0x009432; // Áo khoác tài xế công nghệ xanh lá / xanh dương
    pantsColor = 0x2f3640;
  } else if (archetype === 'elder_woman') {
    topColor = 0xd35400; // Áo bà ba nâu đất / hoa văn
    pantsColor = 0x1e272e; // Quần lãnh đen
  } else if (archetype === 'elder_man') {
    topColor = 0x7f8c8d; // Áo sơ mi cán bộ / hưu trí
    pantsColor = 0x34495e;
  } else if (archetype === 'coder_guy') {
    topColor = 0x2c3e50; // Áo hoodie đen/xám
    pantsColor = 0x1e272e;
  } else if (archetype === 'office_lady') {
    topColor = 0xe84393; // Áo blazer hồng pastel / be
    pantsColor = 0x2d3436;
  }

  if (uniform) {
    topColor = uniform.top;
    pantsColor = uniform.pants;
  }
  if (options.topColor !== undefined) topColor = options.topColor;

  const topMat = mat(new THREE.Color(topColor).getHex(), 0.7);
  const shirtMat = mat(shirtColor, 0.8);
  const pantsMat = mat(pantsColor, 0.7);

  // Thân áo
  const bodyMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.25 * headScale, 0.38 * bodyHeight, 6, 16), topMat);
  bodyMesh.position.set(0, 0.68 * bodyHeight, 0);
  bodyMesh.scale.set(1.15, 0.98, 0.88);
  bodyMesh.castShadow = true;
  outfitGroup.add(bodyMesh);

  // Thắt lưng hoặc viền áo
  const beltMat = mat(0x332219, 0.5);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.245 * headScale, 0.025, 6, 16), beltMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.set(0, 0.48 * bodyHeight, 0);
  outfitGroup.add(belt);

  // Chi tiết đặc thù cho từng nghề:
  if (archetype === 'gentleman' || archetype === 'player') {
    // Áo vest gile + Cà vạt
    const tieMat = mat(0x8a2b3b, 0.5);
    const tie = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 4), tieMat);
    tie.position.set(0, 0.8 * bodyHeight, 0.23);
    tie.rotation.x = Math.PI;
    outfitGroup.add(tie);
  } else if (archetype === 'student_boy' || archetype === 'student_girl') {
    // Khăn quàng đỏ học sinh
    const scarfMat = mat(0xd63031, 0.5);
    const scarf = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 3), scarfMat);
    scarf.position.set(0, 0.78 * bodyHeight, 0.22);
    scarf.rotation.x = Math.PI;
    scarf.scale.set(1, 1, 0.3);
    outfitGroup.add(scarf);

    // Balo học sinh trên lưng
    const bagMat = mat(archetype === 'student_boy' ? 0x0984e3 : 0xfd79a8, 0.6);
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.16), bagMat);
    backpack.position.set(0, 0.72 * bodyHeight, -0.22);
    backpack.castShadow = true;
    outfitGroup.add(backpack);
  } else if (archetype === 'elder_woman') {
    // Khăn rằn Nam Bộ vắt vai bà cụ
    const scarfMat = mat(0xdfe6e9, 0.9);
    const ranScarf = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.44, 0.04), scarfMat);
    ranScarf.position.set(0.12, 0.74 * bodyHeight, 0.18);
    outfitGroup.add(ranScarf);
  }

  // 3. ================= TAY (ARMS) 2 KHỚP =================
  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  let leftForearm!: THREE.Group;
  let rightForearm!: THREE.Group;

  const createArm = (side: number) => {
    const armPivot = side === -1 ? leftArm : rightArm;
    armPivot.position.set(side * 0.32 * headScale, 0.88 * bodyHeight, 0.02);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.22 * bodyHeight, 10), topMat);
    upperArm.position.y = -0.11 * bodyHeight;
    upperArm.castShadow = true;
    armPivot.add(upperArm);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -0.22 * bodyHeight, 0);

    const lowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.16 * bodyHeight, 10), skinMat);
    lowerArm.position.y = -0.09 * bodyHeight;
    lowerArm.castShadow = true;
    forearmPivot.add(lowerArm);

    // Bàn tay
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), skinMat);
    hand.scale.set(0.9, 1.1, 0.7);
    hand.position.set(0, -0.19 * bodyHeight, 0);
    forearmPivot.add(hand);

    armPivot.add(forearmPivot);
    torso.add(armPivot);

    if (side === -1) leftForearm = forearmPivot;
    else rightForearm = forearmPivot;
  };

  createArm(-1);
  createArm(1);

  // 4. ================= CHÂN & GIÀY =================
  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  let leftShin!: THREE.Group;
  let rightShin!: THREE.Group;

  const shoeMat = mat(archetype === 'worker_driver' ? 0x2d3436 : (isElder ? 0x3d271d : 0x543828), 0.5);

  const createLeg = (side: number) => {
    const legPivot = side === -1 ? leftLeg : rightLeg;
    legPivot.position.set(side * 0.13 * headScale, 0.44 * bodyHeight, 0);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.088, 0.22 * bodyHeight, 10), pantsMat);
    thigh.position.y = -0.11 * bodyHeight;
    thigh.castShadow = true;
    legPivot.add(thigh);

    const shinPivot = new THREE.Group();
    shinPivot.position.set(0, -0.22 * bodyHeight, 0);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.08, 0.18 * bodyHeight, 10), pantsMat);
    shin.position.y = -0.09 * bodyHeight;
    shin.castShadow = true;
    shinPivot.add(shin);

    // Giày Chibi
    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.14, 4, 10), shoeMat);
    shoe.rotation.x = Math.PI / 2;
    shoe.scale.set(1.1, 1.35, 0.85);
    shoe.position.set(0, -0.21 * bodyHeight, 0.04);
    shoe.castShadow = true;
    shinPivot.add(shoe);

    legPivot.add(shinPivot);
    torso.add(legPivot);

    if (side === -1) leftShin = shinPivot;
    else rightShin = shinPivot;
  };

  createLeg(-1);
  createLeg(1);

  if (isJob(archetype)) addJobGear(archetype, outfitGroup, rightForearm, leftForearm, bodyHeight, new THREE.Color(topColor).getHex());
  for (const prop of options.props ?? []) addProp(prop, headGroup, outfitGroup, rightForearm, leftForearm, bodyHeight, headScale);

  return {
    root,
    torso,
    headGroup,
    head,
    leftArm,
    rightArm,
    leftForearm,
    rightForearm,
    leftLeg,
    rightLeg,
    leftShin,
    rightShin,
    faceGroup,
    leftEye: leftEyeMesh,
    rightEye: rightEyeMesh,
    archetype,
  };
}
