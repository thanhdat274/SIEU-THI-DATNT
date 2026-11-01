import { describe, it, expect, beforeEach } from 'vitest';
import { useGame, newGameData } from '../core/store';
import { licenseById, licenseStatus, requiredLicenses, missingLicenses, LICENSES } from '../data/licenses';

// Coverage sweep GĐ296: buyLicense chưa có test hành vi nào (chỉ xuất hiện trong coopGuard như
// nhãn phân loại). Đây là thao tác TRỪ TIỀN THẬT → phải khoá: đủ tiền/thiếu tiền, cấp mới vs
// gia hạn (cộng nối tiếp từ hạn cũ, không tính lại từ hôm nay), và sổ sách (stats/totals spent).

describe('buyLicense — cấp mới & gia hạn giấy phép (GĐ296)', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 20, level: 20, money: 5_000_000 });
  });

  it('cấp MỚI: hạn = hôm nay + days, trừ tiền, ghi sổ chi', () => {
    const def = licenseById('business');
    const before = useGame.getState();
    expect(before.licenses.business).toBeUndefined();

    useGame.getState().buyLicense('business');
    const s = useGame.getState();

    expect(s.licenses.business).toBe(20 + def.days);
    expect(s.money).toBe(before.money - def.cost);
    expect(s.stats.spent).toBe(before.stats.spent + def.cost);
    expect(s.totals.spent).toBe(before.totals.spent + def.cost);
  });

  it('GIA HẠN khi còn hạn: cộng nối tiếp từ hạn CŨ (không mất số ngày còn lại)', () => {
    const def = licenseById('business');
    useGame.setState({ licenses: { business: 50 } }); // còn 30 ngày
    const before = useGame.getState();

    useGame.getState().buyLicense('business');
    const s = useGame.getState();

    expect(s.licenses.business).toBe(50 + def.days); // KHÔNG phải 20 + days
    expect(s.money).toBe(before.money - def.cost);
  });

  it('gia hạn khi sắp hết hạn (expiring) cũng cộng nối tiếp', () => {
    const def = licenseById('business');
    useGame.setState({ licenses: { business: 22 } }); // còn 2 ngày → expiring
    expect(licenseStatus(useGame.getState().licenses, 'business', 20)).toBe('expiring');

    useGame.getState().buyLicense('business');
    expect(useGame.getState().licenses.business).toBe(22 + def.days);
  });

  it('ĐÃ HẾT HẠN: tính lại từ hôm nay (không cộng dồn quá khứ)', () => {
    const def = licenseById('business');
    useGame.setState({ licenses: { business: 10 } }); // hết hạn từ ngày 11
    expect(licenseStatus(useGame.getState().licenses, 'business', 20)).toBe('expired');

    useGame.getState().buyLicense('business');
    expect(useGame.getState().licenses.business).toBe(20 + def.days);
  });

  it('KHÔNG đủ tiền: không đổi gì (không giấy phép, không trừ tiền, không ghi sổ)', () => {
    useGame.setState({ money: 1000 });
    const before = useGame.getState();

    useGame.getState().buyLicense('business');
    const s = useGame.getState();

    expect(s.money).toBe(1000);
    expect(s.licenses.business).toBeUndefined();
    expect(s.stats.spent).toBe(before.stats.spent);
    expect(s.totals.spent).toBe(before.totals.spent);
  });

  it('đúng bằng giá tiền → vẫn mua được (biên, không âm két)', () => {
    const def = licenseById('food');
    useGame.setState({ money: def.cost });
    useGame.getState().buyLicense('food');
    const s = useGame.getState();
    expect(s.money).toBe(0);
    expect(s.licenses.food).toBe(20 + def.days);
  });

  it('mua nhiều giấy phép khác nhau: mỗi tờ độc lập, tiền trừ cộng dồn', () => {
    useGame.setState({ money: 9_000_000 });
    const before = useGame.getState();
    const total = LICENSES.reduce((n, l) => n + l.cost, 0);

    for (const l of LICENSES) useGame.getState().buyLicense(l.id);
    const s = useGame.getState();

    expect(s.money).toBe(before.money - total);
    for (const l of LICENSES) expect(s.licenses[l.id]).toBe(20 + l.days);
  });
});

describe('requiredLicenses / missingLicenses — giấy phép nào bắt buộc (GĐ296)', () => {
  it('dưới cấp mở khóa: không bắt buộc gì', () => {
    expect(requiredLicenses({ level: 1, hasCookStation: false, shelved: [] })).toEqual([]);
  });

  it('cấp 12: kinh doanh bắt buộc; an toàn thực phẩm chỉ khi có bếp hoặc đồ tươi', () => {
    expect(requiredLicenses({ level: 12, hasCookStation: false, shelved: [] })).toEqual(['business']);
    expect(requiredLicenses({ level: 14, hasCookStation: true, shelved: [] })).toEqual(['business', 'food']);
    expect(requiredLicenses({ level: 14, hasCookStation: false, shelved: ['rau'] })).toEqual(['business', 'food']);
  });

  it('cấp 16 + bày bia: bắt buộc giấy phép rượu bia', () => {
    expect(requiredLicenses({ level: 16, hasCookStation: false, shelved: ['bia'] })).toEqual(['business', 'alcohol']);
    expect(requiredLicenses({ level: 16, hasCookStation: false, shelved: ['mi'] })).toEqual(['business']);
  });

  it('missingLicenses: thiếu hoặc hết hạn đều tính; còn hạn/sắp hạn thì không', () => {
    const need: ('business' | 'food' | 'alcohol')[] = ['business', 'food', 'alcohol'];
    expect(missingLicenses({}, need, 20)).toEqual(need); // chưa có tờ nào
    expect(missingLicenses({ business: 10, food: 100, alcohol: 22 }, need, 20))
      .toEqual(['business']); // chỉ business hết hạn; food valid, alcohol expiring (vẫn còn hạn)
  });
});
