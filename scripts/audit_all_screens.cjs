const WebSocket = require('ws');
const fs = require('fs');

async function testViewport(width, height, isMobile = false) {
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

  // Set device metrics
  await send({
    sessionId,
    method: 'Emulation.setDeviceMetricsOverride',
    params: {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile
    }
  });

  // Wait a bit
  await new Promise(r => setTimeout(r, 500));

  // If on login screen, click "Chơi không cần đăng nhập"
  await send({
    sessionId,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const guestBtn = btns.find(b => b.innerText.includes('Chơi không cần đăng nhập'));
        if (guestBtn) guestBtn.click();
      })()`
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  // Audit elements
  const auditRes = await send({
    sessionId,
    method: 'Runtime.evaluate',
    params: {
      returnByValue: true,
      expression: `(() => {
        const hudBottom = document.querySelector('.hud-bottom');
        const hudLeft = document.querySelector('.hud-left');
        const hudMeta = document.querySelector('.hud-meta');
        const hudDock = document.querySelector('.hud-dock');
        const dialogue = document.querySelector('.hud-dialogue');
        const panel = document.querySelector('.panel-wrap, [style*=\"position: absolute\"][style*=\"z-index\"], #ui > div[style*=\"backdrop\"]');
        
        const rect = (el) => el ? { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null;

        // Check dock buttons visibility
        const dockBtns = Array.from(document.querySelectorAll('.hud-dock button, .hud-dock .hud-tool'));
        const dockBtnsAudit = dockBtns.map(b => {
          const r = b.getBoundingClientRect();
          const elAtPoint = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2);
          const visible = r.x >= 0 && r.x + r.width <= window.innerWidth && r.y >= 0 && r.y + r.height <= window.innerHeight;
          const clickable = elAtPoint ? (b.contains(elAtPoint) || elAtPoint.contains(b)) : false;
          return {
            text: b.innerText.trim().replace(/\\n/g, ' '),
            rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
            visible,
            clickable,
            obscuredBy: !clickable && elAtPoint ? elAtPoint.className || elAtPoint.tagName : null
          };
        });

        // Check top status chips vs meta overlap
        const statusRect = rect(document.querySelector('.hud-status'));
        const metaRect = rect(document.querySelector('.hud-meta'));
        const topOverlap = (statusRect && metaRect) ? (statusRect.x + statusRect.w > metaRect.x && statusRect.y < metaRect.y + metaRect.h) : false;

        return {
          viewport: { w: window.innerWidth, h: window.innerHeight, scrollW: document.body.scrollWidth, scrollH: document.body.scrollHeight },
          hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth,
          dock: rect(hudDock),
          dockBtnsAudit,
          topOverlap,
          statusRect,
          metaRect,
          dialogueRect: rect(dialogue),
          hudLeftRect: rect(hudLeft)
        };
      })()`
    }
  });

  if (!auditRes || !auditRes.result || !auditRes.result.result) {
    console.error('auditRes error full:', JSON.stringify(auditRes));
    ws.close();
    return { filename: '', audit: { hasHorizontalOverflow: false, dockBtnsAudit: [] } };
  }
  const audit = auditRes.result.result.value;

  // Take screenshot
  const shot = await send({
    sessionId,
    method: 'Page.captureScreenshot',
    params: { format: 'png' }
  });
  const filename = `browser-screenshots/audit_${width}x${height}.png`;
  fs.writeFileSync(filename, Buffer.from(shot.result.data, 'base64'));

  ws.close();
  return { filename, audit };
}

async function main() {
  const viewports = [
    { w: 360, h: 640, mobile: true },  // Common small Android
    { w: 390, h: 844, mobile: true },  // iPhone 12/13/14
    { w: 412, h: 915, mobile: true },  // Pixel / Samsung
    { w: 768, h: 1024, mobile: true }, // iPad Portrait
    { w: 852, h: 393, mobile: true },  // Mobile Landscape
    { w: 1280, h: 720, mobile: false } // Desktop
  ];

  for (const vp of viewports) {
    console.log(`Auditing ${vp.w}x${vp.h}...`);
    const res = await testViewport(vp.w, vp.h, vp.mobile);
    console.log(`Results for ${vp.w}x${vp.h}:`, {
      hasHorizontalOverflow: res.audit.hasHorizontalOverflow,
      topOverlap: res.audit.topOverlap,
      dockBtnCount: res.audit.dockBtnsAudit.length,
      unclickable: res.audit.dockBtnsAudit.filter(b => !b.clickable).map(b => ({ text: b.text, obscuredBy: b.obscuredBy, rect: b.rect })),
      outOfBounds: res.audit.dockBtnsAudit.filter(b => !b.visible).map(b => ({ text: b.text, rect: b.rect }))
    });
  }
}

main().catch(console.error);
