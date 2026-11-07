import { describe, it, expect } from 'vitest';
import { groupTools } from '../ui/groupTools';

describe('Playtest P1 M5 — menu Thêm không lặp tiêu đề nhóm', () => {
  it('gom nhóm không liền nhau, giữ thứ tự xuất hiện đầu', () => {
    const t = [{ l: 'a', group: 'X' }, { l: 'b', group: 'Y' }, { l: 'c', group: 'X' }, { l: 'd' }];
    expect(groupTools(t).map((x) => x.l)).toEqual(['a', 'c', 'b', 'd']);
  });
  it('mỗi nhóm chỉ là một cụm liên tiếp', () => {
    const t = [{ group: 'Nhân sự & khách' }, { group: 'Ngoài tiệm' }, { group: 'Nhân sự & khách' }];
    const g = groupTools(t);
    const heads = g.filter((x, i) => x.group !== g[i - 1]?.group).map((x) => x.group);
    expect(heads).toEqual(['Nhân sự & khách', 'Ngoài tiệm']);
  });
});
