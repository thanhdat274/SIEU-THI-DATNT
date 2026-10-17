import assert from 'node:assert/strict';
import { landCommandLabel } from './land-vote-labels';

console.log('--- Testing nhãn phiếu đất ---');
assert.equal(landCommandLabel('reclaim_wave'), 'khai hoang một đợt đất mới');
assert.equal(landCommandLabel('relocate_building'), 'dời một tòa nhà sang lô khác');
assert.equal(landCommandLabel('buy_parcel'), 'mua hoặc thuê một lô đất');
assert.equal(landCommandLabel('khong-biet'), 'một khoản chi đất lớn', 'Lệnh lạ có nhãn dự phòng');
assert.equal(landCommandLabel('toString'), 'một khoản chi đất lớn', 'Khóa nguyên mẫu không lọt vào nhãn');
console.log('PASS land-vote-labels');
