import { WHOLESALE_UNLOCK } from './wholesale';
import { LOYALTY_UNLOCK } from './bizFinance';
import { DINE_UNLOCK } from './dineIn';
import { CREDIT_UNLOCK } from './credit';
import { HAGGLE_UNLOCK, CHANGE_UNLOCK } from './counterDeals';
import { CRITIC_HARD_UNLOCK } from './critic';
import { RIVAL_UNLOCK, POACH_CLUSTER_UNLOCK } from './rivals';
import { FARM_ORDER_UNLOCK } from './garden';
import { SOCIAL_UNLOCK } from './social';
import { STANCE_UNLOCK } from './stance';
import { MASTERY_UNLOCK } from './cookMastery';
import { LIFE_EVENT_UNLOCK } from './lifeEvent';
import { COOK_UNLOCK } from './recipes';
import { QUAN_NUOC_UNLOCK } from './quanNuoc';

/**
 * SPEC-TOI-UU §T3-L2 — MỘT cửa duy nhất hỏi "hệ này đã mở chưa?" thay cho các phép `level >= X_UNLOCK`
 * rải khắp agents/core/ui. Lý do: khi dời mốc lên cao (T3-L3/L4) bản lưu cũ không được MẤT thứ đã có —
 * quy tắc ở một chỗ: đã mở nếu `level ≥ mốc` HOẶC bản lưu có dấu vết đã dùng hệ đó (`FEATURE_TRACES`).
 *
 * Hiện tại (L2) mốc = đúng hằng cũ và chưa có dấu vết nào ⇒ hasFeature(s, id) ≡ `s.level >= X_UNLOCK`
 * (test `features.test.ts` khoá điều này) ⇒ không đổi kinh tế, golden giữ byte.
 * Thêm hệ mới: thêm một dòng ở FEATURE_LEVEL (mốc lấy từ hằng của hệ đó). Dời mốc: sửa hằng, bản lưu
 * cũ nào đã dùng thì khai báo dấu vết ở FEATURE_TRACES.
 */
export const FEATURE_LEVEL = {
  wholesale: WHOLESALE_UNLOCK,
  loyalty: LOYALTY_UNLOCK,
  dineIn: DINE_UNLOCK,
  credit: CREDIT_UNLOCK,
  haggle: HAGGLE_UNLOCK,
  change: CHANGE_UNLOCK,
  criticHard: CRITIC_HARD_UNLOCK,
  rival: RIVAL_UNLOCK,
  poachCluster: POACH_CLUSTER_UNLOCK,
  farmOrder: FARM_ORDER_UNLOCK,
  social: SOCIAL_UNLOCK,
  stance: STANCE_UNLOCK,
  mastery: MASTERY_UNLOCK,
  lifeEvent: LIFE_EVENT_UNLOCK,
  cook: COOK_UNLOCK,
  quanNuoc: QUAN_NUOC_UNLOCK,
} as const;

export type FeatureId = keyof typeof FEATURE_LEVEL;

/** Phần state tối thiểu hasFeature cần (đủ cho cả GameState lẫn input thuần của hàm data). */
export type FeatureState = { level: number };

/** Dấu vết "bản lưu đã dùng hệ này" → coi như đã mở dù cấp thấp hơn mốc mới. Rỗng ở L2 (chưa dời mốc nào). */
export const FEATURE_TRACES: { [K in FeatureId]?: (s: any) => boolean } = {};

export const featureLevel = (id: FeatureId): number => FEATURE_LEVEL[id];

export const hasFeature = (s: FeatureState, id: FeatureId): boolean =>
  s.level >= FEATURE_LEVEL[id] || (FEATURE_TRACES[id]?.(s) ?? false);
