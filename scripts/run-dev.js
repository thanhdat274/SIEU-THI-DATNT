#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const cwd = path.resolve(__dirname, '..');

// Chạy yarn qua chính node (npm_execpath) để không cần `shell: true`; nếu không có thì rơi về một chuỗi lệnh duy nhất.
const yarnJs = process.env.npm_execpath;
function runYarn(script) {
  return yarnJs
    ? spawn(process.execPath, [yarnJs, script], { cwd, stdio: 'inherit' })
    : spawn(`yarn ${script}`, { cwd, stdio: 'inherit', shell: true });
}

const server = runYarn('dev:server');
const web = runYarn('dev:web');

console.log('BE (dev:server) started');
console.log('FE (dev:web) started');

function cleanup() {
  console.log('\nShutting down...');
  server.kill('SIGINT');
  web.kill('SIGINT');
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
