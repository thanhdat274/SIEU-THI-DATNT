import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getFixtureDimensions, type SaveGameData, type StoreFixture } from '@game/shared';
import { DECOR, FIXTURE_SHOP, LAND_PLOTS, generateStarterTileMap } from '@game/data';
import { applyStoreLayoutActions, decorAttraction, decorTrafficMultiplier, rotateStoreFixture, type StoreLayoutAction } from '@game/core';
import { fixturePreviewUrl } from '@game/renderer';
import { PixelButton } from './pixel';
import './store-layout.css';

interface Props {
  save: SaveGameData;
  onConfirm: (save: SaveGameData, actions: StoreLayoutAction[]) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
}

/** Ảnh nội thất lấy từ bộ vẽ của game; tủ 2 cánh vẽ hai thân cạnh nhau, kệ kính ngả xanh để phân biệt kệ gỗ. */
const FixtureArt: React.FC<{ type: StoreFixture['type']; shopId?: string; doubleWide?: boolean; className?: string }> = ({ type, shopId, doubleWide, className }) => {
  const tint = type === 'shelf_glass' ? 'fx-glass' : '';
  const img = <img src={fixturePreviewUrl(type, shopId)} alt="" draggable={false} className={`fx-img ${tint}`} />;
  // Sprite theo mã danh mục đã vẽ đủ chiều rộng; chỉ ảnh theo loại của tủ 2 cánh mới phải ghép hai thân.
  return <span className={`fx-art ${className ?? ''}`}>{!shopId && type === 'refrigerator' && doubleWide ? <>{img}{img}</> : img}</span>;
};

/** Fixture khởi tạo không có shopId: suy ra mã danh mục để lấy đúng sprite. */
const shopIdOf = (fixture: StoreFixture): string | undefined => fixture.shopId
  ?? (fixture.type === 'shelf_wooden' ? 'shelf' : fixture.type === 'cashier_counter' ? 'counter' : fixture.type === 'refrigerator' ? (fixture.widthTiles >= 2 ? 'fridge' : 'fridge_single') : undefined);

const fixtureName = (fixture: StoreFixture) => fixture.label || fixture.id;

const actionIsBuyFixture = (action: StoreLayoutAction) => action.type === 'buy_fixture';

export const StoreLayoutModal: React.FC<Props> = ({ save, onConfirm, onClose }) => {
  const dialogRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState(save);
  const [actions, setActions] = useState<StoreLayoutAction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [retrieveId, setRetrieveId] = useState<string | null>(null);
  const [buyId, setBuyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dragRef = useRef<{ id: string; pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [previewCell, setPreviewCell] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const getFocusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )).filter(element => element.getAttribute('aria-hidden') !== 'true');
    getFocusable()[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);
  const map = useMemo(() => generateStarterTileMap(draft.storeLayout.unlockedPlotIds ?? []), [draft.storeLayout.unlockedPlotIds]);
  const selected = draft.storeLayout.fixtures.find(item => item.id === selectedId) ?? null;
  const owned = new Set(draft.storeLayout.unlockedPlotIds ?? []);
  const inFootprint = (fixture: StoreFixture, x: number, y: number) => {
    const { widthTiles, heightTiles } = getFixtureDimensions(fixture);
    return x >= fixture.tileX && x < fixture.tileX + widthTiles && y >= fixture.tileY && y < fixture.tileY + heightTiles;
  };
  const layoutResult = (nextActions: StoreLayoutAction[]) => applyStoreLayoutActions(save, nextActions, ids => generateStarterTileMap(ids));
  const buyItem = FIXTURE_SHOP.find(item => item.id === buyId) ?? null;
  const previewResult = selected && previewCell ? layoutResult([...actions, { type: 'move', fixtureId: selected.id, tileX: previewCell.x, tileY: previewCell.y, rotation: selected.rotation }]) : null;
  const applyAction = (action: StoreLayoutAction) => {
    const nextActions = [...actions, action];
    const result = layoutResult(nextActions);
    if (result.error || !result.save) {
      setError(result.error === 'money' ? 'Chưa đủ tiền.' : result.error === 'owned' ? 'Bạn đã có món trang trí này.' : result.error === 'unavailable' ? 'Món này chưa có chức năng trong game.' : result.error === 'level' && actionIsBuyFixture(action) ? 'Chưa đủ cấp độ để mua món này.' : result.error === 'unknown_item' ? 'Món này không có trong cửa hàng.' : result.error === 'level' ? 'Chưa đủ cấp độ để mở khu đất.' : result.error === 'outside_floor' ? 'Ô đặt nằm ngoài mặt bằng đã mở.' : result.error === 'overlap' ? 'Vị trí đang bị nội thất khác chiếm.' : result.error === 'path_blocked' ? `Bố cục chặn lối tới: ${result.blockedFixtureIds?.join(', ')}` : result.error === 'prerequisite' ? 'Cần mở khu đất liền trước hoặc giữ quầy thu ngân.' : 'Không thể áp dụng thao tác này.');
      return;
    }
    setActions(nextActions);
    setDraft(result.save);
    setError('');
    setRetrieveId(null);
    setBuyId(null);
    setSelectedId(null);
    setPreviewCell(null);
  };
  const undo = () => {
    const next = actions.slice(0, -1);
    const result = layoutResult(next);
    if (result.save) { setActions(next); setDraft(result.save); setError(''); }
  };
  const confirm = async () => {
    const result = layoutResult(actions);
    if (!result.save) { setError('Bố cục hiện tại chưa hợp lệ.'); return; }
    setBusy(true);
    try { const accepted = await onConfirm(result.save, actions); if (accepted !== false) onClose(); }
    finally { setBusy(false); }
  };
  const ground = map.layers.find(layer => layer.name === 'ground')!.data;
  const tileKind = (x: number, y: number) => {
    const ly = y - (map.originTileY ?? 0);
    return x >= 0 && x < map.width && ly >= 0 && ly < map.height ? ground[ly * map.width + x] : 0;
  };

  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="store-layout-dialog" role="dialog" aria-modal="true" aria-labelledby="layout-title" tabIndex={-1}>
      <header className="layout-heading"><div><p className="eyebrow">Đóng cửa để sửa mặt bằng</p><h2 id="layout-title">Sắp xếp cửa hàng</h2></div><strong>Tiền: {draft.player.money.toLocaleString('vi-VN')} đ</strong></header>
      <div className="layout-workspace">
        <div className="layout-board-wrap"><p className="layout-help">Chọn một món bên dưới, rồi chạm ô đích để di chuyển. Ô caro là vùng chưa mở.</p>
          <div className="layout-board" role="grid" aria-label="Lưới bố trí cửa hàng">
            {Array.from({ length: 8 }, (_, row) => Array.from({ length: 16 }, (_, col) => {
              const x = 6 + col, y = 3 + row;
              const fixture = draft.storeLayout.fixtures.find(item => !item.parentId && inFootprint(item, x, y));
              const floor = tileKind(x, y) === 3 && !map.collisionLayer[(y - (map.originTileY ?? 0)) * map.width + x];
              const previewDimensions = buyItem ? { width: buyItem.widthTiles, height: buyItem.heightTiles } : selected ? (selected.rotation === 90 || selected.rotation === 270 ? { width: selected.heightTiles, height: selected.widthTiles } : { width: selected.widthTiles, height: selected.heightTiles }) : { width: 0, height: 0 };
              const previewCovered = (!!selected || !!buyItem) && !!previewCell && x >= previewCell.x && x < previewCell.x + previewDimensions.width && y >= previewCell.y && y < previewCell.y + previewDimensions.height;
              const action = buyItem ? () => applyAction({ type: 'buy_fixture', shopId: buyItem.id, tileX: x, tileY: y, rotation: 0 }) : selected ? () => {
                const rotation = selected.rotation;
                const width = rotation === 90 || rotation === 270 ? selected.heightTiles : selected.widthTiles;
                const height = rotation === 90 || rotation === 270 ? selected.widthTiles : selected.heightTiles;
                applyAction({ type: 'move', fixtureId: selected.id, tileX: x, tileY: y, rotation });
                if (width < 1 || height < 1) setError('Nội thất không có footprint hợp lệ.');
              } : fixture ? () => { setSelectedId(fixture.id); setRetrieveId(null); setBuyId(null); setError(''); } : undefined;
              const buyPreview = buyItem && previewCell ? layoutResult([...actions, { type: 'buy_fixture', shopId: buyItem.id, tileX: previewCell.x, tileY: previewCell.y, rotation: 0 }]) : null;
              const previewInvalid = previewCovered && (!floor || !(buyItem ? buyPreview?.save : previewResult?.save));
              return <button key={`${x}-${y}`} type="button" role="gridcell" data-layout-cell={`${x},${y}`} className={`layout-cell ${floor ? 'is-floor' : 'is-locked'} ${fixture ? 'has-fixture' : ''} ${fixture?.id === selectedId ? 'is-selected' : ''} ${retrieveId ? 'is-drop-target' : ''} ${previewCovered ? (previewInvalid ? 'is-preview-invalid' : 'is-preview-valid') : ''}`} aria-label={fixture ? `${fixtureName(fixture)} tại ô ${x}, ${y}` : `Ô ${x}, ${y}${floor ? '' : ' chưa mở'}`} onPointerEnter={() => { if (selected || buyItem) setPreviewCell({ x, y }); }} onPointerDown={event => { if (!fixture || retrieveId || buyItem) return; dragRef.current = { id: fixture.id, pointerId: event.pointerId, offsetX: x - fixture.tileX, offsetY: y - fixture.tileY }; setSelectedId(fixture.id); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={event => {
                const drag = dragRef.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                dragRef.current = null;
                const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-layout-cell]')?.dataset.layoutCell?.split(',').map(Number);
                if (target && (target[0] !== fixture?.tileX || target[1] !== fixture?.tileY)) applyAction({ type: 'move', fixtureId: drag.id, tileX: target[0] - drag.offsetX, tileY: target[1] - drag.offsetY, rotation: draft.storeLayout.fixtures.find(item => item.id === drag.id)?.rotation ?? 0 });
              }} onPointerCancel={() => { dragRef.current = null; }} onClick={() => retrieveId ? applyAction({ type: 'retrieve', fixtureId: retrieveId, tileX: x, tileY: y }) : action?.()}>{fixture ? null : floor ? '' : '×'}</button>;
            }))}
            <div className="layout-art" aria-hidden="true">{draft.storeLayout.fixtures.filter(item => !item.parentId && !item.type.startsWith('warehouse_')).map(item => {
              const { widthTiles: w, heightTiles: h } = getFixtureDimensions(item);
              const turned = item.rotation === 90 || item.rotation === 270;
              return <div key={item.id} className={`layout-art-item ${item.id === selectedId ? 'is-selected' : ''}`} style={{ left: `${(item.tileX - 6) / 16 * 100}%`, top: `${(item.tileY - 3) / 8 * 100}%`, width: `${w / 16 * 100}%`, height: `${h / 8 * 100}%` }}>
                <div className="layout-art-inner" style={{ width: turned ? `${h / w * 100}%` : '100%', height: turned ? `${w / h * 100}%` : '100%', transform: `translate(-50%,-50%) rotate(${item.rotation}deg)` }}>
                  <FixtureArt type={item.type} shopId={shopIdOf(item)} doubleWide={item.widthTiles * item.heightTiles >= 2} />
                </div>
              </div>;
            })}</div>
          </div>
          <div className="layout-plots">{LAND_PLOTS.map(plot => <article key={plot.id} className="layout-plot">
            <div><strong>{plot.name}</strong><span>Level {plot.level} · {plot.tiles.length / 8 - 1}×6 ô bán hàng · {plot.cost.toLocaleString('vi-VN')} đ</span></div>
            {owned.has(plot.id) ? <span className="layout-owned">Đã mở</span> : <PixelButton disabled={busy || draft.player.level < plot.level || (plot.prerequisitePlotId && !owned.has(plot.prerequisitePlotId)) || draft.player.money < plot.cost} onClick={() => applyAction({ type: 'buy_plot', plotId: plot.id })}>Mở khu</PixelButton>}
          </article>)}</div>
        </div>
        <aside className="layout-sidebar">
          <h3>Mua thêm</h3>
          <div className="layout-fixtures layout-shop">{FIXTURE_SHOP.map(item => <button key={item.id} type="button" className={`shop-card ${item.id === buyId ? 'is-selected' : ''}`} disabled={!item.functional || draft.player.level < item.unlockLevel || (draft.player.money < item.cost && item.id !== buyId)} onClick={() => { setBuyId(item.id === buyId ? null : item.id); setSelectedId(null); setRetrieveId(null); setError(item.id === buyId ? '' : 'Chọn ô sàn để đặt món mới.'); }}><span className="shop-art"><FixtureArt type={item.type} shopId={item.id} /></span><strong>{item.name}</strong><small>{item.functional ? `${item.widthTiles}×${item.heightTiles} ô · ${item.slotCount} ô hàng` : `${item.widthTiles}×${item.heightTiles} ô`}</small><span className={`shop-price ${item.functional && draft.player.level >= item.unlockLevel ? '' : 'is-locked'}`}>{draft.player.level < item.unlockLevel ? `Cần Lv ${item.unlockLevel}` : !item.functional ? 'Sắp có' : `${item.cost.toLocaleString('vi-VN')} đ`}</span></button>)}</div>
          <h3>Trang trí</h3>
          <p className="layout-help">Thu hút {decorAttraction(draft.storeLayout.decorOwned, draft.storeLayout.fixtures)}/100 · khách đông thêm {Math.round((decorTrafficMultiplier(decorAttraction(draft.storeLayout.decorOwned, draft.storeLayout.fixtures)) - 1) * 100)}%</p>
          <div className="layout-fixtures layout-shop">{DECOR.filter(item => item.slot !== 'floor' && !item.exclusive).map(item => {
            const have = (draft.storeLayout.decorOwned ?? []).includes(item.id);
            const locked = draft.player.level < item.unlockLevel;
            return <button key={item.id} type="button" className="shop-card" disabled={have || locked || draft.player.money < item.cost} onClick={() => applyAction({ type: 'buy_decor', decorId: item.id })}>
              <span className="shop-art decor-icon" aria-hidden="true">{item.icon}</span><strong>{item.name}</strong><small>+{item.attraction} thu hút · {item.slot === 'sign' ? 'biển hiệu' : item.slot === 'wall' ? 'treo tường' : 'quầy'}</small>
              <span className={`shop-price ${have || locked ? 'is-locked' : ''}`}>{have ? 'Đã có' : locked ? `Cần Lv ${item.unlockLevel}` : `${item.cost.toLocaleString('vi-VN')} đ`}</span>
            </button>;
          })}</div>
          <h3>Nội thất đang dùng</h3>
          <div className="layout-fixtures">{draft.storeLayout.fixtures.filter(fixture => !fixture.parentId).map(fixture => <button key={fixture.id} type="button" className={fixture.id === selectedId ? 'is-selected' : ''} onClick={() => { setSelectedId(fixture.id); setRetrieveId(null); setBuyId(null); setError(''); }}><span className="fixture-row"><FixtureArt type={fixture.type} shopId={shopIdOf(fixture)} doubleWide={fixture.widthTiles * fixture.heightTiles >= 2} className="fx-thumb" />{fixtureName(fixture)}</span><small>{fixture.tileX}, {fixture.tileY} · {fixture.rotation}°</small></button>)}</div>
          {selected && <div className="layout-controls"><strong>{fixtureName(selected)}</strong><div><PixelButton onClick={() => { applyAction({ type: 'move', fixtureId: selected.id, tileX: selected.tileX, tileY: selected.tileY, rotation: rotateStoreFixture(selected) }); setSelectedId(selected.id); }}>Xoay 90°</PixelButton><PixelButton disabled={selected.type === 'cashier_counter'} onClick={() => { applyAction({ type: 'store', fixtureId: selected.id }); setSelectedId(null); }}>Cất vào kho</PixelButton></div></div>}
          <h3>Nội thất đã cất</h3>
          <div className="layout-fixtures">{(draft.storeLayout.storedFixtures ?? []).filter(fixture => !fixture.parentId).map(fixture => <button key={fixture.id} type="button" className={retrieveId === fixture.id ? 'is-selected' : ''} onClick={() => { setRetrieveId(fixture.id); setSelectedId(null); setBuyId(null); setError('Chọn ô sàn để đặt lại nội thất.'); }}>{fixtureName(fixture)}<small>Chạm để chọn vị trí</small></button>)}</div>
          {error && <p className="layout-error" role="alert">{error}</p>}
        </aside>
      </div>
      <footer className="layout-footer"><span>{actions.length} thao tác trong bản nháp</span><div><PixelButton disabled={!actions.length || busy} onClick={undo}>Hoàn tác</PixelButton><PixelButton disabled={busy} onClick={onClose}>Hủy</PixelButton><PixelButton variant="teal" disabled={busy || !actions.length} onClick={() => void confirm()}>{busy ? 'Đang lưu…' : 'Áp dụng'}</PixelButton></div></footer>
    </section>
  </div>;
};
