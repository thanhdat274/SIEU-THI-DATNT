import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeAtlasesInOrder, parseAtlas, parseAtlasIndex } from './sprite-atlas-parse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const spritesDir = path.resolve(__dirname, '../../../apps/web/public/assets/sprites');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
// (a) Thứ tự nạp xong khác nhau → cùng kết quả: atlas đứng sau trong index luôn thắng khóa trùng.
const fake: Record<string, Map<string, string>> = {
  'chars/chars.json': new Map([['npc_6_left_idle_0', 'chars'], ['npc_0_down_idle_0', 'chars']]),
  'residents/residents.json': new Map([['npc_6_left_idle_0', 'residents'], ['nb_house_0_1_3', 'residents']]),
  'civic/civic.json': new Map([['npc_6_left_idle_0', 'civic'], ['civic_park', 'civic']]),
};
const order = Object.keys(fake);
const runWithDelays = (delays: Record<string, number>) =>
  mergeAtlasesInOrder(order, async (p) => { await wait(delays[p]); return fake[p]; });

// Atlas đứng cuối (civic) nạp xong ĐẦU TIÊN, atlas đầu (chars) nạp xong SAU CÙNG: cách cũ "ai xong sau thắng" sẽ ra chars.
const slowFirst = await runWithDelays({ 'chars/chars.json': 60, 'residents/residents.json': 30, 'civic/civic.json': 0 });
const fastFirst = await runWithDelays({ 'chars/chars.json': 0, 'residents/residents.json': 30, 'civic/civic.json': 60 });
assert.deepEqual([...slowFirst.entries()].sort(), [...fastFirst.entries()].sort(), 'hai thứ tự nạp xong cho cùng kết quả');
assert.equal(slowFirst.get('npc_6_left_idle_0'), 'civic', 'civic (cuối index) thắng dù nạp xong đầu tiên');
assert.equal(slowFirst.get('npc_0_down_idle_0'), 'chars');
assert.equal(slowFirst.size, 4);

// Atlas lỗi (null hoặc throw) bị bỏ qua, các atlas khác vẫn gộp.
const withFailure = await mergeAtlasesInOrder(order, async (p) => {
  if (p === 'residents/residents.json') throw new Error('mạng lỗi');
  return p === 'chars/chars.json' ? null : fake[p];
});
assert.equal(withFailure.get('npc_6_left_idle_0'), 'civic');
assert.equal(withFailure.has('npc_0_down_idle_0'), false);

// (b) Khóa trùng giữa các atlas THẬT phải nằm trong danh sách cho phép; thêm khóa trùng mới ngoài danh sách → test đỏ.
// `chars` (LimeZu bản free, gitignore) có thể vắng trên máy khác: khi đó bỏ qua atlas đó.
const ALLOWED_OVERRIDES: Array<{ winner: string; losers: string[]; pattern: RegExp; why: string }> = [
  { winner: 'civic', losers: ['chars', 'residents'], pattern: /^npc_[6-9]_(left|right)_(idle|walk)_\d$/, why: 'khung nghiêng ngang look 6–9 vẽ lại (Bước D2)' },
  { winner: 'residents', losers: ['chars'], pattern: /^npc_[6-8]_(up|down)_(idle|walk)_\d$/, why: 'cư dân look 6–8 hướng lên/xuống vẽ lại thay khung LimeZu' },
];
const index = parseAtlasIndex(JSON.parse(fs.readFileSync(path.join(spritesDir, 'index.json'), 'utf8')));
assert.ok(index);
const owners = new Map<string, string[]>();
const present: string[] = [];
for (const atlasPath of index.atlases) {
  const file = path.join(spritesDir, atlasPath);
  if (!fs.existsSync(file)) { console.log(`  (bỏ qua ${atlasPath}: không có trên máy này)`); continue; }
  const name = atlasPath.split('/')[0];
  present.push(name);
  const atlas = parseAtlas(JSON.parse(fs.readFileSync(file, 'utf8')));
  assert.ok(atlas, `${atlasPath} hợp lệ`);
  for (const key of atlas.frames.keys()) owners.set(key, [...(owners.get(key) ?? []), name]);
}
for (const [key, names] of owners) {
  if (names.length < 2) continue;
  const winner = names[names.length - 1];
  const rule = ALLOWED_OVERRIDES.find((r) => r.pattern.test(key));
  assert.ok(rule, `Khóa "${key}" trùng giữa ${names.join(', ')} mà không nằm trong danh sách cho phép`);
  assert.equal(winner, rule.winner, `Khóa "${key}": atlas thắng phải là ${rule.winner} (${rule.why}), đang là ${winner}`);
  for (const loser of names.slice(0, -1)) assert.ok(rule.losers.includes(loser), `Khóa "${key}": ${loser} không được phép bị ${winner} đè`);
}
// Mỗi khung nghiêng look 6–9 chỉ có một nguồn trong repo (civic); residents không còn giữ bản cũ.
for (const key of owners.keys()) if (/^npc_[6-9]_(left|right)_/.test(key)) assert.ok(!owners.get(key)!.includes('residents'), `${key} không còn trong residents`);
assert.equal(owners.get('npc_9_left_walk_0')?.join(','), 'civic', 'npc_9 nghiêng chỉ có ở civic');

console.log(`PASS sprite-atlas-order: gộp theo thứ tự index tất định; khóa trùng (${present.join(' < ')}) chỉ nằm trong danh sách cho phép`);
}

main().catch((err) => { console.error(err); process.exit(1); });
