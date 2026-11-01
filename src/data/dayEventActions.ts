/**
 * GĐ635: việc Sổ đầu ngày theo dịp (ngày cúng / ngày trận) — tách riêng file để chỉ panel Sổ đầu ngày
 * (nạp lười) kéo vào, không nằm trong gói tải ban đầu.
 */
import type { DayAction } from './dayPlan';
import type { Weather } from './weather';
import { productById } from './products';
import { isQuanMatchDay } from './quanNuoc';
import { SAP_LOTS, sapKindOf } from './sapRong';
import { CUNG_GOODS, isXoiCungDay, TIEM_XOI_MAX_STAFF, type TiemXoiState } from './tiemXoi';

/**
 * GĐ612/613 (tách GĐ633): việc Sổ đầu ngày khi đồ cúng đã mở mà chưa có hàng —
 * ngày cúng "khách hỏi … chưa có hàng", hôm trước "Mai ngày cúng — nhập sẵn …".
 */
export function cungGoodsAction(day: number, level: number, haveStock: (id: string) => boolean): DayAction | null {
  const eve = !isXoiCungDay(day) && isXoiCungDay(day + 1);
  if (!eve && !isXoiCungDay(day)) return null;
  const missing = CUNG_GOODS.filter((id) => productById(id).unlock <= level && !haveStock(id));
  if (!missing.length) return null;
  const names = missing.map((id) => productById(id).name.toLowerCase()).join(', ');
  return { icon: '🙏', text: eve ? `Mai ngày cúng — nhập sẵn ${names}` : `Ngày cúng khách hỏi ${names} — chưa có hàng`, panel: 'order', danger: false, priority: 2 };
}

/** GĐ599 (tách GĐ635): Sổ đầu ngày ngày cúng khi tiệm xôi mở — chưa đủ thợ thì nhắc thêm thợ. */
export function tiemXoiCungAction(t: Pick<TiemXoiState, 'open' | 'staff'> | undefined, day: number): DayAction | null {
  if (!t?.open || !isXoiCungDay(day)) return null;
  return { icon: '🙏', text: t.staff < TIEM_XOI_MAX_STAFF ? 'Hôm nay ngày cúng — khách mua xôi ×1,3, thêm thợ để nấu kịp' : 'Hôm nay ngày cúng — khách mua xôi ×1,3, thợ nấu đầy kho', panel: 'quannuoc', danger: false, priority: 3 };
}

/**
 * GĐ625/631 (tách GĐ632): việc Sổ đầu ngày khi có sạp mà chưa lô nào bán món "đúng dịp":
 * ngày cúng → xôi (×1,3, mưa/bão sạp nghỉ thì thôi); ngày trận → nước mía (×1,15).
 */
export function sapEventActions(lots: number | undefined, kinds: readonly string[] | undefined, day: number, weather?: Weather): DayAction[] {
  const n = Math.max(0, Math.min(SAP_LOTS, lots ?? 0));
  if (!n) return [];
  const ids = Array.from({ length: n }, (_, i) => sapKindOf(kinds, i).id);
  const out: DayAction[] = [];
  if (isXoiCungDay(day) && weather !== 'rain' && weather !== 'storm' && !ids.includes('xoi')) out.push({ icon: '🙏', text: 'Hôm nay ngày cúng — đổi một lô sạp sang xôi (×1,3)', panel: 'quannuoc', danger: false, priority: 3 });
  if (isQuanMatchDay(day, weather) && !ids.includes('nuocmia')) out.push({ icon: '⚽', text: 'Hôm nay có trận — đổi một lô sạp sang nước mía (×1,15)', panel: 'quannuoc', danger: false, priority: 3 });
  return out;
}


/**
 * GĐ637: dòng đếm ngược dịp kế tiếp trên Sổ đầu ngày — ngày cúng (luôn) và tối có trận (khi quán nước
 * đã mở cấp). Trận tính theo lịch, chưa biết mưa nên ghi "dự kiến". Hôm nay đúng dịp thì bỏ (việc đã báo).
 */
export function nextEventLine(day: number, level: number, quanUnlock: number): string | null {
  const find = (ok: (d: number) => boolean) => { for (let n = 1; n <= 31; n++) if (ok(day + n)) return n; return null; };
  const parts: string[] = [];
  const c = isXoiCungDay(day) ? null : find((d) => isXoiCungDay(d));
  if (c) parts.push(c === 1 ? '🙏 Ngày cúng: mai' : `🙏 Ngày cúng: còn ${c} ngày`);
  if (level >= quanUnlock && !isQuanMatchDay(day, 'sunny')) {
    const m = find((d) => isQuanMatchDay(d, 'sunny'));
    if (m) parts.push(m === 1 ? '⚽ Trận: mai (dự kiến)' : `⚽ Trận: còn ${m} ngày (dự kiến)`);
  }
  return parts.length ? parts.join(' · ') : null;
}
