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
  await send({ sessionId: s, method: 'Emulation.setDeviceMetricsOverride', params: { width: 390, height: 844, deviceScaleFactor: 1, mobile: true } });
  await new Promise(r => setTimeout(r, 500));
  const res = await send({
    sessionId: s,
    method: 'Runtime.evaluate',
    params: {
      returnByValue: true,
      expression: `(() => {
        const s = document.querySelector(".hud-status");
        const m = document.querySelector(".hud-meta");
        const r = (el) => el ? { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height), right: Math.round(el.getBoundingClientRect().right), bottom: Math.round(el.getBoundingClientRect().bottom) } : null;
        const statusChips = Array.from(s?.querySelectorAll('.hud-chip, .hud-place') || []).map(c => ({
          text: c.innerText.trim().replace(/\\n/g, ' '),
          rect: r(c)
        }));
        const metaChips = Array.from(m?.querySelectorAll('.hud-chip, button') || []).map(c => ({
          text: c.innerText.trim().replace(/\\n/g, ' '),
          rect: r(c)
        }));
        return {
          status: r(s),
          meta: r(m),
          statusChips,
          metaChips,
          dialogue: r(document.querySelector('.hud-dialogue')),
          joystick: r(document.querySelector('.joystick-zone'))
        };
      })()`
    }
  });
  console.log(JSON.stringify(res.result.result.value, null, 2));
  ws.close();
}
run();
