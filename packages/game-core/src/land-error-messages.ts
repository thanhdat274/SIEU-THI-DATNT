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
