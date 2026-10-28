import { useGame } from '../../core/store';
import { feedCost, landmarkProgress, LANDMARK_STAGES, LANDMARK_TARGETS } from '../../data/landmark';
import { landmarkPayoff } from '../../data/landmarkPayoff';
import { formatMoney } from '../../data/products';
import { Footer, styles } from './shared';

const formatMoneyShort = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toLocaleString('vi-VN')}tr` : `${Math.round(v / 1000).toLocaleString('vi-VN')}k`;
const TOTAL = LANDMARK_TARGETS[LANDMARK_TARGETS.length - 1];

/** Công trình khu phố — Sân chơi Trẻ Em (GĐ40): mỗi ngày góp một lượt cho tới khi khánh thành. */
export function LandmarkPanel() {
  const { day, level, money, contributeLandmark, closePanel } = useGame();
  const landmark = useGame((s) => s.biz.landmark);
  const { contributions, lastContributeDay } = landmark;
  const history = useGame((s) => s.history);
  const prog = landmarkProgress(contributions);
  const stage = LANDMARK_STAGES[prog.index];
  const done = prog.done;
  const alreadyToday = !done && lastContributeDay === day;
  const cost = feedCost(prog.index, level);
  const broke = !done && !alreadyToday && money < cost;
  const nextStage = prog.index < LANDMARK_STAGES.length - 1 ? LANDMARK_STAGES[prog.index + 1] : null;
  const disabled = done || alreadyToday || broke;
  const disabledReason = done
    ? 'Sân chơi đã khánh thành rồi!'
    : alreadyToday
      ? 'Hôm nay đã góp rồi — mai quay lại nhé!'
      : broke
        ? `Chưa đủ tiền mua vật liệu (cần ${formatMoneyShort(cost)})`
        : undefined;
  // GĐ158 — thẻ soi sáng "góp bao nhiêu, còn bao nhiêu, đáng không" (thuần đọc, không đổi kinh tế/save).
  const payoff = landmarkPayoff(landmark, level, history);
  const gain = payoff.dailyGainEst;
  const smallGain = gain !== null && gain < 1_000;

  return (
    <>
      <h2 style={styles.title}>🏗️ Công trình Sân chơi</h2>
      <p style={styles.sub}>
        Hẻm cùng nhau góp vật liệu xây sân chơi cho trẻ con. Mỗi ngày góp một lượt — đủ {TOTAL} lượt
        là khánh thành, cả hẻm cảm ơn bạn và… trẻ con reo hò! 🎉
      </p>

      {/* Tiến độ tổng */}
      <div style={{ margin: '6px 0 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
          <span>Đã góp {contributions}/{TOTAL} lượt</span>
          <span>{Math.round(prog.pct * 100)}%</span>
        </div>
        <div style={{ height: 14, borderRadius: 7, background: '#3a3a4d', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${prog.pct * 100}%`, borderRadius: 7, background: '#2ecc71', transition: 'width .3s' }} />
        </div>
      </div>

      {/* Giai đoạn đang ở */}
      <div style={{ ...styles.card, marginTop: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 30 }}>{done ? '🏟️' : stage.icon}</span>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 15 }}>{done ? '🏟️ Khánh thành' : `${stage.icon} ${stage.title}`}</b>
          <div style={{ fontSize: 13, opacity: 0.8, margin: '2px 0' }}>{done ? 'Sân chơi đầu hẻm đã hoàn thành!' : stage.desc}</div>
          {!done && (
            <small style={{ opacity: 0.7 }}>
              Trong giai đoạn {prog.into}/{LANDMARK_TARGETS[prog.index]} lượt
            </small>
          )}
        </div>
      </div>

      {/* Phần thưởng giai đoạn kế tiếp */}
      {nextStage ? (
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
          🎯 Giai đoạn kế tiếp: <b>{nextStage.icon} {nextStage.title}</b> ({nextStage.desc}) — thưởng{' '}
          <b>+{formatMoneyShort(nextStage.bonusMoney)} + {nextStage.bonusXp} XP</b>
        </div>
      ) : (
        <div style={{ marginTop: 10, fontSize: 13, color: '#a3e4a3' }}>
          🎊 Đã hoàn thành cả 4 giai đoạn. Cả hẻm hưởng lợi: khách ghé đông hơn (+6%)!
        </div>
      )}

      {/* GĐ158 — Soi sáng: góp bao nhiêu, còn bao nhiêu, đáng không (thuần đọc) */}
      <div style={{ ...styles.card, display: 'block', marginTop: 12 }}>
        <b style={{ fontSize: 13 }}>💡 Góp bao nhiêu, đáng không?</b>
        <div style={{ fontSize: 12.5, opacity: 0.88, marginTop: 4, lineHeight: 1.55 }}>
          {payoff.done ? (
            <>
              <div>
                Đã khánh thành! Đã góp ước ~<b>{formatMoney(payoff.spentEst)}</b>
                {gain !== null && !smallGain ? (
                  <> — khách tiệm chính đông thêm 6% ≈ <b>+{formatMoney(gain)}/ngày</b> từ ngày khánh thành.</>
                ) : (
                  <> — khách tiệm chính đông thêm 6% từ ngày khánh thành.</>
                )}
              </div>
              {smallGain && (
                <div>Doanh thu đông thêm khiêm tốn — góp nhỏ, được cái đẹp hẻm: sân chơi rộn ràng là quà cho cả khu phố. 😊</div>
              )}
            </>
          ) : (
            <>
              <div>
                Đã góp ~<b>{payoff.contributedTurns}</b> lượt (ước ~<b>{formatMoney(payoff.spentEst)}</b>) · còn{' '}
                <b>{payoff.remainingTurns}</b> lượt ≈ ~<b>{formatMoney(payoff.remainingCostEst)}</b> nữa là khánh thành.
              </div>
              {gain === null ? (
                <div>Bán hàng vài ngày để ước xem khoản góp hòa lại trong bao lâu nhé.</div>
              ) : smallGain ? (
                <div>Khách đông thêm khiêm tốn — góp nhỏ, được cái đẹp hẻm: sân chơi rộn ràng là quà cho cả khu phố. 😊</div>
              ) : (
                <div>
                  Xong rồi khách tiệm chính đông thêm 6% ≈ <b>+{formatMoney(gain)}/ngày</b> — toàn bộ khoản góp hòa lại sau
                  ~<b>{payoff.paybackDays}</b> ngày bán.
                </div>
              )}
              <div>Mỗi ngày góp 1 lượt là khánh thành sớm nhất — góp đều, sớm hưởng lâu!</div>
            </>
          )}
        </div>
      </div>

      {/* Chi phí hôm nay + nút góp */}
      <p style={{ margin: '12px 0 4px', fontSize: 13 }}>
        Chi phí một lượt góp hôm nay: <b>{formatMoneyShort(cost)}</b>
        {done && ' (không cần góp nữa)'}
      </p>
      <button
        style={{ ...styles.btn, marginLeft: 0, background: disabled ? '#666' : '#e67e22', color: '#fff', cursor: disabled ? 'default' : 'pointer', padding: '8px 14px', fontSize: 14 }}
        onClick={contributeLandmark}
        disabled={disabled}
        title={disabledReason}
      >
        {done ? '✅ Đã khánh thành' : alreadyToday ? '✅ Hôm nay đã góp' : `🏗️ Góp vật liệu (+1 hôm nay) · ${formatMoneyShort(cost)}`}
      </button>
      {disabledReason && !done && (
        <small style={{ display: 'block', margin: '6px 0 0', color: '#f0a35c' }}>{disabledReason}</small>
      )}

      <Footer onClose={closePanel} />
    </>
  );
}
