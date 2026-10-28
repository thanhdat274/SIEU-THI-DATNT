const WebSocket = require('ws');
const fs = require('fs');

const PANELS = [
  'morning', 'order', 'storage', 'planogram', 'business',
  'regulars', 'skills', 'online', 'quannuoc', 'roadmap',
  'garden', 'branch', 'calendar', 'cook', 'arrange',
  'combos', 'contracts', 'discovery', 'history', 'records',
  'dossier', 'analytics', 'landmark', 'staff', 'licenses',
  'reviews', 'gifts', 'levels'
];

async function run() {
  const ws = new WebSocket(process.env.AGY_BROWSER_WS_URL);
  const send = (msg) => new Promise(res => {
    const id = Math.floor(Math.random()*100000);
    const handler = (data) => {
      const m = JSON.parse(data.toString());
      if (m.id === id) { ws.off('message', handler); res(m); }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ ...msg, id }));
  });
  await new Promise(r => ws.on('open', r));
  const t = await send({ method: 'Target.getTargets' });
  const p = t.result.targetInfos.find(x => x.type === 'page');
  const a = await send({ method: 'Target.attachToTarget', params: { targetId: p.targetId, flatten: true } });
  const s = a.result.sessionId;

  // Set mobile portrait: 390x844
  await send({ sessionId: s, method: 'Emulation.setDeviceMetricsOverride', params: { width: 390, height: 844, deviceScaleFactor: 1, mobile: true } });
  await new Promise(r => setTimeout(r, 400));

  const results = [];

  for (const pName of PANELS) {
    // Open panel
    await send({
      sessionId: s,
      method: 'Runtime.evaluate',
      params: {
        expression: `window.game ? window.game.useGame.getState().openPanel({ type: '${pName}' }) : null`
      }
    });

    await new Promise(r => setTimeout(r, 200));

    const check = await send({
      sessionId: s,
      method: 'Runtime.evaluate',
      params: {
        returnByValue: true,
        expression: `(() => {
          // Look for any panel opened
          const panelBackdrop = document.querySelector('#ui > div[style*=\"position: absolute\"][style*=\"inset: 0\"]');
          const panelBox = panelBackdrop?.querySelector('div[style*=\"background\"]');
          if (!panelBox) return { open: false };
          const r = panelBox.getBoundingClientRect();
          const closeBtn = panelBox.querySelector('button');
          return {
            open: true,
            w: Math.round(r.width),
            h: Math.round(r.height),
            x: Math.round(r.x),
            y: Math.round(r.y),
            overflowX: panelBox.scrollWidth > panelBox.clientWidth,
            overflowY: panelBox.scrollHeight > panelBox.clientHeight,
            maxH: window.getComputedStyle(panelBox).maxHeight,
            hasClose: !!closeBtn,
            scrollW: panelBox.scrollWidth,
            clientW: panelBox.clientWidth
          };
        })()`
      }
    });

    results.push({ panel: pName, ...check.result.result.value });

    // Close panel
    await send({
      sessionId: s,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const close = document.querySelector('#ui button[style*=\"sticky\"]') || document.querySelector('#ui button[style*=\"float: right\"]');
          if (close) close.click();
        })()`
      }
    });
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('Results:', results);
  ws.close();
}
run();
