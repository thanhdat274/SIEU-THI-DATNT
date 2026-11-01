const WebSocket = require('ws');
const fs = require('fs');

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
  await new Promise(r => setTimeout(r, 300));

  async function snap(type, name) {
    await send({ sessionId: s, method: 'Runtime.evaluate', params: { expression: `window.game.useGame.getState().openPanel({ type: '${type}' })` } });
    await new Promise(r => setTimeout(r, 400));
    const shot = await send({ sessionId: s, method: 'Page.captureScreenshot', params: { format: 'png' } });
    fs.writeFileSync(`browser-screenshots/${name}.png`, Buffer.from(shot.result.data, 'base64'));
  }

  await snap('planogram', 'shot_planogram_mobile');
  await snap('calendar', 'shot_calendar_mobile');
  await snap('discovery', 'shot_discovery_mobile');

  await send({ sessionId: s, method: 'Runtime.evaluate', params: { expression: 'window.game.useGame.getState().openPanel(null)' } });
  ws.close();
  console.log('Saved shots successfully');
}
run();
