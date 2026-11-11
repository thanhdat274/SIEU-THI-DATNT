# Đường cong mở khoá

> Sinh tự động bởi `scripts/unlock-curve.mjs` ngày 2026-11-11. Đếm mẫu chữ trên mã nguồn
> (cú pháp `unlock:N`, `p(...,N)`, tuple cuối game, `*_UNLOCK`), **xấp xỉ** — có thể sót
> vài dạng khai báo. Chạy lại mỗi khi thêm nội dung, rồi đối chiếu bài test `unlockPacing`.

## Mật độ nội dung theo cấp (tổng 1830 mốc, cấp tối đa 200)

| Dải cấp | Số mốc | TB mỗi cấp |
|---|---|---|
| 1–10 |  65 | 6.5 |
| 11–20 | 117 | 11.7 |
| 21–30 | 196 | 19.6 |
| 31–40 | 265 | 26.5 |
| 41–60 | 337 | 16.9 |
| 61–80 | 151 | 7.5 |
| 81–100 |  90 | 4.5 |
| 101–150 | 208 | 4.2 |
| 151–200 | 401 | 8.0 |

Chuỗi từng cấp (răng cưa):
```
1:20 · 2:1 · 3:14 · 4:1 · 5:8 · 6:2 · 7:3 · 8:2 · 9:8 · 10:6 · 11:1 · 12:14 · 13:1 · 14:19 · 15:4 · 16:16 · 17:2 · 18:27 · 19:2 · 20:31 · 21:8 · 22:34 · 23:3 · 24:26 · 25:14 · 26:34 · 27:3 · 28:38 · 29:1 · 30:35 · 31:3 · 32:13 · 33:25 · 34:11 · 35:25 · 36:54 · 37:27 · 38:29 · 39:23 · 40:55 · 41:22 · 42:28 · 43:31 · 44:31 · 45:31 · 46:16 · 47:17 · 48:9 · 49:13 · 50:13 · 51:11 · 52:23 · 53:12 · 54:8 · 55:17 · 56:8 · 57:14 · 58:6 · 59:10 · 60:17 · 61:8 · 62:10 · 63:8 · 64:8 · 65:8 · 66:6 · 67:10 · 68:8 · 69:6 · 70:8 · 71:10 · 72:8 · 73:10 · 74:8 · 75:8 · 76:6 · 77:3 · 78:6 · 79:5 · 80:7 · 81:7 · 82:5 · 83:5 · 84:5 · 85:5 · 86:3 · 87:6 · 88:6 · 89:4 · 90:4 · 91:1 · 92:6 · 93:6 · 94:4 · 95:6 · 96:3 · 97:4 · 98:4 · 99:4 · 100:2 · 101:6 · 102:4 · 103:6 · 104:4 · 105:6 · 106:4 · 107:6 · 108:4 · 109:4 · 110:6 · 111:4 · 112:4 · 113:4 · 114:6 · 115:4 · 116:4 · 117:6 · 118:4 · 119:4 · 120:4 · 121:4 · 122:4 · 123:4 · 124:4 · 125:4 · 126:6 · 127:4 · 128:4 · 129:4 · 130:4 · 131:4 · 132:4 · 133:4 · 134:4 · 135:6 · 136:4 · 137:4 · 138:4 · 139:4 · 140:4 · 141:3 · 142:3 · 143:3 · 144:3 · 145:3 · 146:3 · 147:3 · 148:3 · 149:3 · 150:3 · 151:3 · 152:3 · 153:3 · 154:3 · 155:3 · 156:3 · 157:3 · 158:3 · 159:3 · 160:3 · 161:3 · 162:3 · 163:3 · 164:3 · 165:12 · 166:3 · 167:3 · 168:5 · 169:5 · 170:49 · 171:5 · 172:5 · 173:5 · 174:5 · 175:3 · 176:3 · 177:3 · 178:5 · 179:3 · 180:3 · 181:3 · 182:3 · 183:3 · 184:3 · 185:3 · 186:5 · 187:5 · 188:5 · 189:5 · 190:5 · 191:5 · 192:5 · 193:5 · 194:5 · 195:5 · 196:7 · 197:9 · 198:79 · 199:79 · 200:3
```

## Phân bố theo nguồn file

| File | Số unlock đếm được |
|---|---|
| `data/recipes.ts` | 1053 |
| `data/catalog.ts` | 370 |
| `data/products.ts` | 131 |
| `data/lateGameProducts.ts` | 111 |
| `data/homemade.ts` | 103 |
| `data/furniture.ts` | 49 |
| `data/regionSpecialty.ts` | 13 |

## Hệ lớn (hằng `*_UNLOCK`) — cơ chế mới, không tính món

| Cấp | Hằng | File |
|---|---|---|
| 2 | `CHANGE_UNLOCK` | counterDeals.ts |
| 2 | `HAGGLE_UNLOCK` | counterDeals.ts |
| 3 | `PHONE_UNLOCK` | phoneOrders.ts |
| 4 | `CREDIT_UNLOCK` | credit.ts |
| 4 | `NEW_UNLOCK_WINDOW` | advice.ts |
| 5 | `LOAN_UNLOCK` | bizFinance.ts |
| 5 | `LOYALTY_UNLOCK` | bizFinance.ts |
| 6 | `COMBO_UNLOCK` | combos.ts |
| 6 | `WHOLESALE_UNLOCK` | wholesale.ts |
| 7 | `HUI_UNLOCK` | bizFinance.ts |
| 8 | `GARDEN_UNLOCK` | garden.ts |
| 8 | `RIVAL_UNLOCK` | rivals.ts |
| 8 | `SOCIAL_UNLOCK` | social.ts |
| 10 | `ONLINE_UNLOCK` | online.ts |
| 12 | `INSPECTION_UNLOCK` | bizAchievements.ts |
| 14 | `COOP_UNLOCK` | garden.ts |
| 16 | `FARM_ORDER_UNLOCK` | garden.ts |
| 18 | `HYGIENE_UNLOCK` | inspection.ts |
| 21 | `COOK_UNLOCK` | recipes.ts |
| 29 | `QUAN_NUOC_UNLOCK` | quanNuoc.ts |
| 30 | `CRITIC_UNLOCK` | critic.ts |
| 30 | `DINE_UNLOCK` | dineIn.ts |
| 31 | `MASTERY_UNLOCK` | cookMastery.ts |
| 31 | `MENU_RULE_UNLOCK` | dineIn.ts |
| 32 | `LIFE_EVENT_UNLOCK` | lifeEvent.ts |
| 32 | `MEAT_UNLOCK` | meat.ts |
| 32 | `MINI_UNLOCK` | festivalMini.ts |
| 32 | `POACH_CLUSTER_UNLOCK` | rivals.ts |
| 32 | `TIES_UNLOCK` | regularTies.ts |
| 34 | `PHOI_UNLOCK` | preserve.ts |
| 38 | `RARE_WHEEL_UNLOCK` | gifts.ts |
| 38 | `VAI_UNLOCK` | preserve.ts |
| 39 | `CHEST_UNLOCK` | giftChest.ts |
| 40 | `TIEM_XOI_UNLOCK` | tiemXoi.ts |
| 45 | `CRITIC_HARD_UNLOCK` | critic.ts |
| 45 | `TOILET_STRICT_UNLOCK` | dineIn.ts |
| 46 | `CHUM_UNLOCK` | preserve.ts |
| 55 | `NIGHT_UNLOCK` | night.ts |
| 60 | `STANCE_UNLOCK` | stance.ts |
| 66 | `STAR_BOOST_UNLOCK` | dishStars.ts |
| 100 | `BRAND_UNLOCK` | brand.ts |
| 100 | `BRAND_WORKSHOP_UNLOCK` | brand.ts |
| 110 | `BRAND_DEALER_UNLOCK` | brand.ts |
| 150 | `BRAND_FRANCHISE_UNLOCK` | brand.ts |

---
*Quy ước SPEC-TOI-UU §T3: mỗi cấp tối đa 1 hệ lớn (dải 1–60 cách nhau ≥ 2 cấp); không cấp nào
mở quá 20 mục; từ cấp 60 không quá 12 cấp liên tiếp không có mốc cơ chế/truyện.*
