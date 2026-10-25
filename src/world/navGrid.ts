import * as THREE from 'three';

/**
 * Lưới ô vuông để biết chỗ nào đi được và tìm đường (A*).
 * Dùng chung cho nhân vật, sau này cho khách và nhân viên.
 */
export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  private blocked: Uint8Array;

  constructor(public extent = 40, public cell = 0.5) {
    this.cols = this.rows = Math.round((extent * 2) / cell);
    this.blocked = new Uint8Array(this.cols * this.rows);
  }

  /** Chặn các ô nằm trong hộp (đã nới thêm bán kính nhân vật). */
  blockBox(box: THREE.Box3, padding = 0.3) {
    const b = box.clone().expandByVector(new THREE.Vector3(padding, 0, padding));
    const lo = this.toCell(b.min.x, b.min.z);
    const hi = this.toCell(b.max.x, b.max.z);
    for (let r = Math.max(0, lo.r); r <= Math.min(this.rows - 1, hi.r); r++) {
      for (let c = Math.max(0, lo.c); c <= Math.min(this.cols - 1, hi.c); c++) {
        const { x, z } = this.cellCenter(c, r);
        if (x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z) this.blocked[r * this.cols + c] = 1;
      }
    }
  }

  private base: Uint8Array | null = null;
  private staticLayers = new Map<string, THREE.Box3[]>();

  /** Đặt (hoặc thay) một nhóm vật cản cố định, vd. "shop" khi tiệm được mở rộng. */
  setStatic(key: string, boxes: THREE.Box3[]) {
    this.staticLayers.set(key, boxes);
  }

  /** Tính lại lớp vật cản cố định (tường, cây...) để sau này đặt nội thất lên trên. */
  rebuildBase() {
    this.blocked.fill(0);
    for (const boxes of this.staticLayers.values()) for (const b of boxes) this.blockBox(b);
    this.base = this.blocked.slice();
  }

  /** Quay về chỉ còn vật cản cố định. */
  restoreBase() {
    if (this.base) this.blocked.set(this.base);
  }

  /** Có đi được từ a tới đúng b không. */
  reachable(a: THREE.Vector3, b: THREE.Vector3) {
    if (this.isBlocked(b.x, b.z)) return false;
    const path = this.findPath(a, b);
    return path.length > 0 && path[path.length - 1].distanceTo(new THREE.Vector3(b.x, 0, b.z)) < 0.3;
  }

  blockObject(obj: THREE.Object3D) {
    obj.updateWorldMatrix(true, true);
    this.blockBox(new THREE.Box3().setFromObject(obj));
  }

  cellCenter(c: number, r: number) {
    return { x: -this.extent + (c + 0.5) * this.cell, z: -this.extent + (r + 0.5) * this.cell };
  }

  toCell(x: number, z: number) {
    return { c: Math.floor((x + this.extent) / this.cell), r: Math.floor((z + this.extent) / this.cell) };
  }

  isBlockedCell(c: number, r: number) {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return true;
    return this.blocked[r * this.cols + c] === 1;
  }

  isBlocked(x: number, z: number) {
    const { c, r } = this.toCell(x, z);
    return this.isBlockedCell(c, r);
  }

  /** Đường thẳng giữa 2 điểm có bị chặn không. */
  lineFree(a: THREE.Vector3, b: THREE.Vector3) {
    const steps = Math.ceil(a.distanceTo(b) / (this.cell * 0.5));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (this.isBlocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  }

  /** Tìm đường A* 8 hướng, trả về danh sách điểm đã làm mượt. Rỗng nếu không tới được. */
  findPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
    const start = this.toCell(from.x, from.z);
    const goal = this.nearestFree(this.toCell(to.x, to.z));
    if (!goal) return [];

    const n = this.cols * this.rows;
    const startIdx = start.r * this.cols + start.c;
    const goalIdx = goal.r * this.cols + goal.c;
    // Bộ đệm dùng lại giữa các lần tìm đường: mỗi lần gọi mà cấp phát mới là ~350KB rác GC
    if (!gScratch || gScratch.length !== n) {
      gScratch = new Float32Array(n);
      parentScratch = new Int32Array(n);
      closedScratch = new Uint8Array(n);
    }
    const g = gScratch.fill(Infinity);
    const parent = parentScratch!.fill(-1);
    const closed = closedScratch!.fill(0);
    const heap = heapScratch.reset();
    const h = (i: number) => {
      const dc = Math.abs((i % this.cols) - goal.c);
      const dr = Math.abs(Math.floor(i / this.cols) - goal.r);
      return Math.max(dc, dr) + 0.414 * Math.min(dc, dr);
    };

    g[startIdx] = 0;
    heap.push(startIdx, h(startIdx));
    while (heap.size) {
      const cur = heap.pop();
      if (cur === goalIdx) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cc = cur % this.cols;
      const cr = Math.floor(cur / this.cols);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dc && !dr) continue;
          const nc = cc + dc;
          const nr = cr + dr;
          if (this.isBlockedCell(nc, nr)) continue;
          // Không đi chéo cắt góc tường
          if (dc && dr && (this.isBlockedCell(cc + dc, cr) || this.isBlockedCell(cc, cr + dr))) continue;
          const ni = nr * this.cols + nc;
          const cost = g[cur] + (dc && dr ? 1.414 : 1);
          if (cost < g[ni]) {
            g[ni] = cost;
            parent[ni] = cur;
            heap.push(ni, cost + h(ni));
          }
        }
      }
    }
    if (parent[goalIdx] === -1 && goalIdx !== startIdx) return [];

    const cells: THREE.Vector3[] = [];
    for (let i = goalIdx; i !== -1 && i !== startIdx; i = parent[i]) {
      const { x, z } = this.cellCenter(i % this.cols, Math.floor(i / this.cols));
      cells.push(new THREE.Vector3(x, 0, z));
    }
    cells.reverse();
    if (goalIdx === this.toCell(to.x, to.z).r * this.cols + this.toCell(to.x, to.z).c && cells.length) {
      cells[cells.length - 1] = new THREE.Vector3(to.x, 0, to.z);
    }
    return this.smooth(from, cells);
  }

  /** Bỏ bớt điểm thừa nếu có thể đi thẳng. */
  private smooth(from: THREE.Vector3, points: THREE.Vector3[]) {
    const out: THREE.Vector3[] = [];
    let anchor = from.clone().setY(0);
    let i = 0;
    while (i < points.length) {
      let j = points.length - 1;
      while (j > i && !this.lineFree(anchor, points[j])) j--;
      out.push(points[j]);
      anchor = points[j];
      i = j + 1;
    }
    return out;
  }

  private nearestFree(cell: { c: number; r: number }) {
    for (let radius = 0; radius < 6; radius++) {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          if (!this.isBlockedCell(cell.c + dc, cell.r + dr)) return { c: cell.c + dc, r: cell.r + dr };
        }
      }
    }
    return null;
  }
}

class MinHeap {
  private items: number[] = [];
  private prio: number[] = [];
  get size() { return this.items.length; }

  /** Xoá sạch để dùng lại cho lần tìm đường kế tiếp. */
  reset(): this {
    this.items.length = 0;
    this.prio.length = 0;
    return this;
  }

  push(item: number, p: number) {
    this.items.push(item);
    this.prio.push(p);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.prio[parent] <= this.prio[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop() {
    const top = this.items[0];
    const lastItem = this.items.pop()!;
    const lastPrio = this.prio.pop()!;
    if (this.items.length) {
      this.items[0] = lastItem;
      this.prio[0] = lastPrio;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.items.length && this.prio[l] < this.prio[m]) m = l;
        if (r < this.items.length && this.prio[r] < this.prio[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number) {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.prio[a], this.prio[b]] = [this.prio[b], this.prio[a]];
  }
}

// Bộ đệm A* dùng chung (tìm đường chạy đồng bộ, không nhập lại): hết rác GC khi khách tìm đường dồn dập
let gScratch: Float32Array | null = null;
let parentScratch: Int32Array | null = null;
let closedScratch: Uint8Array | null = null;
const heapScratch = new MinHeap();
