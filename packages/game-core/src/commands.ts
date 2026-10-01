import { isGameCommand, type GameCommand } from '@game/shared';

export type CommandStatus = 'accepted' | 'rejected' | 'stale' | 'invalid' | 'forbidden' | 'duplicate_conflict';
export interface CommandResult {
  commandId: string;
  status: CommandStatus;
  revision: number;
  actualQuantity?: number;
  reason?: string;
}

export type CommandExecutionResult = boolean | { accepted: boolean; actualQuantity?: number; reason?: string };

interface Receipt extends CommandResult { actorId: string; payloadJson: string }

/** In-memory serial command gate. Persistence adapters can commit accepted state and receipt atomically. */
export class GameCommandCoordinator {
  private revision: number;
  private queue: Promise<void> = Promise.resolve();
  private readonly receipts = new Map<string, Receipt>();
  private readonly members: Set<string>;

  constructor(
    private readonly worldId: string,
    private readonly businessIds: ReadonlySet<string>,
    members: Iterable<string>,
    initialRevision = 0,
  ) {
    if (!worldId || !businessIds.size || !Number.isSafeInteger(initialRevision) || initialRevision < 0) {
      throw new Error('Invalid command coordinator scope');
    }
    this.revision = initialRevision;
    this.members = new Set(members);
  }

  getRevision(): number { return this.revision; }

  addMember(accountId: string): void { this.members.add(accountId); }

  submit(
    actorId: string,
    input: unknown,
    execute: (command: GameCommand) => boolean | CommandExecutionResult | Promise<boolean | CommandExecutionResult>
  ): Promise<CommandResult> {
    const commandId = input && typeof input === 'object' && 'commandId' in input && typeof input.commandId === 'string'
      ? input.commandId : 'invalid';
    const operation = this.queue.then(async () => {
      if (!isGameCommand(input)) return this.result(commandId, 'invalid');
      const command = input;
      if (!this.members.has(actorId)) return this.result(command.commandId, 'forbidden');
      if (command.worldId !== this.worldId || !this.businessIds.has(command.businessId)) {
        return this.result(command.commandId, 'forbidden');
      }
      const payloadJson = JSON.stringify(command.payload);
      const receiptKey = `${actorId}:${command.commandId}`;
      const prior = this.receipts.get(receiptKey);
      if (prior) return prior.payloadJson === payloadJson
        ? { commandId: prior.commandId, status: prior.status, revision: prior.revision, actualQuantity: prior.actualQuantity, reason: prior.reason }
        : this.result(command.commandId, 'duplicate_conflict');
      if (command.expectedRevision !== this.revision) return this.result(command.commandId, 'stale');

      const rawResult = await execute(command);
      const isBool = typeof rawResult === 'boolean';
      const accepted = isBool ? rawResult : rawResult.accepted;
      const actualQuantity = !isBool ? rawResult.actualQuantity : undefined;
      const reason = !isBool ? rawResult.reason : undefined;
      const status: CommandStatus = accepted ? 'accepted' : 'rejected';
      if (accepted) this.revision++;
      const receipt: Receipt = { commandId: command.commandId, status, revision: this.revision, actorId, payloadJson, actualQuantity, reason };
      this.receipts.set(receiptKey, receipt);
      return { commandId: receipt.commandId, status: receipt.status, revision: receipt.revision, actualQuantity, reason };
    });
    this.queue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private result(commandId: string, status: CommandStatus): CommandResult {
    return { commandId, status, revision: this.revision };
  }
}
