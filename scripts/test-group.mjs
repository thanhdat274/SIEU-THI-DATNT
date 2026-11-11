// SPEC-TOI-UU §T5-L2: chạy vitest theo nhóm (fast | sim | all), chạy được cả Windows lẫn CI (không cần cross-env).
// Dùng: node scripts/test-group.mjs fast [đối số vitest...]   — xem phân nhóm ở vitest.config.ts
import { spawnSync } from 'node:child_process';

const [group = 'all', ...rest] = process.argv.slice(2);
if (!['fast', 'sim', 'all'].includes(group)) {
  console.error(`Nhóm không hợp lệ: ${group} (fast | sim | all)`);
  process.exit(2);
}
const env = { ...process.env, ...(group === 'all' ? {} : { TEST_GROUP: group }) };
const r = spawnSync('npx', ['vitest', 'run', ...rest], { stdio: 'inherit', env, shell: true });
process.exit(r.status ?? 1);
