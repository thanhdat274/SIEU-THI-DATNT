import { formatMoney, productById } from '../../data/products';
import { fitJoin } from '../../data/onboarding';
import { faintMinutes } from '../../data/biz';
import { maybeSurprise } from '../biz';
import { DIRT_MAX } from '../../data/staff';
import { RECIPE_MAP } from '../../data/recipes';
import { sealYieldBonus } from '../../data/stance';
import { playSfx } from '../audio';
import { STOCK_WARN_AT, nightNeed, shelfTotal } from '../../data/branches';
import { OPERATING_REVENUE_RATE, rentOf } from '../../data/shopTiers';
import { type GameState, type SetState, type GetState, SLEEP_FROM, faintGuard, MINUTES_PER_SECOND, wagesDue } from '../gameTypes';
import { copyStock, putStock } from '../stock';
import { useClock } from '../store';
import { runBranch } from './branch';
import { endDay } from './endDay';
import { countPanel } from '../dayReport';
import { updateOnline } from './online';
import { equipSpeed } from '../../data/equipment';
import { updatePhones, cookSpeed, bartenderBoost } from './orders';
import { maybeInspection } from '../inspection';
import { pushNotif } from '../notifLog';

/** Đồng hồ và nhịp ngày: tick mỗi khung hình (chi nhánh, điện thoại, mẻ nấu), đi ngủ, thông báo, mở bảng. */

let messageTimer: ReturnType<typeof setTimeout> | undefined;
/** GĐ1833 — đã cảnh báo tiền âm trước khi ngủ trong phiên này chưa (chỉ chặn một lần, không nhớ save). */
let sleepWarned = false;
/** GĐ1839 — số lần addDirt còn được bỏ qua sau resetGame (đếm lượt, không phải thời gian → tất định). */
let dirtFreeze = 0;
/** GĐ571: tin gọi liên tiếp trong cùng một lượt xử lý gộp một toast thay vì đè nhau. */
let burst: string[] = [];

export const createClockSlice = (set: SetState, get: GetState): Pick<GameState, 'addDirt' | 'freezeDirt' | 'setSpeed' | 'tick' | 'sleep' | 'notify' | 'armMessage' | 'openPanel' | 'closePanel' | 'markHudTourDone'> => ({
  freezeDirt: () => { dirtFreeze = 200; },
  addDirt: (amount) => {
    // GĐ1839 (review đợt 4 R3): sau resetGame, khách cũ còn trong cảnh vẫn đi ra cửa và addDirt —
    // ngày 1 mở màn với sàn bẩn 72% và bị dạy "lau nhà" thứ mình không gây. freezeDirt() bỏ qua
    // một số lần bẩn đầu tiên (khách cũ tối đa vài chục lượt), trò chơi thường thì chạy lại bình thường.
    if (dirtFreeze > 0) {
      dirtFreeze -= 1;
      return;
    }
    const before = get().dirt;
    const dirt = Math.max(0, Math.min(DIRT_MAX, before + amount));
    set({ dirt });
    if (before < 60 && dirt >= 60) get().notify('🧹 Sàn tiệm bẩn quá, khách bắt đầu ngại vào. Thuê lao công nhé!');
  },
  setSpeed: (speed) => set({ speed }),
  tick: (dt) => {
    const s = get();
    const minutes = s.minutes + dt * MINUTES_PER_SECOND * s.speed;
    // GĐ1506: phút game đã trôi của nhịp tick này — phải tính TRƯỚC khi ghi thẳng get().minutes
    // (mutation tại chỗ làm s.minutes === minutes, trừ lại luôn ra 0 — sự kiện theo thời gian sẽ chết).
    // Ăn sáng no bụng thì thức khuya được thêm một chút mới ngất
    if (minutes >= faintMinutes(s.biz.breakfastDay === s.day)) {
      if (faintGuard.spare()) {
        endDay(set, get, {});
        s.notify('💤 Đã khuya, cả hẻm sang ngày mới.');
        return;
      }
      const lost = Math.floor(s.money * 0.1);
      endDay(set, get, { money: s.money - lost });
      set((st) => ({ ...(st.panel?.type === 'summary' ? { panel: { ...st.panel, fainted: lost } } : {}), ...(st.lastSummary ? { lastSummary: { ...st.lastSummary, fainted: lost } } : {}) }));
      s.notify(`😵 Bạn thức quá khuya và ngất đi... Mất ${formatMoney(lost)} tiền thuốc.`);
      return;
    }
    // GĐ786: qua 24:00 mà đang chạy nhanh thì hạ về 1× — ở 8× chỉ còn ~7 giây thực tới lúc ngất, người chơi
    // (nhất là người mới) không kịp thấy banner "Đã khuya". Chỉ hạ MỘT lần lúc vượt mốc, chạy trên máy chủ (khách không tick).
    if (s.minutes < 24 * 60 && minutes >= 24 * 60 && s.speed > 1) {
      set({ speed: 1 });
      s.notify('🌙 Đã khuya — đã chậm về 1×. Về nhà ngủ kẻo ngất!');
    }
    // Review 13/11-3 R9: chạy ≥4× mà khách xếp hàng ≥4 người (chủ thường đang ở xa quầy) → hạ về 3×
    // MỘT lần kèm giải thích, kẻo khách chất đống bỏ về. Cổng cấp >30 để không lệch golden.
    if (s.level > 30 && s.speed > 3 && s.shopOpen && s.waiting >= 4) {
      set({ speed: 3 });
      s.notify('⏳ Khách xếp hàng chờ tính tiền — đã chậm về 3×. Ra quầy rồi hãy tăng tốc.');
    }
    // Đồng hồ chạy mỗi khung hình: ghi thẳng vào state (không set) để cả đống component
    // dùng nguyên `useGame()` không phải vẽ lại 60 lần/giây. UI đọc giờ qua useClock bên dưới.
    const elapsedMinutes = minutes - s.minutes; // GĐ1506 — chốt trước khi mutation
    get().minutes = minutes;
    useClock.setState({ minutes });
    if (s.branch && minutes - s.branch.simAt >= 10) set(runBranch(get, minutes));
    // Tối: kho chung + hàng trên kệ chi nhánh không đủ bán qua đêm thì nhắc chủ nhập thêm
    const br = get().branch;
    if (br?.open && minutes >= STOCK_WARN_AT && br.warnedDay !== s.day) {
      const have = Object.values(get().storage).reduce((n, q) => n + q, 0) + shelfTotal(br.shelf);
      set({ branch: { ...br, warnedDay: s.day } });
      if (have < nightNeed()) get().notify(`⚠️ Kho chung sắp cạn (còn ${have}, đêm nay cần ~${nightNeed()}) — nhập thêm!`);
    }
    // Hệ 5-L2 (SPEC-CHIEU-RONG §5.10) — xe đi tỉnh về khi hết giờ: một phép so sánh cùng kiểu STOCK_WARN_AT,
    // canh `biz.trip` trống nên simGolden (không bao giờ startTrip) không đổi một byte.
    if (s.biz.trip && minutes >= s.biz.trip.returnAt) get().tripArrive();
    updatePhones(set, get);
    updateOnline(set, get);
    // GĐ1507 — truyền đúng phút đã trôi: bug elapsed=0 làm pool sự kiện một-phát chết từ GĐ962
    // (chỉ arc sống vì không dùng elapsed — GĐ164). Số lần gọi simRng không đổi → chuỗi rng không dịch.
    maybeSurprise(elapsedMinutes);
    // GĐ1506 — đoàn kiểm tra vệ sinh: gieo metaRng theo phút game (chỉ máy chạy chạy tới đây)
    maybeInspection(elapsedMinutes);
    // Các mẻ nấu đang chạy: hết giờ thì thành phẩm vào kho (bày bán như hàng thường)
    const jobs = get().cookJobs;
    if (jobs.length && s.speed > 0) {
      const base = dt * MINUTES_PER_SECOND * s.speed * cookSpeed(get);
      // Mẻ ở trạm pha chế được pha chế trực ca tăng tốc thêm (cùng đầu bếp)
      const drink = base * bartenderBoost(get);
      // SPEC-TOI-UU §T2-a: ghi thẳng `remaining` tại chỗ (như `minutes`) — không `set` mỗi khung nên các
      // component đăng ký cả store không vẽ lại 60 lần/giây; chỉ `set` khi có mẻ xong. UI đọc tiến độ qua useClock.
      for (const j of jobs) {
        const r = RECIPE_MAP[j.recipeId];
        j.remaining -= (r?.station === 'drink_counter' ? drink : base) * equipSpeed(s.biz, r?.station ?? '');
      }
      const next = jobs;
      const done = next.filter((j) => j.remaining <= 0);
      if (done.length) {
        const sealQ = sealYieldBonus(get().biz); // Hệ3-L8 Ấn Đặc sản: mỗi mẻ nấu ra thêm 1 đơn vị
        // Hệ7-L2: thưởng trò khéo tay cộng vào mẻ KẾ TIẾP của công thức (biz.miniBonus) — đọc, cộng, xoá.
        const miniB = get().biz.miniBonus ?? {};
        const usedBonus = new Set<string>();
        const k = copyStock(get());
        for (const j of done) {
          const r = RECIPE_MAP[j.recipeId];
          const bonus = miniB[j.recipeId] ?? 0;
          if (r) {
            putStock(k, r.outputId, r.outputQty + sealQ + bonus);
            if (bonus) usedBonus.add(j.recipeId);
          }
        }
        set({ ...k, cookJobs: next.filter((j) => j.remaining > 0) });
        // xoá phần thưởng đã dùng hết (thưởng chỉ áp cho MỘT mẻ tiếp theo)
        if (usedBonus.size) {
          const keep = { ...get().biz.miniBonus };
          for (const id of usedBonus) delete keep[id];
          set((st) => ({ biz: { ...st.biz, miniBonus: keep } }));
        }
        playSfx('ding');
        for (const j of done) {
          const r = RECIPE_MAP[j.recipeId];
          if (!r) continue;
          const bonus = miniB[j.recipeId] ?? 0;
          const made = r.outputQty + sealQ + bonus;
          get().notify(`🍲 Nấu xong: ${made} ${productById(r.outputId).name} đã vào kho, bày lên kệ được ngay`);
          get().addXp(4);
        }
      }
    }
  },
  sleep: () => {
    const s = get();
    if (s.minutes < SLEEP_FROM) {
      s.notify('Chưa buồn ngủ. Từ 18:00 mới đi ngủ được.');
      return false;
    }
    // GĐ1833 (review đợt 2 R3 / đợt 3 R3): qua ngày khi két không đủ trả tiền nhà + lương + phí vận
    // hành thì tiền bị ÂM mà không có ai nói trước (hẻm QA thật −7.659đ, âm tiếp nhiều ngày). Cảnh
    // báo một lần — bấm Ngủ lần nữa vẫn ngủ (người chơi được phép chấp nhận nợ, nhưng phải biết).
    // Ước lượng nhanh (~): lương có wageRelief gánh nên thực tế có thể đỡ hơn con số này.
    const dueTonight = rentOf(s.shopTier) + wagesDue(s) + Math.round(s.stats.revenue * OPERATING_REVENUE_RATE);
    if (s.money < dueTonight && !sleepWarned) {
      sleepWarned = true;
      s.notify(`⚠️ Két không đủ trả nhà+lương (~${formatMoney(dueTonight)}) — thiếu ${formatMoney(dueTonight - s.money)}. Bấm Ngủ lần nữa vẫn ngủ.`);
      return false;
    }
    endDay(set, get);
    return true;
  },
  notify: (message) => {
    if (!burst.length) queueMicrotask(() => { burst = []; });
    if (!burst.includes(message)) burst.push(message);
    set({ message: burst.length > 1 ? fitJoin([message, ...burst.filter((m) => m !== message).reverse()]) : message });
    // Sổ thông báo: tin trôi sau 3–4.5s nhưng xem lại được ở bảng 🔔 (panel 'log')
    pushNotif(get().day, get().minutes, message);
    clearTimeout(messageTimer);
    // GĐ1835 (review đợt 4 R4): card thoại chương đè mất toast — khi thoại đang mở thì GIỮ tin
    // (không đếm giờ); bấm xong thoại, closeChapter gọi armMessage() mới bắt đầu đếm 3 giây.
    if (get().biz.chapterPending) return;
    messageTimer = setTimeout(() => set({ message: null }), burst.length > 1 ? 4500 : 3000); // GĐ577: toast gộp cần thêm giờ đọc
  },
  armMessage: () => {
    clearTimeout(messageTimer);
    const m = get().message;
    if (!m) return;
    messageTimer = setTimeout(() => set({ message: null }), m.includes(' · ') ? 4500 : 3000);
  },
  openPanel: (panel) => {
    // SPEC-TOI-UU §T1 (L1): đếm số lần mở bảng trong ngày — một chỗ duy nhất mọi bảng đi qua.
    countPanel(panel.type);
    set({ panel });
  },
  // GĐ1503 — chốt cờ đã xem tour HUD (UI thuần, không đụng kinh tế)
  markHudTourDone: () => set({ hudTourDone: true }),
  closePanel: () => set({ panel: null }),
});
