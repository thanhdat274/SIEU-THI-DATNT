import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTitleUnlock, getUnlockedTitles, setActiveTitle, TitleContext } from './titles';
import { TITLES, TITLE_MAP } from '@game/data';
import { PlayerData } from '@game/shared';

export function runTitlesTests(): void {
  describe('Milestone Titles Tests', () => {
    const starterTitle = TITLE_MAP['title_tap_su'];
    const wealthTitle = TITLE_MAP['title_von_quay_vong'];
    const customerTitle = TITLE_MAP['title_tap_nap_khach_hang'];

    it('khởi đầu mở khóa danh hiệu cấp 1', () => {
      const ctx: TitleContext = {
        level: 1,
        totalRevenue: 0,
        totalCustomers: 0,
        daysPassed: 1,
        partyOrders: 0,
        reputation: 10,
      };
      assert.equal(evaluateTitleUnlock(starterTitle, ctx), true);
      assert.equal(evaluateTitleUnlock(wealthTitle, ctx), false);
      const unlocked = getUnlockedTitles(ctx);
      assert.ok(unlocked.includes('title_tap_su'));
      assert.ok(!unlocked.includes('title_von_quay_vong'));
    });

    it('mở khóa danh hiệu theo doanh thu và khách hàng khi đạt ngưỡng', () => {
      const ctx: TitleContext = {
        level: 3,
        totalRevenue: 1500000,
        totalCustomers: 35,
        daysPassed: 8,
        partyOrders: 2,
        reputation: 22,
      };
      assert.equal(evaluateTitleUnlock(wealthTitle, ctx), true);
      assert.equal(evaluateTitleUnlock(customerTitle, ctx), true);
      const unlocked = getUnlockedTitles(ctx);
      assert.ok(unlocked.includes('title_von_quay_vong'));
      assert.ok(unlocked.includes('title_tap_nap_khach_hang'));
      assert.ok(unlocked.includes('title_vua_don_tiec'));
      assert.ok(unlocked.includes('title_tiem_uy_tin'));
      assert.ok(unlocked.includes('title_chu_tiem_can_man'));
    });

    it('chọn và gỡ danh hiệu hoạt động cho người chơi', () => {
      const dummyPlayer: PlayerData = {
        name: 'Chủ Tiệm',
        level: 3,
        experience: 50,
        experienceToNextLevel: 100,
        money: 500000,
        reputation: 15,
        position: { x: 0, y: 0 },
        direction: 'down',
      };
      const unlocked = ['title_tap_su', 'title_chu_tiem_can_man'];

      // Thử trang bị danh hiệu chưa mở
      const failRes = setActiveTitle(dummyPlayer, 'title_dai_gia_tap_hoa', unlocked);
      assert.equal(failRes.success, false);
      assert.equal(dummyPlayer.activeTitle, undefined);

      // Trang bị danh hiệu đã mở
      const okRes = setActiveTitle(dummyPlayer, 'title_chu_tiem_can_man', unlocked);
      assert.equal(okRes.success, true);
      assert.equal(dummyPlayer.activeTitle, 'title_chu_tiem_can_man');

      // Gỡ danh hiệu
      const clearRes = setActiveTitle(dummyPlayer, undefined, unlocked);
      assert.equal(clearRes.success, true);
      assert.equal(dummyPlayer.activeTitle, undefined);
    });
  });
}
