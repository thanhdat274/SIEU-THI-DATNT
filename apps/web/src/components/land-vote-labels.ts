/** Nhãn tiếng Việt cho lệnh đất trong hộp phiếu (tách riêng để test được mà không cần kéo cả bộ UI pixel). */
const COMMAND_LABELS: Readonly<Record<string, string>> = {
  reclaim_wave: 'khai hoang một đợt đất mới',
  relocate_building: 'dời một tòa nhà sang lô khác',
  buy_parcel: 'mua hoặc thuê một lô đất',
  buy_plot: 'mua hoặc mở một tòa nhà',
  expand_footprint: 'mở rộng sàn tiệm',
};

export const landCommandLabel = (command: string): string => Object.prototype.hasOwnProperty.call(COMMAND_LABELS, command) ? COMMAND_LABELS[command] : 'một khoản chi đất lớn';

/** Ba mức quyền của thành viên với lệnh đất (D2), dùng cho bảng cài đặt của chủ hẻm. */
export const MEMBER_PERMISSION_OPTIONS: ReadonlyArray<{ value: 'full' | 'vote' | 'none'; label: string; hint: string }> = [
  { value: 'full', label: 'Toàn quyền', hint: 'Thành viên mua đất, dời tòa, khai hoang như chủ, không cần phiếu.' },
  { value: 'vote', label: 'Cần phiếu (mặc định)', hint: 'Lệnh lớn cần người kia đồng ý khi họ đang online.' },
  { value: 'none', label: 'Chỉ chủ làm', hint: 'Thành viên không được thao tác đất lớn.' },
];
