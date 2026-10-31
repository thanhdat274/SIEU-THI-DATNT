const WebSocket = require('ws');
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
  await send({ sessionId: s, method: 'Emulation.setDeviceMetricsOverride', params: { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false } });
  await new Promise(r => setTimeout(r, 500));
  const res = await send({
    sessionId: s,
    method: 'Runtime.evaluate',
    params: {
      returnByValue: true,
      expression: `(() => {
        const b = document.querySelectorAll(".hud-dock button, .hud-dock .hud-tool");
        const last = b[b.length-1];
        const dock = document.querySelector(".hud-dock");
        const bottom = document.querySelector(".hud-bottom");
        return {
          text: last?.innerText,
          lastRect: last ? { x: last.getBoundingClientRect().x, w: last.getBoundingClientRect().width, right: last.getBoundingClientRect().right } : null,
          dockRect: dock ? { x: dock.getBoundingClientRect().x, w: dock.getBoundingClientRect().width, right: dock.getBoundingClientRect().right } : null,
          bottomRect: bottom ? { x: bottom.getBoundingClientRect().x, w: bottom.getBoundingClientRect().width, right: bottom.getBoundingClientRect().right } : null,
          winW: window.innerWidth,
          buttons: Array.from(b).map(x => ({ text: x.innerText.trim().replace(/\\n/g, ' '), x: Math.round(x.getBoundingClientRect().x), right: Math.round(x.getBoundingClientRect().right), w: Math.round(x.getBoundingClientRect().width) }))
        };
      })()`
    }
  });
  console.log(JSON.stringify(res.result.result.value, null, 2));
  ws.close();
}
run();
