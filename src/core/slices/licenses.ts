import { licenseById, licenseStatus, type LicenseId } from '../../data/licenses';
import { formatMoney } from '../../data/products';
import type { GameState, GetState, SetState } from '../gameTypes';

/** Giấy phép: xin mới hoặc gia hạn (còn hạn thì cộng nối tiếp). Thanh tra chạy ở cuối ngày. */

export const createLicensesSlice = (set: SetState, get: GetState): Pick<GameState, 'buyLicense'> => ({
  buyLicense: (id: LicenseId) => {
    const s = get();
    const def = licenseById(id);
    if (s.money < def.cost) return s.notify('Không đủ tiền làm giấy phép!');
    const status = licenseStatus(s.licenses, id, s.day);
    const from = status === 'valid' || status === 'expiring' ? s.licenses[id]! : s.day;
    set({
      licenses: { ...s.licenses, [id]: from + def.days },
      money: s.money - def.cost,
      stats: { ...s.stats, spent: s.stats.spent + def.cost },
      totals: { ...s.totals, spent: s.totals.spent + def.cost },
    });
    s.notify(`${def.icon} ${status === 'none' ? 'Đã được cấp' : 'Đã gia hạn'} ${def.name} (${formatMoney(def.cost)}), hiệu lực tới ngày ${from + def.days}`);
  },
});
