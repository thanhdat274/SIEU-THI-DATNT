import { useEffect, useRef } from 'react';
import { ALL_PARCELS, RECLAMATION_WAVES, WORLD_BOUNDS } from '@game/data';

type Snapshot = import('@game/renderer-core').MinimapSnapshot;

const W = 132;
const H = 88;

/** Minimap góc dưới-trái (land-reclamation 4.4): toàn thế giới, vùng chơi, đợt đã mở, lô đã mua, khung camera, người chơi. Chỉ để xem, không chặn thao tác. */
export function MiniMap({ getSnapshot }: { getSnapshot: () => Snapshot | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    const bw = WORLD_BOUNDS.x1 - WORLD_BOUNDS.x0 + 1;
    const bh = WORLD_BOUNDS.y1 - WORLD_BOUNDS.y0 + 1;
    const k = Math.min(W / bw, H / bh);
    const offX = (W - bw * k) / 2;
    const offY = (H - bh * k) / 2;
    const px = (x: number): number => offX + (x - WORLD_BOUNDS.x0) * k;
    const py = (y: number): number => offY + (y - WORLD_BOUNDS.y0) * k;
    const draw = (): void => {
      const snap = getSnapshot();
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(30, 24, 16, 0.78)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(96, 120, 84, 0.45)';
      ctx.fillRect(px(WORLD_BOUNDS.x0), py(WORLD_BOUNDS.y0), bw * k, bh * k);
      if (!snap) return;
      ctx.fillStyle = 'rgba(222, 196, 140, 0.9)';
      ctx.fillRect(px(snap.map.x0), py(snap.map.y0), (snap.map.x1 - snap.map.x0) * k, (snap.map.y1 - snap.map.y0) * k);
      for (const wave of RECLAMATION_WAVES) {
        if (!snap.openedWaves.includes(wave.id)) continue;
        const r = wave.region;
        ctx.fillStyle = 'rgba(222, 196, 140, 0.9)';
        ctx.fillRect(px(r.x0), py(r.y0), (r.x1 - r.x0 + 1) * k, (r.y1 - r.y0 + 1) * k);
      }
      ctx.strokeStyle = 'rgba(224, 128, 48, 0.95)';
      ctx.lineWidth = 1;
      // Lô đã mua: viền cam; lô đã có tòa: tô đặc (W0 + lô khai hoang W1–W4 đều vẽ, không chỉ 4 lô gốc).
      for (const parcel of ALL_PARCELS) {
        if (!snap.owned.includes(parcel.id)) continue;
        const r = parcel.rect;
        if (snap.built[parcel.id]) {
          ctx.fillStyle = 'rgba(224, 128, 48, 0.85)';
          ctx.fillRect(px(r.x0), py(r.y0), (r.x1 - r.x0 + 1) * k, (r.y1 - r.y0 + 1) * k);
        }
        ctx.strokeRect(px(r.x0) + 0.5, py(r.y0) + 0.5, (r.x1 - r.x0 + 1) * k - 1, (r.y1 - r.y0 + 1) * k - 1);
      }
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(px(snap.view.x0), py(snap.view.y0), (snap.view.x1 - snap.view.x0) * k, (snap.view.y1 - snap.view.y0) * k);
      ctx.fillStyle = '#e03030';
      ctx.fillRect(px(snap.player.x) - 1.5, py(snap.player.y) - 1.5, 3, 3);
    };
    draw();
    const id = window.setInterval(draw, 150);
    return () => window.clearInterval(id);
  }, [getSnapshot]);

  return <canvas ref={canvasRef} className="mini-map" style={{ width: W, height: H }} role="img" aria-label="Bản đồ thu nhỏ khu phố" />;
}
