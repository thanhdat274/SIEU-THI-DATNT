import React, { useEffect, useState } from 'react';
import { BUILDING_TYPES, BUILDING_TYPE_DEFS, CIVIC_DEFS, DISTRICTS, RECLAMATION_WAVES, buildingTypeOfInstance, cityTierFrom, parcelLandValueMultiplier, parcelPrice, parcelTrafficMultiplier, districtForWave, type LandParcel } from '@game/data';
import type { WorldOpenState } from '@game/shared';
import { PixelButton, PixelDialog, money } from './pixel';

export interface Props {
  world: WorldOpenState;
  ownedParcelIds: readonly string[];
  /** Lô đã có tòa → id loại tòa (`getOccupiedParcelBuildings`). */
  builtParcels: Readonly<Record<string, string>>;
  playerLevel: number;
  playerMoney: number;
  day: number;
  buildingCount: number;
  onReclaim: (waveId: string) => void | Promise<void>;
  /** Đợt khai hoang đầu tiên còn có thể mở: App dùng để báo bạn cùng hẻm đang xem đợt này (giữ chỗ quy hoạch). */
  /** Nhật ký đất của hẻm chung (mới nhất trước), có tên người làm; undefined khi chơi một mình. */
  journal?: Array<{ id: string; who: string; description: string; at: string }>;
  onPlanningWave?: (waveId: string | null) => void;
  onBuyParcel: (parcelId: string) => void | Promise<void>;
  /** Chỉ số sống theo khu (`getCivicQol`), districtId → 0..100. */
  civicQol?: Readonly<Record<string, number>>;
  /** Dân số xóm theo QoL (OpenSpec `civic-population-demand`), districtId → { pop, target, factor }. */
  civicPopulation?: Readonly<Record<string, { pop: number; target: number; factor: number }>>;
  /** Vị trí các tòa đã đặt (để liệt kê công trình công cộng). */
  placements?: readonly { buildingId: string; parcelId: string }[];
  /** Lô trống có thể xây (lô W0 trống + lô đã sở hữu chưa có tòa). */
  buildableParcelIds?: readonly string[];
  /** Chi phí xóm/ngày (OpenSpec `civic-local-fees`): duy trì theo tòa, phí xóm theo lô sở hữu. */
  civicCosts?: { upkeepByBuilding: Readonly<Record<string, number>>; feeByParcel: Readonly<Record<string, number>>; totalUpkeep: number; totalFee: number };
  /** Phí xóm từng lô sở hữu kèm QoL khu của lô (để giải thích con số). */
  civicFeeByParcel?: ReadonlyArray<{ parcelId: string; districtId: string; qol: number; fee: number }>;
  /** Mở bảng góp vốn xây công trình trên một lô. */
  onBuildOnParcel?: (parcelId: string) => void;
  onClose: () => void;
}

const SERVICE_LABEL: Record<string, string> = { green: 'Cây xanh', health: 'Y tế', safety: 'An ninh', education: 'Giáo dục' };

const CORNER_LABEL = ['', 'Góc ngã tư'];
const ROAD_LABEL: Record<string, string> = { main: 'đường chính', south: 'đường nam' };

/** Bảng "Thành phố" (land-reclamation 4.3): cấp thành phố, các đợt khai hoang (khóa/đang thi công/mở) và mua lô. */
export const CityModal: React.FC<Props> = ({ world, ownedParcelIds, builtParcels, playerLevel, playerMoney, day, buildingCount, onReclaim, journal, onPlanningWave, onBuyParcel, civicQol, civicPopulation, placements = [], buildableParcelIds = [], civicCosts, civicFeeByParcel, onBuildOnParcel, onClose }) => {
  const [tab, setTab] = useState<'land' | 'civic'>('land');
  const tier = cityTierFrom(world.openedWaves, buildingCount);
  const waves = RECLAMATION_WAVES.filter(wave => wave.id !== 'w0');
  const nextWaveId = waves.find(wave => !world.openedWaves.includes(wave.id) && world.wavesUnderConstruction[wave.id] === undefined)?.id ?? null;
  useEffect(() => {
    onPlanningWave?.(nextWaveId);
    return () => onPlanningWave?.(null);
  }, [nextWaveId, onPlanningWave]);
  const buildingName = (buildingId: string): string => BUILDING_TYPES.find(def => def.id === buildingId)?.name ?? buildingId;
  return <PixelDialog icon="star" title="Thành phố" subtitle={`Cấp thành phố ${tier} · ${world.openedWaves.length - 1}/${waves.length} đợt khai hoang`} onClose={onClose}>
    <div className="feature-scroll-tabs" role="tablist" style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
      <PixelButton role="tab" aria-selected={tab === 'land'} variant={tab === 'land' ? 'teal' : 'wood'} style={{ minHeight: 44 }} onClick={() => setTab('land')}>Khai hoang</PixelButton>
      <PixelButton role="tab" aria-selected={tab === 'civic'} variant={tab === 'civic' ? 'teal' : 'wood'} style={{ minHeight: 44 }} onClick={() => setTab('civic')} data-city-tab="civic">Xóm phố</PixelButton>
    </div>
    {tab === 'civic' && <CivicPanel civicQol={civicQol} civicPopulation={civicPopulation} placements={placements} buildableParcelIds={buildableParcelIds} civicCosts={civicCosts} civicFeeByParcel={civicFeeByParcel} onBuildOnParcel={onBuildOnParcel} />}
    {tab === 'land' && <>
    <p className="muted" style={{ margin: '0 0 8px' }}>Mở đợt để có đất mới, rồi mua lô để đặt tòa. Lô góc ngã tư đắt hơn nhưng đông khách hơn.</p>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
      {waves.map(wave => {
        const opened = world.openedWaves.includes(wave.id);
        const doneDay = world.wavesUnderConstruction[wave.id];
        const building = doneDay !== undefined;
        const lowLevel = playerLevel < wave.unlockLevel;
        const poor = playerMoney < wave.cost;
        // Đợt có `connectedVia` (W4): chưa có đợt nối nào đã mở thì khách không tới được, nên khóa đến khi có.
        const notConnected = !!wave.connectedVia && !wave.connectedVia.some(id => world.openedWaves.includes(id));
        const linkLabel = (wave.connectedVia ?? []).map(id => `Đợt ${id.slice(1)}`).join(' hoặc ');
        const status = opened ? '✓ Đã mở' : building ? `🚧 Đang thi công · còn ${Math.max(0, doneDay - day)} ngày` : notConnected ? `🔒 Cần mở ${linkLabel} trước (đường nối)` : lowLevel ? `🔒 Cần cấp ${wave.unlockLevel}` : 'Sẵn sàng khai hoang';
        return <li key={wave.id} className="pixel-panel" style={{ padding: 10 }} data-wave={wave.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <strong>Đợt {wave.id.slice(1)} · {wave.parcels.length} lô</strong>
            <span className="muted">{status}</span>
          </div>
          {!opened && !building && <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Chi phí {money(wave.cost)} · thi công {wave.constructionDays} ngày</span>
            <PixelButton variant="teal" disabled={notConnected || lowLevel || poor} onClick={() => onReclaim(wave.id)}>{notConnected ? 'Chưa nối đường' : lowLevel ? `Cần cấp ${wave.unlockLevel}` : poor ? 'Thiếu tiền' : 'Khai hoang'}</PixelButton>
          </div>}
          {opened && <details style={{ marginTop: 6 }} open>
            <summary>Các lô của đợt</summary>
            <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
              {wave.parcels.map(raw => {
                const districtId = RECLAMATION_WAVES.indexOf(wave) === 0 ? 'hem_dan_cu' : districtForWave(wave.id as 'w1' | 'w2' | 'w3' | 'w4');
                const parcel: LandParcel = { id: raw.id, rect: raw.rect, wave: RECLAMATION_WAVES.indexOf(wave), frontageRoadId: raw.frontageRoadId ?? wave.frontageRoadId, districtId, frontage: { corner: raw.corner ?? false } };
                const owned = ownedParcelIds.includes(raw.id);
                const price = parcelPrice(parcel);
                return <div key={raw.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>
                    <strong>{raw.id}</strong>{raw.corner ? ` · ${CORNER_LABEL[1]}` : ''} · {ROAD_LABEL[raw.frontageRoadId ?? wave.frontageRoadId] ?? 'mặt đường'}
                    <br/><span className="muted">Khách ×{parcelTrafficMultiplier(parcel)} · giá đất ×{parcelLandValueMultiplier(parcel)}</span>
                    {owned && <><br/><span>{builtParcels[raw.id] ? `🏪 Có tòa: ${buildingName(builtParcels[raw.id])}` : 'Đất trống — chưa đặt tòa'}</span></>}
                  </span>
                  {owned ? <span>✓ Đã sở hữu</span> : <PixelButton variant="teal" disabled={playerMoney < price} onClick={() => onBuyParcel(raw.id)}>Mua {money(price)}</PixelButton>}
                </div>;
              })}
            </div>
          </details>}
        </li>;
      })}
    </ul>
    </>}
    {journal && <details style={{ marginTop: 10 }} data-city-journal>
      <summary>Nhật ký thành phố ({journal.length})</summary>
      {journal.length === 0 ? <p className="muted">Chưa có hoạt động đất nào.</p> : <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'grid', gap: 4, fontSize: 12 }}>
        {journal.map(entry => <li key={entry.id}><strong>{entry.who}</strong> · {entry.description} <span className="muted">· {entry.at}</span></li>)}
      </ul>}
    </details>}
  </PixelDialog>;
};

/** Tab "Xóm phố" (civic-population-demand + civic-buildings-qol + civic-local-fees): dân số, chỉ số sống, công trình + phí, lô trống. */
const CivicPanel: React.FC<{ civicQol?: Readonly<Record<string, number>>; civicPopulation?: Readonly<Record<string, { pop: number; target: number; factor: number }>>; placements: readonly { buildingId: string; parcelId: string }[]; buildableParcelIds: readonly string[]; civicCosts?: { upkeepByBuilding: Readonly<Record<string, number>>; feeByParcel: Readonly<Record<string, number>>; totalUpkeep: number; totalFee: number }; civicFeeByParcel?: ReadonlyArray<{ parcelId: string; districtId: string; qol: number; fee: number }>; onBuildOnParcel?: (parcelId: string) => void }> = ({ civicQol = {}, civicPopulation = {}, placements, buildableParcelIds, civicCosts, civicFeeByParcel = [], onBuildOnParcel }) => {
  const civic = placements.flatMap(p => {
    const typeId = buildingTypeOfInstance(p.buildingId)?.typeId;
    const def = CIVIC_DEFS.find(c => c.buildingTypeId === typeId);
    return def && typeId ? [{ ...p, typeId, def }] : [];
  });
  return <div data-civic-panel>
    <p className="muted" style={{ margin: '0 0 8px' }}>Công trình công cộng giúp xóm tốt lên → dân số tăng → nhiều khách hơn. Hệ số khách từ 0,85 đến 1,25.</p>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
      {Object.values(DISTRICTS).map(district => {
        const qol = Math.round(civicQol[district.id] ?? 0);
        const pop = civicPopulation[district.id];
        const factor = pop?.factor ?? 1;
        const target = pop?.target ?? 0;
        // Xu hướng: dân số tiến về mục tiêu mỗi ngày — dưới mục tiêu thì đang tăng, trên thì đang giảm.
        const arrow = !pop || target <= 0 || pop.pop === target ? '' : pop.pop < target ? '▲' : '▼';
        return <li key={district.id} className="pixel-panel" style={{ padding: 8 }} data-district-qol={district.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            <strong>{district.name}</strong>
            <span>{target <= 0 ? <span className="muted">Chưa khai hoang</span> : <>Dân số <strong>{Math.round(pop?.pop ?? 0)}</strong> / {Math.round(target)}</>} {arrow && <span title={arrow === '▲' ? 'Đang tăng' : 'Đang giảm'} style={{ color: arrow === '▲' ? 'var(--teal)' : 'var(--brick)', fontWeight: 'bold' }}>{arrow}</span>} · hệ số <strong>{factor.toFixed(2)}</strong></span>
          </div>
          <div aria-hidden style={{ height: 8, background: 'rgba(0,0,0,0.12)', marginTop: 4 }}><div style={{ width: `${qol}%`, height: '100%', background: 'var(--teal)' }}/></div>
          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>QoL {qol}/100</div>
        </li>;
      })}
    </ul>
    <h4 style={{ margin: '12px 0 6px' }}>Công trình đã xây ({civic.length})</h4>
    {civicCosts && (
      <p className="muted" style={{ margin: '0 0 6px', fontSize: 12 }} data-civic-costs-summary>
        Mỗi ngày: duy trì công trình <strong>{money(civicCosts.totalUpkeep)}</strong> + phí xóm <strong>{money(civicCosts.totalFee)}</strong> (chỉ lô sở hữu; QoL cao thì phí giảm).
      </p>
    )}
    {civic.length === 0 ? <p className="muted" style={{ margin: 0 }}>Chưa có công trình công cộng nào.</p> : <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4 }}>
      {civic.map(c => {
        const upkeep = civicCosts?.upkeepByBuilding[c.buildingId] ?? c.def.upkeepPerDay;
        const parcelFee = civicCosts?.feeByParcel[c.parcelId] ?? 0;
        return <li key={c.buildingId} data-civic-building={c.buildingId}>
          🏛 <strong>{BUILDING_TYPE_DEFS[c.typeId as keyof typeof BUILDING_TYPE_DEFS]?.name ?? c.typeId}</strong> · {SERVICE_LABEL[c.def.service] ?? c.def.service} · lô {c.parcelId} · bán kính {c.def.radiusTiles} ô
          <br/><span className="muted">Duy trì {money(upkeep)}/ngày{parcelFee > 0 ? ` · phí xóm lô ${money(parcelFee)}/ngày` : ''}</span>
        </li>;
      })}
    </ul>}
    {civicCosts && Object.keys(civicCosts.feeByParcel).length > 0 && <>
      <h4 style={{ margin: '12px 0 6px' }}>Phí xóm theo lô sở hữu</h4>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4 }} data-civic-fee-parcels>
        {(civicFeeByParcel.length > 0 ? civicFeeByParcel : Object.entries(civicCosts.feeByParcel).map(([parcelId, fee]) => ({ parcelId, qol: 0, fee }))).map(line => (
          <li key={line.parcelId}>Lô <strong>{line.parcelId}</strong> · QoL khu {Math.round(line.qol)}/100 · {money(line.fee)}/ngày</li>
        ))}
      </ul>
      <p className="muted" style={{ margin: '4px 0 0', fontSize: 11 }}>Lô thuê không thu phí xóm (đã trả tiền thuê đất). QoL khu càng cao, phí càng giảm (tối đa −30%).</p>
    </>}
    <h4 style={{ margin: '12px 0 6px' }}>Lô trống có thể xây</h4>
    {buildableParcelIds.length === 0 ? <p className="muted" style={{ margin: 0 }}>Không còn lô trống. Mua thêm lô ở tab Khai hoang.</p> : <div style={{ display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))' }}>
      {buildableParcelIds.map(id => <PixelButton key={id} variant="teal" style={{ minHeight: 44, width: '100%', whiteSpace: 'normal' }} disabled={!onBuildOnParcel} onClick={() => onBuildOnParcel?.(id)}>Góp vốn xây · {id}</PixelButton>)}
    </div>}
  </div>;
};
