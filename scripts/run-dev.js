#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const cwd = path.resolve(__dirname, '..');

const server = spawn('yarn', ['dev:server'], { cwd, stdio: 'inherit', shell: true });
const web = spawn('yarn', ['dev:web'], { cwd, stdio: 'inherit', shell: true });

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
