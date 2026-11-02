import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { VendorAlertView } from '../ui/VendorAlert';

/** GĐ931 — nút nhập gấp tắt khi không đủ tiền, bật khi đủ (render thật qua VendorAlertView). */
const html = (money: number, storage: Record<string, number> = { nuoc: 3 }) => renderToStaticMarkup(createElement(VendorAlertView, {
  offer: { vendorId: 'xe_nuoc', items: { nuoc: 9 }, expiresAt: 9999 }, minutes: 0, storage, storageLots: newGameData().storageLots,
  priceOf: useGame.getState().priceOf, money, accept: () => true, decline: () => true,
}));
const rushBtn = (h: string) => h.match(/<button[^>]*>[^<]*Nhập gấp.*?<\/button>/)?.[0] ?? '';

describe('VendorAlertView — nút nhập gấp', () => {
  it('hết tiền: nút disabled', () => { const b = rushBtn(html(0)); expect(b).not.toBe(''); expect(b).toContain('disabled'); });
  it('đủ tiền: nút bấm được', () => { const b = rushBtn(html(1_000_000)); expect(b).not.toBe(''); expect(b).not.toContain('disabled'); });
  it('đủ kho: hiện nút bán sỉ thường, không có nhập gấp', () => { const h = html(0, { nuoc: 9 }); expect(rushBtn(h)).toBe(''); expect(h).toContain('Bán sỉ từ kho'); });
});
