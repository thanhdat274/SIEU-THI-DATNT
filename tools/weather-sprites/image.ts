import { crc32, deflateSync } from 'node:zlib';

/** Ảnh RGBA thô; chỉ có ghi điểm ảnh nguyên, không làm mượt, không co giãn. */
export class Img {
  readonly data: Uint8Array;
  constructor(readonly w: number, readonly h: number) {
    this.data = new Uint8Array(w * h * 4);
  }
  set(x: number, y: number, rgba: readonly [number, number, number, number]): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = rgba[0]; this.data[i + 1] = rgba[1]; this.data[i + 2] = rgba[2]; this.data[i + 3] = rgba[3];
  }
  get(x: number, y: number): [number, number, number, number] {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }
  rect(x: number, y: number, w: number, h: number, c: readonly [number, number, number, number]): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
  }
  /** Chép ảnh khác vào vị trí (x,y), bỏ qua điểm trong suốt. */
  blit(src: Img, x: number, y: number): void {
    for (let yy = 0; yy < src.h; yy++) for (let xx = 0; xx < src.w; xx++) {
      const c = src.get(xx, yy);
      if (c[3] > 0) this.set(x + xx, y + yy, c);
    }
  }
  mirrored(): Img {
    const out = new Img(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) out.set(this.w - 1 - x, y, this.get(x, y));
    return out;
  }
}

export type Rgba = readonly [number, number, number, number];

export function hex(s: string): Rgba {
  const v = s.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16), 255];
}

export function shade(c: Rgba, f: number): Rgba {
  const k = (n: number) => Math.max(0, Math.min(255, Math.round(n * f)));
  return [k(c[0]), k(c[1]), k(c[2]), 255];
}

function chunk(type: string, body: Uint8Array): Buffer {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, body])) >>> 0);
  return Buffer.concat([len, t, Buffer.from(body), crc]);
}

export function encodePng(img: Img): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.w, 0); ihdr.writeUInt32BE(img.h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bit RGBA
  const stride = img.w * 4;
  const raw = Buffer.alloc((stride + 1) * img.h);
  for (let y = 0; y < img.h; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(img.data.buffer, img.data.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
