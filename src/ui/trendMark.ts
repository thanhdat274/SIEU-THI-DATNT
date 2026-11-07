/** Playtest P1 A1: dấu ▲/▼ cạnh số lãi/lỗ — người mù màu đỏ-lục vẫn đọc được chiều (không chỉ dựa vào màu). */
export const trendMark = (n: number): string => (n > 0 ? '▲ ' : n < 0 ? '▼ ' : '');
