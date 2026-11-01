const WebSocket = require('ws');

const PANELS = ['planogram', 'business', 'calendar', 'discovery', 'dossier'];

async function inspect(pName) {
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

  await send({ sessionId: s, method: 'Emulation.setDeviceMetricsOverride', params: { width: 390, height: 844, deviceScaleFactor: 1, mobile: true } });
  await new Promise(r => setTimeout(r, 300));

  await send({
    sessionId: s,
    method: 'Runtime.evaluate',
    params: { expression: `window.game.useGame.getState().openPanel({ type: '${pName}' })` }
  });
  await new Promise(r => setTimeout(r, 400));

  const res = await send({
    sessionId: s,
    method: 'Runtime.evaluate',
    params: {
      returnByValue: true,
      expression: `(() => {
        const panelBackdrop = document.querySelector('#ui > div[style*=\"position: absolute\"][style*=\"inset: 0\"]');
        const panelBox = panelBackdrop?.querySelector('div[style*=\"background\"]');
        if (!panelBox) return { error: 'no panel box' };
        
        // Find elements inside panelBox that exceed panelBox.clientWidth
        const boxW = panelBox.clientWidth;
        const wideElements = [];
        const all = panelBox.querySelectorAll('*');
        for (const el of all) {
          if (el.scrollWidth > boxW || el.offsetWidth > boxW) {
            wideElements.push({
              tag: el.tagName,
              className: el.className,
              style: el.getAttribute('style'),
              scrollW: el.scrollWidth,
              offsetW: el.offsetWidth,
              text: el.innerText ? el.innerText.slice(0, 40).replace(/\\n/g, ' ') : ''
            });
          }
        }
        return { boxW, wideElements: wideElements.slice(0, 10) };
      })()`
    }
  });

  console.log(`=== Panel ${pName} ===`);
  console.log(JSON.stringify(res.result.result.value, null, 2));

  // Close
  await send({
    sessionId: s,
    method: 'Runtime.evaluate',
    params: { expression: `window.game.useGame.getState().openPanel(null)` }
  });
  ws.close();
}

async function main() {
  for (const p of PANELS) {
    await inspect(p);
  }
}
main();
