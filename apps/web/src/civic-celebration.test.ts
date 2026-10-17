import assert from 'node:assert/strict';
import type { CityProgressState } from '@game/shared';
import { newCivicMilestones } from './civic-celebration';

type M = CityProgressState['milestones'][number];
const done = (bundleId: string, day = 3): M => ({ day, type: 'bundle_completed', bundleId });
const opened = (bundleId: string, day = 4): M => ({ day, type: 'civic_opened', bundleId });
const lvl: M = { day: 1, type: 'level_up', level: 2 };
const goal: M = { day: 1, type: 'goal_claimed', goalId: 'g1' };

// Lần tải đầu: mốc cũ chỉ lập nền, không báo.
const base = newCivicMilestones([lvl, done('bundle_park'), opened('bundle_park')], null);
assert.equal(base.fresh.length, 0);
assert.equal(base.seen.size, 2);

// Mốc mới sau một lần góp → báo đúng một mốc, đúng sổ.
const afterDonate = newCivicMilestones([lvl, done('bundle_park'), opened('bundle_park'), done('bundle_clinic', 6)], base.seen);
assert.deepEqual(afterDonate.fresh.map((m) => [m.type, m.bundleId]), [['bundle_completed', 'bundle_clinic']]);

// Snapshot trùng / nạp lại / replay → không báo lại.
const replay = newCivicMilestones([lvl, done('bundle_park'), opened('bundle_park'), done('bundle_clinic', 6)], afterDonate.seen);
assert.equal(replay.fresh.length, 0);
// Danh sách ngắn lại (nạp save cũ) rồi dài ra lại: không báo lại mốc đã thấy.
const shrunk = newCivicMilestones([lvl], afterDonate.seen);
assert.equal(shrunk.fresh.length, 0);
assert.equal(newCivicMilestones([lvl, done('bundle_clinic', 6)], shrunk.seen).fresh.length, 0);

// Hai mốc cùng lúc → báo đủ, đúng thứ tự trong save.
const both = newCivicMilestones([done('bundle_park'), done('bundle_clinic'), opened('bundle_clinic')], new Set(['bundle_completed:bundle_park']));
assert.deepEqual(both.fresh.map((m) => `${m.type}:${m.bundleId}`), ['bundle_completed:bundle_clinic', 'civic_opened:bundle_clinic']);

// Mốc không phải sổ góp (level_up, goal_claimed, thiếu bundleId) → bỏ qua.
const noise = newCivicMilestones([lvl, goal, { day: 2, type: 'bundle_completed' }], new Set());
assert.equal(noise.fresh.length, 0);

// Hai client: client không góp nhận cùng mốc qua snapshot, mỗi client báo đúng một lần.
const snapshot = [lvl, done('bundle_clinic', 6)];
const clientB0 = newCivicMilestones([lvl], null); // B vào hẻm trước khi mốc xuất hiện
const clientB1 = newCivicMilestones(snapshot, clientB0.seen);
assert.equal(clientB1.fresh.length, 1);
assert.equal(newCivicMilestones(snapshot, clientB1.seen).fresh.length, 0);
// B vào hẻm SAU khi mốc đã có (tải lại trang) → không bật lại.
assert.equal(newCivicMilestones(snapshot, null).fresh.length, 0);

console.log('civic-celebration.test OK');
