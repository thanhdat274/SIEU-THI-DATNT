// Kiểm tra tay trên trình duyệt thật cho gợi ý nhập hàng (không nằm trong `yarn test`).
// Cần: `yarn dev:web` đang chạy, `npm i playwright-core` ở nơi chạy script, và Chrome/Edge.
//   WEB_URL=http://localhost:3001/ CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" node tools/e2e/restock-suggestions.e2e.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const url = process.env.WEB_URL ?? 'http://localhost:3001/';
const executablePath = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
const vnd = text => Number(text.replace(/[^\d]/g, ''));

async function openSupplier(mode) {
  await page.goto(url, { waitUntil: 'load' });
  await page.getByText(mode === 'new' ? 'Chơi Thử (Local)' : /Tiếp tục ngày/).first().click();
  await page.waitForTimeout(3500);
  await page.getByRole('button', { name: 'Đại lý', exact: true }).click();
  await page.waitForTimeout(1000);
}
const suggest = async () => { await page.getByRole('button', { name: 'Tạo gợi ý nhập hàng' }).click(); await page.waitForTimeout(900); };
const cartTotal = async () => vnd(await page.getByText(/^Tổng: /).first().innerText());
const money = async () => vnd(await page.getByText('Tiền vốn hiện có').first().locator('xpath=..').innerText());

await openSupplier('new');

// 1) Bấm gợi ý nhiều lần: giỏ không vượt tiền và chừa quỹ dự phòng 10%.
await suggest();
const cash = await money();
const afterFirst = await cartTotal();
assert.ok(afterFirst <= cash * 0.9 + 1, `Giỏ ${afterFirst} phải chừa 10% của ${cash}`);
await suggest(); await suggest();
assert.ok(await cartTotal() <= cash * 0.9 + 1, 'Bấm gợi ý nhiều lần không vượt tiền');
assert.equal(await page.getByText(/^Thiếu /).count(), 0, 'Không hiện "Thiếu tiền"');

// 2) Khung giải thích gợi ý được cuộn vào vùng nhìn thấy, không nằm dưới thanh giỏ.
const box = await page.getByLabel('Giỏ hàng gợi ý').boundingBox();
assert.ok(box && box.y >= 0 && box.y < 900, 'Khung giải thích nằm trong màn hình');

// 3) Đổi cài đặt → ghi vào save (xóa localStorage rồi tải lại bằng "Tiếp tục").
await page.getByLabel('Phần trăm ngân sách cho hàng đang bán').fill('70');
await page.getByLabel('Số món mới nhập thử tối đa').fill('2');
await page.getByLabel('Phần trăm tiền mặt giữ lại').fill('50');
await page.getByLabel('Chừa tiền lương và thuế').uncheck();
await page.waitForTimeout(1800); // chờ tự lưu (debounce 600 ms)
await page.evaluate(() => localStorage.removeItem('supplier-suggest-options'));
await openSupplier('continue');
const read = async () => [
  await page.getByLabel('Phần trăm ngân sách cho hàng đang bán').inputValue(),
  await page.getByLabel('Số món mới nhập thử tối đa').inputValue(),
  await page.getByLabel('Phần trăm tiền mặt giữ lại').inputValue(),
  await page.getByLabel('Chừa tiền lương và thuế').isChecked(),
];
assert.deepEqual(await read(), ['70', '2', '50', false], 'Cài đặt khôi phục từ save');

assert.deepEqual(errors, [], `Không có lỗi console: ${errors.join(' | ')}`);
console.log('PASS restock-suggestions e2e');
await browser.close();
