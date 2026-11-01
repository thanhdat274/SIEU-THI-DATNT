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

  await send({ sessionId: s, method: 'Page.navigate', params: { url: 'http://localhost:5173/' } });
  await new Promise(r => setTimeout(r, 2000));

  await send({ sessionId: s, method: 'Runtime.evaluate', params: {
    expression: `(() => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Chơi không cần'));
      if (b) b.click();
    })()`
  }});
  await new Promise(r => setTimeout(r, 1200));

  const check = await send({
    sessionId: s,
    method: 'Runtime.evaluate',
    params: {
      returnByValue: true,
      expression: `({ url: window.location.href, hasGame: !!window.game, hasUi: !!document.querySelector('#ui') })`
    }
  });
  console.log('Post navigate status:', check.result.result.value);
  ws.close();
}
run();
