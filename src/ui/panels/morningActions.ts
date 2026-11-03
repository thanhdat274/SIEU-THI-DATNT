import { cungGoodsAction, sapEventActions, tiemXoiCungAction } from '../../data/dayEventActions';
import type { GameState } from '../../core/store';
import { caseSize, formatMoney } from '../../data/products';
import { debtDayAction } from '../../data/debtLedger';
import { birthdaysToday, birthdayHint, birthdayEve, type RegularDef } from '../../data/regulars';
import { isQuanMatchDay } from '../../data/quanNuoc';
import { quanBlockedDrinkAction, quanNuocDayAction } from '../../data/quanNuocInsights';
import { isWeekend, weekdayOf } from '../../data/calendar';
import { festivalPrepAction, festivalRestockPlan } from '../../data/festivalRestock';
import { pickMorningShiftAction } from '../../data/staffIdle';
import { staffDaySnapshot } from '../../core/slices/staffDay';
import { feedCost, landmark2Progress, landmarkProgress } from '../../data/landmark';
import { hiepLucEligible } from '../../data/hiepLuc';
import { marketDayAction, type marketClearValue } from '../../data/chophien';
import { fairMerchantAction } from '../../data/fairmerchant';
import { seasonEvent, seasonObjective, seasonEventName } from '../../data/seasonEvent';
import { planDay, type DayAction } from '../../data/dayPlan';
import { monthOf } from '../../data/calendar';
import type { branchMorningPlan } from '../../data/branchMorning';
import type { quanNuocHealth } from '../../data/quanNuocInsights';
import type { supplyContractById } from '../../data/contracts';

type S = GameState;
export interface MorningActionsCtx {
  day: number; level: number; weather: S['weather']; weatherSeed: S['weatherSeed']; storage: S['storage']; staff: S['staff'];
  regulars: S['regulars']; expected: RegularDef[]; debts: S['debts']; biz: S['biz']; branch: S['branch'];
  branchChores: ReturnType<typeof branchMorningPlan>; quanHealth: ReturnType<typeof quanNuocHealth> | null;
  haveStock: (id: string) => boolean;
  dueContracts: { cs: { dueDay: number }; def: ReturnType<typeof supplyContractById> }[];
  chophien: ReturnType<typeof marketClearValue>; lastSummary: S['lastSummary'];
}

/** GĐ76/945: gộp mọi nhắc chuẩn bị ngày thành một danh sách ưu tiên (danger trước, khử trùng, cap 7). Tách nguyên văn khỏi MorningPanel. */
export function buildMorningActions(c: MorningActionsCtx): DayAction[] {
  const { day, level, weather, weatherSeed, storage, staff, regulars, expected, debts, biz, branch, branchChores, quanHealth, haveStock, dueContracts, chophien, lastSummary } = c;
  // GĐ76: gộp mọi nhắc chuẩn bị ngày thành một danh sách ưu tiên (danger trước, khử trùng, cap 7).
  const candidates: DayAction[] = [];
  for (const c of branchChores) candidates.push({ icon: c.icon, text: c.text, panel: c.text.includes('xin nghỉ hôm nay') || c.text.includes('xin chuyển sang') ? 'staff' : 'branch', danger: c.danger, priority: 1 });
  // GĐ189: quán nước thiếu kho — trước giờ chỉ là thẻ thụ động, giờ thành việc sáng ưu tiên (nạp đồ uống).
  const quanAction = quanNuocDayAction(quanHealth, day, weather);
  if (quanAction) candidates.push(quanAction);
  // GĐ1102: món trên menu quán ngừng bán vì hết nguyên liệu — cụ thể hơn "nạp đồ uống", chỉ khi quán mở.
  const blockedAct = biz.quanNuoc?.open ? quanBlockedDrinkAction(biz.quanNuoc.menu, level, storage) : null;
  if (blockedAct && !candidates.some((x) => x.text === blockedAct.text)) candidates.push(blockedAct);
  // GĐ612: ngày cúng khách hỏi nhang/trái cây (GĐ609) — nhắc nhập món đã mở mà chưa có hàng
  const cungAct = cungGoodsAction(day, level, haveStock); // GĐ612/613 → GĐ633 tách hàm thuần
  if (cungAct) candidates.push(cungAct);
  // GĐ604: đêm có trận — tiện lợi đông sau 22h (GĐ601)
  candidates.push(...sapEventActions(biz.sapRong, biz.sapKinds, day, weather)); // GĐ625/631 → GĐ632 tách hàm thuần
  if (branch?.open && isQuanMatchDay(day, weather)) candidates.push({ icon: '⚽', text: 'Tối nay có trận — tiện lợi đông 22h–24h ×1,2, xếp đủ kệ', panel: 'branch', danger: false, priority: 3 });
  // GĐ589: ngày cúng — tiệm xôi đông; GĐ599: thợ tự nấu ×1,3 nên chỉ nhắc thêm thợ khi còn thiếu
  const xoiCungAct = tiemXoiCungAction(biz.tiemXoi, day); // GĐ599 → GĐ635
  if (xoiCungAct) candidates.push(xoiCungAct);
  for (const { cs, def } of dueContracts) candidates.push({ icon: '📦', text: `${def!.title}: giao trước ngày ${cs.dueDay}`, panel: 'contracts', danger: cs.dueDay <= day, priority: cs.dueDay <= day ? 0 : 2 });
  if (biz.loan && biz.loan.dueDay - day <= 3) candidates.push({ icon: '🏦', text: `Nợ ngân hàng sắp hạn (${Math.max(0, biz.loan.dueDay - day)} ngày)`, panel: 'business', danger: true, priority: 0 });
  // GĐ759 — sinh nhật khách quen: khách đã quen ghé chắc chắn, mua là +3 thân thiết → nhắc nhập món họ thích
  for (const e of birthdayEve(day, level, regulars, haveStock, Object.keys(biz.rival?.poached ?? {}))) candidates.push({ icon: '🎂', text: e.text, panel: 'order', danger: false, priority: 3 }); // GĐ781/793
  for (const d of birthdaysToday(expected, day)) { const h = birthdayHint(d, haveStock); candidates.push({ icon: '🎂', text: h.text, panel: 'regulars', danger: false, priority: h.priority }); }
  // GĐ747 — nợ khách quen sắp bị xoá (Sổ nợ nằm trong panel Khách quen, không ai mở): nhắc lên Sổ đầu ngày
  const debtAct = debtDayAction(debts, day);
  if (debtAct) candidates.push(debtAct);
  // GĐ741 — góp vật liệu công trình vào việc sáng: lượt góp hàng ngày nằm sâu trong panel, đưa lên Sổ đầu
  // ngày để góp đều (càng sớm hưởng lâu). Cả hai công trình xong thì không còn việc này.
  if (biz.landmark && biz.landmark.lastContributeDay < day) {
    const p1 = landmarkProgress(biz.landmark.contributions);
    const p2 = landmark2Progress(biz.landmark.contributions);
    const isP2 = p1.done;
    const idx = isP2 ? (p2?.index ?? 0) : p1.index;
    const proj = isP2 ? 'Đèn Đường Ngõ 1' : 'Sân chơi';
    candidates.push({ icon: isP2 ? '💡' : '🏗️', text: `Góp vật liệu ${proj} hôm nay (${formatMoney(feedCost(idx, level))})`, panel: 'landmark', danger: false, priority: 3 });
  }
  if (hiepLucEligible(branch, biz.quanNuoc, level) && !(biz.hiepLuc?.active && biz.hiepLuc.m === monthOf(day))) candidates.push({ icon: '🤝', text: 'Lập đối tác chi nhánh × quán nước', panel: 'morning', danger: false, priority: 3 });
  const se = seasonEvent(day);
  if (se) {
    const obj = seasonObjective(weatherSeed ?? 0, day);
    const claimed = biz.seasonEvt?.season === se.season && biz.seasonEvt.claimedDay === se.dayIndex;
    if (obj && !claimed) candidates.push({ icon: obj.icon, text: `Sự kiện ${seasonEventName(se.season)}: ${obj.title} (${obj.detail})`, panel: 'morning', danger: false, priority: 3 });
  }
  // GĐ249: trữ lễ thành việc sáng — lễ sắp tới còn món thiếu thì vào danh sách việc hôm nay (mẫu GĐ189).
  // Việc sáng không lọc theo mối (chưa chọn mối nào) — món mối không bán OrderPanel tự nói rõ (GĐ247).
  const festivalPrep = festivalPrepAction(festivalRestockPlan({ day, level, storage, sells: () => true, caseSizeOf: caseSize }), formatMoney);
  if (festivalPrep) candidates.push(festivalPrep);
  // GĐ257: cuối tuần thành việc sáng — Thứ 7/CN khách thật sự hay mua ăn vặt (GĐ255) nên nhắc
  // châm kệ đúng nhóm ngay buổi sáng, cùng nhịp "trữ lễ" GĐ249. Ưu tiên thấp (3) để nhường việc bức thiết.
  if (isWeekend(day)) candidates.push({ icon: '🍬', text: `Cuối tuần (${weekdayOf(day)}): khách hay mua ăn vặt — nhớ châm kệ mì, bánh kẹo, nước ngọt`, panel: 'order', danger: false, priority: 3 });
  // GĐ290: chợ phiên thành việc sáng — đưa vào danh sách việc hôm nay khi có hàng dư
  const marketAction = marketDayAction(chophien);
  if (marketAction) candidates.push(marketAction);
  // GĐ293/294: thương lái ghé đầu tháng thành việc sáng — ngày 1–2 chưa lấy lô thì nhắc
  // xem lô sỉ chiết khấu trong Nhập hàng; lấy lô xong (biz.fairTaken = tháng) tự ẩn.
  const fairAct = fairMerchantAction(day, biz.fairTaken);
  if (fairAct) candidates.push(fairAct);
  // GĐ295/300: tổng kết đội hôm qua thành việc sáng. Ưu tiên bản máy chạy đã CHỐT SẴN trong
  // lastSummary (GĐ300) → máy khách hẻm online thấy y hệt máy chạy; chỉ khi không có (save cũ / vào
  // giữa ngày) mới tự tính từ snapshot transient của máy này.
  const yStats = lastSummary && lastSummary.day === day - 1 ? lastSummary.stats : undefined;
  const shiftAct = pickMorningShiftAction(
    lastSummary && lastSummary.day === day - 1 ? lastSummary.staffIdle : undefined,
    staffDaySnapshot(), staff, yStats,
  );
  if (shiftAct) candidates.push(shiftAct);
  return planDay(candidates);
}
