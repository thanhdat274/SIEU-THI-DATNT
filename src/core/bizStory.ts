/** Sự kiện bất ngờ, chuyện khách quen, cốt truyện chương (GĐ962): tách nguyên văn khỏi biz.ts. */
import { REGULARS } from '../data/regulars';
import { simRng } from './rand';
import { newRival, RIVAL_START, STORIES, SURPRISE_CHANCE, SURPRISES, type BizState } from '../data/biz';
import { chapterById, nextChapter, STORY_RIVAL_NAME } from '../data/chapters';
import { formatMoney, productById } from '../data/products';
import { arcGoodCount, arcSceneAt, arcReward as surpriseArcReward, findSurprise, sceneFor, surpriseArcById, SURPRISE_ARCS, type SurpriseArcState } from '../data/surpriseArcs';
import { useGame } from './store';

const S = () => useGame.getState();
const patch = (b: Partial<BizState>) => useGame.setState({ biz: { ...S().biz, ...b } });

// ───── Sự kiện bất ngờ ─────

/**
 * Gọi mỗi khi giờ chạy: mỗi ngày tối đa một sự kiện, vào giờ ngẫu nhiên khi tiệm mở.
 * GĐ164: arc sự kiện đang dở thì KHÔNG quay pool — phát cảnh hôm nay ở giờ tất định
 * (10h–11h30, arcSceneAt), cảnh giữ tới 20h (không tự mất 45 phút); trúng id-có-arc
 * trong pool thì mở arc thay vì phát một-phát; arc quá hạn thì khép nhẹ không phạt.
 */
export function maybeSurprise(elapsedMinutes: number) {
  const s = S();
  const b = s.biz;
  if (b.surprise && s.minutes > b.surprise.expiresAt) return patch({ surprise: null });
  // Arc quá hạn (hôm qua là ngày cuối mà vẫn để dở) → khép nhẹ, kể cả khi tiệm chưa mở cửa.
  if (b.surpriseArc && !b.surpriseArc.done && s.day > b.surpriseArc.expiresDay) {
    const arc = surpriseArcById(b.surpriseArc.arcId);
    patch({ surpriseArc: { ...b.surpriseArc, done: true } });
    s.notify(`📖 Chuyện ${arc?.title ?? 'hẻm'} để dở — không sao, hẻm nào chẳng có chuyện, dịp khác kể tiếp.`);
    return;
  }
  if (b.surpriseDay === s.day || !s.shopOpen || s.minutes < 9 * 60 || s.minutes > 20 * 60) return;
  // Arc đang dở: hôm nay thuộc arc → phát cảnh hôm nay (một cảnh/ngày, tái dùng surpriseDay).
  const arcSt = b.surpriseArc && !b.surpriseArc.done ? b.surpriseArc : null;
  if (arcSt) {
    const arc = surpriseArcById(arcSt.arcId);
    const scene = arc ? sceneFor(arc, arcSt) : null;
    if (arc && scene && s.minutes >= arcSceneAt(s.weatherSeed, s.day)) {
      // Cảnh arc giữ tới 20h — lỡ hôm nay vẫn quay lại ngày mai, tới khi hết hạn đợt.
      patch({ surprise: { id: arc.id, expiresAt: 20 * 60 }, surpriseDay: s.day });
      s.notify(`📖 ${arc.icon} ${scene.teaser ?? arc.title}`);
    }
    return; // đang có arc → không quay pool hôm nay
  }
  // Cơ hội tỉ lệ với số phút game vừa trôi: cộng dồn cả khung 9h–20h ra khoảng SURPRISE_CHANCE mỗi ngày
  if (simRng()() > (SURPRISE_CHANCE * elapsedMinutes) / (11 * 60)) return;
  // GĐ164: pool = def một-phát + arc CHƯA kể (arc thay def cũ cùng band mật độ; kể xong/khép sớm
  // đều vào surpriseArcsTold → không lặp). Arc đang chiếm slot cũng đã nằm trong told.
  const told = b.surpriseArcsTold ?? [];
  const pool = [
    ...SURPRISES.filter((e) => e.unlock <= s.level).map((e) => ({ id: e.id, unlock: e.unlock })),
    ...SURPRISE_ARCS.filter((a) => a.unlock <= s.level && !told.includes(a.id)).map((a) => ({ id: a.id, unlock: a.unlock })),
  ];
  const pick = pool[Math.floor(simRng()() * pool.length)];
  if (!pick) return;
  // Trúng arc → mở arc (2–3 ngày) thay cho một-phát.
  const arcDef = surpriseArcById(pick.id);
  if (arcDef) {
    const opened: SurpriseArcState = {
      arcId: arcDef.id, step: 0, choices: [], startedDay: s.day, expiresDay: s.day + arcDef.days - 1,
    };
    patch({
      surprise: { id: arcDef.id, expiresAt: s.minutes + 45 },
      surpriseDay: s.day,
      surpriseArc: opened,
      surpriseArcsTold: [...told, arcDef.id],
    });
    s.notify(`📖 ${arcDef.icon} ${arcDef.title}`);
    return;
  }
  const ev = SURPRISES.find((e) => e.id === pick.id)!;
  patch({ surprise: { id: ev.id, expiresAt: s.minutes + 45 }, surpriseDay: s.day });
  s.notify(`${ev.icon} ${ev.title}`);
}

export function chooseSurprise(index: number) {
  const s = S();
  const active = s.biz.surprise;
  if (!active) return;
  // GĐ164: tra arc TRƯỚC rồi mới tới SURPRISES; cảnh arc resolve theo lựa chọn đã ghi.
  const view = findSurprise(active.id, s.biz.surpriseArc?.choices);
  const c = view?.choices[index];
  if (!view || !c) return;
  // Lựa chọn cần hàng kho mà kho không đủ: chặn (UI đã xám lựa chọn), surprise giữ nguyên.
  if (c.needStock && (s.storage[c.needStock.productId] ?? 0) < c.needStock.qty) {
    return s.notify(`Kho hết ${productById(c.needStock.productId).name} rồi`);
  }
  patch({ surprise: null });
  if (c.money) useGame.setState({ money: S().money + c.money, ...(c.money < 0 ? { stats: { ...S().stats, spent: S().stats.spent - c.money } } : {}) });
  if (c.minutes) useGame.setState({ minutes: S().minutes + c.minutes });
  if (c.xp) S().addXp(c.xp);
  if (c.rating) S().addReview(c.rating);
  if (c.friendship) S().adjustFriendship(c.friendship.id, c.friendship.delta);
  const friendNote = (() => {
    if (!c.friendship) return '';
    const name = REGULAR_NAMES[c.friendship.id];
    const sign = c.friendship.delta >= 0 ? '+' : '−';
    return `・💛 ${sign}${c.friendship.delta}${name ? ` ${name}` : ''}`;
  })();
  // GĐ164: nhánh arc — ghi lựa chọn, mở cảnh kế; cảnh cuối (hoặc nhánh khép sớm) thì done.
  if (view.kind === 'arc') {
    const { arc, scene } = view;
    const prev = S().biz.surpriseArc;
    if (!prev || prev.arcId !== arc.id) return;
    const choices = [...prev.choices, index];
    const nextIdx = scene.nextByChoice ? scene.nextByChoice[index] : undefined;
    const finished = nextIdx === undefined || nextIdx < 0; // hết cảnh hoặc "−1" = khép sớm
    let reward: ReturnType<typeof surpriseArcReward> | null = null;
    if (scene.reward) {
      const good = arcGoodCount(arc, { ...prev, choices });
      reward = surpriseArcReward(scene, good, s.level);
      if (reward.rating) S().addReview(reward.rating);
      if (reward.xp) S().addXp(reward.xp);
    }
    const nextArc: SurpriseArcState = { ...prev, choices, step: prev.step + 1, ...(finished || scene.reward ? { done: true } : {}) };
    patch({ surpriseArc: nextArc });
    if (reward) {
      if (reward.money) useGame.setState({ money: S().money + reward.money });
      s.notify(`📖 ${arc.title} khép lại · ${c.result} · +${formatMoney(reward.money)}${friendNote}`);
    } else {
      s.notify(`${view.icon} ${c.result}${c.money ? ` (${c.money > 0 ? '+' : ''}${formatMoney(c.money)})` : ''}${friendNote}`);
    }
    return;
  }
  s.notify(`${view.icon} ${c.result}${c.money ? ` (${c.money > 0 ? '+' : ''}${formatMoney(c.money)})` : ''}${friendNote}`);
}

// ───── Chuyện khách quen ─────

/** Khách quen vừa trả tiền: có chương truyện mới mở theo độ thân thì hiện lên. */
export function storyOnVisit(regularId: string) {
  const s = S();
  const chapters = STORIES[regularId];
  if (!chapters || s.biz.storyPending) return;
  const seen = s.biz.story[regularId] ?? 0;
  const next = chapters[seen];
  if (next && (s.regulars[regularId]?.friendship ?? 0) >= next.at) patch({ storyPending: { regular: regularId, chapter: seen } });
}

export function closeStory() {
  const s = S();
  const p = s.biz.storyPending;
  if (!p) return;
  const ch = STORIES[p.regular]?.[p.chapter];
  patch({ storyPending: null, story: { ...s.biz.story, [p.regular]: p.chapter + 1 } });
  if (ch?.reward?.money) useGame.setState({ money: S().money + ch.reward.money });
  if (ch?.reward?.xp) S().addXp(ch.reward.xp);
}

// ───── Cốt truyện theo chương ─────

/** Có chương mới đủ điều kiện thì xếp chờ hiện hội thoại (gọi thường xuyên, rẻ). */
export function checkChapters() {
  const s = S();
  if (s.biz.chapterPending || s.biz.storyPending || s.panel) return;
  // Mỗi ngày tối đa một chương: lên cấp nhanh không dồn mấy hội thoại liên tiếp
  if (s.biz.chapterDay === s.day) return;
  const ch = nextChapter(s.biz.chapters, {
    day: s.day, level: s.level, customers: s.totals.customers, staffCount: s.staff.length, shopTier: s.shopTier,
    hasRival: !!s.biz.rival, rivalsBeaten: s.biz.rivalsBeaten,
  });
  if (ch) patch({ chapterPending: ch.id });
}

/** Đọc xong hội thoại: ghi đã xem, trao thưởng, chạy hiệu ứng của chương. */
export function closeChapter() {
  const s = S();
  const ch = s.biz.chapterPending ? chapterById(s.biz.chapterPending) : undefined;
  if (!ch) return patch({ chapterPending: null });
  const b: Partial<BizState> = { chapterPending: null, chapters: [...s.biz.chapters, ch.id], chapterDay: s.day };
  if (ch.effect === 'openRival' && !s.biz.rival) {
    b.rival = { ...newRival(STORY_RIVAL_NAME, RIVAL_START, s.day), saleUntil: s.day + 2 };
  }
  patch(b);
  if (ch.reward?.money) useGame.setState({ money: S().money + ch.reward.money });
  if (ch.reward?.xp) S().addXp(ch.reward.xp);
  if (ch.effect === 'openRival') s.notify(`⚔️ ${STORY_RIVAL_NAME} khai trương, giảm giá 2 ngày đầu. Xem sức mạnh của họ ở Kinh doanh`);
}

/** Tên khách quen theo id (dùng ở HUD, thị trường, báo cáo cuối ngày). */
export const REGULAR_NAMES = Object.fromEntries(REGULARS.map((r) => [r.id, r.name]));
