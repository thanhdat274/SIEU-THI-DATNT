// GĐ686 — probe server WS: nối vào /ws, im lặng, đo server có terminate hay không.
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3002/ws');
const t0 = Date.now();
let closed = null;
ws.on('open', () => console.log('open @0ms'));
ws.on('close', (code, reason) => { closed = { code, reason: String(reason), ms: Date.now() - t0 }; console.log('closed', closed); process.exit(0); });
ws.on('error', (e) => console.log('error:', e.message));
ws.on('unexpected-response', (_, res) => console.log('unexpected status', res.statusCode));
setTimeout(() => { if (!closed) console.log('ALIVE after 100s — server không ngắt client im lặng'); process.exit(0); }, 100000);
