import { describe, expect, it, vi } from 'vitest';

// net/coop.ts đụng window/document/location ngay lúc nạp module (đăng ký listener rời tab, firebase đọc
// ?dev=) nên môi trường test node thuần cần bộ xương tối thiểu trước khi import.
vi.hoisted(() => {
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = { addEventListener: () => {} };
  g.document = { addEventListener: () => {}, body: { classList: { toggle: () => {} } }, visibilityState: 'visible' };
  g.location = { search: '', href: 'http://localhost/', reload: () => {} };
  g.WebSocket = class {
    static OPEN = 1;
    readyState = 0;
    send() {}
    close() {}
  };
});

import { GUARDED, LOCAL_ACTIONS } from '../net/coop';
import { useGame } from '../core/store';

/**
 * Phủ kín phân loại thao tác khi chơi hẻm online: MỌI hàm public của store phải nằm trong
 *  - GUARDED (bảng ở net/coop.ts): sửa đúng MỘT CHỈ chung (ô kệ, vị trí đồ, giá món, luống/chuồng trại)
 *    — hai người cùng sửa trong 3 giây thì người sau bị chặn kèm lời nhắn;
 *  - hoặc LOCAL_ONLY (bảng dưới đây): không cần khoá theo chỗ, mỗi mục ghi rõ lý do.
 * Thêm thao tác mới mà quên phân loại sẽ bị test này bắt.
 */
const LOCAL_ONLY: Record<string, string> = {
  // ── Giao diện/cục bộ — coop.ts đã cho chạy tại chỗ (LOCAL_ACTIONS), không gửi qua máy chạy ──
  notify: 'thuần giao diện: hiện thông báo ngắn trên chính máy đó',
  openPanel: 'thuần giao diện: mở bảng trên chính máy đó',
  closePanel: 'thuần giao diện: đóng bảng trên chính máy đó',
  setBuildMode: 'thuần giao diện; bật/xây đã có khoá riêng "build" ở server từng người một',
  setPlacing: 'thuần giao diện: món đồ đang cầm trên chính máy đó',
  priceOf: 'chỉ đọc: tính giá bán gợi ý, không đổi trạng thái',
  tick: 'chỉ máy chạy chạy mô phỏng; người không chạy không gọi',
  takeFromShelf: 'khách lấy món ở kệ trên máy đó, kho/kệ đổi rồi PATCH đồng bộ theo subscribe',
  setCostume: 'chỉ đổi trang phục của chính máy này, không vào trạng thái chung',

  // ── Chỉ máy chạy gọi trong mô phỏng (khách/nhân viên/sự kiện) — không ai bấm từ UI nên không giành chỗ ──
  checkout: 'mô phỏng quầy: nhân viên/thủ quầy tính tiền cho khách, chỉ chạy trên máy chạy',
  noteDemand: 'mô phỏng: khách muốn món, chỉ chạy trên máy chạy',
  noteMiss: 'mô phỏng: khách bỏ về/lỡ bán, chỉ chạy trên máy chạy',
  recordVisit: 'mô phỏng: chấm điểm danh tiếng sau lượt khách, chỉ chạy trên máy chạy',
  addReview: 'mô phỏng: khách nhận xét, chỉ chạy trên máy chạy',
  addXp: 'mô phỏng nội bộ: cộng kinh nghiệm từ doanh thu/nấu/thu hoạch',
  addDirt: 'mô phỏng nội bộ: sàn bẩn theo lượt khách',
  regularVisit: 'mô phỏng: khách quen ghé lấy món/ghi sổ, chỉ chạy trên máy chạy',
  communitySale: 'mô phỏng: món bán tính vào mục tiêu chung dịp lễ',
  consumeStock: 'mô phỏng nội bộ: trừ kho cho thú cưng/ăn uống',
  acceptWholesale: 'nhận lấy sỉ từ đề nghị của người bán rong đang chờ (duy nhất một đề nghị)',
  declineWholesale: 'từ chối đề nghị lấy sỉ đang chờ của người bán rong',
  sellMarketSurplus: 'bán chợ phiên đầu ngõ — một lần mỗi ngày (cờ marketClearedDay toàn cục chốt một lần), bán hàng DƯ theo marketClearValue, kết quả cộng dồn không đè chỗ nhau',
  offerWholesale: 'mô phỏng: người bán rong tới quầy đưa đề nghị',
  recordTheft: 'mô phỏng sự kiện: kẻ trộm/mất cắp, chỉ chạy trên máy chạy',
  recordCounterfeit: 'mô phỏng sự kiện: tiền giả ở quầy, chỉ chạy trên máy chạy',
  checkTitles: 'mô phỏng nội bộ: soát danh hiệu sau khi sang ngày mới',
  recordDiscovery: 'mô phỏng nội bộ: ghi sổ món đã bán của "Sổ tay Tiệm" từ doanh thu (chạy trong checkout/giao đơn trên máy chạy)',
  noteComboHits: 'mô phỏng nội bộ: cộng dồn số lần combo kích hoạt để ComboPanel hiển thị (chạy trong checkout khách trên máy chạy)',
  tallyDemographics: 'mô phỏng nội bộ: ghi sổ nhân khẩu học khách vãng lai theo nghề cho "Khách của tôi" (chạy trong lượt khách trên máy chạy)',

  // ── Sửa trạng thái TOÀN CỤC (đồng bộ qua proxy/PATCH sẵn) — không có "một chỗ" riêng để hai người đè nhau ──
  buy: 'nhập hàng vào kho chung theo món+số lượng, kết quả cộng dồn chứ không đè chỗ nhau',
  placeOrder: 'đặt đơn mối hàng: thêm delivery toàn cục',
  toggleShop: 'bật/tắt mở cửa — trạng thái toàn cục, ai bấm cũng cùng một kết quả',
  setSpeed: 'đặt tốc độ mô phỏng toàn cục, không đụng chỗ riêng',
  sleep: 'đi ngủ — ở hẻm máy chạy đếm phiếu (coop.ts installSleepVote): cả hẻm cùng nằm giường mới sang ngày',
  setPrices: 'đổi nhiều giá một lúc — mỗi món chỉ đổi nếu giá còn đúng giá người bấm vừa thấy, không đè giá người khác vừa sửa',
  setHappyHour: 'đặt/tắt giờ vàng — cấu hình toàn cục của tiệm',
  toggleCombo: 'bật/tắt một combo — cấu hình toàn cục',
  hire: 'tuyển nhân viên từ pool chung (thêm mới, không sửa chỗ của ai)',
  fire: 'cho nhân viên nghỉ việc theo id người',
  setShift: 'đổi ca một nhân viên theo id người',
  trainStaff: 'đào tạo một nhân viên theo id người',
  promoteStaff: 'thăng chức một nhân viên tiệm chính theo id người',
  transferStaff: 'điều nhân viên sang chi nhánh/tiệm chính theo id người',
  buyUpgrade: 'nâng cấp tiệm — cờ toàn cục, ai bấm cũng cùng kết quả',
  upgradeWarehouse: 'nâng cấp nhà kho — cờ toàn cục',
  placeFurniture: 'đặt đồ mới: luôn tạo uid riêng, không đè lên chỗ ai (chế độ xây đã khoá từng người)',
  demolishAll: 'đập hết nội thất — kết quả như nhau dù ai bấm',
  claimQuest: 'nhận thưởng nhiệm vụ theo id nhiệm vụ (cờ đã nhận là chốt một lần)',
  placeBet: 'chốt kèo hôm nay — ghi questLog.bet của chính máy này (1 kèo/ngày), không đụng trạng thái chung',
  claimGift: 'điểm danh quà ngày — cờ toàn cục, nhận một lần mỗi ngày',
  spinWheel: 'quay vòng quay ngày — cờ toàn cục, một lượt mỗi ngày',
  contributeLandmark: 'sân chơi — lượt góp và tiền là trạng thái chung; cả hẻm góp tối đa 1 lượt/ngày như chơi đơn, máy chạy kiểm tra và cập nhật nguồn chân lý',
  checkWelcomeBack: 'thưởng "Chào mừng quay lại" khi nạp bản lưu chơi đơn — theo lastSeenAt lưu trong máy, không dùng ở hẻm online, chạy cục bộ',
  dismissUnlockAct: 'đóng banner "Mới mở" — thêm một id vào danh sách chung, làm lại nhiều lần không đổi gì nên không cần khoá chỗ',
  learnSkill: 'học một kỹ năng theo id (thêm vào danh sách, không đè)',
  buyLicense: 'mua giấy phép theo id tờ',
  setShopName: 'đổi tên tiệm — một trường toàn cục, ai đặt cũng là tên chung',
  setAllowCredit: 'bật/tắt cho ghi sổ — công tắc toàn cục',
  setCounterPolicy: 'đổi thái độ quầy (mặc cả/tiền lẻ) — một chính sách toàn cục, ai đặt cũng là cái chung',
  checkoutOnCredit: 'tính tiền ghi sổ cho một khách quen (mô phỏng quầy ở máy chạy)',
  collectDebt: 'thu nợ một khách quen theo id người',
  remindDebt: 'nhắc nợ một khách quen theo id người',
  forgiveDebt: 'xoá nợ một khách quen theo id người',
  addReservation: 'nhận giữ món cho một khách quen (thêm hẹn mới)',
  cancelReservation: 'huỷ lời hẹn của một khách quen theo id người',
  adjustFriendship: 'cộng/trừ thân thiết một khách quen theo id người',
  acceptContract: 'nhận hợp đồng cung cấp theo id (thêm trạng thái mới)',
  deliverContract: 'giao kỳ hiện tại của một hợp đồng theo id',
  commitContract: 'cam kết kỳ: trữ đúng số hàng kỳ này khỏi kho chung theo id; toàn cục dồn chứ không đè chỗ',
  releaseContract: 'hủy cam kết: trả hàng về kho chung + hoàn cọc theo id; toàn cục',
  acceptOrder: 'nhận đơn tiệc — cờ toàn cục của đơn đang mời',
  declineOrder: 'từ đơn tiệc — cờ toàn cục của đơn đang mời',
  deliverOrder: 'giao đơn tiệc từ kho — đơn đang giữ duy nhất một',
  rushDeliverOrder: 'nhập gấp rồi giao đơn tiệc — đơn đang giữ duy nhất một',
  answerPhone: 'nghe máy một cuộc gọi theo id đơn (soạn hàng từ kho)',
  restockAndAnswerPhone: 'nhập bù rồi nghe một cuộc gọi theo id đơn',
  declinePhone: 'từ chối một cuộc gọi theo id đơn',
  deliverPhone: 'mang đơn gọi điện tới nhà khách theo id đơn',
  startCook: 'bắt đầu một mẻ nấu theo id công thức (thêm job mới vào hàng)',
  replaceEmptySlots: 'đổi các ô kệ hết hàng sang món khác trong kho — quét toàn kệ một lượt',
  apologize: 'đăng bài xin lỗi khi khủng hoảng — một bài/ngày, cờ toàn cục',
  promoteShop: 'đăng bài quảng bá — một bài/ngày, cờ toàn cục',
  openBranch: 'mua mặt bằng chi nhánh — cờ toàn cục (chưa có là mở, rồi thì thôi)',
  toggleBranch: 'mở/đóng cửa chi nhánh — công tắc toàn cục',
  hireForBranch: 'tuyển nhân viên chi nhánh từ pool chung theo id ứng viên',
  fireFromBranch: 'cho nhân viên chi nhánh nghỉ theo id người',
  setBranchShift: 'đổi ca nhân viên chi nhánh theo id người',
  coverCalloff: 'gọi người làm thay ca đêm — cờ "đã gọi" trên sự kiện đêm duy nhất',
  bonusBranchStaff: 'thưởng nóng một nhân viên chi nhánh theo id người',
  restBranchStaff: 'cho nhân viên chi nhánh nghỉ ngày mai theo id người',
  toggleVending: 'lắp/tắt máy bán hàng — công tắc toàn cục',
  toggleNightDelivery: 'bật/tắt nhận đơn app đêm ở chi nhánh — công tắc toàn cục',
  toggleBranchAutoHaul: 'bật/tắt auto chuyển kho chi nhánh — công tắc toàn cục',
  setBranchAutoHaul: 'chỉnh ngưỡng/hẹn giờ auto chuyển kho chi nhánh — cấu hình toàn cục',
  buyBranchPower: 'mua nâng cấp điện chi nhánh theo id (thêm vào danh sách)',
  promoteBranchStaff: 'thăng chức nhân viên chi nhánh theo id người',
  evacuateBranch: 'dồn cả đội chi nhánh về tiệm chính — xếp lại toàn bộ một lượt',
  openOnline: 'mở gian hàng trên app — cờ toàn cục (một lần, tiền trừ vào két)',
  toggleOnline: 'tạm ngưng/nhận tiếp đơn app — công tắc toàn cục',
  acceptOnline: 'nhận một đơn app theo id đơn (kho và danh sách đơn đổi một lần)',
  declineOnline: 'từ chối một đơn app theo id đơn',
  doPrestige: 'reset toàn cục sang vòng mới (tái sinh NG+) — chỉ chơi đơn, action tự chặn khi đang ở hẻm online',
  claimNgGoal: 'nhận thưởng mục tiêu vòng tái sinh (NG+) theo id — cờ đã nhận chốt một lần/vòng, chỉ chơi đơn như doPrestige',
};

/** Hàm nội bộ của store/không phải thao tác game thì loại khỏi danh sách đối chiếu. */
const INTERNAL_KEYS = new Set(['set', 'get', 'setState', 'getState', 'subscribe', 'destroy']);

/** Mọi hàm public của store tại thời điểm test. */
function storeActions(): string[] {
  const s = useGame.getState() as unknown as Record<string, unknown>;
  return Object.keys(s).filter((k) => typeof s[k] === 'function' && !INTERNAL_KEYS.has(k));
}

describe('phân loại thao tác cho hẻm online (GUARDED / LOCAL_ONLY)', () => {
  it('mọi thao tác public của store nằm trong GUARDED hoặc LOCAL_ONLY', () => {
    const lost = storeActions().filter((name) => !(name in GUARDED) && !(name in LOCAL_ONLY));
    expect(lost).toEqual([]); // thao tác mới thêm mà quên phân loại sẽ lọt vào đây
  });

  it('không thao tác nào nằm cả hai danh sách', () => {
    const dup = Object.keys(GUARDED).filter((name) => name in LOCAL_ONLY);
    expect(dup).toEqual([]);
  });

  it('GUARDED và LOCAL_ONLY không trỏ tới hàm đã bị xoá/đổi tên', () => {
    const live = new Set(storeActions());
    const dead = [...Object.keys(GUARDED), ...Object.keys(LOCAL_ONLY)].filter((name) => !live.has(name));
    expect(dead).toEqual([]);
  });

  it('các hàm chạy tại chỗ của coop.ts (LOCAL_ACTIONS) đều thuộc danh sách cục bộ', () => {
    // LOCAL_ACTIONS là tập coop.ts thực dùng để bỏ qua proxy — không được trôi khỏi danh sách lý do
    for (const name of LOCAL_ACTIONS) expect(LOCAL_ONLY[name]).toBeTruthy();
  });
});
