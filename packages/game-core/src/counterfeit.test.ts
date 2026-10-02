import assert from 'node:assert/strict';
import { COUNTERFEIT_RULES } from '@game/data';
import { assessCounterfeit } from './counterfeit';

export function runCounterfeitTests(): void {
  // Xác định: cùng đầu vào → cùng kết quả
  const a = assessCounterfeit(3, 'chk-1', 200_000, { kind: 'player' });
  assert.deepEqual(a, assessCounterfeit(3, 'chk-1', 200_000, { kind: 'player' }));

  // Hóa đơn dưới mệnh giá nhỏ nhất không bao giờ có tiền giả
  for (let i = 0; i < 500; i++) {
    assert.equal(assessCounterfeit(1, `c${i}`, COUNTERFEIT_RULES.denominations[0] - 1, { kind: 'player' }).counterfeit, false);
  }

  // Tỷ lệ xuất hiện gần transactionChance, mệnh giá không vượt tổng hóa đơn
  const N = 20_000;
  let fake = 0, detected = 0;
  for (let i = 0; i < N; i++) {
    const r = assessCounterfeit(2, `chk-${i}`, 60_000, { kind: 'player' });
    if (!r.counterfeit) { assert.equal(r.detected, false); assert.equal(r.faceValue, 0); continue; }
    fake++;
    if (r.detected) detected++;
    assert.ok(r.faceValue > 0 && r.faceValue <= 60_000, 'Mệnh giá không vượt tổng hóa đơn');
  }
  assert.ok(Math.abs(fake / N - COUNTERFEIT_RULES.transactionChance) < 0.004, `Tỷ lệ tiền giả ${fake / N}`);
  assert.ok(Math.abs(detected / fake - COUNTERFEIT_RULES.playerDetectChance) < 0.12, 'Tỷ lệ người chơi phát hiện gần 70%');

  // Nhân viên: độ chính xác cao hơn → phát hiện nhiều hơn; bị chặn trần
  const rate = (accuracy: number) => {
    let f = 0, d = 0;
    for (let i = 0; i < 60_000; i++) {
      const r = assessCounterfeit(5, `s-${i}`, 100_000, { kind: 'staff', accuracy });
      if (r.counterfeit) { f++; if (r.detected) d++; }
    }
    return d / f;
  };
  assert.ok(rate(10) > rate(0), 'Accuracy cao phát hiện nhiều hơn');
  assert.ok(rate(1000) <= COUNTERFEIT_RULES.staffDetectCap + 0.1, 'Bị chặn bởi staffDetectCap');
}
