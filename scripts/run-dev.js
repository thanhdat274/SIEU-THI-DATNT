#!/usr/bin/env node
const { spawn, spawnSync } = require('child_process');
const path = require('path');

const cwd = path.resolve(__dirname, '..');

// Chạy yarn qua chính node (npm_execpath) để không cần `shell: true`; nếu không có thì rơi về một chuỗi lệnh duy nhất.
const yarnJs = process.env.npm_execpath;

const children = [];
let shuttingDown = false;

/** Gắn tiền tố [BE]/[FE] vào từng dòng log để phân biệt hai tiến trình trong cùng một terminal. */
function pipeWithPrefix(stream, out, prefix) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) out.write(`${prefix} ${line}\n`);
  });
  stream.on('end', () => { if (buffer) out.write(`${prefix} ${buffer}\n`); });
}

function runYarn(script, label, color) {
  const prefix = `\x1b[${color}m[${label}]\x1b[0m`;
  const opts = { cwd, stdio: ['inherit', 'pipe', 'pipe'], env: { ...process.env, FORCE_COLOR: '1' } };
  const child = yarnJs
    ? spawn(process.execPath, [yarnJs, script], opts)
    : spawn(`yarn ${script}`, { ...opts, shell: true });
  pipeWithPrefix(child.stdout, process.stdout, prefix);
  pipeWithPrefix(child.stderr, process.stderr, prefix);
  child.on('exit', (code) => {
    if (shuttingDown) return;
    console.log(`${prefix} đã dừng (mã thoát ${code}). Tiến trình còn lại vẫn chạy; sửa lỗi rồi chạy lại yarn dev nếu cần.`);
  });
  children.push(child);
  return child;
}

/** Windows: child.kill() chỉ giết yarn, bỏ sót tsx/vite/node con nên cổng 3000/3001 bị giữ bởi bản code cũ. */
function killTree(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGINT');
  }
}

runYarn('dev:server', 'BE', '36');
runYarn('dev:web', 'FE', '35');

console.log('BE (dev:server) started');
console.log('FE (dev:web) started');

function cleanup() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\nShutting down...');
  children.forEach(killTree);
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => children.forEach(killTree));
