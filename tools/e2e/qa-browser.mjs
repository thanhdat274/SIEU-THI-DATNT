import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import WebSocket from 'ws';

import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9222;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${PORT}/json`, (r) => {
          let data = '';
          r.on('data', chunk => data += chunk);
          r.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      });
      const page = Array.isArray(res) ? res.find(t => t.type === 'page') || res[0] : null;
      if (page && page.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch {}
    await sleep(500);
  }
  throw new Error('Could not connect to Chrome debugging endpoint');
}

async function runQA() {
  console.log('--- Bắt đầu QA trình duyệt tự động ---');
  const tmpDir = path.join(os.tmpdir(), `chrome-qa-${Date.now()}`);
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${tmpDir}`,
    '--window-size=1280,800',
    'about:blank',
  ]);

  try {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.on('open', res);
      ws.on('error', rej);
    });

    let msgId = 1;
    const pending = new Map();
    const consoleLogs = [];
    const consoleErrors = [];

    ws.on('message', (raw) => {
      const data = JSON.parse(raw);
      if (data.id && pending.has(data.id)) {
        pending.get(data.id)(data);
        pending.delete(data.id);
      }
      if (data.method === 'Runtime.consoleAPICalled') {
        const type = data.params.type;
        const text = data.params.args.map(a => a.value ?? a.description ?? '').join(' ');
        consoleLogs.push(`[${type}] ${text}`);
        if (type === 'error') {
          consoleErrors.push(text);
        }
      }
      if (data.method === 'Runtime.exceptionThrown') {
        const text = data.params.exceptionDetails?.text || 'Uncaught exception';
        consoleErrors.push(text);
      }
    });

    const send = (method, params = {}) => new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('1. Mở http://localhost:5173/?qa');
    await send('Page.navigate', { url: 'http://localhost:5173/?qa' });
    await sleep(2000);

    console.log('2. Tìm và bấm Chơi Thử (Local)...');
    let gameReady = false;
    for (let i = 0; i < 30; i++) {
      const evalRes = await send('Runtime.evaluate', {
        expression: `(() => {
          if (document.querySelector('canvas')) return 'Game already loaded';
          const btn = document.querySelector('.card-local') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Chơi Thử'));
          if (btn) {
            btn.click();
            return 'Clicked guest button';
          }
          return null;
        })()`,
        returnByValue: true,
      });
      const val = evalRes.result?.result?.value;
      if (val) {
        console.log('   Kết quả:', val);
        break;
      }
      await sleep(1000);
    }

    console.log('   Đợi canvas game khởi tạo...');
    for (let i = 0; i < 30; i++) {
      const canvasCheck = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('canvas'))`,
        returnByValue: true,
      });
      if (canvasCheck.result?.result?.value) {
        gameReady = true;
        console.log('   Canvas game đã sẵn sàng!');
        break;
      }
      await sleep(1000);
    }
    await sleep(3000);

    // Kiểm tra các viewport
    const viewports = [
      { name: '375x812 (Mobile Portrait)', w: 375, h: 812, mobile: true },
      { name: '667x375 (Mobile Landscape)', w: 667, h: 375, mobile: true },
      { name: 'Desktop (1280x800)', w: 1280, h: 800, mobile: false },
    ];

    const capturedFiles = [];

    for (const vp of viewports) {
      console.log(`\n3. Kiểm tra viewport ${vp.name}...`);
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: 1,
        mobile: vp.mobile,
      });
      await sleep(1500);

      const checkState = await send('Runtime.evaluate', {
        expression: `(() => {
          const canvas = document.querySelector('canvas');
          const vpElem = document.querySelector('.world-viewport');
          return {
            hasCanvas: Boolean(canvas),
            canvasWidth: canvas ? canvas.width : 0,
            canvasHeight: canvas ? canvas.height : 0,
            vpBounds: vpElem ? vpElem.getBoundingClientRect().width + 'x' + vpElem.getBoundingClientRect().height : 'none',
          };
        })()`,
        returnByValue: true,
      });

      console.log('   Trạng thái renderer:', checkState.result?.result?.value);

      // Chụp ảnh làm bằng chứng
      const ssRes = await send('Page.captureScreenshot', { format: 'png' });
      const imgBuffer = Buffer.from(ssRes.result?.data, 'base64');
      const tempPath = path.resolve(`qa_evidence_${vp.w}x${vp.h}.png`);
      fs.writeFileSync(tempPath, imgBuffer);
      capturedFiles.push(tempPath);
      console.log(`   Đã chụp ảnh bằng chứng: ${tempPath} (${imgBuffer.length} bytes)`);
    }

    console.log('\n4. Kiểm tra Console Errors:');
    if (consoleErrors.length === 0) {
      console.log('   ✔ 0 console errors phát sinh!');
    } else {
      console.error('   ✖ Phát hiện console errors:', consoleErrors);
    }

    // XÓA ảnh làm bằng chứng khỏi repo theo đúng yêu cầu
    console.log('\n5. Dọn dẹp ảnh bằng chứng khỏi repo...');
    for (const f of capturedFiles) {
      if (fs.existsSync(f)) {
        fs.unlinkSync(f);
        console.log(`   Đã xóa ${path.basename(f)}`);
      }
    }

    ws.close();
    console.log('\n🎉 Hoàn thành kiểm tra QA trình duyệt thành công!');
    return consoleErrors.length === 0;
  } finally {
    chrome.kill();
  }
}

runQA().then(ok => {
  process.exit(ok ? 0 : 1);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
