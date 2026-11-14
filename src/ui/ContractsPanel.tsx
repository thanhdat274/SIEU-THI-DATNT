import { useGame } from '../core/store';
import { describeRep, meetsRep, repScore, reputationOf } from '../data/reputation';
import { AUTO_CONTRACT_LEVEL, CONTRACT_STREAK_BONUS, CONTRACT_STREAK_EVERY, CONTRACT_COMMIT_BONUS, SUPPLY_CONTRACTS, supplyContractById, contractValue, commitBonusValue, commitDeposit, contractStreakProgress, contractAcceptRoi, missingForContract, reservedMissing, restockCost, type SupplyContract } from '../data/contracts';
import { formatMoney, productById } from '../data/products';
import { shortLabel } from './shortLabel';
import { Callout, Footer } from './panels/shared';
import { commitTry } from '../data/commitTry';
import { contractPortfolio } from '../data/contractPortfolio';
import { t } from '../core/i18n';

/** Panel Hợp đồng — xem, chấp nhận và giao hợp đồng cung cấp dài hạn. */
export function ContractsPanel() {
  const { level, contracts, closePanel } = useGame();
  const all = SUPPLY_CONTRACTS;
  const available = all.filter((c) => c.unlock <= level);
  const locked = all.filter((c) => c.unlock > level);
  return (
    <>
      <h2 style={{ margin: '0 0 4px' }}>{t('trip.hop_dong')}</h2>
      <p style={{ margin: '0 0 12px', opacity: 0.75, fontSize: 13, maxWidth: 520 }}>
        {t('trip.hop_dong_cung_cap_dai_han')}
      </p>

      {Object.keys(contracts).length > 0 && <ActiveContracts />}

      <h3 style={head}>{t('trip.hop_dong_dang_co')}</h3>
      {available.length === 0 ? (
        <p style={{ opacity: 0.75, fontSize: 13 }}>{t('trip.chua_co_hop_dong_nao_kha')}</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {available.map((c) => (
            <ContractRow key={c.id} contract={c} />
          ))}
        </div>
      )}

      {locked.length > 0 && (
        <>
          <h3 style={head}>{t('trip.hop_dong_khoa')}</h3>
          <div style={{ display: 'grid', gap: 6 }}>
            {locked.map((c) => (
              <LockedContract key={c.id} contract={c} />
            ))}
          </div>
        </>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}

/** Các hợp đồng đang hoạt động: đã chấp nhận, chờ giao. */
function ActiveContracts() {
  const { contracts, deliverContract, commitContract, releaseContract, restockContract, setContractAuto, level, money, day, storage, biz } = useGame();
  const active = Object.entries(contracts).filter(([, cs]) => !cs.pending || cs.dueDay);
  if (!active.length) return null;
  return (
    <>
      <h3 style={head}>{t('trip.dang_hoat_dong')}</h3>
      <div style={{ fontSize: 12, opacity: 0.75, margin: '0 0 6px' }}>
        {t('trip.giao_moi_ky_dung_han_de')}{' '}{CONTRACT_STREAK_EVERY}{' '}{t('trip.ky_lien_tiep_duoc')}{Math.round(CONTRACT_STREAK_BONUS * 100)}{t('trip.thuong_moc')}{' '}<b>{t('trip.cam_ket_ky')}</b>{t('trip.tru_san_dung_hang_ky_nay')}{Math.round(CONTRACT_COMMIT_BONUS * 100)}%.
      </div>
      {(() => {
        const pf = contractPortfolio(active.map(([id]) => id));
        if (pf.count === 0) return null;
        return (
          <Callout tone={pf.verdict === 'ok' ? 'ok' : 'warn'} style={{ marginBottom: 8 }} title={t('trip.hop_dong_dang_dong_gop_ngay', { count: pf.count, v1: formatMoney(pf.netPerDayTotal) })}>
            <div style={{ marginTop: 2, fontSize: 12 }}>
              {t('trip.moi_ky_can_tru')}{formatMoney(pf.capitalPerPeriod)}{' '}{t('trip.von_hang_de_giao_du_ca')}
              {pf.anyLosing ? t('trip.co_hop_dong_dang_lo_that') : t('trip.doi_chieu_voi_kho_va_dong')}
            </div>
          </Callout>
        );
      })()}
      <div style={{ display: 'grid', gap: 8 }}>
        {active.map(([id, cs]) => {
          const def = supplyContractById(id);
          if (!def) return null;
          const left = cs.dueDay - useGame.getState().day;
          const committed = cs.committed === true;
          const deposit = commitDeposit(def);
          const bonus = commitBonusValue(def);
          return (
            <div key={id} style={{ background: '#3a3a4d', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>{def.icon}</span>
                <div style={{ flex: 1 }}>
                  <b>{def.title}</b>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {cs.delivered}{' '}{t('trip.ky_da_giao_moi')}{' '}{def.periodDays}{' '}{t('trip.ngay')}
                    {left > 0 && t('trip.con_ngay_nua', { left })}
                    {(cs.streak ?? 0) > 0 && t('trip.chuoi_dung_hen', { streak: cs.streak })}
                    {cs.overdue && <span style={{ color: '#e74c3c' }}>{' '}{t('trip.qua_han_giao_lan_nay_se')}</span>}
                  </div>
                </div>
                <button
                  style={{ ...btn, background: cs.auto ? '#3498db' : 'transparent', border: '1px solid #3498db', color: cs.auto ? '#fff' : '#3498db', opacity: level < AUTO_CONTRACT_LEVEL ? 0.5 : 1 }}
                  onClick={() => setContractAuto(id, !cs.auto)}
                  title={level < AUTO_CONTRACT_LEVEL
                    ? t('trip.mo_tu_cap', { AUTO_CONTRACT_LEVEL })
                    : t('trip.toi_ky_giao_thi_tu_nhap')}
                >
                  {cs.auto ? t('trip.tu_dong_bat') : level < AUTO_CONTRACT_LEVEL ? t('trip.tu_dong_cap', { AUTO_CONTRACT_LEVEL }) : t('trip.tu_dong')}
                </button>
                <button
                  style={{ ...btn, background: left > 0 ? '#2ecc71' : '#e74c3c', color: '#fff' }}
                  onClick={() => deliverContract(id)}
                >
                  🚚 Giao
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8, fontSize: 12, background: committed ? 'rgba(241,196,15,0.10)' : 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '6px 8px' }}>
                {committed ? (
                  <>
                    <span style={{ color: '#f1c40f' }}>{t('trip.da_cam_ket_tru')}{' '}{Object.values(cs.locked ?? {}).reduce((n, q) => n + q, 0)}{' '}{t('trip.mon_rieng_coc')}{' '}{formatMoney(deposit)}{' '}{t('trip.hoan_khi_giao')}</span>
                    <button style={{ ...btn, background: 'transparent', border: '1px solid #e67e22', color: '#e67e22' }} onClick={() => releaseContract(id)}>{t('trip.huy_cam_ket')}</button>
                    {/* GĐ2351 — nhập bù thẳng vào ngăn trữ riêng đúng phần còn thiếu */}
                    {(() => {
                      const rm = reservedMissing(def, cs.locked);
                      if (!rm.length) return null;
                      const cost = restockCost(rm, biz);
                      return (
                        <button
                          style={{ ...btn, background: money < cost ? '#777' : '#f1c40f', color: '#222' }}
                          disabled={money < cost}
                          onClick={() => restockContract(id)}
                          title={t('trip.nhap_ngay_dung_phan_con_thieu')}
                        >
                          {t('trip.nhap_bu')}{formatMoney(cost)})
                        </button>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <span style={{ opacity: 0.75 }}>{t('trip.cam_ket_ky_coc')}{' '}{formatMoney(deposit)}{' '}{t('trip.hoan_tru_hang_rieng_giao_dung')}{' '}<b style={{ color: '#f1c40f' }}>+{formatMoney(bonus)}{' '}{t('trip.tin_cay')}</b>.</span>
                    {(() => {
                      const ct = commitTry(def, money);
                      const line = ct.verdict === 'skip'
                        ? { c: '#e74c3c', t: t('trip.khong_du_coc_can', { v0: formatMoney(ct.deposit) }) }
                        : ct.verdict === 'tight'
                          ? { c: '#f1c40f', t: t('trip.coc_von_khoa_chiem_phan_lon', { v0: formatMoney(ct.reservedValue) }) }
                          : { c: '#2ecc71', t: t('trip.dang_coc_hoan_khi_giao_lay', { v0: formatMoney(ct.deposit), v1: formatMoney(ct.bonus) }) };
                      return <span style={{ color: line.c, width: '100%' }}>{line.t}.</span>;
                    })()}
                    <button style={{ ...btn, background: money < deposit ? '#777' : '#f1c40f', color: '#222' }} disabled={money < deposit} onClick={() => commitContract(id)}>{shortLabel(t('trip.cam_ket'), deposit, money)}</button>
                    {/* GĐ2351 — nhập bù đúng phần kho còn thiếu để giao/cam kết được kỳ này */}
                    {(() => {
                      const missing = missingForContract(def, storage);
                      if (!missing.length) return null;
                      const cost = restockCost(missing, biz);
                      return (
                        <button
                          style={{ ...btn, background: money < cost ? '#777' : '#2ecc71', color: '#222' }}
                          disabled={money < cost}
                          onClick={() => restockContract(id)}
                          title={t('trip.nhap_ngay_dung_phan_kho_con')}
                        >
                          {t('trip.nhap_bu')}{formatMoney(cost)})
                        </button>
                      );
                    })()}
                  </>
                )}
              </div>
              {(() => {
                const p = contractStreakProgress(cs, day);
                const pct = Math.min(100, (p.cycle / CONTRACT_STREAK_EVERY) * 100);
                const barColor = p.cycle >= CONTRACT_STREAK_EVERY - 1 || p.atMilestone ? '#f1c40f' : '#3498db';
                const riskColor = p.risk === 'overdue' ? '#e74c3c' : '#f1c40f';
                return (
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#3498db' }}>🎯 {p.cycle}/{CONTRACT_STREAK_EVERY}{' '}{t('trip.ky_con')}{' '}{p.toMilestone}{' '}{t('trip.ky_nua_toi_moc')}{Math.round(CONTRACT_STREAK_BONUS * 100)}%</span>
                      <span style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3 }} />
                      </span>
                    </div>
                    {p.risk !== 'ok' && (
                      <div style={{ color: riskColor, marginTop: 3 }}>
                        {p.overdue
                          ? (p.streak > 0
                              ? t('trip.da_qua_han_giao_bay_gio', { streak: p.streak })
                              : t('trip.da_qua_han_giao_lan_nay'))
                          : t('trip.con_ngay_nua_toi_han_giao', { daysLeft: p.daysLeft, v1: Math.round(CONTRACT_STREAK_BONUS * 100) })}
                      </div>
                    )}
                    <div style={{ marginTop: 3, opacity: 0.85 }}>
                      {p.overdue && p.streak > 0
                        ? t('trip.danh_doi_giao_giu_doanh_thu')
                        : p.risk === 'due_soon'
                          ? t('trip.giao_dung_han_ky_nay_dua', { v0: p.streak + 1 })
                          : t('trip.giu_nhip_giao_moi_ngay_de', { periodDays: def.periodDays, v1: Math.round(CONTRACT_STREAK_BONUS * 100) })}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Một hợp đồng: hiển thị chi tiết, nút chấp nhận. */
function ContractRow({ contract }: { contract: SupplyContract }) {
  const { contracts, acceptContract, repLog } = useGame();
  const rep = reputationOf(repLog);
  const trusted = meetsRep(rep, contract.rep);
  const alreadyAccepted = !!contracts[contract.id];
  return (
    <div style={{ background: '#3a3a4d', borderRadius: 8, padding: '8px 12px', opacity: alreadyAccepted ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 22 }}>{contract.icon}</span>
        <div style={{ flex: 1 }}>
          <b>{contract.title}</b>
          <div style={{ fontSize: 12, opacity: 0.75 }}>{contract.from} · {contract.description}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 12 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span>{t('trip.chu_ky')}{' '}{contract.periodDays}{' '}{t('trip.ngay')}</span>
          <span>💰 {formatMoney(contractValue(contract))}{t('trip.ky')}</span>
          <span>⭐ {contract.xp} XP</span>
        </div>
      </div>
      <div style={{ fontSize: 13, marginTop: 6 }}>
        {Object.entries(contract.items).map(([id, q]) => (
          <span key={id} style={{ marginRight: 12, color: '#3498db' }}>
            {productById(id).name} ×{q}
          </span>
        ))}
      </div>
      {(() => {
        const roi = contractAcceptRoi(contract);
        const chipColor = roi.verdict === 'worth' ? '#2ecc71' : roi.verdict === 'tight' ? '#f1c40f' : '#e74c3c';
        const chipText = roi.verdict === 'worth' ? t('trip.dang_ky') : roi.verdict === 'tight' ? t('trip.can_nhac') : t('trip.suy_nghi_lai');
        return (
          <div style={{ fontSize: 13, marginTop: 4 }}>
            {t('trip.loi_that')}{formatMoney(roi.contractNet)}{t('trip.ky_2')}{formatMoney(roi.netPerDay)}{t('trip.ngay_2')}{' '}
            <span style={{ color: chipColor, border: `1px solid ${chipColor}`, borderRadius: 10, padding: '0 7px', fontSize: 11 }}>{chipText}</span>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
              {t('trip.so_voi_ban_le_het_lo')}{' '}{Math.round(roi.giveUpPct * 100)}{t('trip.doi_lai_dau_ra_chac_giao')}
            </div>
          </div>
        );
      })()}
      {alreadyAccepted ? (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>{t('trip.da_chap_nhan_hop_dong_nay')}</div>
      ) : (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {contract.rep && (
            <span style={{ fontSize: 12, color: trusted ? '#2ecc71' : '#e67e22' }}>
              {trusted ? '✅' : '🔒'} {describeRep(contract.rep)}{' '}{t('trip.dang')}{' '}{repScore(rep, contract.rep).toFixed(1)}★)
            </span>
          )}
          <button
            style={{ ...btn, background: trusted ? '#f1c40f' : '#777' }}
            disabled={!trusted}
            onClick={() => acceptContract(contract.id)}
          >
            {t('trip.chap_nhan_hop_dong')}
          </button>
        </div>
      )}
    </div>
  );
}

/** Hợp đồng chưa mở khóa — chỉ hiện thông tin khóa. */
function LockedContract({ contract }: { contract: SupplyContract }) {
  return (
    <div style={{ background: '#3a3a4d', borderRadius: 8, padding: '8px 12px', opacity: 0.5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 22 }}>🔒</span>
        <div>
          <b>{contract.title}</b>
          <div style={{ fontSize: 12, opacity: 0.75 }}>{t('trip.can_cap')}{' '}{contract.unlock}{contract.rep ? ` · ${describeRep(contract.rep)}` : ''}</div>
        </div>
      </div>
    </div>
  );
}

const head: React.CSSProperties = { margin: '14px 0 8px', fontSize: 15 };
const btn: React.CSSProperties = { border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 13 };
