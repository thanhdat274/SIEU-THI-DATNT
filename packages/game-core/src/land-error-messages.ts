/**
 * Ánh xạ mã lỗi đất -> chuỗi thông báo (module THUẦN, open-world-coop-land D5).
 *
 * Client sau này dùng kết quả để hiện toast có TÊN người kia; phần này chỉ trả
 * chuỗi, không dính UI/renderer/socket.
 */

export interface LandErrorContext {
  /** Tên người chơi kia (người gây xung đột / từ chối phiếu). */
  name?: string;
}

/**
 * Trả về chuỗi thông báo cho mã lỗi đất. Khi có `ctx.name` thì chèn tên người kia
 * vào; với mã không biết (mặc định) trả về chính `code` làm fallback.
 */
export function landErrorMessage(code: string, ctx?: LandErrorContext): string {
  const name = ctx?.name;
  switch (code) {
    case 'reserved_by_other':
      return name
        ? `Ô/nơi này đang được ${name} giữ`
        : 'Khu vực này đang được người khác giữ trong khi quy hoạch';
    case 'stale_revision':
      return name
        ? `${name} vừa đổi đất, hãy kiểm tra lại`
        : 'Có người vừa thay đổi đất, hãy làm mới';
    case 'vote_rejected':
      return name ? `${name} đã từ chối` : 'Phiếu bị từ chối';
    case 'forbidden':
      return 'Bạn không có quyền thực hiện';
    default:
      return code;
  }
}

const OPEN_BUILDING_REASON_MESSAGES: Record<string, string> = {
  store_open: 'Cần đóng cửa tiệm rồi mới mở được cơ sở mới.',
  unknown_type: 'Loại công trình này không tồn tại.',
  unknown_parcel: 'Không tìm thấy lô đất này.',
  parcel_not_owned: 'Bạn chưa sở hữu lô đất này.',
  not_leased: 'Lô đất này chưa được thuê.',
  rent_debt: 'Lô đất đang nợ tiền thuê, hãy trả nợ trước.',
  wave_not_open: 'Đợt khai hoang của lô này chưa mở.',
  level: 'Chưa đủ cấp để mở công trình này.',
  money: 'Không đủ tiền để mở công trình này.',
  max_instances: 'Đã đạt số lượng tối đa của loại công trình này.',
  single_instance: 'Mỗi lô chỉ xây được một công trình loại này.',
  building_present: 'Lô đất này đã có công trình.',
  owned: 'Công trình này đã có rồi.',
  invalid_day: 'Chưa mở được công trình vào lúc này.',
};

/** Câu tiếng Việt cho `reason` của `openBuilding` (mã lạ trả về chính mã). */
export function openBuildingReasonMessage(reason: string | undefined): string {
  if (!reason) return 'Không mở được cơ sở.';
  return OPEN_BUILDING_REASON_MESSAGES[reason] ?? reason;
}
