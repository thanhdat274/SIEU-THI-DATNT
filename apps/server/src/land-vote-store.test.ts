import assert from 'node:assert/strict';
import { LandVoteStore } from './land-vote-store';

const store = new LandVoteStore();
const t0 = 1_000_000;
const body = { receipt: { commandId: 'c1', payloadJson: '{}' } };

// Mở phiếu: mỗi hẻm một phiếu
const first = store.start('w', 'a', 'reclaim_wave', { type: 'reclaim_wave', waveId: 'w1' }, body, t0);
assert.ok(first, 'Mở được phiếu');
assert.equal(store.start('w', 'b', 'buy_parcel', {}, body, t0), null, 'Hẻm đã có phiếu thì không mở thêm');
assert.ok(store.start('x', 'a', 'reclaim_wave', {}, body, t0), 'Hẻm khác độc lập');
assert.equal(store.summary('w', t0 + 5_000)?.expiresInMs, 40_000);

// Người đề xuất không tự duyệt được; người kia duyệt thì phiếu đóng và mang đúng thân yêu cầu
assert.equal(store.respond('w', 'a', true, t0 + 1).kind, 'none', 'Người đề xuất không tự đồng ý');
const approved = store.respond('w', 'b', true, t0 + 2);
assert.equal(approved.kind, 'approved');
if (approved.kind === 'approved') {
  assert.equal(approved.pending.body, body, 'Giữ nguyên thân yêu cầu gốc để chạy lại');
  assert.equal(approved.pending.vote.status, 'approved');
}
assert.equal(store.get('w'), undefined, 'Duyệt xong phiếu biến mất');
assert.equal(store.respond('w', 'b', true, t0 + 3).kind, 'none', 'Không có phiếu thì trả lời vô nghĩa');

// Từ chối
store.start('w', 'a', 'relocate_building', {}, body, t0);
const rejected = store.respond('w', 'b', false, t0 + 10);
assert.equal(rejected.kind, 'rejected');
assert.equal(store.get('w'), undefined);

// Hết hạn 45 s: không trả lời được nữa, `expire` gỡ và báo
store.start('w', 'a', 'reclaim_wave', {}, body, t0);
assert.equal(store.respond('w', 'b', true, t0 + 45_000).kind, 'none', 'Quá hạn thì không duyệt được');
const gone = store.expire(t0 + 45_000);
assert.ok(gone.some(item => item.worldId === 'w'), 'expire báo phiếu hết hạn');
assert.equal(store.get('w'), undefined);

// Hủy: chỉ người đề xuất
store.start('w', 'a', 'reclaim_wave', {}, body, t0);
assert.equal(store.cancel('w', 'b'), undefined, 'Người khác không hủy hộ');
assert.ok(store.cancel('w', 'a'), 'Người đề xuất hủy được');

// Người kia rời: chỉ còn người đề xuất online thì chạy ngay; còn người kia thì giữ; người đề xuất rời thì hủy
store.start('w', 'a', 'reclaim_wave', {}, body, t0);
assert.equal(store.resolveOnLeave('w', ['a', 'b']), undefined, 'Cả hai còn online: giữ phiếu');
assert.ok(store.get('w'));
const executed = store.resolveOnLeave('w', ['a']);
assert.equal(executed?.vote.status, 'executed', 'Người kia rời thì phiếu chạy ngay');
assert.equal(store.get('w'), undefined);
store.start('w', 'a', 'reclaim_wave', {}, body, t0);
assert.equal(store.resolveOnLeave('w', ['b']), undefined);
assert.equal(store.get('w'), undefined, 'Người đề xuất rời thì phiếu bị hủy');

console.log('PASS land-vote-store');
