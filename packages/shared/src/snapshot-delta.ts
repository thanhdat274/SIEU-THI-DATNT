/**
 * Delta snapshot cho kênh WebSocket: thay vì gửi lại cả snapshot (gồm save vài chục KB) mỗi 250ms,
 * server chỉ gửi những nhánh đã đổi. Mỗi patch đặt giá trị tuyệt đối tại một đường dẫn
 * (không cộng dồn), nên áp lên đúng bản gốc `baseSeq` sẽ ra đúng bản mới.
 *
 * Mảng được thay nguyên mảng (so khớp từng phần tử dễ sai khi chèn/xóa); object được đi sâu tới `maxDepth`.
 */
export interface SnapshotPatch {
  /** Đường dẫn khóa; số là chỉ số mảng (chỉ dùng cho `businesses[i]`). */
  p: (string | number)[];
  /** Giá trị mới; thiếu khi `d` = true. */
  v?: unknown;
  /** Khóa bị xóa. */
  d?: true;
}

export interface SnapshotDeltaMessage {
  baseSeq: number;
  seq: number;
  patches: SnapshotPatch[];
  serverTime?: string;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** So hai cây JSON; trả danh sách patch biến `prev` thành `next`. */
export function diffSnapshot(prev: unknown, next: unknown, maxDepth = 5): SnapshotPatch[] {
  const patches: SnapshotPatch[] = [];
  const walk = (a: unknown, b: unknown, path: (string | number)[], depth: number) => {
    if (a === b) return;
    // Mảng businesses có độ dài cố định nhỏ: đi sâu theo chỉ số để save không bị gửi nguyên khối.
    const sameLengthArrays = Array.isArray(a) && Array.isArray(b) && a.length === b.length && path.length === 1 && path[0] === 'businesses';
    if (depth < maxDepth && sameLengthArrays) {
      for (let i = 0; i < b.length; i++) walk(a[i], b[i], [...path, i], depth + 1);
      return;
    }
    if (depth < maxDepth && isPlainObject(a) && isPlainObject(b)) {
      for (const key of Object.keys(b)) walk(a[key], b[key], [...path, key], depth + 1);
      for (const key of Object.keys(a)) if (!(key in b)) patches.push({ p: [...path, key], d: true });
      return;
    }
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    patches.push(b === undefined ? { p: path, d: true } : { p: path, v: b });
  };
  walk(prev, next, [], 0);
  return patches;
}

/** Áp patch theo kiểu bất biến: chỉ sao chép các nhánh trên đường dẫn bị đổi, phần còn lại dùng chung với `base`. */
export function applySnapshotPatches<T>(base: T, patches: SnapshotPatch[]): T {
  let root: unknown = base;
  for (const patch of patches) {
    if (!patch.p.length) { root = patch.d ? undefined : patch.v; continue; }
    const copy = (node: unknown): Record<string | number, unknown> =>
      (Array.isArray(node) ? [...node] : isPlainObject(node) ? { ...node } : {}) as Record<string | number, unknown>;
    const newRoot = copy(root);
    let cursor = newRoot;
    for (let i = 0; i < patch.p.length - 1; i++) {
      const key = patch.p[i];
      const child = copy(cursor[key]);
      cursor[key] = child;
      cursor = child;
    }
    const last = patch.p[patch.p.length - 1];
    if (patch.d) delete cursor[last];
    else cursor[last] = patch.v;
    root = newRoot;
  }
  return root as T;
}
