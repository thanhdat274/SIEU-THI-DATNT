/**
 * Ảnh nhỏ minimap mỗi lần lên cấp thành phố (OpenSpec `open-world-districts-city-goals` 3.2).
 * Lưu CỤC BỘ trong IndexedDB (không vào save/cloud), tối đa `CITY_SNAPSHOT_MAX` ảnh mỗi thế giới; thiết bị không có
 * IndexedDB thì bỏ qua lặng lẽ (không bắt buộc cho nghiệm thu).
 */
export interface CitySnapshot { worldKey: string; level: number; day: number; dataUrl: string; createdAt: number }

export const CITY_SNAPSHOT_MAX = 10;
const DB_NAME = 'hem-city-snapshots';
const STORE = 'snapshots';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') { resolve(null); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { autoIncrement: true }).createIndex('worldKey', 'worldKey');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

/** Ảnh của một thế giới, mới nhất trước. */
export async function listCitySnapshots(worldKey: string): Promise<CitySnapshot[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    const req = db.transaction(STORE).objectStore(STORE).index('worldKey').getAll(worldKey);
    req.onsuccess = () => resolve((req.result as CitySnapshot[]).sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => resolve([]);
  });
}

/** Chụp canvas minimap (nén webp) và lưu; giữ tối đa `CITY_SNAPSHOT_MAX` ảnh mới nhất của thế giới. */
export async function captureCitySnapshot(worldKey: string, level: number, day: number): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('canvas.mini-map');
  const db = await openDb();
  if (!canvas || !db) return;
  const dataUrl = canvas.toDataURL('image/webp', 0.7);
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.add({ worldKey, level, day, dataUrl, createdAt: Date.now() } satisfies CitySnapshot);
    const keysReq = store.index('worldKey').getAllKeys(worldKey);
    keysReq.onsuccess = () => {
      // Khóa autoIncrement tăng dần theo thời gian → xóa các khóa cũ nhất vượt trần.
      const keys = (keysReq.result as number[]).sort((a, b) => a - b);
      for (const key of keys.slice(0, Math.max(0, keys.length - CITY_SNAPSHOT_MAX))) store.delete(key);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}
