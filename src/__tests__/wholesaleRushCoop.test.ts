import { describe, it, expect } from 'vitest';
import { cleanActionArgs } from '../net/actionArgs';

describe('GĐ930: nhập gấp đơn sỉ ở hẻm online', () => {
  it('tham số rush=true đi qua bộ lọc tham số thao tác và sống sót qua JSON', () => {
    const sent = JSON.parse(JSON.stringify(cleanActionArgs([true])));
    expect(sent).toEqual([true]);
  });
  it('sự kiện click lọt vào không bị hiểu là rush (nhận sỉ thường)', () => {
    const click = { preventDefault: () => {} };
    expect(cleanActionArgs([click])).toEqual([]);
  });
});
