import { Container, Graphics } from 'pixi.js';
import { TILE_SIZE } from '@game/shared';
import { ROAD_PROFILE, STORM_DRAINS } from '@game/data';

/** Số hàng mặt đường vẽ lớp ướt: hàng bó vỉa (13) tới hết vùng nhựa đường hiển thị dưới bản đồ. */
const WET_ROWS = 6;
/** Chỉ vẽ lại lớp ướt khi độ ướt đổi ít nhất ngần này, tránh vẽ lại mỗi frame. */
const WET_REDRAW_STEP = 0.02;

/** Kích thước vũng nước quanh cửa thu nước theo độ ướt 0..1; dùng chung cho vẽ vũng và gợn/phản chiếu. */
export function puddleGeometry(wet: number): { level: number; rx: number; ry: number } {
  const level = Math.max(0, (wet - 0.3) / 0.7);
  return { level, rx: 10 + 26 * level, ry: 3 + 7 * level };
}

export interface RoadSurface {
  /** Độ ướt mặt đường 0..1; vẽ lại lớp đường ướt và vũng nước khi đổi đủ lớn. */
  setWetness(wetness: number): void;
}

/**
 * Mặt cắt lòng đường (chỉ hình ảnh, không va chạm): bó vỉa + rãnh, vạch giữa đường, cửa thu nước (vạch qua đường nằm ở các ngã tư,
 * xem neighborhood-scene); kèm lớp đường ướt và vũng nước gần cửa thu nước khi trời mưa.
 */
export function buildRoadSurface(layer: Container, widthTiles: number): RoadSurface {
  const widthPx = widthTiles * TILE_SIZE;
  const kerbY = ROAD_PROFILE.kerbTileY * TILE_SIZE;
  const centerY = ROAD_PROFILE.centerLineTileY * TILE_SIZE;

  const fixed = new Graphics();
  fixed.eventMode = 'none';
  // Bó vỉa sáng rồi rãnh thoát nước sẫm sát lòng đường.
  fixed.rect(0, kerbY, widthPx, 3).fill({ color: 0xb9b2a0, alpha: 0.9 });
  fixed.rect(0, kerbY + 3, widthPx, 6).fill({ color: 0x5d6a68, alpha: 0.55 });
  // Vạch phân làn giữa hai chiều, nét đứt.
  for (let x = 0; x < widthTiles; x++) fixed.rect(x * TILE_SIZE + 6, centerY - 1, 20, 2).fill({ color: 0xf0d48a, alpha: 0.7 });
  // Cửa thu nước (song chắn) trong rãnh.
  for (const drain of STORM_DRAINS) {
    const gx = drain.tileX * TILE_SIZE + 8;
    fixed.rect(gx - 1, kerbY + 2, 18, 8).fill({ color: 0x1d2624, alpha: 0.9 });
    fixed.rect(gx, kerbY + 3, 16, 6).fill(0x2d3836);
    for (let bar = 0; bar < 4; bar++) fixed.rect(gx + 2 + bar * 4, kerbY + 3, 1, 6).fill({ color: 0x6a7a75, alpha: 0.9 });
  }
  layer.addChild(fixed);

  const wetLayer = new Graphics();
  wetLayer.eventMode = 'none';
  layer.addChild(wetLayer);

  let drawn = -1;
  return {
    setWetness(wetness: number): void {
      const wet = Math.max(0, Math.min(1, wetness));
      if (Math.abs(wet - drawn) < WET_REDRAW_STEP && !(wet === 0 && drawn !== 0)) return;
      drawn = wet;
      wetLayer.clear();
      if (wet <= 0.01) return;
      const roadH = WET_ROWS * TILE_SIZE;
      wetLayer.rect(0, kerbY, widthPx, roadH).fill({ color: 0x1d2a38, alpha: 0.28 * wet });
      wetLayer.rect(0, kerbY + 3, widthPx, 6).fill({ color: 0x7fa6bd, alpha: 0.38 * wet });
      // Vệt phản chiếu cố định (xác định theo ô) trên mặt đường ướt.
      for (let i = 0; i < 46; i++) {
        const h = (i * 2654435761) >>> 0;
        const sx = (h % widthPx);
        const sy = kerbY + 14 + ((h >>> 8) % (roadH - 20));
        const len = 8 + ((h >>> 16) % 14);
        wetLayer.rect(sx, sy, len, 1).fill({ color: 0xcfe3f0, alpha: 0.12 * wet });
      }
      // Vũng nước gần cửa thu nước, lớn dần khi mưa nặng.
      const { level, rx, ry } = puddleGeometry(wet);
      if (level > 0) {
        for (const drain of STORM_DRAINS) {
          const px = drain.tileX * TILE_SIZE + 16;
          const py = kerbY + 14;
          wetLayer.ellipse(px, py, rx, ry).fill({ color: 0x8db3c7, alpha: 0.28 + 0.22 * level });
          wetLayer.ellipse(px - rx * 0.25, py - ry * 0.3, rx * 0.5, ry * 0.4).fill({ color: 0xe2f0f7, alpha: 0.25 * level });
        }
      }
    },
  };
}
