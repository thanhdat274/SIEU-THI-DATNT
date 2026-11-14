import { useGame } from '../../core/store';
import { machineDayLine, idleMachineHint, clawWinLine } from '../../data/machines';
import { buyHomeItem, buyService, buyPet, buyUpgrade, buyVehicle, feedPet } from '../../core/biz';
import { hasUpgrade, UPGRADES } from '../../data/upgrades';
import { Callout } from './shared';
import { EquipmentSection } from './EquipmentSection';
import { BREAKFAST, HOME_ITEMS, petActive, PETS, VEHICLES } from '../../data/biz';
import { formatMoney, productById } from '../../data/products';
import { shortLabel } from '../shortLabel';
import { BILL_RUSH_DAYS, dayOfMonth, SERVICE_BUY_ALONG, SERVICES } from '../../data/services';
import { roiOf } from '../../data/serviceRoi';
import { catPayoff, dogPayoff, CAT_PITCH_MIN } from '../../data/petPayoff';
import { theftRisk, THEFT_LEAK_HIGH, THEFT_LEAK_MODERATE, THEFT_UNLOCK } from '../../data/theftRisk';
import { maintenancePayoff, MAINT_RISK_HIGH, MAINT_RISK_MODERATE, MAINT_UNLOCK } from '../../data/maintenancePayoff';
import { posPayoff, POS_RISK_HIGH, POS_RISK_MODERATE, POS_UNLOCK } from '../../data/posPayoff';
import { avgPerVisit } from '../../data/repMoney';
import { brokenShelfLoss } from '../../data/brokenShelfLoss';
import { itemHealthList, shelfCount } from '../../data/analytics';
import { card, title, pill, iconTile, btn, sub, row } from './businessStyles';
import { t } from '../../core/i18n';

export function Pets() {
  const { biz, day, level, storage, analytics, riskTrend } = useGame();
  // GĐ157: "Con này đáng bữa cơm không?" — quy công nuôi ra tiền, đối chiếu tiền thức ăn (thuần đọc).
  const cat = catPayoff(analytics, biz.pets, day, storage);
  const dog = dogPayoff(riskTrend);
  return (
    <>
      {PETS.map((p) => {
        const pet = biz.pets[p.kind];
        const fed = petActive(pet, day);
        return (
          <div key={p.kind} style={card}>
            <div style={row}>
              <b>{p.icon} {p.name}</b>
              {!pet ? (level < p.unlock ? <span style={sub}>{t('panels_misc.cap')}{' '}{p.unlock}</span> : <button style={btn} onClick={() => buyPet(p.kind)}>{t('panels_misc.nuoi')}{' '}{formatMoney(p.price)}</button>)
                : <button style={btn} disabled={pet.fedDay === day} onClick={() => feedPet(p.kind)}>{pet.fedDay === day ? t('panels_misc.da_cho_an') : t('panels_misc.cho_an')}</button>}
            </div>
            <div style={sub}>{p.desc}</div>
            {pet && (
              <div style={{ fontSize: 12, marginTop: 2, color: fed ? '#2ecc71' : '#e67e22' }}>
                {fed ? t('panels_misc.no_bung_dang_lam_viec') : t('panels_misc.doi_khong_chiu_lam_viec')}{' '}{t('panels_misc.kho_con')}{' '}{storage[p.food] ?? 0} {productById(p.food).name}{' '}{t('panels_misc.khong_co_thi_mua_le_gia')}
              </div>
            )}
            {/* GĐ157: payoff thú cưng — số tiền là ƯỚC từ sổ hỏng hàng / sổ rủi ro có sẵn. */}
            {p.kind === 'cat' && pet && cat.verdict !== 'nothing-spoiled' && (
              <div style={{ fontSize: 12, marginTop: 4, borderTop: '1px dashed rgba(255,255,255,0.12)', paddingTop: 4 }}>
                <div>
                  {t('panels_misc.hom_qua_cuu')}{' '}<b>~{formatMoney(cat.savedYesterday)}</b>{' '}{t('panels_misc.hang_hong_bua_com_hom_nay')}{formatMoney(cat.foodCostToday)} →{' '}
                  <b style={{ color: cat.savedYesterday >= cat.foodCostToday ? '#2ecc71' : '#e67e22' }}>
                    {cat.savedYesterday >= cat.foodCostToday ? t('panels_misc.dang_loi', { v0: formatMoney(cat.savedYesterday - cat.foodCostToday) }) : t('panels_misc.dang_lo', { v0: formatMoney(cat.foodCostToday - cat.savedYesterday) })}
                  </b>
                </div>
                <div style={{ marginTop: 2 }}>
                  {t('panels_misc.7_ngay_cuu')}{' '}<b>~{formatMoney(cat.savedWeek)}</b> —{' '}
                  {cat.verdict === 'saved' && <b style={{ color: '#2ecc71' }}>{t('panels_misc.loi')}{formatMoney(cat.savedWeek - cat.foodWeek)}</b>}
                  {cat.verdict === 'breakeven' && <b style={{ color: '#f1c40f' }}>{t('panels_misc.vua_du_an')}</b>}
                  {cat.verdict === 'losing' && <b style={{ color: '#e67e22' }}>{t('panels_misc.lo_com')}{formatMoney(cat.foodWeek - cat.savedWeek)}</b>}
                  {' '}{t('panels_misc.thuc_an')}{formatMoney(cat.foodWeek)}).
                </div>
                {!fed && <div style={{ color: '#e67e22', marginTop: 2 }}>{t('panels_misc.doi_1_ngay_mat_cong_dung')}</div>}
              </div>
            )}
            {p.kind === 'cat' && pet && cat.verdict === 'nothing-spoiled' && (
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {t('panels_misc.7_ngay_qua_kho_sach_khong')}{formatMoney(cat.foodCostToday)}{t('panels_misc.ngay')}
              </div>
            )}
            {p.kind === 'cat' && !pet && cat.weekSpoilCost >= CAT_PITCH_MIN && (
              <Callout tone="danger" strong style={{ marginTop: 4 }}>
                <div style={{ fontSize: 12 }}>
                  {t('panels_misc.tuan_nay_hang_hong')}{' '}<b>~{formatMoney(cat.weekSpoilCost)}</b>{' '}{t('panels_misc.nuoi_meo_cuu_duoc_1_4')}{formatMoney(Math.round(cat.weekSpoilCost * 0.25))}{t('panels_misc.voi')}{formatMoney(cat.foodCostToday)}{t('panels_misc.ngay_thuc_an')}
                </div>
              </Callout>
            )}
            {p.kind === 'dog' && pet && dog.days > 0 && dog.weekBlocked > 0 && (
              <div style={{ fontSize: 12, marginTop: 4, borderTop: '1px dashed rgba(255,255,255,0.12)', paddingTop: 4 }}>
                {t('panels_misc.tuan_nay_chan_thu_lai')}{' '}<b>~{formatMoney(dog.weekBlocked)}</b> trộm & tiền giả.
                <div style={{ ...sub, marginTop: 2 }}>{t('panels_misc.so_rui_ro_chung_ca_tiem')}</div>
              </div>
            )}
            {p.kind === 'dog' && pet && dog.days > 0 && dog.weekBlocked <= 0 && dog.weekLeak > 0 && (
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {t('panels_misc.tuan_nay_lot')}{' '}<b>~{formatMoney(dog.weekLeak)}</b>{t('panels_misc.chua_chan_duoc_gi_cho_giu')}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/** Dịch vụ ở quầy: mua thiết bị một lần, khách ghé dùng dịch vụ và hay mua kèm. */
export function Services() {
  const { biz, level, day, stats, furniture, minutes } = useGame();
  const owned = biz.services ?? [];
  return (
    <>
      <div style={card}>
        <b>{t('panels_misc.dich_vu_o_quay')}</b>
        <div style={sub}>
          {t('panels_misc.khong_can_ke_khach_di_thang')}{' '}{Math.round(SERVICE_BUY_ALONG * 100)}{t('panels_misc.khach_tien_tay_mua_kem_1')}
        </div>
        <div style={{ fontSize: 12, marginTop: 4 }}>{t('panels_misc.hom_nay_loi_tu_dich_vu')}{' '}<b>{formatMoney(stats.services ?? 0)}</b></div>
        {machineDayLine(stats.byService) && <div style={{ fontSize: 12, marginTop: 2 }}>{machineDayLine(stats.byService)}</div>}
        {clawWinLine(stats.clawWins) && <div style={{ fontSize: 12, marginTop: 2 }}>{clawWinLine(stats.clawWins)}</div>}
        {idleMachineHint(furniture, stats.byService, minutes) && <div style={{ fontSize: 12, marginTop: 2, opacity: 0.8 }}>{idleMachineHint(furniture, stats.byService, minutes)}</div>}
      </div>
      {SERVICES.map((sv) => (
        <div key={sv.id} style={{ ...card, opacity: level < sv.unlock ? 0.5 : 1 }}>
          <div style={row}>
            <b>{sv.icon} {sv.name}</b>
            {owned.includes(sv.id) ? <span style={{ ...sub, color: '#2ecc71' }}>{t('panels_misc.dang_chay')}</span>
              : level < sv.unlock ? <span style={sub}>{t('panels_misc.cap')}{' '}{sv.unlock}</span>
                : <button style={btn} onClick={() => buyService(sv.id)}>{t('panels_misc.mo')}{' '}{formatMoney(sv.price)}</button>}
          </div>
          <div style={sub}>{sv.desc}</div>
          {owned.includes(sv.id) && (() => {
            const roi = roiOf(sv, biz.serviceLife, stats.byService);
            const goal = roi.paidBack
              ? <span style={{ color: '#2ecc71' }}>{t('panels_misc.da_hoan_von')}</span>
              : <span style={{ color: '#f1c40f' }}>{t('panels_misc.con_kem')}{' '}{formatMoney(roi.deficit)}{' '}{t('panels_misc.nua_la_hoan_von')}{roi.daysToRecoup ? t('panels_misc.ngay_theo_nhip_hom_nay', { daysToRecoup: roi.daysToRecoup }) : ''}</span>;
            return (
              <div style={{ fontSize: 12, marginTop: 2 }}>
                {t('panels_misc.da_loi')}{' '}{formatMoney(roi.life)}{' '}{t('panels_misc.hom_nay')}{' '}{roi.today >= 0 ? '+' : ''}{formatMoney(roi.today)} · {goal}
              </div>
            );
          })()}
          {sv.id === 'bills' && (
            <div style={{ fontSize: 12, marginTop: 2 }}>
              {t('panels_misc.hom_nay_ngay')}{' '}{dayOfMonth(day)}{' '}{t('panels_misc.trong_thang')}{dayOfMonth(day) <= BILL_RUSH_DAYS ? t('panels_misc.dau_thang_khach_dong_tien_dong') : t('panels_misc.dot_dong_toi_sau_ngay', { v0: 30 - dayOfMonth(day) + 1 })}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export function Life() {
  const { biz, level, day } = useGame();
  return (
    <>
      <div style={card}>
        <b>{t('panels_misc.sam_do_cho_nha_rieng')}</b>
        <div style={sub}>{t('panels_misc.nha_dep_ngu_ngon_moi_mon')}</div>
        {HOME_ITEMS.map((h) => (
          <div key={h.id} style={{ ...row, marginTop: 4, opacity: level < h.unlock ? 0.5 : 1 }}>
            <span>{h.icon} {h.name} <span style={sub}>+{Math.round(h.rest * 100)}{t('panels_misc.toc_do')}</span></span>
            {biz.home.includes(h.id) ? <span style={{ ...sub, color: '#2ecc71' }}>{t('panels_misc.da_co')}</span>
              : level < h.unlock ? <span style={sub}>{t('panels_misc.cap')}{' '}{h.unlock}</span>
                : <button style={btn} onClick={() => buyHomeItem(h.id)}>{formatMoney(h.price)}</button>}
          </div>
        ))}
      </div>
      <div style={card}>
        <b>{t('panels_misc.bua_sang')}</b>
        <div style={sub}>{t('panels_misc.buoc_toi_canh_tu_dau_giuong')}{formatMoney(BREAKFAST.price)}{t('panels_misc.truoc_11_00_di_nhanh_hon')}{' '}{Math.round(BREAKFAST.speed * 100)}{t('panels_misc.ca_ngay_thuc_khuya_them')}{' '}{BREAKFAST.lateMinutes}{' '}{t('panels_misc.phut_moi_ngat')}</div>
        <div style={{ fontSize: 12, marginTop: 2 }}>{biz.breakfastDay === day ? t('panels_misc.sang_nay_da_an') : t('panels_misc.hom_nay_chua_an')}</div>
      </div>
      <div style={card}>
        <b>{t('panels_misc.xe_co')}</b>
        <div style={sub}>{t('panels_misc.ngoai_duong_di_nhanh_hon_nut')}</div>
        {VEHICLES.map((v) => (
          <div key={v.id} style={{ ...row, marginTop: 4, opacity: level < v.unlock ? 0.5 : 1 }}>
            <span>{v.icon} {v.name} <span style={sub}>+{Math.round(v.speed * 100)}{t('panels_misc.ngoai_duong_di_lai_con')}{' '}{Math.round(v.travel * 100)}{t('panels_misc.thoi_gian')}</span></span>
            {biz.vehicle === v.id || (biz.vehicle === 'moto' && v.id === 'bike') ? <span style={{ ...sub, color: '#2ecc71' }}>{t('panels_misc.da_co')}</span>
              : level < v.unlock ? <span style={sub}>{t('panels_misc.cap')}{' '}{v.unlock}</span>
                : <button style={btn} onClick={() => buyVehicle(v.id)}>{formatMoney(v.price)}</button>}
          </div>
        ))}
      </div>
    </>
  );
}

/** Tab nâng cấp: thiết bị mua một lần dùng vĩnh viễn. */
export function Upgrades() {
  const { level, money, biz, stats, day, furniture, analytics, storage, demand } = useGame();
  return (
    <>
      <div style={{ ...card, marginBottom: 8 }}>
        <b>{t('panels_misc.thiet_bi_cua_tiem')}</b>
        <div style={sub}>{t('panels_misc.thiet_bi_nau_nang_duoc_nhieu')}</div>
      </div>
      <EquipmentSection />
      {UPGRADES.map((u) => {
        const owned = hasUpgrade(biz, u.id);
        const cameraRisk = u.id === 'camera' && level >= THEFT_UNLOCK
          ? theftRisk({
              level, customers: stats.customers, revenue: stats.revenue,
              hasCamera: owned, hasDog: !!petActive(biz.pets?.dog, day),
            })
          : null;
        const maintPayoff = u.id === 'maintenance' && level >= MAINT_UNLOCK
          ? maintenancePayoff({ level, furniture, hasContract: owned })
          : null;
        const shelfLoss = u.id === 'maintenance'
          ? brokenShelfLoss(furniture, itemHealthList(analytics, level, storage, shelfCount(furniture), demand))
          : null;
        const posValue = u.id === 'pos' && level >= POS_UNLOCK
          ? posPayoff({
              level, hasPos: owned,
              waitMissed: stats.missed?.wait ?? 0,
              avgRevenuePerBuyer: avgPerVisit(stats.revenue, stats.customers),
            })
          : null;
        return (
          <div key={u.id} style={card}>
            <div style={row}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={iconTile}>{u.icon}</div>
                <div>
                  <b>{u.name}</b>
                  <div style={sub}>{u.desc}</div>
                  {owned
                    ? <span style={{ ...pill, background: 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>{t('panels_misc.da_lap')}</span>
                    : <div style={sub}>{t('panels_misc.gia')}{' '}{formatMoney(u.price)}{' '}{t('panels_misc.mo_o_cap')}{' '}{u.unlock}</div>}
                </div>
              </div>
              {!owned && (
                <button style={btn} disabled={level < u.unlock || money < u.price} onClick={() => buyUpgrade(u.id)}>
                  {level < u.unlock ? t('panels_misc.can_cap', { unlock: u.unlock }) : shortLabel(`Mua ${formatMoney(u.price)}`, u.price, money)}
                </button>
              )}
            </div>
            {cameraRisk && (
              <Callout
                tone={cameraRisk.hasCamera ? 'ok' : cameraRisk.leakExposureToday >= THEFT_LEAK_HIGH ? 'danger' : cameraRisk.leakExposureToday >= THEFT_LEAK_MODERATE ? 'warn' : 'info'}
                style={{ marginTop: 8 }}
                title={cameraRisk.hasCamera
                  ? t('panels_misc.da_lap_camera_ke_trom_ne')
                  : t('panels_misc.moi_ngay_trom_rut_hang', { v0: formatMoney(cameraRisk.leakExposureToday) })}
              >
                <div style={{ marginTop: 2, fontSize: 12 }}>
                  {cameraRisk.hasCamera
                    ? t('panels_misc.da_lap_ke_trom_ne_tiem')
                    : t('panels_misc.khach_ngay_la_ke_trom_gio', { v0: Math.round(cameraRisk.expectedThievesToday * 10) / 10, v1: formatMoney(cameraRisk.avgBasketRetail), v2: formatMoney(cameraRisk.cameraSavesPerDay), v3: cameraRisk.cameraPaybackDays ?? '?' })}
                </div>
              </Callout>
            )}
            {maintPayoff && (
              <Callout
                tone={maintPayoff.hasContract ? 'ok' : maintPayoff.nightlyRepairSpend >= MAINT_RISK_HIGH ? 'danger' : maintPayoff.nightlyRepairSpend >= MAINT_RISK_MODERATE ? 'warn' : 'info'}
                style={{ marginTop: 8 }}
                title={maintPayoff.hasContract
                  ? t('panels_misc.da_ky_hop_dong_tho_cham')
                  : t('panels_misc.moi_dem_ke_hong_rui_ro', { v0: formatMoney(maintPayoff.nightlyRepairSpend) })}
              >
                <div style={{ marginTop: 2, fontSize: 12 }}>
                  {maintPayoff.hasContract
                    ? t('panels_misc.ke_mon_40_duoc_tho_cham')
                    : t('panels_misc.ke_dem_co_nguy_co_hong', { v0: Math.round(maintPayoff.expectedBreaksPerNight * 10) / 10, nbWearing: maintPayoff.nbWearing, v2: formatMoney(maintPayoff.savingPerDay), v3: maintPayoff.paybackDays ?? '?' })}
                </div>
                {shelfLoss && shelfLoss.hasBroken && (
                  <div style={{ marginTop: 4, fontSize: 12, color: '#e74c3c' }}
                    title={`Kệ hỏng đang chặn hẳn: ${shelfLoss.lines.map((l) => `${l.typeName} (${l.itemNames.join(', ')})`).join(' · ')}`}>
                    {t('panels_misc.ke_hong_dang_chan_han')}{' '}{shelfLoss.lines.length}{' '}{t('panels_misc.do_lo_toi')}{formatMoney(shelfLoss.lostPerDay)}{t('panels_misc.ngay_sua_de_ban_lai')}
                  </div>
                )}
              </Callout>
            )}
            {posValue && (owned || posValue.estRevenueLostPerDay > 0) && (
              <Callout
                tone={owned ? 'ok' : posValue.verdict === 'high' ? 'danger' : posValue.verdict === 'modest' ? 'warn' : 'info'}
                style={{ marginTop: 8 }}
                title={owned
                  ? t('panels_misc.da_lap_pos_quay_quet_nhanh')
                  : t('panels_misc.moi_ngay_lo_vi_khach_cho', { v0: formatMoney(posValue.estRevenueLostPerDay) })}
              >
                <div style={{ marginTop: 2, fontSize: 12 }}>
                  {owned
                    ? t('panels_misc.quet_ma_tu_dong_moi_quay')
                    : t('panels_misc.khach_ngay_bo_ve_vi_cho', { waitMissed: posValue.waitMissed, v1: formatMoney(posValue.savingPerDay), v2: posValue.paybackDays ?? '?' })}
                </div>
              </Callout>
            )}
          </div>
        );
      })}
    </>
  );
}
