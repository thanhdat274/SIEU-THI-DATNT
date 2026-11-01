const WebSocket = require('ws');
const fs = require('fs');

async function run() {
  const wsUrl = process.env.AGY_BROWSER_WS_URL;
  const ws = new WebSocket(wsUrl);

  const send = (msg) => new Promise((resolve) => {
    const id = Math.floor(Math.random() * 1000000);
    const payload = { ...msg, id };
    const handler = (data) => {
      const res = JSON.parse(data.toString());
      if (res.id === id) {
        ws.off('message', handler);
        resolve(res);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify(payload));
  });

  await new Promise((res) => ws.on('open', res));
  const targets = await send({ method: 'Target.getTargets' });
  const page = targets.result.targetInfos.find((t) => t.type === 'page');
  const attached = await send({
    method: 'Target.attachToTarget',
    params: { targetId: page.targetId, flatten: true }
  });
  const sessionId = attached.result.sessionId;

  const evalRes = await send({
    sessionId,
    method: 'Runtime.evaluate',
    params: {
      expression: `JSON.stringify({
        title: document.title,
        url: window.location.href,
        uiLen: document.querySelector('#ui')?.innerHTML?.length,
        buttons: Array.from(document.querySelectorAll('#ui button')).map(b => b.innerText.trim()).filter(Boolean)
      })`
    }
  });

  console.log('Result:', JSON.parse(evalRes.result.result.value));
  ws.close();
}

run().catch(console.error);
