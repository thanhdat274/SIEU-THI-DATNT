import assert from 'node:assert/strict';
import { createInitialOnlineWorld, XOI_PLOT_ID } from '@game/data';
import { buyLandPlot } from '@game/core';
import type { SaveGameData } from '@game/shared';
import { checkSaveInvariants, MAX_REVENUE_PER_GAME_MINUTE } from './save-invariants.js';

const base = createInitialOnlineWorld({ id: 'inv-owner', displayName: 'Owner', photoUrl: null }, 'inv-world').business.save as SaveGameData;
const clone = (): SaveGameData => structuredClone(base);
const check = (next: SaveGameData, type = 'set_price', prev = base) => checkSaveInvariants(prev, next, type);

assert.equal(check(clone()), null, 'save không đổi hợp lệ');

let n = clone(); n.player.money += 5_000_000;
assert.match(check(n) ?? '', /Tiền tăng/, 'cộng tiền không có thời gian trôi qua bị từ chối');
n = clone(); n.player.money += 5_000_000; n.worldTime.day += 1;
assert.equal(check(n), null, 'một ngày game trôi qua cho phép tiền tăng hợp lý');
n = clone(); n.player.money += 900_000; assert.equal(check(n, 'claim_goal'), null, 'lệnh nhận thưởng được cộng trong hạn mức');
n = clone(); n.player.money += 1_500_000; assert.match(check(n, 'claim_goal') ?? '', /Tiền tăng/, 'vượt hạn mức thưởng bị từ chối');
n = clone(); n.player.money = -1; assert.match(check(n) ?? '', /Tiền không hợp lệ/);
n = clone(); n.player.money = Number.NaN; assert.match(check(n) ?? '', /Tiền không hợp lệ/);
n = clone(); n.player.level = 99; assert.match(check(n) ?? '', /Cấp độ/);
n = clone(); n.statistics.totalRevenue += MAX_REVENUE_PER_GAME_MINUTE * 10; assert.match(check(n) ?? '', /Doanh thu/);
n = clone(); n.worldTime.minute += 10; n.statistics.totalRevenue += MAX_REVENUE_PER_GAME_MINUTE * 10;
assert.equal(check(n), null, 'doanh thu trong hạn mức theo thời gian');

const richPrev = clone();
richPrev.statistics.totalRevenue = 1000;
richPrev.player.experience = 50;
richPrev.goals = { claimedGoalIds: ['g1'], claimedWeeklyQuestIds: { 1: ['w1'] }, claimedFestivalGoalKeys: ['f@1'] };
richPrev.skills = { xp: { management: 10, marketing: 0, storage: 0 }, levels: { management: 1, marketing: 1, storage: 1 }, chosenPerks: ['p1'] };
n = structuredClone(richPrev); n.statistics.totalRevenue = 500; assert.match(check(n, 'set_price', richPrev) ?? '', /doanh thu/i);
n = structuredClone(richPrev); n.player.experience = 10; assert.match(check(n, 'set_price', richPrev) ?? '', /XP/);
n = structuredClone(richPrev); n.goals!.claimedGoalIds = []; assert.match(check(n, 'set_price', richPrev) ?? '', /mục tiêu/);
n = structuredClone(richPrev); n.goals!.claimedWeeklyQuestIds = {}; assert.match(check(n, 'set_price', richPrev) ?? '', /tuần/);
n = structuredClone(richPrev); n.skills!.chosenPerks = []; assert.match(check(n, 'set_price', richPrev) ?? '', /đặc quyền/);
n = structuredClone(richPrev); n.skills!.xp.management = 0; assert.match(check(n, 'set_price', richPrev) ?? '', /XP kỹ năng/);
n = clone(); n.inventory = [{ productId: 'x', quantity: -3, lots: [] } as never]; assert.match(check(n) ?? '', /kho/);

n = clone(); n.worldTime.isStoreOpen = !base.worldTime.isStoreOpen;
assert.match(checkSaveInvariants(base, n, 'store_status', { isOpen: base.worldTime.isStoreOpen }) ?? '', /cửa hàng/);
assert.equal(checkSaveInvariants(base, n, 'store_status', { isOpen: n.worldTime.isStoreOpen }), null);
n = clone(); n.worldTime.minute = Math.max(0, base.worldTime.minute - 5);
assert.equal(check(n), null, 'giờ lùi nhẹ (client lệch pha) không bị phạt');

// Nhân viên: chỉ hire_staff được thêm một người, không vượt số vị trí theo cấp.
const member = (id: string) => ({ id, name: id, role: 'cashier', shift: 'full_day' }) as never;
const staffed = clone(); staffed.player.level = 10;
n = structuredClone(staffed); n.staff = [member('a')];
assert.match(check(n, 'set_price', staffed) ?? '', /nhân viên/i, 'tăng nhân viên không qua hire_staff bị từ chối');
assert.equal(check(n, 'hire_staff', staffed), null, 'hire_staff được thêm một người');
n = structuredClone(staffed); n.staff = [member('a'), member('b')];
assert.match(check(n, 'hire_staff', staffed) ?? '', /nhân viên/i, 'một lệnh hire_staff không thêm hai người');
n = clone(); n.player.level = 1; n.staff = [member('a')];
assert.match(check(n, 'hire_staff') ?? '', /vị trí/, 'vượt số vị trí theo cấp bị từ chối');
n = structuredClone(staffed); n.staff = [member('a')];
const hired = structuredClone(n); hired.staff = [member('a')];
assert.equal(check(hired, 'set_staff_shift', n), null, 'đổi ca không đổi số nhân viên thì hợp lệ');

// Mua tiệm xôi (buy_plot): tiền chỉ giảm đúng giá, nội thất mặc định được thêm; không bị chặn bởi bất biến.
{
  const prev = clone(); prev.player.level = 29; prev.player.money = 2_000_000; prev.worldTime.isStoreOpen = false;
  const bought = buyLandPlot(prev, XOI_PLOT_ID).save!;
  assert.equal(bought.player.money, prev.player.money - 700_000, 'trừ đúng giá tiệm xôi');
  assert.ok(bought.storeLayout.fixtures.some(fixture => fixture.id === 'xoi_cashier_counter'), 'có bố cục mặc định');
  assert.equal(check(bought, 'buy_plot', prev), null, 'mua tiệm xôi hợp lệ theo bất biến');
  const cheated = structuredClone(bought); cheated.player.money = prev.player.money + 5_000_000;
  assert.match(check(cheated, 'buy_plot', prev) ?? '', /Tiền tăng/, 'mua tiệm mà tiền tăng bị từ chối');
}

console.log('PASS save-invariants: chặn tiền/doanh thu/XP/cấp/đã nhận bị sửa, cho phép tăng hợp lý theo thời gian');
