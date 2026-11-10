// Lớp phủ đo hiệu năng (SPEC-TOI-UU §T2, L1): bật bằng `?perf=1` hoặc `game.perf(true)`.
// Hiện snapshot do main.tsx chụp mỗi giây (`core/perf.ts`), kèm nút "Ghi 30 giây":
// tích luỹ 30 snapshot rồi để người chơi tải/đọc một dòng JSON dán vào bảng kết quả.
// Mount ở boot.tsx (ngoài Hud) để không làm nhiễu số "Hud vẽ lại/giây".
import { useEffect, useRef, useState } from 'react';
import { setPerf, usePerf, type PerfSnapshot } from '../core/perf';

const NUM = (n: number, d = 0) => (Number.isFinite(n) ? n.toFixed(d) : '—');
const CSS = {
  box: {
    position: 'fixed', left: 8, bottom: 8, zIndex: 9999, background: 'rgba(0,0,0,.78)',
    color: '#dfe', font: '11px/1.4 ui-monospace,monospace', padding: '6px 8px', borderRadius: 6,
    whiteSpace: 'pre', minWidth: 240, pointerEvents: 'auto',
  } as const,
  btn: { marginTop: 4, cursor: 'pointer' } as const,
};

export function PerfOverlay() {
  const { on, snap } = usePerf();
  const [rec, setRec] = useState<{ rows: { t: number; s: PerfSnapshot }[] } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const rowsRef = useRef(rec?.rows ?? []);

  // Mỗi giây, nếu đang ghi thì lưu snapshot hiện tại; đủ 30 thì chốt lại.
  useEffect(() => {
    if (!on) return;
    if (!rec) return;
    rowsRef.current = rec.rows;
    const id = setInterval(() => {
      const s = usePerf.getState().snap;
      if (!s) return;
      rowsRef.current = [...rowsRef.current, { t: Date.now(), s }];
      setRec({ rows: rowsRef.current });
      if (rowsRef.current.length >= 30) {
        setDone(JSON.stringify({ legend: 'mỗi dòng = 1 giây', rows: rowsRef.current }));
        setRec(null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [on, rec]);

  if (!on) return null;

  const line = (k: string, v: string) => `\u00A0${k.padEnd(16)} ${v}`;
  const body = snap ? [
    line('fps', NUM(snap.fps, 0)),
    line('frame p50/p95/w', `${NUM(snap.frameMs.p50, 1)}/${NUM(snap.frameMs.p95, 1)}/${NUM(snap.frameMs.worst, 1)} ms`),
    line('draw calls', NUM(snap.drawCalls, 0)),
    line('triangles', NUM(snap.triangles, 0)),
    line('geometry/texture', `${NUM(snap.geometries, 0)}/${NUM(snap.textures, 0)}`),
    line('npc', NUM(snap.npc, 0)),
    line('instancedMesh', NUM(snap.instancedMeshes, 0)),
    line('js memory', `${NUM(snap.jsMemory, 1)} MB`),
    line('hud redraws/s', NUM(snap.hudRedraws, 0)),
    line('gfx', `${snap.gfx} @ ${snap.pixelRatio}x`),
  ].join('\n') : 'đang chờ snapshot…';

  return (
    <div style={CSS.box}>
      <div>{body}</div>
      {!rec && !done && (
        <button style={CSS.btn} onClick={() => { rowsRef.current = []; setDone(null); setRec({ rows: [] }); }}>
          ▶ Ghi 30 giây
        </button>
      )}
      {rec && <div style={{ color: '#fe7' }}>⏺ Đang ghi… {rec.rows.length}/30</div>}
      {done && (
        <>
          <div style={{ color: '#7f7' }}>✓ Xong 30 giây (dán vào docs/PERF.md)</div>
          <textarea
            readOnly value={done} style={{ width: 260, height: 70, fontSize: 10 }}
            onFocus={(e) => e.currentTarget.select()}
          />
        </>
      )}
      <button style={CSS.btn} onClick={() => setPerf(false)}>✕ Tắt</button>
    </div>
  );
}
