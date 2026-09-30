import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getFixtureDimensions, type SaveGameData, type StoreFixture } from '@game/shared';
import { LAND_PLOTS, generateStarterTileMap } from '@game/data';
import { applyStoreLayoutActions, rotateStoreFixture, type StoreLayoutAction } from '@game/core';
import { PixelButton } from './pixel';
import './store-layout.css';

interface Props {
  save: SaveGameData;
  onConfirm: (save: SaveGameData, actions: StoreLayoutAction[]) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
}

const fixtureName = (fixture: StoreFixture) => fixture.label || fixture.id;

export const StoreLayoutModal: React.FC<Props> = ({ save, onConfirm, onClose }) => {
  const dialogRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState(save);
  const [actions, setActions] = useState<StoreLayoutAction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [retrieveId, setRetrieveId] = useState<string | null>(null);
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
  const previewResult = selected && previewCell ? layoutResult([...actions, { type: 'move', fixtureId: selected.id, tileX: previewCell.x, tileY: previewCell.y, rotation: selected.rotation }]) : null;
  const applyAction = (action: StoreLayoutAction) => {
    const nextActions = [...actions, action];
    const result = layoutResult(nextActions);
    if (result.error || !result.save) {
      setError(result.error === 'money' ? 'Chưa đủ tiền để mở khu đất.' : result.error === 'level' ? 'Chưa đủ cấp độ để mở khu đất.' : result.error === 'outside_floor' ? 'Ô đặt nằm ngoài mặt bằng đã mở.' : result.error === 'overlap' ? 'Vị trí đang bị nội thất khác chiếm.' : result.error === 'path_blocked' ? `Bố cục chặn lối tới: ${result.blockedFixtureIds?.join(', ')}` : result.error === 'prerequisite' ? 'Cần mở khu đất liền trước hoặc giữ quầy thu ngân.' : 'Không thể áp dụng thao tác này.');
      return;
    }
    setActions(nextActions);
    setDraft(result.save);
    setError('');
    setRetrieveId(null);
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
              const fixture = draft.storeLayout.fixtures.find(item => inFootprint(item, x, y));
              const floor = tileKind(x, y) === 3 && !map.collisionLayer[(y - (map.originTileY ?? 0)) * map.width + x];
              const previewDimensions = selected ? (selected.rotation === 90 || selected.rotation === 270 ? { width: selected.heightTiles, height: selected.widthTiles } : { width: selected.widthTiles, height: selected.heightTiles }) : { width: 0, height: 0 };
              const previewCovered = !!selected && !!previewCell && x >= previewCell.x && x < previewCell.x + previewDimensions.width && y >= previewCell.y && y < previewCell.y + previewDimensions.height;
              const action = selected ? () => {
                const rotation = selected.rotation;
                const width = rotation === 90 || rotation === 270 ? selected.heightTiles : selected.widthTiles;
                const height = rotation === 90 || rotation === 270 ? selected.widthTiles : selected.heightTiles;
                applyAction({ type: 'move', fixtureId: selected.id, tileX: x, tileY: y, rotation });
                if (width < 1 || height < 1) setError('Nội thất không có footprint hợp lệ.');
              } : fixture ? () => { setSelectedId(fixture.id); setRetrieveId(null); setError(''); } : undefined;
              const previewInvalid = previewCovered && (!floor || !previewResult?.save);
              return <button key={`${x}-${y}`} type="button" role="gridcell" data-layout-cell={`${x},${y}`} className={`layout-cell ${floor ? 'is-floor' : 'is-locked'} ${fixture ? 'has-fixture' : ''} ${fixture?.id === selectedId ? 'is-selected' : ''} ${retrieveId ? 'is-drop-target' : ''} ${previewCovered ? (previewInvalid ? 'is-preview-invalid' : 'is-preview-valid') : ''}`} aria-label={fixture ? `${fixtureName(fixture)} tại ô ${x}, ${y}` : `Ô ${x}, ${y}${floor ? '' : ' chưa mở'}`} onPointerEnter={() => { if (selected) setPreviewCell({ x, y }); }} onPointerDown={event => { if (!fixture || retrieveId) return; dragRef.current = { id: fixture.id, pointerId: event.pointerId, offsetX: x - fixture.tileX, offsetY: y - fixture.tileY }; setSelectedId(fixture.id); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={event => {
                const drag = dragRef.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                dragRef.current = null;
                const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-layout-cell]')?.dataset.layoutCell?.split(',').map(Number);
                if (target && (target[0] !== fixture?.tileX || target[1] !== fixture?.tileY)) applyAction({ type: 'move', fixtureId: drag.id, tileX: target[0] - drag.offsetX, tileY: target[1] - drag.offsetY, rotation: draft.storeLayout.fixtures.find(item => item.id === drag.id)?.rotation ?? 0 });
              }} onPointerCancel={() => { dragRef.current = null; }} onClick={() => retrieveId ? applyAction({ type: 'retrieve', fixtureId: retrieveId, tileX: x, tileY: y }) : action?.()}>{fixture ? <span>{fixture.type === 'cashier_counter' ? '▤' : fixture.type === 'refrigerator' ? '▥' : '▦'}</span> : floor ? '' : '×'}</button>;
            }))}
          </div>
          <div className="layout-plots">{LAND_PLOTS.map(plot => <article key={plot.id} className="layout-plot">
            <div><strong>{plot.name}</strong><span>Level {plot.level} · {plot.tiles.length / 8 - 1}×6 ô bán hàng · {plot.cost.toLocaleString('vi-VN')} đ</span></div>
            {owned.has(plot.id) ? <span className="layout-owned">Đã mở</span> : <PixelButton disabled={busy || draft.player.level < plot.level || (plot.prerequisitePlotId && !owned.has(plot.prerequisitePlotId)) || draft.player.money < plot.cost} onClick={() => applyAction({ type: 'buy_plot', plotId: plot.id })}>Mở khu</PixelButton>}
          </article>)}</div>
        </div>
        <aside className="layout-sidebar">
          <h3>Nội thất đang dùng</h3>
          <div className="layout-fixtures">{draft.storeLayout.fixtures.map(fixture => <button key={fixture.id} type="button" className={fixture.id === selectedId ? 'is-selected' : ''} onClick={() => { setSelectedId(fixture.id); setRetrieveId(null); setError(''); }}>{fixtureName(fixture)}<small>{fixture.tileX}, {fixture.tileY} · {fixture.rotation}°</small></button>)}</div>
          {selected && <div className="layout-controls"><strong>{fixtureName(selected)}</strong><div><PixelButton onClick={() => applyAction({ type: 'move', fixtureId: selected.id, tileX: selected.tileX, tileY: selected.tileY, rotation: rotateStoreFixture(selected) })}>Xoay 90°</PixelButton><PixelButton disabled={selected.type === 'cashier_counter'} onClick={() => { applyAction({ type: 'store', fixtureId: selected.id }); setSelectedId(null); }}>Cất vào kho</PixelButton></div></div>}
          <h3>Nội thất đã cất</h3>
          <div className="layout-fixtures">{(draft.storeLayout.storedFixtures ?? []).map(fixture => <button key={fixture.id} type="button" className={retrieveId === fixture.id ? 'is-selected' : ''} onClick={() => { setRetrieveId(fixture.id); setSelectedId(null); setError('Chọn ô sàn để đặt lại nội thất.'); }}>{fixtureName(fixture)}<small>Chạm để chọn vị trí</small></button>)}</div>
          {error && <p className="layout-error" role="alert">{error}</p>}
        </aside>
      </div>
      <footer className="layout-footer"><span>{actions.length} thao tác trong bản nháp</span><div><PixelButton disabled={!actions.length || busy} onClick={undo}>Hoàn tác</PixelButton><PixelButton disabled={busy} onClick={onClose}>Hủy</PixelButton><PixelButton variant="teal" disabled={busy || !actions.length} onClick={() => void confirm()}>{busy ? 'Đang lưu…' : 'Áp dụng'}</PixelButton></div></footer>
    </section>
  </div>;
};
