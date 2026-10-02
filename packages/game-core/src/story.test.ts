import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE, MARKET_EVENT_MAP, RIVAL_EVENT_ID, STORY_CHAPTERS, generateStarterTileMap, validateMarketData } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';
import { beginChapter, claimChapter, createInitialStoryState, getChapterProgress, normalizeStoryState, type StoryContext } from './story';
import { scheduleEvents } from './market';

const ctxAt = (patch: Partial<StoryContext> = {}): StoryContext => ({
  day: 1, level: 1, totalCustomersServed: 0, totalRevenue: 0, staffCount: 0, reputation: 20, regularsCount: 0, stallServings: 0, ...patch,
});

export function runStoryTests(): void {
  console.log('\n--- Test: Cốt truyện (chương có lời thoại) ---');

  // Dữ liệu: id duy nhất, số chương liên tiếp, level mở không giảm
  assert.equal(new Set(STORY_CHAPTERS.map(c => c.id)).size, STORY_CHAPTERS.length);
  STORY_CHAPTERS.forEach((chapter, i) => {
    assert.equal(chapter.chapter, i + 1);
    assert.ok(chapter.dialog.length > 0 && chapter.rewardMoney > 0);
    if (i > 0) assert.ok(chapter.unlockLevel >= STORY_CHAPTERS[i - 1].unlockLevel);
  });
  assert.deepEqual(validateMarketData(), [], 'dữ liệu thị trường (gồm sự kiện mới) hợp lệ');

  // Chương 1: mở ngay, phải bắt đầu mới tính hoàn thành
  {
    const state = createInitialStoryState();
    assert.equal(getChapterProgress(state, STORY_CHAPTERS[0], ctxAt()).status, 'available');
    assert.equal(getChapterProgress(state, STORY_CHAPTERS[1], ctxAt({ level: 10 })).status, 'locked', 'chương 2 khóa khi chương 1 chưa nhận');
    assert.equal(claimChapter(state, 'homecoming', ctxAt({ totalCustomersServed: 5 })).success, false, 'chưa bắt đầu thì không nhận được');
    assert.equal(beginChapter(state, 'homecoming', ctxAt()).success, true);
    assert.equal(beginChapter(state, 'homecoming', ctxAt()).success, false, 'không bắt đầu hai lần');
    assert.equal(claimChapter(state, 'homecoming', ctxAt()).success, false, 'chưa phục vụ khách nào');
    const done = ctxAt({ totalCustomersServed: 1 });
    assert.equal(getChapterProgress(state, STORY_CHAPTERS[0], done).status, 'completed');
    const claimed = claimChapter(state, 'homecoming', done);
    assert.ok(claimed.success && claimed.reward.money === 50000);
    assert.equal(claimChapter(state, 'homecoming', done).success, false, 'không nhận hai lần');
    assert.equal(getChapterProgress(state, STORY_CHAPTERS[1], ctxAt({ level: 10 })).status, 'available', 'nhận xong thì chương 2 mở');
    assert.equal(beginChapter(state, 'growing_shop', ctxAt({ level: 9 })).success, false, 'thiếu level');
  }

  // Chương 5: phải đủ ngày, danh tiếng và khách quen
  {
    const state = normalizeStoryState({ startedChapters: { rival_supermarket: 30 }, claimedChapters: STORY_CHAPTERS.slice(0, 4).map(c => c.id) });
    const rival = STORY_CHAPTERS.find(c => c.id === 'rival_supermarket')!;
    const strong = { level: 24, reputation: 80, regularsCount: 10 };
    assert.equal(getChapterProgress(state, rival, ctxAt({ ...strong, day: 38 })).status, 'started', 'chưa hết 10 ngày');
    assert.equal(getChapterProgress(state, rival, ctxAt({ ...strong, day: 39 })).status, 'started', 'ngày cuối chưa trọn');
    assert.equal(getChapterProgress(state, rival, ctxAt({ ...strong, day: 40 })).status, 'completed');
    assert.equal(getChapterProgress(state, rival, ctxAt({ ...strong, day: 40, reputation: 60 })).status, 'started', 'danh tiếng thấp');
    assert.equal(getChapterProgress(state, rival, ctxAt({ ...strong, day: 40, regularsCount: 3 })).status, 'started', 'thiếu khách quen');
  }

  // Normalize: bỏ chương lạ, ngày không hợp lệ
  {
    const state = normalizeStoryState({ startedChapters: { homecoming: 5, ghost: 3, growing_shop: -2 }, claimedChapters: ['ghost', 'homecoming', 'homecoming'] });
    assert.deepEqual(state.claimedChapters, ['homecoming']);
    assert.deepEqual(state.startedChapters, { homecoming: 5 });
    assert.deepEqual(normalizeStoryState(undefined), createInitialStoryState());
  }

  // Sự kiện đối thủ không bao giờ tự lên lịch; hai sự kiện mới có xuất hiện
  {
    assert.equal(MARKET_EVENT_MAP[RIVAL_EVENT_ID].manual, true);
    const schedule = scheduleEvents('seed-story', undefined, 400);
    assert.ok(!schedule.events.some(event => event.id === RIVAL_EVENT_ID), 'đối thủ chỉ do cốt truyện kích hoạt');
    assert.ok(schedule.events.some(event => event.id === 'wholesale_sale'), 'mối sỉ xả hàng có xuất hiện');
    assert.ok(schedule.events.some(event => event.id === 'social_trend'), 'trend mạng xã hội có xuất hiện');
  }

  // Qua mô phỏng: save cũ không có story, bắt đầu/nhận chương, thưởng tiền
  {
    const save = structuredClone(DEFAULT_INITIAL_SAVE);
    if (save.goals) delete save.goals.story;
    save.player.level = 24;
    save.statistics.totalCustomersServed = 10;
    save.statistics.totalRevenue = 60_000_000;
    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
    const list = sim.getStoryProgressList();
    assert.equal(list.length, STORY_CHAPTERS.length);
    assert.equal(list[0].status, 'available');

    const money0 = sim.getPlayerData().money;
    assert.equal(sim.claimStoryChapter('homecoming').success, false);
    assert.equal(sim.beginStoryChapter('homecoming').success, true);
    assert.equal(sim.claimStoryChapter('homecoming').success, true);
    assert.equal(sim.getPlayerData().money, money0 + 50000);
    assert.equal(sim.claimStoryChapter('homecoming').success, false);
    assert.equal(sim.beginStoryChapter('rival_supermarket').success, false, 'khóa vì chương trước chưa nhận');
  }

  // Bắt đầu chương đối thủ: thêm sự kiện 10 ngày vào lịch thị trường và còn sau save/load
  {
    const save = structuredClone(DEFAULT_INITIAL_SAVE);
    save.player.level = 30;
    save.goals = { claimedGoalIds: [], claimedWeeklyQuestIds: {}, story: { startedChapters: {}, claimedChapters: STORY_CHAPTERS.slice(0, 4).map(c => c.id) } };
    const sim = new GameSimulation(save, generateStarterTileMap(), new InputManager());
    const day = sim.getTime().day;
    assert.equal(sim.beginStoryChapter('rival_supermarket').success, true);
    const rival = sim.getMarketState().events.find(event => event.id === RIVAL_EVENT_ID);
    assert.ok(rival && rival.startDay === day && rival.endDay === day + 9, 'sự kiện đối thủ kéo dài 10 ngày');
    const reloaded = new GameSimulation(sim.exportSaveData(), generateStarterTileMap(), new InputManager());
    assert.ok(reloaded.getMarketState().events.some(event => event.id === RIVAL_EVENT_ID), 'sự kiện còn sau khi nạp lại');
    assert.equal(reloaded.getStoryProgressList().find(c => c.chapterId === 'rival_supermarket')?.status, 'started');
  }
  console.log('Cốt truyện và sự kiện mới: PASS');
}
