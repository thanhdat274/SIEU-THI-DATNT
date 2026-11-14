import { useState } from 'react';
import { useGame } from '../core/store';
import { joinHui, repayLoan, takeLoan } from '../core/biz';
import { HUI_COLLAPSE, HUI_OPTIONS, HUI_UNLOCK, LOAN_DAILY_RATE, LOAN_UNLOCK, loanInterest, loanLimit, loanOptions, loanTopUps } from '../data/biz';
import { formatMoney } from '../data/products';
import { huiRoundSummary } from '../data/minorPayoff';
import { Market } from './panels/MarketTab';
import { Week, Month } from './panels/PeriodTabs';
import { card, btn, sub, row } from './panels/businessStyles';
import { Achievements } from './panels/AchievementsTab';
import { Life, Pets, Services, Upgrades } from './panels/ShopLifeTabs';
import { StanceTab } from './panels/StanceTab';
import { Footer, Tabs } from './panels/shared';
import { t } from '../core/i18n';

type BusinessTab = 'market' | 'services' | 'money' | 'stance' | 'week' | 'month' | 'pets' | 'life' | 'upgrades' | 'ach';
const TABS: readonly (readonly [BusinessTab, string])[] = [
  ['market', t('biz.canh_tranh')],
  ['services', t('biz.dich_vu')],
  ['money', t('biz.vay_hui')],
  ['stance', t('biz.dinh_vi')],
  ['week', t('biz.lai_lo')],
  ['month', t('biz.thang')],
  ['pets', t('biz.thu_cung')],
  ['life', t('biz.nha_xe')],
  ['upgrades', t('biz.nang_cap')],
  ['ach', t('biz.thanh_tuu')],
];

/** Bảng Kinh doanh: các hệ thống thêm (đối thủ, quảng cáo, tích điểm, vay, hụi, tuần, thú cưng, nhà, xe, thành tựu). */
export function BusinessPanel() {
  const closePanel = useGame((s) => s.closePanel);
  // panel.focus (vd. từ Dạo phố → 'money') chọn sẵn tab; không có thì mở 'Cạnh tranh'.
  const focus = useGame((s) => (s.panel && s.panel.type === 'business' ? s.panel.focus : undefined));
  const [tab, setTab] = useState<BusinessTab>(TABS.some(([id]) => id === focus) ? (focus as BusinessTab) : 'market');
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <h2 style={{ margin: '0 0 8px' }}>📈 Kinh doanh</h2>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      <div>
        {tab === 'market' && <Market />}
        {tab === 'services' && <Services />}
        {tab === 'money' && <Money />}
        {tab === 'stance' && <StanceTab />}
        {tab === 'week' && <Week />}
        {tab === 'month' && <Month />}
        {tab === 'pets' && <Pets />}
        {tab === 'life' && <Life />}
        {tab === 'upgrades' && <Upgrades />}
        {tab === 'ach' && <Achievements />}
      </div>
      <Footer onClose={closePanel} />
    </div>
  );
}

function Money() {
  const { biz, day, level } = useGame();
  const loan = biz.loan;
  const hui = biz.hui;
  return (
    <>
      <div style={card}>
        <b>{t('biz.vay_ngan_hang')}</b>
        {level < LOAN_UNLOCK ? <div style={sub}>{t('biz.mo_o_cap')}{' '}{LOAN_UNLOCK}.</div> : loan ? (
          <>
            {(() => {
              const daily = loanInterest(loan.principal);
              const left = Math.max(0, loan.dueDay - day);
              const interestLeft = daily * left;
              const row = { display: 'flex', justifyContent: 'space-between', gap: 12 };
              return (
                <div style={{ display: 'grid', gap: 2, marginTop: 4, maxWidth: 420 }}>
                  <div style={row}><span>{t('biz.no_goc')}</span><b>{formatMoney(loan.principal)}</b></div>
                  <div style={row}><span>{t('biz.lai_moi_toi')}{(LOAN_DAILY_RATE * 100).toFixed(1)}%)</span><span>{formatMoney(daily)}</span></div>
                  <div style={row}><span>{t('biz.lai_da_tra')}</span><span>{formatMoney(loan.interestPaid ?? 0)}</span></div>
                  <div style={row}><span>{t('biz.lai_con_phai_tra_neu_giu')}{left}{' '}{t('biz.ngay')}</span><span>{formatMoney(interestLeft)}</span></div>
                  <div style={{ ...row, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 2 }}>
                    <span>{t('biz.tong_con_phai_tra_toi_han')}{' '}{loan.dueDay})</span><b>{formatMoney(loan.principal + interestLeft)}</b>
                  </div>
                </div>
              );
            })()}
            <div style={{ marginTop: 6 }}>
              <button style={{ ...btn, marginLeft: 0 }} onClick={() => repayLoan(Math.min(loan.principal, 500000))}>{t('biz.tra_500_000d')}</button>
              <button style={btn} onClick={() => repayLoan()}>{t('biz.tra_het_goc')}{' '}{formatMoney(loan.principal)}</button>
            </div>
            {loanTopUps(level, loan.principal).length > 0 ? (
              <div style={{ marginTop: 4 }}>
                {loanTopUps(level, loan.principal).map((a) => <button key={a} style={{ ...btn, marginLeft: 0, marginRight: 6 }} onClick={() => takeLoan(a)}>{t('biz.vay_them')}{' '}{formatMoney(a)}</button>)}
              </div>
            ) : (
              <div style={sub}>{t('biz.da_cham_han_muc')}{' '}{formatMoney(loanLimit(level))}{' '}{t('biz.o_cap_nay')}</div>
            )}
            <div style={sub}>
              {t('biz.lai_tru_vao_tien_moi_toi')}{' '}{formatMoney(loanLimit(level))}{t('biz.qua_han_ngan_hang_se_tu')}
            </div>
          </>
        ) : (
          <>
            <div style={sub}>
              {t('biz.vay_de_mo_rong_som_lai')}{' '}{(LOAN_DAILY_RATE * 100).toFixed(1)}{t('biz.ngay_tren_tien_con_no_han')}
              {loanOptions(level)[0] > 0 && t('biz.vi_du_vay_tra_ngay_giu', { v0: formatMoney(loanOptions(level)[0]), v1: formatMoney(Math.round(loanOptions(level)[0] * LOAN_DAILY_RATE)), v2: formatMoney(Math.round(loanOptions(level)[0] * LOAN_DAILY_RATE) * 30) })}
            </div>
            <div style={{ marginTop: 4 }}>
              {loanOptions(level).map((a) => <button key={a} style={{ ...btn, marginLeft: 0, marginRight: 6 }} onClick={() => takeLoan(a)}>Vay {formatMoney(a)}</button>)}
            </div>
          </>
        )}
      </div>
      <div style={card}>
        <b>{t('biz.choi_hui_voi_hang_xom')}</b>
        {level < HUI_UNLOCK ? <div style={sub}>{t('biz.mo_o_cap')}{' '}{HUI_UNLOCK}.</div> : hui ? (
          <>
            <div>{t('biz.gop')}{' '}{formatMoney(hui.daily)}{t('biz.ngay_da_gop')}{' '}{hui.paidDays}/{hui.members}{' '}{t('biz.ngay_2')}</div>
            <div>{hui.received ? t('biz.da_hot_hui') : t('biz.ngay_toi_luot_hot', { turnDay: hui.turnDay, v1: formatMoney(hui.daily * hui.members) })}</div>
            {/* GĐ159: "đã góp bao nhiêu trong vòng này". contributed = daily × paidDays là số CHÍNH XÁC (mỗi tối
                trừ đúng daily rồi mới tăng paidDays — news vỡ hụi cũng tính vậy), không phải ước. Vòng đều tay hòa
                về danh nghĩa: góp đủ members ngày, hốt đúng 1 lần = cả vòng góp. Lệch audit 28/10: trong game này
                chủ hụi ôm trốn là MẤT THẬT phần đã góp (không có "lời từ người vỡ hụi") — chỗ có lời thật là giá
                trị thời điểm (hốt sớm thì được dùng tiền trước). */}
            {(() => {
              const hr = huiRoundSummary(hui);
              return (
                <div style={sub}>
                  {t('biz.da_gop')}{' '}<b>{formatMoney(hr.contributed)}</b>{' '}{t('biz.trong_vong_nay_con_gop')}{' '}{hr.daysLeft}{' '}{t('biz.ngay_nua_vong_deu_tay_thi')}
                </div>
              );
            })()}
            <div style={sub}>{t('biz.tien_gop_tru_moi_toi_moi')}{' '}{(HUI_COLLAPSE * 100).toFixed(1)}{t('biz.chu_hui_om_tien_tron')}</div>
          </>
        ) : (
          <>
            <div style={sub}>{t('biz.moi_ngay_gop_mot_khoan_toi')}</div>
            {HUI_OPTIONS.map((o, i) => (
              <button key={i} style={{ ...btn, marginLeft: 0, marginRight: 6, marginTop: 4 }} onClick={() => joinHui(i)}>
                {t('biz.hui')}{' '}{formatMoney(o.daily)}{t('biz.ngay_3')}{' '}{o.members}{' '}{t('biz.chan')}
              </button>
            ))}
          </>
        )}
      </div>
    </>
  );
}
