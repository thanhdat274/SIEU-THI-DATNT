/**
 * Chính sách đồng ý xử lý dữ liệu cá nhân (Luật 91/2025). Module THUẦN — không import firebase/net
 * để dễ test và tách biệt với lớp mạng. Phiên bản Chính sách đổi lúc nào thì đồng ý lại lúc đó.
 */

/** Phiên bản hiện hành của Chính sách Bảo mật; đổi khi cập nhật nội dung để buộc đồng ý lại. */
export const PRIVACY_VERSION = '2026-11-03';

/**
 * Các phạm vi cần người chơi chủ động đồng ý, mỗi phạm vi một ô tick riêng (không gộp đồng ý xử lý
 * dữ liệu vào chấp nhận điều khoản — NĐ 356/2025). 'account_cloud' = đăng nhập Google + đồng bộ cloud;
 * 'terms' = chấp nhận Điều khoản sử dụng.
 */
export const CONSENT_SCOPES = ['account_cloud', 'terms'] as const;
export type ConsentScope = (typeof CONSENT_SCOPES)[number];

/** Kênh liên hệ thực hiện quyền chủ thể dữ liệu; rỗng = chưa công bố (panel sẽ báo chưa có). */
export const SUPPORT_CONTACT = 'nguyenthanhdat27042002@gmail.com';

/** Đủ mọi ô đồng ý bắt buộc chưa (nút đăng nhập Google chỉ mở khi đủ). */
export const allConsentsGiven = (given: Partial<Record<ConsentScope, boolean>>) =>
  CONSENT_SCOPES.every((s) => given[s] === true);

/** Một chuỗi có phải scope đồng ý hợp lệ không. */
export const isConsentScope = (s: string): s is ConsentScope =>
  (CONSENT_SCOPES as readonly string[]).includes(s);

/** Phiên bản Chính sách có đủ ý (không rỗng, hợp độ dài) để ghi bằng chứng không. */
export const isValidConsentVersion = (v: string) => v.length > 0 && v.length <= 40;
