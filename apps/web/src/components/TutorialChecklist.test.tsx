import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { TutorialItem } from '@game/core';
import { TutorialChecklist } from './TutorialChecklist';

console.log('--- Testing TutorialChecklist (render phía server) ---');

const item = (id: string, label: string, done: boolean): TutorialItem => ({ id, label, done } as TutorialItem);
const html = (items: TutorialItem[]) => renderToStaticMarkup(<TutorialChecklist items={items} />);

// Xong hết thì không render gì
assert.equal(html([]), '');
assert.equal(html([item('a', 'Bán món đầu tiên', true)]), '');

// Mặc định thu gọn: đếm tiến độ, chỉ hiện bước kế tiếp, không có danh sách
{
  const out = html([item('a', 'Nhập hàng', true), item('b', 'Xếp hàng lên kệ', false), item('c', 'Mở cửa', false)]);
  assert.ok(out.includes('Hướng dẫn (1/3)'), 'đếm 1/3');
  assert.ok(out.includes('Xếp hàng lên kệ'), 'hiện bước chưa xong đầu tiên');
  assert.ok(!out.includes('Mở cửa'), 'không lộ các bước sau khi thu gọn');
  assert.ok(!out.includes('Nhập hàng'), 'không hiện bước đã xong khi thu gọn');
  assert.ok(!out.includes('<ul'), 'không có danh sách khi thu gọn');
  assert.ok(out.includes('aria-expanded="false"'), 'aria-expanded=false');
  assert.ok(out.includes('aria-label="Checklist hướng dẫn"'), 'có nhãn vùng');
  assert.ok(out.includes('aria-label="Ẩn checklist hướng dẫn"'), 'nút ẩn có nhãn truy cập');
}

// Nhãn có ký tự HTML bị escape
{
  const out = html([item('x', '<script>alert(1)</script>', false)]);
  assert.ok(!out.includes('<script>'), 'escape HTML trong nhãn');
  assert.ok(out.includes('&lt;script&gt;'));
}

console.log('PASS TutorialChecklist');
