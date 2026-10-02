import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getFixtureDimensions, slotGroup, type SaveGameData, type StoreFixture } from '@game/shared';
import { DECOR, FIXTURE_SHOP, LAND_PLOTS, PRODUCT_MAP, generateStarterTileMap } from '@game/data';
import { applyStoreLayoutActions, decorAttraction, decorTrafficMultiplier, rotateStoreFixture, type StoreLayoutAction } from '@game/core';
import { fixturePreviewUrl } from '@game/renderer';
import { PixelButton } from './pixel';
import './store-layout.css';

interface Props {
  save: SaveGameData;
  onConfirm: (save: SaveGameData, actions: StoreLayoutAction[]) => Promise<boolean | void> | boolean | void;
  onClose: () => void;
}

type SidebarTab = 'shop' | 'decor' | 'stored' | 'plots';
type SelectMode = 'inspect' | 'adjust';

const FixtureArt: React.FC<{ type: StoreFixture['type']; shopId?: string; doubleWide?: boolean; className?: string }> = ({ type, shopId, doubleWide, className }) => {
  const tint = type === 'shelf_glass' ? 'fx-glass' : '';
  const img = <img src={fixturePreviewUrl(type, shopId)} alt="" draggable={false} className={`fx-img ${tint}`} />;
  return <span className={`fx-art ${className ?? ''}`}>{img}</span>;
};

const shopIdOf = (fixture: StoreFixture): string | undefined => fixture.shopId
  ?? (fixture.type === 'shelf_wooden' ? 'shelf' : fixture.type === 'cashier_counter' ? 'counter' : fixture.type === 'refrigerator' ? (fixture.widthTiles >= 2 ? 'fridge' : 'fridge_single') : undefined);

const catalogName = (fixture: StoreFixture) => {
  if (fixture.shopId) return FIXTURE_SHOP.find(item => item.id === fixture.shopId)?.name ?? fixture.label;
  if (fixture.type === 'cashier_counter') return 'Quầy thu ngân';
  if (fixture.type === 'refrigerator') return fixture.widthTiles >= 2 ? 'Tủ lạnh 2 cánh' : 'Tủ lạnh 1 cánh';
  if (fixture.type === 'dining_table') return fixture.shopId === 'food_table_4' ? 'Bàn ăn 4 chỗ' : 'Bàn ăn 2 chỗ';
  if (fixture.type === 'shelf_glass') return 'Kệ kính';
  if (fixture.type === 'shelf_wooden') return 'Kệ gỗ';
  return fixture.label;
};

const fixtureGoods = (fixtures: readonly StoreFixture[], fixture: StoreFixture) => {
  if (fixture.type === 'cashier_counter') return 'Quầy tính tiền khách mua';
  const names = [...new Set(slotGroup(fixtures, fixture)
    .map(slot => slot.assignedProductId ? PRODUCT_MAP[slot.assignedProductId]?.name : undefined)
    .filter((name): name is string => !!name))];
  return names.length ? names.join(' · ') : 'Chưa bày hàng';
};

const actionIsBuyFixture = (action: StoreLayoutAction) => action.type === 'buy_fixture';

const errorMessage = (error: string | undefined, action: StoreLayoutAction, blocked?: string[]) => {
  if (error === 'money') return 'Chưa đủ tiền.';
  if (error === 'owned') return 'Bạn đã có món trang trí này.';
  if (error === 'unavailable') return 'Món này chưa có chức năng trong game.';
  if (error === 'level' && actionIsBuyFixture(action)) return 'Chưa đủ cấp độ để mua món này.';
  if (error === 'unknown_item') return 'Món này không có trong cửa hàng.';
  if (error === 'level') return 'Chưa đủ cấp độ để mở khu đất.';
  if (error === 'outside_floor') return 'Ô đặt nằm ngoài mặt bằng đã mở.';
  if (error === 'overlap') return 'Vị trí đang bị nội thất khác chiếm.';
  if (error === 'path_blocked') return `Bố cục chặn lối tới: ${blocked?.join(', ')}`;
  if (error === 'prerequisite') return 'Cần mở khu đất liền trước hoặc giữ quầy thu ngân.';
  return 'Không thể áp dụng thao tác này.';
};

export const StoreLayoutModal: React.FC<Props> = ({ save, onConfirm, onClose }) => {
  const dialogRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState(save);
  const [actions, setActions] = useState<StoreLayoutAction[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState<SelectMode>('inspect');
  const [retrieveId, setRetrieveId] = useState<string | null>(null);
  const [buyId, setBuyId] = useState<string | null>(null);
  const [tab, setTab] = useState<SidebarTab>('shop');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewCell, setPreviewCell] = useState<{ x: number; y: number } | null>(null);

  const escapeRef = useRef({ selectMode, selectedId, buyId, retrieveId, onClose });
  escapeRef.current = { selectMode, selectedId, buyId, retrieveId, onClose };

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
        event.preventDefault();
        const ui = escapeRef.current;
        if (ui.selectMode === 'adjust' && ui.selectedId) {
          setSelectMode('inspect');
          setError('');
          return;
        }
        if (ui.selectedId || ui.buyId || ui.retrieveId) {
          setSelectedId(null);
          setBuyId(null);
          setRetrieveId(null);
          setPreviewCell(null);
          setError('');
          return;
        }
        ui.onClose();
        return;
      }
      if (event.key === 'Enter') {
        const ui = escapeRef.current;
        if (ui.selectMode === 'adjust' && ui.selectedId) {
          event.preventDefault();
          setSelectMode('inspect');
          setError('');
          return;
        }
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
  const stored = (draft.storeLayout.storedFixtures ?? []).filter(fixture => !fixture.parentId);
  const attraction = decorAttraction(draft.storeLayout.decorOwned, draft.storeLayout.fixtures);

  const inFootprint = (fixture: StoreFixture, x: number, y: number) => {
    const { widthTiles, heightTiles } = getFixtureDimensions(fixture);
    return x >= fixture.tileX && x < fixture.tileX + widthTiles && y >= fixture.tileY && y < fixture.tileY + heightTiles;
  };

  const layoutResult = (nextActions: StoreLayoutAction[]) => applyStoreLayoutActions(save, nextActions, ids => generateStarterTileMap(ids));
  const buyItem = FIXTURE_SHOP.find(item => item.id === buyId) ?? null;

  const applyAction = (action: StoreLayoutAction) => {
    const nextActions = [...actions, action];
    const result = layoutResult(nextActions);
    if (result.error || !result.save) {
      setError(errorMessage(result.error, action, result.blockedFixtureIds));
      return false;
    }
    const previousIds = new Set(draft.storeLayout.fixtures.map(item => item.id));
    setActions(nextActions);
    setDraft(result.save);
    setError('');
    setPreviewCell(null);

    if (action.type === 'move') {
      setSelectedId(action.fixtureId);
      return true;
    }
    if (action.type === 'store') {
      setSelectedId(null);
      setRetrieveId(null);
      setBuyId(null);
      setTab('stored');
      return true;
    }
    if (action.type === 'retrieve') {
      setRetrieveId(null);
      setBuyId(null);
      setSelectedId(action.fixtureId);
      setSelectMode('inspect');
      return true;
    }
    if (action.type === 'buy_fixture') {
      const created = result.save.storeLayout.fixtures.find(item => !item.parentId && !previousIds.has(item.id));
      setBuyId(null);
      setRetrieveId(null);
      setSelectedId(created?.id ?? null);
      setSelectMode('inspect');
      return true;
    }
    setBuyId(null);
    setRetrieveId(null);
    return true;
  };

  const undo = () => {
    const next = actions.slice(0, -1);
    const result = next.length ? layoutResult(next) : { save };
    if (result.save) {
      setActions(next);
      setDraft(result.save);
      setError('');
      if (selectedId && !result.save.storeLayout.fixtures.some(item => item.id === selectedId)) {
        setSelectedId(null);
      }
    }
  };

  const confirm = async () => {
    const result = layoutResult(actions);
    if (!result.save) { setError('Bố cục hiện tại chưa hợp lệ.'); return; }
    setBusy(true);
    try {
      const accepted = await onConfirm(result.save, actions);
      if (accepted !== false) onClose();
    } finally {
      setBusy(false);
    }
  };

  /** Bấm lần đầu vào các kệ sẽ hiển thị thông tin tên kệ và bật chế độ di chuyển với các nút điều hướng + xoay */
  const selectFixture = (id: string) => {
    setSelectedId(id);
    setSelectMode('adjust');
    setRetrieveId(null);
    setBuyId(null);
    setPreviewCell(null);
    setError('');
  };

  const finishAdjusting = () => {
    setSelectMode('inspect');
    setError('');
  };

  const startAdjusting = () => {
    setSelectMode('adjust');
    setError('');
  };

  const nudge = (dx: number, dy: number) => {
    if (!selected) return;
    applyAction({ type: 'move', fixtureId: selected.id, tileX: selected.tileX + dx, tileY: selected.tileY + dy, rotation: selected.rotation });
  };

  const rotateSelected = () => {
    if (!selected) return;
    applyAction({ type: 'move', fixtureId: selected.id, tileX: selected.tileX, tileY: selected.tileY, rotation: rotateStoreFixture(selected) });
  };

  const canMove = (dx: number, dy: number, rotation = selected?.rotation) => {
    if (!selected || rotation === undefined) return false;
    return !!layoutResult([...actions, { type: 'move', fixtureId: selected.id, tileX: selected.tileX + dx, tileY: selected.tileY + dy, rotation }]).save;
  };

  const canMoveTo = (tileX: number, tileY: number, rotation = selected?.rotation) => {
    if (!selected || rotation === undefined) return false;
    return !!layoutResult([...actions, { type: 'move', fixtureId: selected.id, tileX, tileY, rotation }]).save;
  };

  const moveRef = useRef({ selectMode, selectedId, nudge, rotateSelected });
  moveRef.current = { selectMode, selectedId, nudge, rotateSelected };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const move = moveRef.current;
      if (move.selectMode !== 'adjust' || !move.selectedId) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === 'ArrowUp') { event.preventDefault(); move.nudge(0, -1); }
      else if (event.key === 'ArrowDown') { event.preventDefault(); move.nudge(0, 1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); move.nudge(-1, 0); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); move.nudge(1, 0); }
      else if (event.key === 'r' || event.key === 'R') { event.preventDefault(); move.rotateSelected(); }
      else if (event.key === 'Enter') { event.preventDefault(); setSelectMode('inspect'); setError(''); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ground = map.layers.find(layer => layer.name === 'ground')!.data;
  const tileKind = (x: number, y: number) => {
    const ly = y - (map.originTileY ?? 0);
    return x >= 0 && x < map.width && ly >= 0 && ly < map.height ? ground[ly * map.width + x] : 0;
  };

  const retrieveFixture = retrieveId ? (draft.storeLayout.storedFixtures ?? []).find(item => item.id === retrieveId) ?? null : null;
  const placing = !!buyItem || !!retrieveFixture;
  const retrieveSize = retrieveFixture ? getFixtureDimensions(retrieveFixture) : null;
  const previewWidth = buyItem ? buyItem.widthTiles : retrieveSize?.widthTiles ?? 0;
  const previewHeight = buyItem ? buyItem.heightTiles : retrieveSize?.heightTiles ?? 0;
  const buyPreview = buyItem && previewCell
    ? layoutResult([...actions, { type: 'buy_fixture', shopId: buyItem.id, tileX: previewCell.x, tileY: previewCell.y, rotation: 0 }])
    : null;
  const retrievePreview = retrieveId && previewCell
    ? layoutResult([...actions, { type: 'retrieve', fixtureId: retrieveId, tileX: previewCell.x, tileY: previewCell.y }])
    : null;

  const selectedSize = selected ? getFixtureDimensions(selected) : null;

  const handleCellClick = (x: number, y: number) => {
    if (retrieveId) {
      applyAction({ type: 'retrieve', fixtureId: retrieveId, tileX: x, tileY: y });
      return;
    }
    if (buyItem) {
      applyAction({ type: 'buy_fixture', shopId: buyItem.id, tileX: x, tileY: y, rotation: 0 });
      return;
    }

    const clickedFixture = draft.storeLayout.fixtures.find(item => !item.parentId && inFootprint(item, x, y));
    if (clickedFixture) {
      if (clickedFixture.id === selectedId) {
        if (selectMode === 'adjust') {
          // Bấm lại vào kệ đã chọn khi đang chỉnh vị trí -> Chuyển về trạng thái hiển thị thông tin
          finishAdjusting();
        } else {
          // Đang ở inspect -> Chuyển sang chỉnh vị trí
          startAdjusting();
        }
      } else {
        // Bấm lần đầu vào kệ khác: hiển thị tên kệ và mở các nút di chuyển + xoay
        selectFixture(clickedFixture.id);
      }
      return;
    }

    // Nếu chạm vào một ô sàn trống trong khi đang ở chế độ di chuyển:
    if (selected && selectMode === 'adjust') {
      if (canMoveTo(x, y)) {
        applyAction({ type: 'move', fixtureId: selected.id, tileX: x, tileY: y, rotation: selected.rotation });
      } else {
        setError('Không thể di chuyển kệ tới ô này (ngoài sàn hoặc bị vướng).');
      }
      return;
    }

    // Chạm ra sàn trống khi xem thông tin: Bỏ chọn
    setSelectedId(null);
    setError('');
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="store-layout-dialog" role="dialog" aria-modal="true" aria-labelledby="layout-title" tabIndex={-1}>
        {/* Header */}
        <header className="layout-heading">
          <div className="layout-heading-title">
            <span className="layout-icon">🏪</span>
            <div>
              <h2 id="layout-title">Sắp xếp cửa hàng</h2>
              <p className="eyebrow">Đóng cửa tiệm để bố trí nội thất &amp; mở rộng diện tích</p>
            </div>
          </div>
          <div className="layout-heading-meta">
            <span className="layout-money-badge">
              <span className="money-coin">💰</span> {draft.player.money.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </header>

        {/* Workspace */}
        <div className="layout-workspace">
          {/* Main Left: Board & Control Inspector */}
          <div className="layout-main">
            {/* Status bar / Contextual guidance */}
            <div className={`layout-status-bar ${selected && selectMode === 'adjust' ? 'is-adjust' : selected ? 'is-inspect' : placing ? 'is-placing' : 'is-idle'}`}>
              {selected && selectMode === 'adjust' ? (
                <>
                  <span className="status-icon">✥</span>
                  <span>Đang di chuyển: <strong>{catalogName(selected)}</strong> — Bấm nút điều hướng, phím mũi tên hoặc chạm ô sàn để đặt, sau đó bấm <strong>&quot;Đặt xong vị trí&quot;</strong>.</span>
                </>
              ) : selected ? (
                <>
                  <span className="status-icon">🏷️</span>
                  <span>Thông tin: <strong>{catalogName(selected)}</strong> — Đã ở đúng vị trí. Bấm nút <strong>&quot;Di chuyển&quot;</strong> nếu muốn dời chỗ khác.</span>
                </>
              ) : placing ? (
                <>
                  <span className="status-icon">📦</span>
                  <span>Đang đặt: <strong>{buyItem ? buyItem.name : retrieveFixture ? catalogName(retrieveFixture) : ''}</strong> — Chạm ô sàn hợp lệ để đặt món vào tiệm.</span>
                </>
              ) : (
                <>
                  <span className="status-icon">💡</span>
                  <span>Chạm vào một kệ hàng trên bản đồ để di chuyển vị trí hoặc xem thông tin, hoặc chọn món từ danh mục bên phải.</span>
                </>
              )}
            </div>

            {/* Board Container */}
            <div className="layout-board-container">
              <div className="board-landmark is-warehouse">
                <span>📦 Cửa kho (phía trên)</span>
              </div>

              <div className="layout-board" role="grid" aria-label="Lưới bố trí cửa hàng">
                {Array.from({ length: 8 }, (_, row) => Array.from({ length: 16 }, (_, col) => {
                  const x = 6 + col, y = 3 + row;
                  const fixture = draft.storeLayout.fixtures.find(item => !item.parentId && inFootprint(item, x, y));
                  const floor = tileKind(x, y) === 3 && !map.collisionLayer[(y - (map.originTileY ?? 0)) * map.width + x];
                  const previewCovered = placing && !!previewCell && x >= previewCell.x && x < previewCell.x + previewWidth && y >= previewCell.y && y < previewCell.y + previewHeight;
                  const previewInvalid = previewCovered && (!floor || !(buyItem ? buyPreview?.save : retrievePreview?.save));
                  const isCurrentSelectedFixtureTile = fixture?.id === selectedId;

                  return (
                    <button
                      key={`${x}-${y}`}
                      type="button"
                      role="gridcell"
                      data-layout-cell={`${x},${y}`}
                      className={`layout-cell ${floor ? 'is-floor' : 'is-locked'} ${fixture ? 'has-fixture' : ''} ${isCurrentSelectedFixtureTile ? 'is-selected' : ''} ${retrieveId || buyItem ? 'is-drop-target' : ''} ${previewCovered ? (previewInvalid ? 'is-preview-invalid' : 'is-preview-valid') : ''}`}
                      aria-label={fixture ? `${catalogName(fixture)} tại ô ${x}, ${y}` : `Ô ${x}, ${y}${floor ? '' : ' chưa mở'}`}
                      onPointerEnter={() => { if (placing) setPreviewCell({ x, y }); }}
                      onClick={() => handleCellClick(x, y)}
                    >
                      {fixture ? null : floor ? '' : '×'}
                    </button>
                  );
                }))}

                {/* Fixture Art overlay */}
                <div className="layout-art" aria-hidden="true">
                  {draft.storeLayout.fixtures.filter(item => !item.parentId && !item.type.startsWith('warehouse_')).map(item => {
                    const { widthTiles: w, heightTiles: h } = getFixtureDimensions(item);
                    const turned = item.rotation === 90 || item.rotation === 270;
                    const isSel = item.id === selectedId;

                    return (
                      <div
                        key={item.id}
                        className={`layout-art-item ${isSel ? 'is-selected' : ''} ${isSel && selectMode === 'adjust' ? 'is-adjusting' : ''}`}
                        style={{
                          left: `${(item.tileX - 6) / 16 * 100}%`,
                          top: `${(item.tileY - 3) / 8 * 100}%`,
                          width: `${w / 16 * 100}%`,
                          height: `${h / 8 * 100}%`
                        }}
                      >
                        <div
                          className="layout-art-inner"
                          style={{
                            width: turned ? `${h / w * 100}%` : '100%',
                            height: turned ? `${w / h * 100}%` : '100%',
                            transform: `translate(-50%,-50%) rotate(${item.rotation}deg)`
                          }}
                        >
                          <FixtureArt type={item.type} shopId={shopIdOf(item)} doubleWide={item.widthTiles * item.heightTiles >= 2} />
                        </div>

                        {/* Tên kệ hiển thị khi được chọn */}
                        {isSel && (
                          <div className={`layout-nameplate ${selectMode === 'adjust' ? 'is-adjusting' : ''}`}>
                            <span className="nameplate-icon">{selectMode === 'adjust' ? '✥' : '🏷️'}</span>
                            <span className="nameplate-title">{catalogName(item)}</span>
                            {selectMode === 'adjust' && <span className="nameplate-tag">Di chuyển</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="board-landmark is-entrance">
                <span>🚪 Lối vào tiệm (khách đi vào từ đây)</span>
              </div>
            </div>

            {/* Error banner if any */}
            {error && <p className="layout-error" role="alert">⚠️ {error}</p>}

            {/* Inspector & Controller Panel */}
            <div className="layout-bottom-panel">
              {selected && selectedSize ? (
                <article className={`layout-inspector ${selectMode === 'adjust' ? 'is-adjust-mode' : 'is-inspect-mode'}`} aria-live="polite">
                  {/* Left: Fixture Icon & Main Information */}
                  <div className="layout-inspector-left">
                    <div className="layout-inspector-art">
                      <FixtureArt type={selected.type} shopId={shopIdOf(selected)} doubleWide={selected.widthTiles * selected.heightTiles >= 2} />
                    </div>
                    <div className="layout-inspector-info">
                      <div className="inspector-title-row">
                        <strong className="inspector-name">{catalogName(selected)}</strong>
                        <span className="inspector-badge">{selected.type === 'cashier_counter' ? 'Thu ngân' : selected.type === 'dining_table' ? 'Bàn ăn' : selected.type === 'kitchen_station' ? 'Trạm bếp' : 'Kệ bán hàng'}</span>
                        <span className="inspector-state-pill">{selectMode === 'adjust' ? 'Đang di chuyển' : 'Đã cố định'}</span>
                      </div>
                      <div className="inspector-details-row">
                        <span className="detail-tag">📐 {selectedSize.widthTiles}×{selectedSize.heightTiles} ô</span>
                        <span className="detail-tag">📍 Vị trí ({selected.tileX}, {selected.tileY})</span>
                        <span className="detail-tag">🔄 Góc {selected.rotation}°</span>
                      </div>
                      <p className="inspector-goods-line">
                        <span className="goods-label">Mặt hàng:</span>{' '}
                        <span className="goods-content">{fixtureGoods(draft.storeLayout.fixtures, selected)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Controller Buttons */}
                  {selectMode === 'adjust' ? (
                    /* TRẠNG THÁI DI CHUYỂN: HIỂN THỊ CÁC NÚT DI CHUYỂN (CÁC GÓC TRÊN MAP) + NÚT XOAY + NÚT ĐẶT XONG */
                    <div className="layout-inspector-controls">
                      <div className="dpad-box">
                        <span className="dpad-title">Nút di chuyển &amp; xoay</span>
                        <div className="layout-dpad-grid" role="group" aria-label="Điều khiển di chuyển">
                          <div className="dpad-empty" />
                          <button
                            type="button"
                            className="dpad-btn is-up"
                            disabled={!canMove(0, -1)}
                            aria-label="Dịch lên (Mũi tên lên)"
                            title="Dịch lên 1 ô"
                            onClick={() => nudge(0, -1)}
                          >▲</button>
                          <div className="dpad-empty" />

                          <button
                            type="button"
                            className="dpad-btn is-left"
                            disabled={!canMove(-1, 0)}
                            aria-label="Dịch trái (Mũi tên trái)"
                            title="Dịch trái 1 ô"
                            onClick={() => nudge(-1, 0)}
                          >◀</button>
                          <button
                            type="button"
                            className="dpad-btn is-rotate"
                            disabled={!canMove(0, 0, rotateStoreFixture(selected))}
                            aria-label="Xoay 90 độ (Phím R)"
                            title="Xoay 90 độ"
                            onClick={rotateSelected}
                          >↻</button>
                          <button
                            type="button"
                            className="dpad-btn is-right"
                            disabled={!canMove(1, 0)}
                            aria-label="Dịch phải (Mũi tên phải)"
                            title="Dịch phải 1 ô"
                            onClick={() => nudge(1, 0)}
                          >▶</button>

                          <div className="dpad-empty" />
                          <button
                            type="button"
                            className="dpad-btn is-down"
                            disabled={!canMove(0, 1)}
                            aria-label="Dịch xuống (Mũi tên xuống)"
                            title="Dịch xuống 1 ô"
                            onClick={() => nudge(0, 1)}
                          >▼</button>
                          <div className="dpad-empty" />
                        </div>
                        <span className="dpad-hint">Phím ↑ ↓ ← → | R: Xoay</span>
                      </div>

                      <div className="confirm-placement-box">
                        <PixelButton
                          variant="teal"
                          className="btn-finish-adjust"
                          onClick={finishAdjusting}
                        >
                          ✓ Đặt xong vị trí
                        </PixelButton>
                        <span className="finish-hint">Bấm xong sẽ trở về thông tin</span>
                      </div>
                    </div>
                  ) : (
                    /* TRẠNG THÁI HIỂN THỊ THÔNG TIN NỘI THẤT (INSPECT) */
                    <div className="layout-inspector-actions">
                      <PixelButton
                        variant="teal"
                        className="btn-move-again"
                        onClick={startAdjusting}
                      >
                        ✥ Di chuyển
                      </PixelButton>
                      <PixelButton
                        disabled={selected.type === 'cashier_counter'}
                        onClick={() => applyAction({ type: 'store', fixtureId: selected.id })}
                        title={selected.type === 'cashier_counter' ? 'Không thể cất quầy thu ngân' : 'Cất vào kho'}
                      >
                        📦 Cất kho
                      </PixelButton>
                      <PixelButton
                        className="btn-deselect"
                        onClick={() => { setSelectedId(null); setError(''); }}
                      >
                        ✕ Bỏ chọn
                      </PixelButton>
                    </div>
                  )}
                </article>
              ) : placing ? (
                <article className="layout-inspector is-placing-mode">
                  <div className="layout-inspector-left">
                    <div className="layout-inspector-art">
                      {buyItem && <FixtureArt type={buyItem.type} shopId={buyItem.id} />}
                      {retrieveFixture && <FixtureArt type={retrieveFixture.type} shopId={shopIdOf(retrieveFixture)} doubleWide={retrieveFixture.widthTiles * retrieveFixture.heightTiles >= 2} />}
                    </div>
                    <div className="layout-inspector-info">
                      <div className="inspector-title-row">
                        <strong className="inspector-name">{buyItem ? buyItem.name : retrieveFixture ? catalogName(retrieveFixture) : ''}</strong>
                        <span className="inspector-badge">{buyItem ? 'Mua mới' : 'Kho cất'}</span>
                      </div>
                      <p className="inspector-goods-line">Chạm vào một ô sàn màu vàng trên bản đồ để đặt món vào tiệm.</p>
                    </div>
                  </div>
                  <div className="layout-inspector-actions">
                    <PixelButton onClick={() => { setBuyId(null); setRetrieveId(null); setPreviewCell(null); setError(''); }}>
                      ✕ Hủy đặt
                    </PixelButton>
                  </div>
                </article>
              ) : (
                <article className="layout-inspector is-idle-mode">
                  <div className="idle-content">
                    <span className="idle-badge">💡 Hướng dẫn</span>
                    <p>Bấm vào bất kỳ kệ hàng nào trong tiệm: <strong>lần đầu bấm sẽ hiện tên kệ và các nút di chuyển (các góc trên map) cùng nút xoay</strong>. Sau khi căn chỉnh đúng chỗ, bấm <strong>&quot;Đặt xong vị trí&quot;</strong> để trở về xem thông tin chi tiết nội thất.</p>
                  </div>
                </article>
              )}
            </div>
          </div>

          {/* Right Sidebar: Shop / Decor / Stored / Plots */}
          <aside className="layout-sidebar">
            <nav className="layout-tabs" aria-label="Danh mục bên phải">
              <button type="button" className={tab === 'shop' ? 'is-active' : ''} onClick={() => setTab('shop')}>
                🛒 Kệ hàng
              </button>
              <button type="button" className={tab === 'decor' ? 'is-active' : ''} onClick={() => setTab('decor')}>
                🎨 Trang trí
              </button>
              <button type="button" className={tab === 'stored' ? 'is-active' : ''} onClick={() => setTab('stored')}>
                📦 Kho{stored.length ? ` (${stored.length})` : ''}
              </button>
              <button type="button" className={tab === 'plots' ? 'is-active' : ''} onClick={() => setTab('plots')}>
                🚩 Mở đất
              </button>
            </nav>

            <div className="sidebar-tab-content">
              {tab === 'shop' && (
                <div className="layout-fixtures layout-shop">
                  {FIXTURE_SHOP.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={`shop-card ${item.id === buyId ? 'is-selected' : ''}`}
                      disabled={!item.functional || draft.player.level < item.unlockLevel || (draft.player.money < item.cost && item.id !== buyId)}
                      onClick={() => {
                        setBuyId(item.id === buyId ? null : item.id);
                        setSelectedId(null);
                        setRetrieveId(null);
                        setError(item.id === buyId ? '' : 'Chọn ô sàn để đặt món mới.');
                      }}
                    >
                      <span className="shop-art"><FixtureArt type={item.type} shopId={item.id} /></span>
                      <strong className="shop-card-name">{item.name}</strong>
                      <small className="shop-card-info">
                        {item.functional ? `${item.widthTiles}×${item.heightTiles} ô · ${item.slotCount} khay` : `${item.widthTiles}×${item.heightTiles} ô`}
                      </small>
                      <span className={`shop-price ${item.functional && draft.player.level >= item.unlockLevel ? '' : 'is-locked'}`}>
                        {draft.player.level < item.unlockLevel ? `Cần Lv ${item.unlockLevel}` : !item.functional ? 'Sắp có' : `${item.cost.toLocaleString('vi-VN')} đ`}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {tab === 'decor' && (
                <div className="sidebar-decor-section">
                  <div className="decor-banner">
                    <span>Điểm thu hút: <strong>{attraction}/100</strong></span>
                    <small>Khách đông thêm +{Math.round((decorTrafficMultiplier(attraction) - 1) * 100)}%</small>
                  </div>
                  <div className="layout-fixtures layout-shop">
                    {DECOR.filter(item => item.slot !== 'floor' && !item.exclusive).map(item => {
                      const have = (draft.storeLayout.decorOwned ?? []).includes(item.id);
                      const locked = draft.player.level < item.unlockLevel;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className="shop-card"
                          disabled={have || locked || draft.player.money < item.cost}
                          onClick={() => applyAction({ type: 'buy_decor', decorId: item.id })}
                        >
                          <span className="shop-art decor-icon" aria-hidden="true">{item.icon}</span>
                          <strong className="shop-card-name">{item.name}</strong>
                          <small className="shop-card-info">+{item.attraction} thu hút · {item.slot === 'sign' ? 'biển hiệu' : item.slot === 'wall' ? 'treo tường' : 'quầy'}</small>
                          <span className={`shop-price ${have || locked ? 'is-locked' : ''}`}>
                            {have ? 'Đã có' : locked ? `Cần Lv ${item.unlockLevel}` : `${item.cost.toLocaleString('vi-VN')} đ`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {tab === 'stored' && (
                <div className="layout-fixtures layout-stored-list">
                  {stored.length ? stored.map(fixture => (
                    <button
                      key={fixture.id}
                      type="button"
                      className={`stored-item-card ${retrieveId === fixture.id ? 'is-selected' : ''}`}
                      onClick={() => {
                        setRetrieveId(fixture.id);
                        setSelectedId(null);
                        setBuyId(null);
                        setError('Chọn ô sàn để đặt lại nội thất.');
                      }}
                    >
                      <span className="fixture-row">
                        <FixtureArt type={fixture.type} shopId={shopIdOf(fixture)} doubleWide={fixture.widthTiles * fixture.heightTiles >= 2} className="fx-thumb" />
                        <span className="stored-item-info">
                          <strong>{catalogName(fixture)}</strong>
                          <small>{fixture.widthTiles}×{fixture.heightTiles} ô · Chạm ô sàn để đặt</small>
                        </span>
                      </span>
                    </button>
                  )) : (
                    <div className="stored-empty-state">
                      <span className="empty-icon">📦</span>
                      <p>Chưa có nội thất nào trong kho.</p>
                      <small>Kệ cất kho sẽ hiển thị ở đây để đặt lại khi cần.</small>
                    </div>
                  )}
                </div>
              )}

              {tab === 'plots' && (
                <div className="layout-plots-section">
                  <p className="plots-heading-help">Mở rộng thêm diện tích mặt bằng sang hướng đông để bày thêm kệ.</p>
                  <div className="plots-card-list">
                    {LAND_PLOTS.map(plot => {
                      const unlocked = owned.has(plot.id);
                      const blocked = draft.player.level < plot.level || (plot.prerequisitePlotId && !owned.has(plot.prerequisitePlotId)) || draft.player.money < plot.cost;
                      return (
                        <article key={plot.id} className={`layout-plot-card ${unlocked ? 'is-owned' : ''}`}>
                          <div className="plot-card-header">
                            <strong className="plot-card-name">{plot.name}</strong>
                            <span className="plot-card-dim">+4 cột ô sàn</span>
                          </div>
                          <div className="plot-card-meta">
                            <span className={`plot-req-badge ${draft.player.level >= plot.level ? 'is-met' : 'is-unmet'}`}>
                              Lv {plot.level}
                            </span>
                            <span className="plot-cost-badge">
                              {plot.cost.toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                          <div className="plot-card-action">
                            {unlocked ? (
                              <span className="plot-owned-tag">✓ Đã mở mặt bằng</span>
                            ) : (
                              <PixelButton
                                variant="teal"
                                disabled={busy || !!blocked}
                                onClick={() => applyAction({ type: 'buy_plot', plotId: plot.id })}
                              >
                                Mở khu này
                              </PixelButton>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="layout-footer">
          <div className="footer-summary">
            <span className="draft-badge">📝 {actions.length} thay đổi trong bản nháp</span>
          </div>
          <div className="footer-actions">
            <PixelButton disabled={!actions.length || busy} onClick={undo}>
              ↺ Hoàn tác
            </PixelButton>
            <PixelButton disabled={busy} onClick={onClose}>
              ✕ Hủy
            </PixelButton>
            <PixelButton variant="teal" disabled={busy || !actions.length} onClick={() => void confirm()}>
              {busy ? 'Đang lưu…' : '✓ Áp dụng bố cục'}
            </PixelButton>
          </div>
        </footer>
      </section>
    </div>
  );
};
