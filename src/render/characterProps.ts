import * as THREE from 'three';
import type { CharacterArchetype, CharacterGender, HairStyle, PropKind } from './characterTypes';
import { mat } from './characterGear';

export function defaultHairStyle(a: CharacterArchetype): HairStyle {
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
export function genderHairStyle(a: CharacterArchetype, g: CharacterGender | undefined): HairStyle {
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
export function addProp(prop: PropKind, headGroup: THREE.Group, outfit: THREE.Group, rightHand: THREE.Group, leftHand: THREE.Group, bh: number, s: number) {
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
