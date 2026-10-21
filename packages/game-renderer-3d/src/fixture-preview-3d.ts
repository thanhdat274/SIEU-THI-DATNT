import type { StoreFixture } from '@game/shared';
import { CAMERA_BETA } from './coords';
import { fixtureBoxes } from './fixture-shapes';
import { renderStudioShot, STUDIO_ALPHA, STUDIO_PX, type StudioShot } from './studio-3d';

/** Chiều cao nội thất cao nhất (kệ, tủ lạnh) để đặt tâm ngắm và biên khung hình. */
const FRAME_HEIGHT = 1.4;
/** Gần 0 (không dùng đúng 0 để tránh suy biến trục lên của ArcRotateCamera). */
const TOP_VIEW_BETA = 0.001;
const TOP_VIEW_PAD = 0.05;

type PreviewFixture = Pick<StoreFixture, 'type' | 'tileX' | 'tileY' | 'widthTiles' | 'heightTiles' | 'rotation'>;

/** Góc chụp: 'iso' nghiêng như camera game (thẻ, danh sách); 'top' nhìn thẳng từ trên xuống (ô trên bảng bố trí, được xoay bằng CSS). */
export type FixturePreviewView = 'iso' | 'top';

/** Khóa cache: mọi món cùng loại và cùng chân diện có cùng hình trong game nên dùng chung một ảnh. */
export function fixturePreviewKey(type: StoreFixture['type'], widthTiles: number, heightTiles: number, view: FixturePreviewView = 'iso'): string {
  return `${type}|${widthTiles}x${heightTiles}|${view}`;
}

/** Fixture giả đặt ở ô (0,0), không xoay, dùng để dựng đúng hình như trong game. */
export function previewFixtureFor(type: StoreFixture['type'], widthTiles: number, heightTiles: number): PreviewFixture {
  return { type, tileX: 0, tileY: 0, widthTiles, heightTiles, rotation: 0 };
}

/** Khung chụp riêng cho nội thất: nghiêng theo cạnh dài chân diện, hoặc thẳng góc đúng tỉ lệ chân diện. */
function fixtureShot(type: StoreFixture['type'], widthTiles: number, heightTiles: number, view: FixturePreviewView): StudioShot {
  const boxes = fixtureBoxes(previewFixtureFor(type, widthTiles, heightTiles), 0.5);
  const key = fixturePreviewKey(type, widthTiles, heightTiles, view);
  const target = { x: widthTiles / 2, y: FRAME_HEIGHT / 2, z: heightTiles / 2 };
  if (view === 'top') {
    const longSide = Math.max(widthTiles, heightTiles);
    return {
      key, boxes, target, alpha: STUDIO_ALPHA.top, beta: TOP_VIEW_BETA,
      halfW: widthTiles / 2 + TOP_VIEW_PAD, halfH: heightTiles / 2 + TOP_VIEW_PAD,
      widthPx: Math.round((STUDIO_PX * widthTiles) / longSide), heightPx: Math.round((STUDIO_PX * heightTiles) / longSide),
    };
  }
  const half = Math.max(widthTiles, heightTiles) * 0.62 + 0.3;
  return { key, boxes, target, alpha: STUDIO_ALPHA.iso, beta: CAMERA_BETA, halfW: half, halfH: half, widthPx: STUDIO_PX, heightPx: STUDIO_PX };
}

/**
 * Chụp ảnh xem trước (data URL PNG nền trong suốt) của một loại nội thất từ chính các khối dựng bằng code dùng trong game
 * (`fixtureBoxes`, cũng là hình game dùng khi model Kenney chưa tải). Không dùng model Kenney: cách đặt chúng ở `fixtures-3d` chưa khớp với file.
 * Có cache theo loại + chân diện, dùng chung engine ngoài màn hình của `studio-3d`.
 * Trả null khi không có DOM/WebGL hoặc chụp lỗi (giao diện tự hiện ô trống).
 */
export function renderFixturePreview(type: StoreFixture['type'], widthTiles: number, heightTiles: number, view: FixturePreviewView = 'iso'): Promise<string | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return renderStudioShot(fixtureShot(type, widthTiles, heightTiles, view));
}
