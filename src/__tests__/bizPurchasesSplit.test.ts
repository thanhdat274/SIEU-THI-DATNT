import { describe, expect, it } from 'vitest';
import * as split from '../core/bizPurchases';
import * as biz from '../core/biz';

describe('GĐ979 — core/bizPurchases tách khỏi core/biz', () => {
  it('biz vẫn re-export đúng các hàm mua sắm', () => {
    for (const n of ['buyPet', 'feedPet', 'buyUpgrade', 'buyHomeItem', 'buyService', 'earnService'] as const) {
      expect(biz[n]).toBe(split[n]);
    }
  });
});
