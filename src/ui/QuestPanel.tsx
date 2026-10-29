import type React from 'react';
import { useState } from 'react';
import { questContext, useGame } from '../core/store';
import { takeLoan } from '../core/biz';
import { loanToCover } from '../data/biz';
import { goalLocked, goalLockText, upcomingGoals, type CommunityGoal } from '../data/community';
import { reputationOf } from '../data/reputation';
import { betBonusMoney, betStatus, BET_TIERS, betCoreSetProgress, dailyQuests, dailySetProgress, isBetCore, questEcoCap, QUEST_ECO_MULT, STORY_STEPS, storyQuest, type BetTier, type Quest } from '../data/quests';
import { formatMoney, productById } from '../data/products';
import { recentAvgProfit } from '../data/gifts';
import { missingForOrder, orderValue, rushQuote, partyOrderById, STORY_ORDER_FRIEND_GAIN, STORY_ORDER_FRIEND_LOSS } from '../data/orders';

/** Sổ nhiệm vụ: những việc mỗi ngày (đủ mở gì thêm việc đó) và một bước cốt truyện, xong thì bấm nhận thưởng. */
export function QuestPanel() {
  const s = useGame();
  const ctx = questContext(s);
  const daily = dailyQuests(ctx);
  const story = storyQuest(ctx);
  const doneSteps = s.questLog.claimedStory.length;
  const claimable = [story, ...daily].filter((q): q is Quest => !!q && q.done && !q.claimed);
  // Kèo đang chạy trong ngày (chưa phân định hoặc đã trúng): gắn dấu 🎯 lên các việc của bộ
  const betBadge = !!s.questLog.bet && s.questLog.bet.day === s.day;
  return (
    <>
      <h2 style={{ margin: '0 0 4px' }}>📜 Sổ nhiệm vụ</h2>
      <p style={{ margin: '0 0 12px', opacity: 0.75, fontSize: 13, maxWidth: 520 }}>
        Nhiệm vụ ngày làm mới mỗi sáng, càng lên cấp càng khó và thưởng càng to. Cốt truyện làm lần lượt từng bước.
      </p>

      <CommunityGoals />
      <OrderCard />

      <h3 style={head}>📖 Cốt truyện <small style={{ opacity: 0.6, fontWeight: 400 }}>· bước {Math.min(doneSteps + 1, STORY_STEPS.length)}/{STORY_STEPS.length}</small></h3>
      {story ? <QuestRow q={story} /> : <p style={{ opacity: 0.75, fontSize: 13 }}>🎊 Đã xong toàn bộ cốt truyện!</p>}

      <h3 style={head}>☀️ Nhiệm vụ hôm nay <small style={{ opacity: 0.6, fontWeight: 400 }}>· ngày {s.day} · {daily.length} việc</small></h3>
      <DailySetStatus />
      <QuestEcoNote />
      <BetCard />
      <div style={{ display: 'grid', gap: 8 }}>
        {daily.map((q) => <QuestRow key={q.id} q={q} betBadge={betBadge && isBetCore(q.id)} />)}
      </div>

      {claimable.length > 1 && (
        <button style={{ ...btn, marginTop: 12, width: '100%', padding: '8px 0', background: '#f1c40f' }}
          onClick={() => claimable.forEach((q) => useGame.getState().claimQuest(q.id))}>
          🎁 Nhận tất cả ({claimable.length})
        </button>
      )}
    </>
  );
}

/** Mục tiêu chung của hẻm: ngày khai trương và dịp lễ đang diễn ra hoặc sắp tới. */
function CommunityGoals() {
  const { day, level, opening, pendingUpgrade, shopTier } = useGame();
  return <>{upcomingGoals(day, level, opening, pendingUpgrade ? shopTier + 1 : undefined).map(({ goal, inDays }) => (
    <CommunityCard key={goal.key} goal={goal} inDays={inDays} />
  ))}</>;
}

function CommunityCard({ goal, inDays }: { goal: CommunityGoal; inDays: number }) {
  const { community, repLog, furniture } = useGame();
  const f = goal.festival;
  const p = community[goal.key];
  const decor = furniture.filter((x) => x.type === 'plant').length;
  const locked = goalLocked(goal, reputationOf(repLog));
  const bar = (label: string, have: number, need: number) => need > 0 && (
    <div style={{ fontSize: 12, marginTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{label}</span><span>{Math.min(have, need)}/{need}</span></div>
      <div style={{ height: 6, background: '#555', borderRadius: 3 }}>
        <div style={{ width: `${Math.min(1, have / need) * 100}%`, height: '100%', borderRadius: 3, background: have >= need ? '#2ecc71' : '#f1c40f' }} />
      </div>
    </div>
  );
  const names = goal.items.slice(0, 3).map((id) => productById(id).name).join(', ') + (goal.items.length > 3 ? '…' : '');
  return (
    <div style={{ background: '#3a3a4d', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
      <b>{f.icon} Mục tiêu chung · {f.name}</b>
      <span style={{ fontSize: 12, opacity: 0.75 }}> · {inDays ? `${inDays === 1 ? 'mai' : `${inDays} ngày nữa`} bắt đầu, chuẩn bị hàng và trang trí` : goal.days === 1 ? 'chỉ hôm nay' : `${goal.days} ngày`}</span>
      {p?.done ? (
        <div style={{ fontSize: 13, marginTop: 4 }}>🎉 Cả hẻm đã hoàn thành mục tiêu dịp này!</div>
      ) : locked ? (
        <div style={{ fontSize: 12, marginTop: 4, color: '#e67e22' }}>🔒 {goalLockText(goal)}</div>
      ) : (
        <>
          {bar(goal.items.length ? `🛍️ Bán hàng của dịp (${names})` : '🛍️ Bán món bất kỳ', p?.sold ?? 0, goal.itemTarget)}
          {bar('🍲 Món nhà làm', p?.cooked ?? 0, goal.cookedTarget)}
          {bar(f.id === 'khai_truong' ? '💐 Lẵng hoa mừng (chậu cây)' : '🪴 Trang trí tiệm (chậu cây)', decor, goal.decorTarget)}
          <div style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>
            🎁 Thưởng {formatMoney(goal.reward.money)} · {goal.reward.xp} XP{f.host ? ' · người lo hội thân hơn' : ''}. Chơi chung thì cả hẻm cùng góp.
          </div>
        </>
      )}
    </div>
  );
}

/** Đơn tiệc đang mời hoặc đã nhận: giao bằng hàng trong kho. */
function OrderCard() {
  const { order, storage, day, money, level, biz, acceptOrder, declineOrder, deliverOrder, rushDeliverOrder } = useGame();
  const def = order && partyOrderById(order.id);
  if (!order || !def) return null;
  const missing = missingForOrder(def, storage);
  const rush = rushQuote(def, storage, day);
  const short = rush.cost - money;
  const loan = short > 0 ? loanToCover(level, biz.loan?.principal ?? null, short) : null;
  const left = order.dueDay - day;
  return (
    <>
      <h3 style={head}>{def.icon} {def.regular ? 'Khách quen nhờ' : 'Đơn đặt hàng'} <small style={{ opacity: 0.6, fontWeight: 400 }}>· {left > 0 ? `còn ${left + 1} ngày` : 'hạn chót hôm nay'}</small></h3>
      <div style={{ background: '#3a3a4d', borderRadius: 8, padding: '8px 12px', display: 'grid', gap: 6 }}>
        <div><b>{def.title}</b> <span style={{ opacity: 0.7, fontSize: 12 }}>· {def.from}</span></div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{def.description}</div>
        <div style={{ fontSize: 13 }}>
          {Object.entries(def.items).map(([id, q]) => {
            const have = storage[id] ?? 0;
            return <span key={id} style={{ marginRight: 10, color: have >= q ? '#2ecc71' : '#e67e22' }}>{productById(id).name} {Math.min(have, q)}/{q}</span>;
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
          <span>Trả {formatMoney(orderValue(def))} + thưởng {formatMoney(def.bonus)} · {def.xp} XP{def.regular && ` · 💛 +${STORY_ORDER_FRIEND_GAIN}`}</span>
          {order.accepted ? (
            <button style={{ ...btn, background: missing.length ? '#555' : '#2ecc71', color: missing.length ? '#bbb' : '#fff' }} onClick={deliverOrder}>
              🚚 Giao từ kho
            </button>
          ) : (
            <span>
              <button style={btn} onClick={declineOrder}>Từ chối</button>{' '}
              <button style={{ ...btn, background: '#f1c40f' }} onClick={acceptOrder}>Nhận đơn</button>
            </span>
          )}
        </div>
        {order.accepted && missing.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12, background: '#2f2f40', borderRadius: 6, padding: '6px 8px' }}>
            {!rush.ok ? (
              <span style={{ opacity: 0.8 }}>Có món nhà làm, đại lý không bán: phải tự nấu rồi giao từ kho.</span>
            ) : (
              <>
                <span>
                  Nhập gấp phần thiếu ở 🏠 đại lý: <b>{formatMoney(rush.cost)}</b>
                  {short > 0 && <span style={{ color: '#ff7675' }}> · thiếu {formatMoney(short)}</span>}
                </span>
                {short <= 0 ? (
                  <button style={{ ...btn, background: '#2ecc71', color: '#fff', whiteSpace: 'nowrap' }} onClick={rushDeliverOrder}>⚡ Nhập gấp & giao</button>
                ) : loan ? (
                  <button style={{ ...btn, background: '#f1c40f', whiteSpace: 'nowrap' }} onClick={() => takeLoan(loan.amount, loan.emergency)}>
                    🏦 Vay {formatMoney(loan.amount)} để nhập
                  </button>
                ) : (
                  <span style={{ opacity: 0.7 }}>Đã chạm hạn mức vay</span>
                )}
              </>
            )}
          </div>
        )}
        {order.accepted && <div style={{ fontSize: 11, opacity: 0.65 }}>Lỡ hẹn thì người đặt chê 1 sao{def.regular && ` và giảm ${STORY_ORDER_FRIEND_LOSS} thân thiết`}.</div>}
      </div>
    </>
  );
}

function QuestRow({ q, betBadge }: { q: Quest; betBadge?: boolean }) {
  const claimQuest = useGame((s) => s.claimQuest);
  const pct = Math.min(1, q.current / q.target);
  return (
    <div style={{ background: '#3a3a4d', borderRadius: 8, padding: '8px 12px', display: 'grid', gap: 5, opacity: q.claimed ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 22 }}>{q.icon}</span>
        <div style={{ flex: 1 }}>
          <b>{q.title}</b>
          {betBadge && <span style={{ background: 'rgba(241,196,15,0.16)', borderRadius: 4, padding: '1px 6px', marginLeft: 6, fontSize: 11, verticalAlign: 'middle' }}>🎯 kèo</span>}
          <div style={{ fontSize: 12, opacity: 0.75 }}>{q.description}</div>
        </div>
        <button style={{ ...btn, background: q.done && !q.claimed ? '#2ecc71' : '#555', color: q.done && !q.claimed ? '#fff' : '#bbb' }}
          disabled={!q.done || q.claimed} onClick={() => claimQuest(q.id)}>
          {q.claimed ? '✔ Đã nhận' : q.done ? '🎁 Nhận' : 'Chưa xong'}
        </button>
      </div>
      <div style={{ height: 7, background: '#555', borderRadius: 4 }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 4, background: q.done ? '#2ecc71' : '#e67e22' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span>{q.current.toLocaleString('vi-VN')} / {q.target.toLocaleString('vi-VN')}</span>
        <span>Thưởng {formatMoney(q.money)}{q.xp ? ` · ${q.xp} XP` : ''}</span>
      </div>
    </div>
  );
}

const head: React.CSSProperties = { margin: '14px 0 8px', fontSize: 15 };
const btn: React.CSSProperties = { border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 13 };

/** Tôn trọng prefers-reduced-motion: tắt hẳn transition khi người dùng bật giảm chuyển động. */
const REDUCED_MOTION = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const BET_TRANSITION = REDUCED_MOTION ? 'none' : 'border-color 0.15s ease, background 0.15s ease, transform 0.15s ease';

/** MỘT QUYẾT ĐỊNH SÁNG: chốt 1 kèo — làm trọn VIỆC CHÍNH hôm nay (đông khách, bán hàng, doanh thu) ở mục
 * tiêu cao hơn thì nhận thêm, hụt thì không mất gì ngoài cơ hội. State kèo nằm trong store (questLog.bet)
 * nên sống sót mở/đóng panel + F5. */
function BetCard() {
  const s = useGame();
  const status = betStatus(s.day, s.questLog.bet);
  const totalMoney = dailyQuests(questContext(s)).reduce((n, q) => n + q.money, 0);

  if (status === 'won') {
    const bet = s.questLog.bet!;
    return (
      <div style={{ background: 'rgba(46,204,113,0.18)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 13, border: '2px solid #2ecc71' }}>
        🎉 trúng kèo +{formatMoney(bet.bonus)} — làm trọn việc chính hôm nay ở mục tiêu ×{bet.tier}
      </div>
    );
  }
  if (status === 'lost') {
    return (
      <div style={{ background: '#3a3a4d', borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 13, opacity: 0.6, border: '2px solid #f1c40f' }}>
        hụt kèo — mai thử lại
      </div>
    );
  }
  if (status === 'pending') return <BetPendingCard />;
  // GD104: nén thẻ chưa chốt ≤200px @390 — card padding 6/10, giải thích gọn 1 câu,
  // option vẫn ≥40px cao (minHeight 40), đủ tên kèo + mục tiêu ×N + thưởng thêm X.
  return (
    <div style={{ background: '#3a3a4d', borderRadius: 8, padding: '6px 10px', marginBottom: 8 }}>
      <b style={{ fontSize: 13 }}>🎯 Đặt kèo hôm nay</b>
      <div style={{ fontSize: 12, opacity: 0.75, margin: '2px 0 4px' }}>Chốt 1 kèo — làm trọn việc chính hôm nay (đông khách, bán hàng, doanh thu) là nhận thêm, hụt thì không mất gì.</div>
      <div style={{ display: 'grid', gap: 4 }}>
        {BET_TIERS.map((t) => <BetOption key={t.tier} tier={t} totalMoney={totalMoney} />)}
      </div>
    </div>
  );
}

/** Đã chốt: thẻ thu gọn 1 hàng + nút đổi kèo (chỉ khi kèo chưa phân định — xong/hụt là chốt luôn, không đổi được).
 * GD109: hiện tiến độ sống của KÈO (bộ việc chính X/Y) để người chơi biết còn cách trúng bao xa — không hộp đen. */
function BetPendingCard() {
  const s = useGame();
  const [open, setOpen] = useState(false);
  const bet = s.questLog.bet!;
  const def = BET_TIERS.find((t) => t.tier === bet.tier) ?? BET_TIERS[0];
  const totalMoney = dailyQuests(questContext(s)).reduce((n, q) => n + q.money, 0);
  const core = betCoreSetProgress(questContext(s));
  const corePct = core.total ? Math.round((core.done / core.total) * 100) : 0;
  return (
    <div style={{ background: '#3a3a4d', borderRadius: 8, padding: '7px 12px', marginBottom: 8, border: '2px solid #f1c40f' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, fontSize: 13 }}>
        <span style={{ flex: 1 }}>🎯 Kèo: <b>{def.name}</b> · thưởng thêm {formatMoney(betBonusMoney(bet.tier, totalMoney))} khi làm trọn việc chính</span>
        <button style={{ ...btn, background: '#2f2f40', color: '#fff', border: '1px solid #555', minHeight: 36, minWidth: 44, transition: BET_TRANSITION }}
          onClick={() => setOpen((v) => !v)}>Đổi kèo</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 2px', fontSize: 12 }}>
        <span style={{ opacity: 0.85, whiteSpace: 'nowrap' }}>Việc chính: <b>{core.done}/{core.total}</b> đã xong{core.allDone ? ' 🎉' : ''}</span>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#2f2f40', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${corePct}%`, background: core.allDone ? '#2ecc71' : '#f1c40f', transition: 'width 0.2s ease' }} />
        </div>
      </div>
      {open && (
        <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
          {BET_TIERS.map((t) => <BetOption key={t.tier} tier={t} totalMoney={totalMoney} current={bet.tier} />)}
        </div>
      )}
    </div>
  );
}

/** Một mức kèo: nút full-width ≥40px, hover viền vàng, bấm chốt luôn (state nằm ở store).
 * GD104: padding/icon/chữ phải gọn để 1 mức gói trọn 1 hàng ~40px @390 (dòng thưởng 11.5px). */
function BetOption({ tier, totalMoney, current }: { tier: BetTier; totalMoney: number; current?: number }) {
  const placeBet = useGame((g) => g.placeBet);
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  return (
    <button
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 40, textAlign: 'left', flexWrap: 'wrap',
        background: '#2f2f40', color: '#fff', border: `1px solid ${hover ? '#f1c40f' : '#555'}`,
        borderRadius: 6, padding: '4px 8px', fontSize: 13, cursor: 'pointer',
        transition: BET_TRANSITION, transform: press ? 'scale(0.98)' : 'none',
        outline: current === tier.tier ? '1px solid #f1c40f' : undefined,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onPointerDown={() => setPress(true)}
      onPointerUp={() => setPress(false)}
      onClick={() => placeBet(tier.tier)}
    >
      <span style={{ fontSize: 16 }}>{tier.icon}</span>
      <b>{tier.name}</b>
      <span style={{ marginLeft: 'auto', fontSize: 11.5, opacity: 0.85 }}>mục tiêu ×{tier.tier} · thưởng thêm {formatMoney(betBonusMoney(tier.tier, totalMoney))}</span>
    </button>
  );
}

/** Tín hiệu khép TRỌN BỘ nhiệm vụ hôm nay: đếm X/M + trạng thái xong hết / nhận hết thưởng (mồi "còn mấy việc là xong ngày"). */
function DailySetStatus() {
  const p = dailySetProgress(questContext(useGame()));
  if (p.total === 0) return null;
  if (p.allClaimed) {
    return <div style={{ background: 'rgba(46,204,113,0.22)', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 13 }}>🎉 Xong và nhận toàn bộ thưởng hôm nay ({p.done}/{p.total}) — mai về thử bộ mới!</div>;
  }
  if (p.allDone) {
    return <div style={{ background: 'rgba(241,196,15,0.18)', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 13 }}>🎉 Xong hết {p.done}/{p.total} việc hôm nay — bấm 🎁 Nhận (hoặc "Nhận tất cả") để lấy thưởng!</div>;
  }
  return (
    <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.85 }}>
      ✅ Đã xong <b>{p.done}/{p.total}</b> việc hôm nay ({p.pct}%) — còn <b>{p.total - p.done}</b> là khép trọn cả bộ. 🎯
    </div>
  );
}

/** Mồi \"kinh tế thật\" (GĐ106): tổng thưởng tiền của bộ ngày hôm nay và — khi tiệm đã đủ lãi và bị chặn
 * bởi trần (questEcoCap) — dòng nhắc cho thấy thưởng bộ neo theo lãi bình quân gần đây để không lấn át
 * sức bán thật. Tiệm nhỏ/chưa có lãi (không bị chặn) → ẩn (không nhiễu). */
function QuestEcoNote() {
  const s = useGame();
  const daily = dailyQuests(questContext(s));
  const total = daily.reduce((n, q) => n + q.money, 0);
  const avg = recentAvgProfit(s.history);
  const cap = questEcoCap(avg);
  if (!isFinite(cap)) return null; // chưa tới trần — không nói gì
  return (
    <div style={{ marginBottom: 8, fontSize: 11.5, opacity: 0.8 }}>
      💹 Thưởng bộ hôm nay <b>{formatMoney(total)}</b> — neo theo lãi bình quân gần đây ({formatMoney(avg)}/ngày, tối đa {QUEST_ECO_MULT}×), để việc bán hàng vẫn đáng công.
    </div>
  );
}
