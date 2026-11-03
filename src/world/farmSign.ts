import * as THREE from 'three';

/** Chữ trắng in đậm trên nền gỗ (biển cổng trang trại), vẽ vừa khít khung. */
export function signTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#6b4a2a';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#8a6a44';
  g.lineWidth = 10;
  g.strokeRect(8, 8, c.width - 16, c.height - 16);
  g.fillStyle = '#ffffff';
  // Co cỡ chữ cho khít chiều rộng biển, không bị cắt
  const size = Math.min(120, (c.width * 0.92 / text.length) * 1.55);
  g.font = `900 ${size}px "Segoe UI", Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
