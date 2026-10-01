import assert from 'node:assert/strict';
import { REGULAR_CUSTOMERS, REGULAR_CUSTOMERS_MAP } from '@game/data';
import {
  shouldRegularVisitToday,
  processRegularCheckout,
  processRegularWalkout
} from './regulars';
import { RegularCustomerProgress } from '@game/shared';

export function runRegularsTests(): void {
  console.log('--- Test Regular Customers Core Logic ---');

  // Test 1: Khách quen có đủ 6 người với dữ liệu chuẩn
  assert.equal(REGULAR_CUSTOMERS.length, 6, 'Đủ 6 khách quen đại diện hẻm');
  const baNam = REGULAR_CUSTOMERS_MAP['ba_nam'];
  assert.ok(baNam, 'Có Bà Năm Bán Xôi');
  assert.equal(baNam.favoriteProductIds.length >= 3, true, 'Bà Năm có ít nhất 3 món ưa thích');

  // Test 2: Ghé tiệm theo seed là deterministic
  const visit1 = shouldRegularVisitToday(baNam, 1, 12345);
  const visit2 = shouldRegularVisitToday(baNam, 1, 12345);
  assert.equal(visit1, visit2, 'Tính xác định theo seed và ngày');

  // Test 3: Thanh toán lần đầu có món ưa thích -> +2 điểm, khám phá món
  const initProg: RegularCustomerProgress = {
    id: 'ba_nam',
    friendship: 0,
    unlockedPerks: [],
    discoveredProductIds: [],
    totalVisits: 0,
  };

  const res1 = processRegularCheckout(baNam, initProg, ['beverage_tea'], 1);
  assert.equal(res1.pointsAwarded, 2, 'Có món ưa thích -> cộng 2 điểm');
  assert.equal(res1.updatedProgress.friendship, 2, 'Điểm thân thiết cập nhật');
  assert.ok(res1.updatedProgress.discoveredProductIds.includes('beverage_tea'), 'Đã khám phá trà thơm');
  assert.equal(res1.updatedProgress.lastFriendshipDay, 1, 'Ghi nhận ngày cộng điểm');

  // Test 4: Giới hạn trần điểm mỗi ngày (+2 tối đa)
  const resRepeatSameDay = processRegularCheckout(baNam, res1.updatedProgress, ['beverage_tea'], 1);
  assert.equal(resRepeatSameDay.pointsAwarded, 0, 'Cùng ngày không được cộng thêm điểm thân thiết');
  assert.equal(resRepeatSameDay.updatedProgress.friendship, 2, 'Điểm không tăng vượt trần');

  // Test 5: Mở khóa perk khi đủ điểm
  const highProg: RegularCustomerProgress = {
    id: 'ba_nam',
    friendship: 39,
    unlockedPerks: ['Tình làng nghĩa xóm'],
    discoveredProductIds: ['beverage_tea'],
    totalVisits: 10,
    lastFriendshipDay: 1,
  };

  // Sang ngày 2 (+2 điểm -> friendship 41 >= 40)
  const resUnlock = processRegularCheckout(baNam, highProg, ['condensed_milk_ong_tho'], 2);
  assert.equal(resUnlock.updatedProgress.friendship, 41);
  assert.ok(resUnlock.updatedProgress.unlockedPerks.includes('Hộp xôi lót dạ'), 'Mở khóa perk Hộp xôi lót dạ');
  assert.ok(resUnlock.newlyUnlockedPerks.includes('Hộp xôi lót dạ'), 'Báo perk mới mở');
  assert.ok(resUnlock.tipBonusRatio > 0, 'Có tỉ lệ tiền boa');

  // Test 6: Walkout không cộng điểm nhưng tăng tổng số lần ghé
  const walkoutProg = processRegularWalkout(baNam, initProg, 3);
  assert.equal(walkoutProg.friendship, 0, 'Walkout không tăng điểm');
  assert.equal(walkoutProg.totalVisits, 1, 'Tăng số lần ghé');
  assert.equal(walkoutProg.lastVisitDay, 3);

  console.log('  ✓ Passed: Khách quen — tính xác định, trần +2/ngày, khám phá sở thích, perk và boa');
}
