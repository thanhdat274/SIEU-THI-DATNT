/** Nhãn tiếng Việt cho lệnh đất trong hộp phiếu (tách riêng để test được mà không cần kéo cả bộ UI pixel). */
const COMMAND_LABELS: Readonly<Record<string, string>> = {
  reclaim_wave: 'khai hoang một đợt đất mới',
  relocate_building: 'dời một tòa nhà sang lô khác',
  buy_parcel: 'mua hoặc thuê một lô đất',
  buy_plot: 'mua hoặc mở một tòa nhà',
  expand_footprint: 'mở rộng sàn tiệm',
};

export const landCommandLabel = (command: string): string => Object.prototype.hasOwnProperty.call(COMMAND_LABELS, command) ? COMMAND_LABELS[command] : 'một khoản chi đất lớn';
