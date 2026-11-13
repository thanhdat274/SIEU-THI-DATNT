import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AccountMenu, MoreMenu } from '../ui/HudMenus';

const noop = () => {};
describe('GĐ951 — HudMenus', () => {
  it('AccountMenu: chữ cái đầu khi không có ảnh, ảnh khi có; menu đóng sẵn', () => {
    const a = renderToStaticMarkup(createElement(AccountMenu, { name: 'Đạt', photo: null, status: 'Đã lưu', items: [{ label: 'Đăng xuất', on: noop }] }));
    expect(a).toContain('hud-avatar'); expect(a).toContain('Đạt'); expect(a).toContain('Đã lưu'); expect(a).not.toContain('Đăng xuất');
    const b = renderToStaticMarkup(createElement(AccountMenu, { name: 'Đạt', photo: 'http://x/p.png', status: 's', items: [] }));
    expect(b).toContain('<img'); expect(b).not.toContain('hud-avatar');
  });
  it('MoreMenu: chấm báo chỉ khi có badge và đã mở khoá, bỏ qua badge ★', () => {
    const t = (o: object) => ({ id: 'x', label: 'X', icon: 'i', on: noop, ...o }) as never;
    const render = (tools: unknown[], level = 5) => renderToStaticMarkup(createElement(MoreMenu, { tools: tools as never, level, onHelp: noop, onSettings: noop }));
    expect(render([t({})])).not.toContain('hud-dot');
    expect(render([t({ badge: '3' })])).toContain('hud-dot');
    expect(render([t({ badge: '★' })])).not.toContain('hud-dot');
    expect(render([t({ badge: '3', lock: 9 })], 5)).not.toContain('hud-dot');
  });
});
