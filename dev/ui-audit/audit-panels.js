// GĐ2368 — audit hình học toàn bộ panel qua trình duyệt (chạy bằng agent-browser eval --stdin)
// Đo cho từng panel: khung tràn viewport, trang cuộn ngang, nút ✕ ngoài màn,
// khoảng trống lớn dưới thân panel, chữ bị cắt (overflow hidden + scrollWidth > clientWidth).
(async () => {
  const PANELS = ['order','shelf','build','arrange','prices','staff','branch','levels','reviews','storage','planogram','quests','regulars','skills','combos','contracts','costume','business','calendar','gifts','cook','morning','todo','log','history','social','online','community','licenses','garden','brand','analytics','quannuoc','discovery','landmark','records','dossier','roadmap','summary'];
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const g = window.game;
  const useGame = g.useGame;

  const clippedText = (root, frame) => {
    const out = [];
    const all = root.querySelectorAll('*');
    for (const el of all) {
      if (!(el instanceof HTMLElement) || !el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
      const cs = getComputedStyle(el);
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 2);
      if (!hasText) continue;
      const ox = cs.overflowX;
      if ((ox === 'hidden' || ox === 'clip') && el.scrollWidth > el.clientWidth + 2) {
        out.push((el.className ? String(el.className).split(' ')[0] : el.tagName) + ':' + (el.textContent || '').trim().slice(0, 24));
        if (out.length >= 5) break;
      }
    }
    return out;
  };

  const auditOne = async (type) => {
    try {
      const s = useGame.getState();
      let panel = { type };
      if (type === 'shelf') {
        const sh = (s.shelf && s.shelf[0]) || (s.furniture && s.furniture.find && s.furniture.find(f => f.kind === 'shelf'));
        panel = sh ? { type: 'shelf', uid: sh.uid ?? sh.id } : null;
      }
      if (!panel) return { type, skip: 'no-shelf' };
      useGame.setState({ panel });
      await sleep(350);
      const p = document.querySelector('#ui .panel');
      if (!p) return { type, skip: 'not-rendered' };
      const fr = p.getBoundingClientRect();
      const overX = Math.round(Math.max(0, fr.right - innerWidth, -(fr.left)));
      const overY = Math.round(Math.max(0, fr.bottom - innerHeight, -(fr.top)));
      const docOver = Math.round(Math.max(0, document.documentElement.scrollWidth - innerWidth));
      // nút đóng
      let closeOK = false;
      for (const b of p.querySelectorAll('button')) {
        const t = (b.textContent || '').trim();
        if (t === '✕' || t === 'Đóng' || /đóng/i.test(t)) { const r = b.getBoundingClientRect(); closeOK = r.width > 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && r.left >= -1; break; }
      }
      // thân panel: khoảng trống dưới cùng (nội dung thấp hơn khung nhiều)
      const body = p.querySelector('[class*="body"], [class*="content"]') || p;
      const bodyStyle = getComputedStyle(body);
      const emptyBottom = body.scrollHeight < body.clientHeight - 60 ? (body.clientHeight - body.scrollHeight) : 0;
      // phần tử con tràn khỏi khung mà không nằm trong scroller
      let leak = 0;
      const frRect = fr;
      for (const el of p.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        let anc = el.parentElement, inScroller = false;
        while (anc && anc !== p) { const cs = getComputedStyle(anc); if (cs.overflowX === 'auto' || cs.overflowX === 'scroll' || cs.overflowY === 'auto' || cs.overflowY === 'scroll') { inScroller = true; break; } anc = anc.parentElement; }
        if (!inScroller && (r.right > frRect.right + 3 || r.left < frRect.left - 3)) leak++;
      }
      const ct = clippedText(p, fr);
      return { type, w: Math.round(fr.width), h: Math.round(fr.height), overX, overY, docOver, closeOK, emptyBottom: Math.round(emptyBottom), leak, clippedText: ct };
    } catch (e) {
      return { type, err: String(e && e.message || e).slice(0, 80) };
    }
  };

  const results = [];
  for (const t of PANELS) results.push(await auditOne(t));
  // đóng panel + audit HUD dock
  useGame.setState({ panel: null });
  await sleep(250);
  const dock = document.querySelector('.hud-dock');
  const dockInfo = dock ? { w: Math.round(dock.getBoundingClientRect().width), overX: Math.round(Math.max(0, dock.getBoundingClientRect().right - innerWidth)), rows: Math.round(dock.getBoundingClientRect().height / 48) } : null;
  return { vw: innerWidth, vh: innerHeight, dock: dockInfo, panels: results };
})()
