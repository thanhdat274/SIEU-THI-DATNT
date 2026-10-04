import React, { useState } from 'react';
import type { FestivalGoalProgressInfo, GoalProgressInfo, QuestProgress, StoryChapterProgress, WeeklyQuestProgressInfo } from '@game/core';
import { getLevelUnlocks, MAX_PLAYER_LEVEL } from '@game/core';
import type { ActivePartyOrder, InventoryItem } from '@game/shared';
import { GOAL_MAP, PARTY_ORDER_MAP, PRODUCT_MAP, STORY_CHAPTER_MAP, WEEKLY_QUESTS } from '@game/data';
import { money, PixelButton, PixelDialog, PixelProgress } from './pixel';

/** Returns false when the claim failed so a batch claim can stop. */
type ClaimHandler = (id: string) => void | boolean | Promise<void | boolean>;

export interface QuestModalProps {
  daily: QuestProgress[];
  story: QuestProgress | null;
  level: number;
  onOpenLevelRoadmap: () => void;
  onClaim: ClaimHandler;
  onClose: () => void;
  // Party orders
  partyOrders?: ActivePartyOrder[];
  onRespondPartyOrder?: (orderId: string, accept: boolean) => void;
  onFulfillPartyOrder?: (orderId: string) => void;
  /** Nhận (nếu cần) + nhập hỏa tốc phần thiếu + giao ngay; `rushQuote` trả tiền nhập hỏa tốc (<0 nếu không có nguồn). */
  onRushFulfillPartyOrder?: (orderId: string) => void;
  rushQuote?: (orderId: string) => number;
  inventory?: InventoryItem[];
  // Goals & Weekly Quests
  goals?: GoalProgressInfo[];
  weeklyQuests?: WeeklyQuestProgressInfo[];
  festivalGoals?: FestivalGoalProgressInfo[];
  onClaimFestivalGoal?: ClaimHandler;
  onClaimGoal?: ClaimHandler;
  onClaimWeeklyQuest?: ClaimHandler;
  // Chương cốt truyện có lời thoại
  chapters?: StoryChapterProgress[];
  onBeginChapter?: ClaimHandler;
  onClaimChapter?: ClaimHandler;
}

type QuestTab = 'daily' | 'party' | 'goals' | 'chapters';

const QuestRow: React.FC<{ quest: QuestProgress; onClaim: ClaimHandler; disabled?: boolean }> = ({ quest, onClaim, disabled }) => (
  <li className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 4 }}>
    <strong>{quest.title}</strong>
    <span className="muted">{quest.description}</span>
    <PixelProgress label={quest.title} value={quest.current} max={quest.target} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span className="tabular">Thưởng {money(quest.reward.money)}{quest.reward.experience > 0 ? ` · ${quest.reward.experience} XP` : ''}</span>
      <PixelButton variant="teal" disabled={disabled || !quest.done || quest.claimed} onClick={() => void onClaim(quest.id)}>
        {quest.claimed ? 'Đã nhận' : quest.done ? 'Nhận thưởng' : 'Chưa xong'}
      </PixelButton>
    </div>
  </li>
);

export const QuestModal: React.FC<QuestModalProps> = ({
  daily,
  story,
  level,
  onClaim,
  onClose,
  onOpenLevelRoadmap,
  partyOrders = [],
  onRespondPartyOrder,
  onFulfillPartyOrder,
  onRushFulfillPartyOrder,
  rushQuote,
  inventory = [],
  goals = [],
  weeklyQuests = [],
  festivalGoals = [],
  onClaimFestivalGoal,
  onClaimGoal,
  onClaimWeeklyQuest,
  chapters = [],
  onBeginChapter,
  onClaimChapter,
}) => {
  const [activeTab, setActiveTab] = useState<QuestTab>('daily');
  const [claimingAll, setClaimingAll] = useState(false);

  const capped = level >= MAX_PLAYER_LEVEL;
  const next = capped ? null : getLevelUnlocks(level + 1);
  const nextItems = next ? [...next.products, ...next.suppliers] : [];
  const nextFeatures = [
    ...(next?.staffUnlocked ? ['Mở tuyển nhân viên'] : []),
    ...(next?.staffSlots ? [`+${next.staffSlots} chỗ nhân viên`] : []),
    ...(next?.trafficMultiplier ? [`Lưu lượng khách +${next.trafficMultiplier.toFixed(1)}×`] : []),
    ...(next?.customerCapacity ? [`Sức chứa thêm ${next.customerCapacity} khách đồng thời`] : []),
    ...(next?.stalls.map((name) => `Có thể mở quầy ${name}`) ?? []),
    ...(next?.plots.map((plot) => `Có thể mua ${plot.name} (${money(plot.cost)})`) ?? []),
  ];

  // Helper check stock for party order
  const checkOrderStock = (orderId: string) => {
    const def = PARTY_ORDER_MAP[orderId];
    if (!def) return false;
    for (const item of def.items) {
      const inv = inventory.find((i) => i.productId === item.productId);
      const usable = inv?.lots
        ? inv.lots.reduce((sum, l) => sum + l.quantity, 0)
        : (inv?.quantity ?? 0);
      if (usable < item.quantity) return false;
    }
    return true;
  };

  const pendingOrdersCount = partyOrders.filter((o) => o.status === 'pending' || (o.status === 'accepted' && checkOrderStock(o.orderId))).length;
  const claimableGoalsCount = goals.filter((g) => g.completed && !g.claimed).length + festivalGoals.filter((f) => f.completed && !f.claimed).length + weeklyQuests.filter((w) => w.completed && !w.claimed).length;

  const claimableChapters = chapters.filter((c) => c.status === 'completed' || c.status === 'available');
  const claimableDaily = [story, ...daily].filter((q): q is QuestProgress => !!q && q.done && !q.claimed);
  const claimableFestival = festivalGoals.filter((f) => f.completed && !f.claimed);
  const claimableWeekly = weeklyQuests.filter((w) => w.completed && !w.claimed);
  const claimableGoals = goals.filter((g) => g.completed && !g.claimed);

  /** Claims one by one (each claim is its own committed command) and stops at the first failure. */
  const claimAll = async (jobs: Array<() => void | boolean | Promise<void | boolean>>) => {
    if (claimingAll) return;
    setClaimingAll(true);
    try {
      for (const job of jobs) {
        if ((await job()) === false) break;
      }
    } finally {
      setClaimingAll(false);
    }
  };
  const claimAllDaily = () => claimAll(claimableDaily.map((q) => () => onClaim(q.id)));
  const claimAllGoals = () => claimAll([
    ...claimableFestival.map((f) => () => onClaimFestivalGoal?.(f.goalId)),
    ...claimableWeekly.map((w) => () => onClaimWeeklyQuest?.(w.questId)),
    ...claimableGoals.map((g) => () => onClaimGoal?.(g.goalId)),
  ]);

  return (
    <PixelDialog icon="star" title="SỔ NHIỆM VỤ & MỤC TIÊU" subtitle="Việc trong ngày, đơn tiệc xóm và hoài bão phát triển" onClose={onClose}>
      {/* Tab bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        <PixelButton
          variant={activeTab === 'daily' ? 'teal' : 'paper'}
          onClick={() => setActiveTab('daily')}
          style={{ flex: 1, padding: '6px 4px', fontSize: '0.85rem' }}
        >
          Nhiệm vụ ngày
        </PixelButton>
        <PixelButton
          variant={activeTab === 'party' ? 'teal' : 'paper'}
          onClick={() => setActiveTab('party')}
          style={{ flex: 1, padding: '6px 4px', fontSize: '0.85rem' }}
        >
          Đơn tiệc {pendingOrdersCount > 0 ? `(${pendingOrdersCount})` : ''}
        </PixelButton>
        <PixelButton
          variant={activeTab === 'goals' ? 'teal' : 'paper'}
          onClick={() => setActiveTab('goals')}
          style={{ flex: 1, padding: '6px 4px', fontSize: '0.85rem' }}
        >
          Mục tiêu & Tuần {claimableGoalsCount > 0 ? `(${claimableGoalsCount})` : ''}
        </PixelButton>
        <PixelButton
          variant={activeTab === 'chapters' ? 'teal' : 'paper'}
          onClick={() => setActiveTab('chapters')}
          style={{ flex: 1, padding: '6px 4px', fontSize: '0.85rem' }}
        >
          Cốt truyện {claimableChapters.length > 0 ? `(${claimableChapters.length})` : ''}
        </PixelButton>
      </div>

      {/* Tab 1: Nhiệm vụ ngày */}
      {activeTab === 'daily' && (
        <>
          {claimableDaily.length > 0 && (
            <PixelButton variant="teal" disabled={claimingAll} onClick={() => void claimAllDaily()}>
              {claimingAll ? 'Đang nhận…' : `Nhận tất cả (${claimableDaily.length})`}
            </PixelButton>
          )}
          <h3>Chuyện xóm nhỏ</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', display: 'grid', gap: 8 }}>
            {story ? <QuestRow quest={story} onClaim={onClaim} disabled={claimingAll} /> : <li className="muted">Bạn đã hoàn thành toàn bộ chuyện xóm hiện có.</li>}
          </ul>
          <h3>Nhiệm vụ hôm nay</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', display: 'grid', gap: 8 }}>
            {daily.map((quest) => <QuestRow key={quest.id} quest={quest} onClaim={onClaim} disabled={claimingAll} />)}
          </ul>
          <h3>{capped ? 'Cấp tối đa' : `Mốc cấp tiếp theo (cấp ${level + 1})`}</h3>
          <p className="muted">{capped ? `Bạn đã đạt cấp tối đa ${MAX_PLAYER_LEVEL}.` : nextItems.length || nextFeatures.length ? `Mở khóa: ${[...nextItems, ...nextFeatures].join(', ')}` : 'Cấp này chưa có mở khóa mới được thiết kế. Chạm thanh Cấp trên HUD để xem toàn bộ lộ trình.'}</p>
          <PixelButton icon="star" onClick={onOpenLevelRoadmap}>Xem lộ trình cấp đầy đủ</PixelButton>
        </>
      )}

      {/* Tab 2: Đơn tiệc có hạn */}
      {activeTab === 'party' && (
        <div style={{ display: 'grid', gap: 10 }}>
          {partyOrders.length === 0 ? (
            <div className="muted" style={{ padding: 12, textAlign: 'center' }}>
              Hiện chưa có đơn tiệc nào từ bà con trong hẻm. Hãy tiếp tục kinh doanh và mở cửa tiệm mỗi ngày!
            </div>
          ) : (
            [...partyOrders]
              .map((ord, index) => ({ ord, index }))
              .sort((a, b) => {
                const activeA = a.ord.status === 'pending' || a.ord.status === 'accepted' ? 0 : 1;
                const activeB = b.ord.status === 'pending' || b.ord.status === 'accepted' ? 0 : 1;
                if (activeA !== activeB) return activeA - activeB;
                if (a.ord.availableDay !== b.ord.availableDay) return b.ord.availableDay - a.ord.availableDay;
                return b.index - a.index;
              })
              .map(({ ord }) => ord)
              .map((ord) => {
              const def = PARTY_ORDER_MAP[ord.orderId];
              if (!def) return null;
              const hasStock = checkOrderStock(ord.orderId);

              return (
                <div key={ord.orderId} className="pixel-panel" style={{ padding: 10, display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{def.title}</strong>
                    <span className="badge">
                      {ord.status === 'pending'
                        ? 'Chờ duyệt'
                        : ord.status === 'accepted'
                        ? `Còn ${Math.max(0, ord.deadlineDay - ord.availableDay)} ngày`
                        : ord.status === 'completed'
                        ? 'Đã giao'
                        : ord.status === 'declined'
                        ? 'Đã từ chối'
                        : 'Quá hạn'}
                    </span>
                  </div>

                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    Người đặt: <strong>{def.customerName}</strong> — {def.description}
                  </div>

                  {/* Danh sách món yêu cầu */}
                  <div style={{ margin: '4px 0', fontSize: '0.85rem' }}>
                    <strong>Món yêu cầu (kho bãi):</strong>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      {def.items.map((it) => {
                        const prod = PRODUCT_MAP[it.productId];
                        const inv = inventory.find((i) => i.productId === it.productId);
                        const curQty = inv?.quantity ?? 0;
                        const isEnough = curQty >= it.quantity;
                        return (
                          <li key={it.productId} style={{ color: isEnough ? 'inherit' : '#d9534f' }}>
                            {prod?.name ?? it.productId}: <strong>{curQty}/{it.quantity}</strong> {isEnough ? '✓' : '(thiếu hàng)'}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span className="tabular" style={{ color: 'var(--color-primary)' }}>
                      Thưởng: {money(def.reward.money)} · +{def.reward.reputation} Uy tín
                    </span>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {(ord.status === 'pending' || ord.status === 'accepted') && !hasStock && onRushFulfillPartyOrder && rushQuote && (() => {
                        const cost = rushQuote(ord.orderId);
                        return (
                          <PixelButton
                            variant="teal"
                            disabled={cost < 0}
                            title="Nhập phần còn thiếu giao ngay trong ngày (phụ phí hỏa tốc +30%, đại lý nghỉ sau 22:00), rồi giao đơn luôn"
                            onClick={() => onRushFulfillPartyOrder(ord.orderId)}
                          >
                            {cost < 0 ? 'Không có nguồn hàng (hỏa tốc nghỉ sau 22h)' : `${ord.status === 'pending' ? 'Nhận đơn + ' : ''}Nhập hỏa tốc & giao (${money(cost)})`}
                          </PixelButton>
                        );
                      })()}
                      {ord.status === 'pending' && onRespondPartyOrder && (
                        <>
                          <PixelButton variant="teal" onClick={() => onRespondPartyOrder(ord.orderId, true)}>
                            Nhận đơn
                          </PixelButton>
                          <PixelButton variant="paper" onClick={() => onRespondPartyOrder(ord.orderId, false)}>
                            Từ chối
                          </PixelButton>
                        </>
                      )}

                      {ord.status === 'accepted' && onFulfillPartyOrder && (
                        <PixelButton
                          variant="teal"
                          disabled={!hasStock}
                          onClick={() => onFulfillPartyOrder(ord.orderId)}
                        >
                          {hasStock ? 'Giao hàng (FEFO)' : 'Chưa đủ hàng'}
                        </PixelButton>
                      )}

                      {ord.status === 'completed' && <span className="muted">✓ Hoàn tất</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 3: Sổ mục tiêu & Tuần */}
      {activeTab === 'goals' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {claimableGoalsCount > 0 && (
            <PixelButton variant="teal" disabled={claimingAll} onClick={() => void claimAllGoals()}>
              {claimingAll ? 'Đang nhận…' : `Nhận tất cả (${claimableGoalsCount})`}
            </PixelButton>
          )}
          {/* Mục tiêu ngày hội (chỉ hiện khi đang có ngày hội) */}
          {festivalGoals.length > 0 && (
            <div>
              <h3 style={{ margin: '0 0 6px 0' }}>Mục tiêu ngày hội</h3>
              <div style={{ display: 'grid', gap: 6 }}>
                {festivalGoals.map((f) => (
                  <div key={f.goalId} className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{f.title}</strong>
                      <span className="tabular" style={{ fontSize: '0.85rem' }}>
                        {f.currentValue.toLocaleString()} / {f.targetValue.toLocaleString()}
                      </span>
                    </div>
                    <span className="muted" style={{ fontSize: '0.85rem' }}>{f.description} Tính doanh số đến hết ngày {f.lastDay}, nhận thưởng đến hết ngày {f.claimUntilDay}.</span>
                    <PixelProgress label={f.title} value={f.currentValue} max={f.targetValue} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <span className="tabular" style={{ fontSize: '0.85rem' }}>
                        Thưởng {money(f.rewardMoney)} · +{f.rewardReputation} Uy tín
                      </span>
                      <PixelButton
                        variant="teal"
                        disabled={claimingAll || !f.completed || f.claimed}
                        onClick={() => void onClaimFestivalGoal?.(f.goalId)}
                        style={{ minWidth: 90 }}
                      >
                        {f.claimed ? 'Đã nhận' : f.completed ? 'Nhận thưởng' : 'Chưa xong'}
                      </PixelButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nhiệm vụ tuần */}
          <div>
            <h3 style={{ margin: '0 0 6px 0' }}>Nhiệm vụ tuần này</h3>
            <div style={{ display: 'grid', gap: 6 }}>
              {weeklyQuests.map((wq) => {
                const def = WEEKLY_QUESTS.find((q) => q.id === wq.questId);
                if (!def) return null;
                return (
                  <div key={wq.questId} className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{def.title}</strong>
                      <span className="tabular" style={{ fontSize: '0.85rem' }}>
                        {wq.currentValue.toLocaleString()} / {wq.targetValue.toLocaleString()}
                      </span>
                    </div>
                    <span className="muted" style={{ fontSize: '0.85rem' }}>{def.description}</span>
                    <PixelProgress label={def.title} value={wq.currentValue} max={wq.targetValue} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <span className="tabular" style={{ fontSize: '0.85rem' }}>
                        Thưởng {money(def.rewardMoney)} · +{def.rewardReputation} Uy tín
                      </span>
                      <PixelButton
                        variant="teal"
                        disabled={claimingAll || !wq.completed || wq.claimed}
                        onClick={() => void onClaimWeeklyQuest?.(wq.questId)}
                        style={{ minWidth: 90 }}
                      >
                        {wq.claimed ? 'Đã nhận' : wq.completed ? 'Nhận thưởng' : 'Chưa xong'}
                      </PixelButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mục tiêu dài hạn */}
          <div>
            <h3 style={{ margin: '8px 0 6px 0' }}>Mục tiêu phát triển tiệm</h3>
            <div style={{ display: 'grid', gap: 6 }}>
              {goals.map((g) => {
                const def = GOAL_MAP[g.goalId];
                if (!def) return null;
                return (
                  <div key={g.goalId} className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{def.title}</strong>
                      <span className="tabular" style={{ fontSize: '0.85rem' }}>
                        {g.currentValue.toLocaleString()} / {g.targetValue.toLocaleString()}
                      </span>
                    </div>
                    <span className="muted" style={{ fontSize: '0.85rem' }}>{def.description}</span>
                    <PixelProgress label={def.title} value={g.currentValue} max={g.targetValue} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <span className="tabular" style={{ fontSize: '0.85rem' }}>
                        Thưởng {money(def.rewardMoney)} · +{def.rewardReputation} Uy tín
                      </span>
                      <PixelButton
                        variant="teal"
                        disabled={claimingAll || !g.completed || g.claimed}
                        onClick={() => void onClaimGoal?.(g.goalId)}
                        style={{ minWidth: 90 }}
                      >
                        {g.claimed ? 'Đã nhận' : g.completed ? 'Nhận thưởng' : 'Chưa xong'}
                      </PixelButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Cốt truyện (chương có lời thoại) */}
      {activeTab === 'chapters' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {chapters.map((progress) => {
            const def = STORY_CHAPTER_MAP[progress.chapterId];
            if (!def) return null;
            const locked = progress.status === 'locked';
            return (
              <div key={def.id} className="pixel-panel" style={{ padding: 8, display: 'grid', gap: 4, opacity: locked ? 0.65 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span aria-hidden="true" style={{ fontSize: '1.6rem' }}>{def.portrait}</span>
                  <strong>Chương {def.chapter}: {def.title}</strong>
                </div>
                {locked ? (
                  <span className="muted">Mở khi đạt cấp {def.unlockLevel}{def.chapter > 1 ? ' và nhận thưởng chương trước.' : '.'}</span>
                ) : (
                  <>
                    {def.dialog.map((line, i) => <span key={i} className="muted" style={{ fontSize: '0.9rem' }}>“{line}”</span>)}
                    <span style={{ fontSize: '0.9rem' }}>Mục tiêu: {def.goal}</span>
                    {progress.status !== 'available' && <PixelProgress label={def.title} value={progress.current} max={progress.target} />}
                    {progress.rivalEndsDay !== undefined && progress.status === 'started' && <span className="muted" style={{ fontSize: '0.85rem' }}>Đợt cạnh tranh kéo dài tới hết ngày {progress.rivalEndsDay}.</span>}
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span className="tabular" style={{ fontSize: '0.85rem' }}>Thưởng {money(def.rewardMoney)} · {def.rewardExp} XP</span>
                  {progress.status === 'completed' ? (
                    <PixelButton variant="teal" disabled={claimingAll} onClick={() => void onClaimChapter?.(def.id)} style={{ minWidth: 110 }}>Nhận thưởng</PixelButton>
                  ) : progress.status === 'available' ? (
                    <PixelButton variant="teal" disabled={claimingAll} onClick={() => void onBeginChapter?.(def.id)} style={{ minWidth: 110 }}>Bắt đầu chương</PixelButton>
                  ) : (
                    <PixelButton variant="paper" disabled style={{ minWidth: 110 }}>
                      {progress.status === 'claimed' ? 'Đã nhận' : progress.status === 'started' ? 'Đang thực hiện' : `Cấp ${def.unlockLevel}`}
                    </PixelButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PixelDialog>
  );
};
