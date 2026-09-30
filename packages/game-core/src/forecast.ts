import type { Product } from '@game/shared';
import { FORECAST_RULES, SPOILAGE_RULES } from '@game/data';
import type { DemandTable } from './demand';

export type DemandTrend = 'up' | 'down' | 'flat';

/** Nhu cầu dự kiến (đơn vị/ngày). Dùng chung cho bảng lập kế hoạch và gợi ý nhập để hai nơi ra cùng số. */
export function expectedDailyUnits(input: { velocity: number; hadSales: boolean; basePopularity: number; multiplierNow: number; multiplierTarget: number }): number {
  const ratio = input.multiplierNow > 0 ? input.multiplierTarget / input.multiplierNow : 1;
  const value = input.hadSales ? input.velocity * ratio : input.basePopularity * FORECAST_RULES.trialUnitsPerPopularity * input.multiplierTarget;
  return Number(value.toFixed(2));
}

export function trendOf(now: number, target: number): DemandTrend {
  if (now <= 0) return 'flat';
  const change = target / now - 1;
  return change > FORECAST_RULES.trendThreshold ? 'up' : change < -FORECAST_RULES.trendThreshold ? 'down' : 'flat';
}

export interface ExpiringInfo { quantity: number; earliestDay: number }

export interface ProductPlanInput {
  product: Product;
  stock: number; // dùng được: kệ + kho + hàng chờ
  incoming: number;
  soldRecently: number; // tổng bán trong cửa sổ `slowSellDays`
  velocity: number; // bán/ngày gần đây
  hadSales: boolean;
  expiring?: ExpiringInfo;
  supplierStock?: number; // tồn còn của nhà cung cấp hôm nay (undefined = vô hạn)
  supplierUnavailable?: boolean;
  unitPrice: number;
}

export interface PlanContext {
  today: DemandTable;
  tomorrow: DemandTable;
  leadDays: number; // số ngày từ lúc đặt tới lúc hàng về
  budget: number;
  coldFree: number; // chỗ trống kho mát
}

export interface ProductPlan {
  productId: string;
  stock: number;
  incoming: number;
  soldRecently: number;
  expectedToday: number;
  expectedTomorrow: number;
  trend: DemandTrend;
  reasons: string[]; // nguyên nhân chính của thay đổi nhu cầu ngày mai (từ bộ chỉnh dữ liệu)
  daysOfStock: number | null;
  recommended: number;
  note?: string;
  flags: { lowStock: boolean; slowMoving: boolean; expiring: boolean };
  expiring?: ExpiringInfo;
}

function topReasons(table: DemandTable, productId: string): string[] {
  const factors = table.perProduct[productId]?.factors ?? [];
  return factors
    .filter(f => Math.abs(Math.log(f.factor)) > 1e-9)
    .sort((a, b) => Math.abs(Math.log(b.factor)) - Math.abs(Math.log(a.factor)))
    .slice(0, FORECAST_RULES.reasonsShown)
    .map(f => `${f.label} (${f.factor >= 1 ? '+' : ''}${Math.round((f.factor - 1) * 100)}%)`);
}

/**
 * Thông tin lập kế hoạch từng món. Hàm thuần: không đặt hàng, không đổi giá, không đổi kho.
 * Khuyến nghị bị giới hạn theo tồn nhà cung cấp, ngân sách còn lại (món thiếu hàng nhất xét trước) và chỗ trống kho mát.
 */
export function buildProductPlans(inputs: readonly ProductPlanInput[], ctx: PlanContext): ProductPlan[] {
  const plans = inputs.map((input): ProductPlan => {
    const { product } = input;
    const now = ctx.today.perProduct[product.id]?.multiplier ?? 1;
    const target = ctx.tomorrow.perProduct[product.id]?.multiplier ?? 1;
    const args = { velocity: input.velocity, hadSales: input.hadSales, basePopularity: product.demandProfile.basePopularity };
    const expectedToday = expectedDailyUnits({ ...args, multiplierNow: now, multiplierTarget: now });
    const expectedTomorrow = expectedDailyUnits({ ...args, multiplierNow: now, multiplierTarget: target });
    const effective = input.stock + input.incoming;
    const daysOfStock = expectedTomorrow > 0 ? Number((effective / expectedTomorrow).toFixed(1)) : null;
    const needed = Math.ceil(expectedTomorrow * (ctx.leadDays + FORECAST_RULES.horizonDays));
    return {
      productId: product.id,
      stock: input.stock,
      incoming: input.incoming,
      soldRecently: input.soldRecently,
      expectedToday,
      expectedTomorrow,
      trend: trendOf(now, target),
      reasons: topReasons(ctx.tomorrow, product.id),
      daysOfStock,
      recommended: Math.max(0, needed - effective),
      flags: {
        lowStock: expectedTomorrow > 0 && effective < Math.ceil(expectedTomorrow * Math.max(1, ctx.leadDays)),
        slowMoving: input.stock >= FORECAST_RULES.slowMinStock && input.soldRecently / FORECAST_RULES.slowSellDays < FORECAST_RULES.slowMaxPerDay,
        expiring: !!input.expiring && input.expiring.earliestDay >= 0,
      },
      expiring: input.expiring,
    };
  });

  let budget = ctx.budget;
  let coldFree = ctx.coldFree;
  const order = plans.map((plan, index) => index).sort((a, b) => (plans[a].daysOfStock ?? 999) - (plans[b].daysOfStock ?? 999));
  for (const index of order) {
    const plan = plans[index];
    const input = inputs[index];
    let qty = plan.recommended;
    if (qty <= 0) continue;
    if (input.supplierUnavailable) { plan.recommended = 0; plan.note = 'Nhà cung cấp tạm ngừng cung'; continue; }
    if (input.supplierStock !== undefined && qty > input.supplierStock) {
      qty = input.supplierStock;
      plan.note = `Nhà cung cấp chỉ còn ${input.supplierStock}, thiếu ${plan.recommended - qty}`;
    }
    if (input.product.storageType === 'cold' && qty > coldFree) { qty = coldFree; plan.note = plan.note ?? 'Giới hạn bởi chỗ trống kho mát'; }
    const affordable = input.unitPrice > 0 ? Math.floor(budget / input.unitPrice) : qty;
    if (qty > affordable) { qty = affordable; plan.note = plan.note ?? 'Giới hạn bởi ngân sách'; }
    qty = Math.max(0, qty);
    budget -= qty * input.unitPrice;
    if (input.product.storageType === 'cold') coldFree -= qty;
    plan.recommended = qty;
  }
  return plans;
}

export const EXPIRING_DAYS = SPOILAGE_RULES.expiringSoonDays;
