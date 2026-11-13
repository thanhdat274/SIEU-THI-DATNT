import { describe, expect, it } from 'vitest';
import { validatePlayerName } from '../data/playerName';
import { feedbackProblem } from '../data/feedback';
import { validateFeedback } from '../../server/feedback';

describe('tên người chơi', () => {
  const OK = ['Tiệm Cô Ba', 'An', 'Bé Na 2024'];
  const BAD = ['', 'A', 'x'.repeat(25), '<b>hi</b>', '!!!', 'me@mail.com', 'www.abc.vn', '0912345678', 'admin', 'đmm hay'];
  it.each(OK)('hợp lệ: %s', (n) => expect(validatePlayerName(n).ok).toBe(true));
  it.each(BAD)('từ chối: %s', (n) => expect(validatePlayerName(n).ok).toBe(false));
});

describe('góp ý', () => {
  it('client: kiểm độ dài và loại', () => {
    expect(feedbackProblem('idea', 'abc')).not.toBeNull();
    expect(feedbackProblem('idea', 'game rất vui')).toBeNull();
    expect(feedbackProblem('idea', 'x'.repeat(1001))).not.toBeNull();
  });
  it('server: cần install, loại, nội dung', () => {
    const base = { install: 'abcdefgh12', kind: 'bug', text: 'bị đứng hình' };
    expect(validateFeedback(base).ok).toBe(true);
    expect(validateFeedback({ ...base, install: 'x' }).ok).toBe(false);
    expect(validateFeedback({ ...base, kind: 'zzz' }).ok).toBe(false);
    expect(validateFeedback({ ...base, text: 'ab' }).ok).toBe(false);
  });
});
