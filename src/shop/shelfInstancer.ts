import * as THREE from 'three';
import { productParts } from '../render/productModels';

interface Pool {
  size: number[];
  cap: number;
  parts: THREE.InstancedMesh[];
}

/**
 * GĐ886: hàng hóa của MỌI kệ gộp theo món — 1 InstancedMesh / phần-vật-liệu / món cho cả tiệm,
 * thay vì mỗi kệ một bộ (đo ở cấp 44: ~812 draw call, 21 kệ → ~1.100 InstancedMesh).
 * Mỗi kệ gửi ma trận (toạ độ của `root`) qua `set`; `flush` dựng lại bộ đệm các món đổi.
 */
export class ShelfInstancer {
  readonly root = new THREE.Group();
  private pools = new Map<string, Pool>();
  /** món → (kệ → ma trận các hộp) */
  private contrib = new Map<string, Map<object, THREE.Matrix4[]>>();
  private dirty = new Set<string>();

  /** `mats` null/rỗng = kệ không còn món này. */
  set(owner: object, productId: string, size: number[], mats: THREE.Matrix4[] | null) {
    let by = this.contrib.get(productId);
    if (!mats?.length) {
      if (!by?.delete(owner)) return;
      if (!by.size) this.contrib.delete(productId);
    } else {
      if (!by) { by = new Map(); this.contrib.set(productId, by); }
      by.set(owner, mats);
      const p = this.pools.get(productId);
      if (p) p.size = size; else this.pools.set(productId, { size, cap: 0, parts: [] });
    }
    this.dirty.add(productId);
  }

  removeOwner(owner: object) {
    for (const pid of [...this.contrib.keys()]) this.set(owner, pid, [], null);
  }

  flush() {
    for (const pid of this.dirty) this.rebuild(pid);
    this.dirty.clear();
  }

  private rebuild(pid: string) {
    const by = this.contrib.get(pid);
    const pool = this.pools.get(pid);
    if (!pool) return;
    if (!by) { this.free(pool); this.pools.delete(pid); return; }
    let n = 0;
    for (const m of by.values()) n += m.length;
    if (n > pool.cap || !pool.parts.length) {
      this.free(pool);
      pool.cap = Math.max(16, Math.ceil(n * 1.5));
      const [w, h, d] = pool.size;
      pool.parts = productParts(pid, w, h, d).map(({ geometry, material }) => {
        const im = new THREE.InstancedMesh(geometry, material, pool.cap);
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.root.add(im);
        return im;
      });
    }
    for (const im of pool.parts) {
      let i = 0;
      for (const mats of by.values()) for (const m of mats) im.setMatrixAt(i++, m);
      im.count = n;
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
    }
  }

  private free(pool: Pool) {
    for (const im of pool.parts) { this.root.remove(im); im.dispose(); }
    pool.parts = [];
  }

  /** Số InstancedMesh đang vẽ (cho test/đo). */
  get meshCount() {
    let n = 0;
    for (const p of this.pools.values()) n += p.parts.length;
    return n;
  }
}
