import assert from 'node:assert/strict';
import { isSaveGameData } from '@game/shared';
import { QA_SEED_KINDS, buildQaSave } from './qa-seed';

export function runQaSeedTests(): void {
  for (const kind of QA_SEED_KINDS) {
    const save = buildQaSave(kind);
    assert.equal(isSaveGameData(save), true, `bộ '${kind}' tạo save hợp lệ`);
    assert.equal(isSaveGameData(JSON.parse(JSON.stringify(save))), true, `bộ '${kind}' hợp lệ sau JSON`);
  }
}
