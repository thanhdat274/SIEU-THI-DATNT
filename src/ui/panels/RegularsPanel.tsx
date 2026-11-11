import { useGame, formatClock } from '../../core/store';
import { useState } from 'react';
import { productById, formatMoney } from '../../data/products';
import { isBirthday, nextPerk, birthdayLabel, REGULARS, regularById, rescueGiftFor, type PerkEffect } from '../../data/regulars';
import { RESCUE_FEE, atRiskOfPoach, poachLungLayOf } from '../../data/biz';
import { arcById, currentArcStep } from '../../data/regularArc';
import { lifetimeRegularVisits, vipTierOf, nextTierOf, monthlyTriAn, regularQuote, EMOTIONAL_FRIENDSHIP } from '../../data/regularTrust';
import { Callout, Footer, Swatch, styles, Tabs } from './shared';
import { DebtBook } from './DebtBook';
import { regularGiftPlan, REGULAR_GIFT_LEVEL, giftFriendship, giftableCount, sortForGift, giftPanelLine } from '../../data/regularGift';
import {
  REGULAR_TIES, TIE_LABEL, TIE_ICON, alleyBond, tieIsHostile, tieKey, displayTieKind,
} from '../../data/regularTies';

/** GĐ793 — nút đòi khách quen bị rival lôi kéo (cùng kiểu nút vàng accent của hệ thống). */
const rescueBtn: React.CSSProperties = {
  marginTop: 6, padding: '7px 14px', borderRadius: 8, border: 0, cursor: 'pointer',
  background: '#f1c40f', fontWeight: 600, fontSize: 13, minHeight: 34,
};

/** Biểu tượng nhận diện nhanh cho từng loại perk của khách quen. */
export const PERK_ICONS: Record<PerkEffect, string> = {
  bonus_tip: '💲',        // boa thêm tiền
  extra_item: '🛒',       // mua thêm món
  frequent_visit: '🔁',   // ghé thường hơn
  refer_friend: '👥',     // rủ bạn bè
  bulk_buy: '📦',         // mua số lượng lớn theo lô
  festival: '🎉',         // ngày hội
};

/** Khách quen: điểm thân thiết, món ưa thích đã biết, perk đã mở. */
export function RegularsPanel() {
  const { level, day, regulars, biz, stats, money, storage, closePanel, rescuePoachedRegular, giftRegular } = useGame();
  const arcs = biz.regularArcs ?? {};
  const rival = biz.rival;
  const poached = rival?.poached ?? {};
  const poachedList = Object.entries(poached);
  const atRisk = atRiskOfPoach(rival, Object.fromEntries(Object.entries(regulars).map(([id, p]) => [id, p.friendship])));
  const lungLay = poachLungLayOf(rival, Object.fromEntries(Object.entries(regulars).map(([id, p]) => [id, p.friendship])), level, day);
  const met = REGULARS.filter((r) => r.unlock <= level);
  const [tab, setTab] = useState<'list' | 'ties'>('list');
  const bond = alleyBond(regulars, biz.tiesMended ?? []);
  const triVisits = lifetimeRegularVisits(regulars);
  const triTier = vipTierOf(triVisits);
  const triNext = nextTierOf(triVisits);
  const triPrev = triTier.threshold;
  const closeFriends = Object.values(regulars).filter((r) => r.friendship >= EMOTIONAL_FRIENDSHIP).length;
  const tri = monthlyTriAn(triVisits, biz.triAnMonth ?? 0, closeFriends);
  return (
    <>
      <h2 style={styles.title}>💛 Khách quen</h2>
      <Tabs tabs={[['list', '👥 Khách quen'], ['ties', '🕸️ Quan hệ']]} value={tab} onChange={setTab} />
      {tab === 'list' && (
        <>
          {level >= REGULAR_GIFT_LEVEL && <p style={styles.sub}>{giftPanelLine(giftableCount(met, regulars, level, day, storage), stats.gifts)}</p>}
      <DebtBook />
      <p style={styles.sub}>
        Khách quen ghé vào giờ quen. Bán đúng món họ thích thì thân hơn (+2, món khác +1, mỗi ngày một lần);
        để họ về tay không thì mất 1 điểm. Thân đủ mốc thì họ ghé thường hơn, mua thêm món và boa tiền.
      </p>
      <div style={{ ...styles.card, maxWidth: 560, marginBottom: 6, border: '1px solid rgba(243,156,18,0.4)', background: 'rgba(243,156,18,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <b>📖 Sổ thương mến</b>
          <span>{triTier.icon} {triTier.name} <span style={{ opacity: 0.7, fontSize: 12 }}>— {triVisits} lượt khách quen</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12 }}>
          {triNext ? (
            <>
              <div style={{ flex: 1, height: 6, background: '#555', borderRadius: 3 }}>
                <div style={{ width: `${Math.min(100, ((triVisits - triPrev) / (triNext.threshold - triPrev || 1)) * 100)}%`, height: '100%', borderRadius: 3, background: '#e67e22' }} />
              </div>
              <span style={{ opacity: 0.8 }}>còn {triNext.threshold - triVisits} lượt tới {triNext.icon} {triNext.name}</span>
            </>
          ) : (
            <span style={{ opacity: 0.8 }}>🛍️ Bậc cao nhất — bể khách quen toàn thịnh!</span>
          )}
        </div>
        <div style={{ fontSize: 12, marginTop: 4, opacity: 0.95 }}>
          Tháng này đã phục vụ <b>{biz.triAnMonth ?? 0} lượt khách quen</b>{' '}
          {closeFriends >= 1 && triTier.level >= 1
            ? <span>→ cuối tháng nhận 💝 tri ân <b style={{ color: '#2ecc71' }}>~{formatMoney(tri.amount)}</b></span>
            : <span style={{ opacity: 0.75 }}>(cần 1 khách thân 💛 ≥{EMOTIONAL_FRIENDSHIP} và bậc Tiệm ≥1 để nhận quà)</span>}
        </div>
      </div>
      {poachedList.length > 0 && rival && (
        <div style={{ display: 'grid', gap: 6, maxWidth: 560, marginBottom: 8 }}>
          {poachedList.map(([id, sinceDay]) => {
            const def = regularById(id);
            if (!def) return null;
            const gift = rescueGiftFor(def, level, (pid) => (storage[pid] ?? 0) > 0);
            const wantName = productById(gift ?? def.favorites[0]).name;
            const usedToday = biz.rescueDay === day;
            const canRescue = !usedToday && !!gift && money >= RESCUE_FEE;
            return (
              <Callout
                key={id}
                tone="danger"
                strong
                title={`😠 ${def.name} đang sang tiệm ${rival.name}`}
                actions={
                  <button
                    disabled={!canRescue}
                    onClick={() => rescuePoachedRegular(id)}
                    style={{ ...rescueBtn, opacity: canRescue ? 1 : 0.55 }}
                  >
                    {usedToday
                      ? 'Hôm nay đã đòi một người — mai tiếp'
                      : gift ? `Đòi về — tặng 1 ${wantName} + ${formatMoney(RESCUE_FEE)}` : `Thiếu ${wantName} trong kho`}
                  </button>
                }
              >
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  Từ ngày {sinceDay} khách không ghé tiệm mình. Tặng 1 {wantName} + {formatMoney(RESCUE_FEE)} tiền quà là khách quay lại ngay,
                  cộng thêm thân thiết. Mỗi ngày đòi lại được một người.
                </div>
              </Callout>
            );
          })}
        </div>
      )}
      <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
        {sortForGift(met, regulars, level, day, storage, (d) => isBirthday(d, day)).map((r) => {
          const prog = regulars[r.id];
          const next = nextPerk(r, prog);
          const pts = prog?.friendship ?? 0;
          const from = r.perks.filter((p) => prog?.perks.includes(p.title)).at(-1)?.threshold ?? 0;
          const arcSt = arcs[r.id];
          const arc = arcSt ? arcById(arcSt.arcId) : undefined;
          // Thẻ gom lại (details): danh sách 10 khách quen dài ~5.000px trên điện thoại —
          // đóng mặc định để lướt nhanh, chạm vào khách cần xem mới mở chi tiết.
          return (
            <details key={r.id} style={{ background: '#3a3a4d', borderRadius: 8, padding: '8px 12px', maxWidth: 560 }}>
              <summary style={{ display: 'flex', justifyContent: 'space-between', gap: 8, cursor: 'pointer', listStyle: 'none', fontWeight: 700 }}>
                <span><Swatch color={r.color} /> {r.name}</span>
                <span style={{ opacity: 0.75, fontSize: 12, fontWeight: 400 }}>
                  {poached[r.id] ? '😠 ' : lungLay.includes(r.id) ? <span title={`Người nhà/bạn của người vừa bị kéo — mấy đêm nay dễ lung lay gấp đôi, ưu tiên chăm`}>💢 </span> : atRisk.includes(r.id) ? <span title={`Thân thiết thấp, ${rival?.name} có thể lôi kéo — tặng quà hoặc bán đúng món họ thích`}>⚠️ </span> : ''}{arcSt && !arcSt.done ? '📖 ' : ''}💛 {pts} · {prog?.visits ?? 0} lần ghé
                </span>
              </summary>
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, opacity: 0.75 }}>
                  <span>{r.role}{(prog?.visits ?? 0) > 0 ? ` · 🎂 ${birthdayLabel(r)}` : ''}</span>
                  <span>{formatClock(r.visitFrom)}–{formatClock(r.visitUntil)}</span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{r.bio}</div>
                {regularQuote(r.lines.greeting, prog) && (
                  <div style={{ fontSize: 12, fontStyle: 'italic', marginTop: 2 }}>💬 “{r.lines.greeting}”</div>
                )}
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Thích: {r.favorites.map((id) => (prog?.discovered.includes(id) ? productById(id).name : '???')).join(', ')}
                </div>
                {level >= REGULAR_GIFT_LEVEL && (() => {
                  const plan = regularGiftPlan(r, prog, level, day, storage);
                  const err = 'error' in plan ? plan.error : null;
                  return (
                    <button
                      disabled={!!err}
                      onClick={() => giftRegular(r.id)}
                      style={{ marginTop: 4, fontSize: 12, padding: '3px 8px', borderRadius: 6, border: 'none', cursor: err ? 'default' : 'pointer', opacity: err ? 0.55 : 1 }}
                    >
                      {'productId' in plan ? `🎁 Tặng 1 ${productById(plan.productId).name} (+${giftFriendship(isBirthday(r, day))} 💛)` : `🎁 ${err}`}
                    </button>
                  );
                })()}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12 }}>
                  <span>💛 {pts}</span>
                  {next && (
                    <>
                      <div style={{ flex: 1, height: 6, background: '#555', borderRadius: 3 }}>
                        <div style={{ width: `${Math.min(100, ((pts - from) / (next.threshold - from)) * 100)}%`, height: '100%', borderRadius: 3, background: '#f1c40f' }} />
                      </div>
                      <span style={{ opacity: 0.75 }}>{PERK_ICONS[next.effect]} {next.threshold}: {next.description}</span>
                    </>
                  )}
                </div>
                {!!prog?.perks.length && (
                  <div style={{ fontSize: 12, color: '#2ecc71', marginTop: 2 }}>
                    {r.perks.filter((p) => prog.perks.includes(p.title)).map((p) => PERK_ICONS[p.effect] + ' ' + p.description).join(' · ')}
                  </div>
                )}
                {arcSt && (() => {
                  if (!arc) return null;
                  if (arcSt.done) return <div style={{ fontSize: 12, color: '#e67e22', marginTop: 2 }}>📖 Đã xong: {arc.title} ✓</div>;
                  const step = currentArcStep(arc, arcSt);
                  const left = Math.max(0, arcSt.expiresDay - day);
                  return (
                    <div style={{ fontSize: 12, color: '#e67e22', marginTop: 2 }}>
                      📖 {arc.title} —&nbsp;
                      {arcSt.waitingReward
                        ? 'xong đủ bước, tối nay gom thưởng'
                        : step ? `bước ${arcSt.step + 1}/${arc.steps.length}: cần ${step.qty} ${productById(step.itemId).name}` : ''}
                      {' · hạn còn '}{left} ngày
                    </div>
                  );
                })()}
              </div>
            </details>
          );
        })}
        {REGULARS.length > met.length && <p style={styles.sub}>Lên cấp để gặp thêm {REGULARS.length - met.length} khách quen nữa.</p>}
      </div>
        </>
      )}
      {tab === 'ties' && (
        <TiesView bond={bond} regulars={regulars} tiesMended={biz.tiesMended ?? []} met={met} />
      )}
      <Footer onClose={closePanel} />
    </>
  );
}

/** GĐ Hệ2-L1 — tab "Quan hệ" chỉ đọc: chỉ số Tình làng + danh sách 22 mối quan hệ giữa khách quen. */
function TiesView({ bond, regulars, tiesMended, met }: {
  bond: number;
  regulars: Record<string, { friendship: number }>;
  tiesMended: string[];
  met: { id: string; name: string; color: number }[];
}) {
  const friendly = REGULAR_TIES.filter((t) => !tieIsHostile(t, tiesMended));
  const hostile = REGULAR_TIES.filter((t) => tieIsHostile(t, tiesMended));
  const metIds = new Set(met.map((r) => r.id));
  const name = (id: string): string => {
    const def = regularById(id);
    return def ? (metIds.has(id) ? def.name : `${def?.name ?? id} (chưa gặp)`) : id;
  };
  return (
    <>
      <div style={{ ...styles.card, maxWidth: 560, marginBottom: 8, border: '1px solid rgba(46,204,113,0.4)', background: 'rgba(46,204,113,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <b>🏮 Tình làng nghĩa xóm</b>
          <span style={{ fontWeight: 700, color: '#2ecc71' }}>{bond}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12 }}>
          <div style={{ flex: 1, height: 8, background: '#555', borderRadius: 4 }}>
            <div style={{ width: `${bond}%`, height: '100%', borderRadius: 4, background: '#2ecc71' }} />
          </div>
          <span style={{ opacity: 0.8 }}>min thân thiết đủ 40 là kín 1 mối ({friendly.length} mối thân)</span>
        </div>
        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
          Họ hàng · bạn bè · láng giềng trong hẻm. Chăm sâu vài người then chốt giữ được cả cụm; mối khắc khẩu thì lo A là B hơi dỗi.
        </div>
      </div>
      <div style={{ display: 'grid', gap: 4, maxWidth: 560 }}>
        {friendly.map((t) => {
          const m = Math.min(regulars[t.a]?.friendship ?? 0, regulars[t.b]?.friendship ?? 0);
          const pct = Math.min(100, Math.round((m / 40) * 100));
          return (
            <div key={tieKey(t.a, t.b)} style={{ background: '#3a3a4d', borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span><span style={{ opacity: 0.8 }}>{TIE_ICON[displayTieKind(t, tiesMended)]} {TIE_LABEL[displayTieKind(t, tiesMended)]}</span><br />{name(t.a)} · {name(t.b)}</span>
                <span style={{ color: '#f1c40f', fontWeight: 600, whiteSpace: 'nowrap' }}>💛 {m}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div style={{ flex: 1, height: 5, background: '#555', borderRadius: 3 }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: '#f1c40f' }} />
                </div>
                <span style={{ opacity: 0.7, fontSize: 11 }}>{t.note}</span>
              </div>
            </div>
          );
        })}
        {hostile.length > 0 && (
          <div style={{ fontSize: 12, opacity: 0.9, background: 'rgba(231,76,60,0.08)', borderRadius: 8, padding: '6px 12px', maxWidth: 560 }}>
            ⚡ <b>Người khắc khẩu</b> — lo chu đáo một người thì người kia hơi dỗi:
            {hostile.map((t) => <div key={tieKey(t.a, t.b)}>💢 {name(t.a)} · {name(t.b)}</div>)}
          </div>
        )}
      </div>
    </>
  );
}
