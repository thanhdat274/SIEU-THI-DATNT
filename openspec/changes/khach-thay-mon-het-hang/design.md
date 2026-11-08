# Thiết kế — Khách thay món khi hết hàng

## Điểm cắm trong code hiện tại

Nhánh đã có sẵn trong `src/agents/customers.ts` (vòng `for (const want of c.wants)`):

```ts
const price = st.takeFromShelf(want, shelfUid);
if (price !== null) { /* vào giỏ */ }
else {
  c.missing++; c.missed.push({ id: want, why: 'stock' });
  st.noteMiss('stock', want); c.say(`❓ Hết ${shortName}!`);
}
```

→ Thay đổi duy nhất nằm trong nhánh `else`: trước khi ghi lỡ, gọi helper thử thay món.

## Helper thuần (đặt ở `src/data/pricing.ts` hoặc file mới `src/data/substitute.ts`)

```ts
export const SUBSTITUTE_CHANCE = 0.6; // tune khi đo — ghi mức đo vào PROGRESS

export function chooseSubstitute(
  want: string,
  shelf: Furniture | undefined,      // kệ khách đang đứng
  priceOf: (id: string) => number,
  hotIds: ReadonlySet<string>,       // hàng hot/dịp lễ đang diễn ra
  rng: () => number,                 // simRng
): string | null
```

- Ứng viên: `shelf.tiers.filter(t => t.productId && t.productId !== want && t.count > 0 && priceOf(t.productId) <= priceOf(want))`.
- Không ứng viên → null (không tốn lượt rng).
- Cổng xác suất: `rng() >= SUBSTITUTE_CHANCE` → null.
- Thứ tự chọn: cùng `productById(want).category` → có trong `hotIds` → còn lại theo thứ tự tầng kệ (tự nhiên, không sort thêm).
- Thuần, không đụng store → test unit dễ, tái lập được.

## Lưu ý tích hợp

- `shelfUid` có thể undefined (kệ hết món muốn → `shelfWith(want)` trả undefined, khách vẫn đứng ở vị trí walk trước đó). Trường hợp này **không thay** — khách phải đứng trước một kệ thật sự mới "nhìn thấy" hàng. Ghi rõ trong test.
- Sau khi lấy món thay: `c.basket.push({ id: sub, price })` + `pullCombo(c, sub)` như món thường + bong bóng thoại `c.say('🔄 Lấy món này thay!')` (bubble, không đụng ô thông báo).
- `c.missing` chỉ tăng khi KHÔNG thay được — giữ nguyên ý nghĩa của `bigBasketAbandons`.
- Bộ đếm: `stats.substituted` — đọc/ghi qua `useGame.setState` như `clawWins` (GĐ1592 làm mẫu). Trường mới trong object `stats` được merge sâu khi nạp save cũ (kiểm trong test nạp save); không bump SAVE_VERSION.

## Kinh tế & đối chiếu luật

- Món thay bán theo giá kệ của chính nó → doanh thu tăng đúng "bán hàng là nghề chính" (Luật 10), không có thưởng/kèo mới.
- Chỉ số cần soi sau khi bật: `economySimL50` (biên daily_smile sát 22 — GĐ1805), `economySimL5` 30 ngày, doanh thu ngày 1 (mục tiêu 100k sẽ vượt dễ hơn — chấp nhận, đó là mục tiêu của thay đổi), trần `(thưởng+kèo)/lãi` không đổi công thức.
- Guard `reviewR2Day1.test.ts`: re-đo với cơ chế mới rồi **hạ trần** xuống mức đo mới (chỉ được giảm).

## Co-op

Không có thao tác store mới (agent khách là mô phỏng chạy trên máy chủ đò) → không đụng coopGuard; test parity: chạy cùng seed qua đường chơi đơn và hẻm (mẫu test co-op hiện có) so `stats.substituted` + doanh thu.

## Rủi ro

- Doanh thu tăng làm lệch các test khoá số liệu kinh tế → nếu có test nào assert cứng doanh thu/lãi từ mô phỏng đầy đủ thì phải cập nhật theo số đo mới (ghi vào tasks), không được "nâng trần cho có" — phải hiểu vì sao lệch.
- Thay món làm mất tín hiệu "hết hàng" cho người chơi → giữ `noteDemand` (đã ghi mỗi lượt muốn) và dòng tổng kết vẫn nhắc châm kệ; ô "Vì sao khách không mua" vẫn liệt kê các lượt lỡ KHÔNG thay được.
