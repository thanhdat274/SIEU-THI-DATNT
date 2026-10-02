import type { GoalState, PartyOrderState, QuestState, SaveGameData } from '@game/shared';
import { emptyQuestState, markQuestClaimed, normalizeQuestState, type QuestProgress, type QuestContext as QuestCtx } from './quests';
import { refreshAvailablePartyOrders, createInitialPartyOrderState } from './party-orders';
import { createInitialGoalState } from './goals';

/** Quản lý quests, party orders và goals. */
export class QuestManager {
  private state: QuestState = emptyQuestState();
  private partyOrders: PartyOrderState = createInitialPartyOrderState();
  private goals: GoalState = createInitialGoalState();

  constructor(initialSave: SaveGameData) {
    this.load(initialSave);
  }

  public load(saveData: SaveGameData): void {
    this.state = normalizeQuestState(saveData.quests);
    this.partyOrders = refreshAvailablePartyOrders(
      saveData.partyOrders ?? createInitialPartyOrderState(),
      saveData.worldTime?.day ?? 1,
      saveData.player?.level ?? 1
    );
    this.goals = saveData.goals ? structuredClone(saveData.goals) : createInitialGoalState();
  }

  public export(): {
    quests: QuestState;
    partyOrders: PartyOrderState;
    goals: GoalState;
  } {
    return {
      quests: this.state,
      partyOrders: structuredClone(this.partyOrders),
      goals: structuredClone(this.goals),
    };
  }

  /** Tham chiếu trực tiếp đến quests state (dùng để ghi). */
  public getState(): QuestState {
    return this.state;
  }

  /** Tham chiếu trực tiếp đến partyOrders (dùng để ghi). */
  public getPartyOrdersRef(): PartyOrderState {
    return this.partyOrders;
  }

  /** Tham chiếu trực tiếp đến goals (dùng để ghi). */
  public setState(val: QuestState): void { this.state = val; }
  public setPartyOrders(val: PartyOrderState): void { this.partyOrders = val; }
  public setGoals(val: GoalState): void { this.goals = val; }

  public getGoalsRef(): GoalState {
    return this.goals;
  }

  public advanceToDay(day: number, playerLevel: number): void {
    this.partyOrders = refreshAvailablePartyOrders(this.partyOrders, day, playerLevel);
  }

  /** Tìm quest claimable hôm nay. */
  public findClaimableQuest(questId: string, day: number): boolean {
    return (this.state.claimedDaily?.[day] ?? []).includes(questId);
  }

  /** Đánh dấu quest đã claim. */
  public markClaimed(questId: string, day: number): void {
    markQuestClaimed(this.state, day, questId);
  }
}
