import * as THREE from 'three';

/** Ngói: các hàng sóng sẫm, nền trắng để nhuộm theo màu mái. */
export function roofTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 0; y < 64; y += 16) ctx.fillRect(0, y, 64, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let x = 0; x < 64; x += 16) for (let y = 0; y < 64; y += 16) ctx.fillRect(x + ((y / 16) % 2) * 8, y + 3, 2, 13);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Sàn gạch: mỗi viên 1m, có ron sẫm màu. */
export function tileTexture(color: number, w: number, d: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const base = new THREE.Color(color);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = `#${base.clone().multiplyScalar(0.8).getHexString()}`;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 62, 62);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(w, d);
  return texture;
}

/** Chữ trắng trên nền đỏ cho bảng quầy. */
export function signTexture(text: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 80;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(0, 0, 256, 80);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 42);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Mã QR giả (ô đen trắng ngẫu nhiên cố định) cho bảng thanh toán. */
export function qrTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#000';
  let h = 7;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    if (h % 2) ctx.fillRect(x * 8, y * 8, 8, 8);
  }
  // Ba ô định vị ở góc như QR thật
  for (const [x, y] of [[0, 0], [40, 0], [0, 40]]) {
    ctx.fillStyle = '#000'; ctx.fillRect(x, y, 24, 24);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 4, y + 4, 16, 16);
    ctx.fillStyle = '#000'; ctx.fillRect(x + 8, y + 8, 8, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  return t;
}

/** Mặt màn hình máy tính tiền: hai dòng chữ sáng trên nền màu. */
export function screenTexture(bg: string, top: string, bottom: string) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 88;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 128, 88);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(top, 64, 34);
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(bottom, 64, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
