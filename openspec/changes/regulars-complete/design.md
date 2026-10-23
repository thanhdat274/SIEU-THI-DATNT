# Design

Change này là **state-documentation** (chốt hiện trạng) cho năng lực khách quen đã có sẵn — không triển khai code mới. Phần thiết kế dưới đây mô tả kiến trúc THỰC TẾ đang chạy để làm nền cho tài liệu/QA và để mọi người thống nhất.

## 1. Khách quen — thiện cảm (`game-core/regulars.ts`)

- `REGULAR_CUSTOMERS`: 6 khách quen đại diện hẻm (game-data), mỗi khách có `favoriteProductIds`, `preferredCategories`, `perks`.
- `shouldRegularVisitToday(regular, day, seed, progress)`: quyết định ghé hôm nay — deterministic theo `(seed, day, id)`, base ~30%/ngày, nhất quán giữa client (seed chung); khách quen không ghé 2 ngày liên tiếp trừ khi có perk `frequent_visit`.
- `pickAvailableRegular(day, seed, inStoreIds, progressMap)`: chọn 1 khách quen hợp lệ ghé, không trùng người đang có mặt.
- `processRegularCheckout(def, progress, basketPids, day)`:
  - `totalVisits += 1`, `lastVisitDay = day`.
  - Khám phá món ưa thích đã mua → `discoveredProductIds`.
  - Điểm thân thiết: +2 có món ưa thích / +1 thường, **trần +2/ngày** (`lastFriendshipDay` chống cộng lặp).
  - Mở khóa perk theo ngưỡng `friendship >= perk.threshold`; perk `bonus_tip` cộng `tipBonusRatio`, perk `frequent_visit` tăng xác suất ghé.
  - Trả `updatedProgress`, `pointsAwarded`, `newlyUnlockedPerks`, `tipBonusRatio`.
- `processRegularWalkout`: khách quen bỏ về vẫn tính `totalVisits`/`lastVisitDay` (không cộng thân thiết).

## 2. Sổ nợ / mua chịu — credit (`simulation.ts`)

- `customerCredits: CustomerCreditAccount[]`, mỗi khoản: `{ id, regularId, checkoutId, issuedDay, dueDay (ngày+3), amount, balance, status }`.
- `getCustomerCreditTerms(regularId)`: hạn mức theo `friendship >= 40 → min(100k, 20k + (f-40)*1k)`; `used` = tổng balance các khoản mở/quá hạn; `eligible = limit>0 && !hasDefault`; `available = limit - used`.
- Checkout `onCredit` (chỉ khi `customer.regularId`): gating `getCustomerCreditTerms` — đủ/không vượt hạn mức mới cho mua chịu; ngược lại từ chối (trạng thái không đổi). Có nhánh tiệm thu ngân và nhánh quầy.
- `updateCustomerCreditStatuses(day)`: mở → `overdue` khi quá `dueDay` (toast); quá `dueDay + 7` → `defaulted`, `balance=0`, ghi `bad_debt` vào sổ cái + phản ánh `badDebtCost`/`netProfit`.
- `repayCustomerCredit(creditId)`: thu hồi khoản mở/quá hạn → trừ balance, `status='paid'`, vào quỹ, ghi sổ cái `credit_repayment`, toast, `notifyStateChanged`.
- Lệnh co-op `repay_customer_credit` (qua server) dùng chung method → 2 phía nhất quán.

## 3. Lưu theo khách (`SaveGameData`)

- `SaveGameData.regulars` (Record regularId → `RegularCustomerProgress`) và `SaveGameData.customerCredits[]` được lưu/đọc qua `exportSaveData`/`importSaveData`; tải cũ không đổi `schemaVersion`, lọc khoản hỏng khi tải.

## 4. UI (`apps/web`)

- `RegularsModal`: danh sách khách quen + thân thiết/perk/món đã khám phá.
- `CashierModal`: bên cạnh nhân viên/... có khối "phải thu" hiện các tài khoản mua chịu mở/quá hạn + nút **Thu nợ** (`onRepayCredit`); `creditAccounts`/`creditTerms` truyền từ `App.tsx` qua `getCustomerCredits()`/`getCustomerCreditTerms()`.
- Toast: quá hạn (`overdue`), nợ xấu (`defaulted`), thu nợ thành công.

## 5. Kiểm chứng (change này)

- Chạy `regulars.test.ts` (thân thiết/perk/boa) + `wave-a.test.ts` (tín dụng/mua chịu/nợ xấu) qua harness tsc→node; ghi PASS.
- Không sửa logic; chỉ gom bằng chứng + đồng bộ tài liệu.

## 6. Rủi ro / giới hạn

- Đây là hiện trạng có sẵn; nếu playtest thấy hạn mức/tần suất khách quen chưa cân bằng, mở change riêng để chỉnh hằng số.
- Browser QA (RegularsModal, CashierModal "Thu nợ", toast overdue/defaulted, viewport hẹp) **chờ máy thật**.
