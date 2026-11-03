import * as THREE from 'three';

import { SKIN_TONES, type CharacterArchetype, type CharacterGender, type CharacterMeshOptions, type CharacterParts, type HairStyle, type PropKind } from './characterTypes';
export * from './characterTypes';
import { addJobGear, addJobHeadwear, isJob, JOB_UNIFORMS, mat, OUTDOOR_JOBS, type JobArchetype } from './characterGear';
export { isSharedMaterial } from './characterGear';
import { genderHairStyle, addProp } from './characterProps';



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
