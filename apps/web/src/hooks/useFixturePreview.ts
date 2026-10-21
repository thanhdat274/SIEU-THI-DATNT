import { useEffect, useState } from 'react';
import { FIXTURE_SHOP } from '@game/data';
import type { StoreFixture } from '@game/shared';

/** Chân diện mặc định khi không rõ món trong danh mục (khớp ảnh xem trước cũ). */
const DEFAULT_WIDTH_TILES = 2;
const DEFAULT_HEIGHT_TILES = 1;

/** Ảnh xem trước nội thất chụp từ model 3D; `null` khi đang chụp hoặc không chụp được. Renderer 3D tải trễ cùng chunk với game. */
export function useFixturePreview(type: StoreFixture['type'], shopId?: string, view: 'iso' | 'top' = 'iso'): string | null {
  const item = shopId ? FIXTURE_SHOP.find((entry) => entry.id === shopId) : undefined;
  const widthTiles = item?.widthTiles ?? DEFAULT_WIDTH_TILES;
  const heightTiles = item?.heightTiles ?? DEFAULT_HEIGHT_TILES;
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    import('@game/renderer-3d')
      .then((m) => m.renderFixturePreview(type, widthTiles, heightTiles, view))
      .then((next) => { if (alive) setUrl(next); })
      .catch(() => { /* không chụp được: giữ ô trống */ });
    return () => { alive = false; };
  }, [type, widthTiles, heightTiles, view]);

  return url;
}
