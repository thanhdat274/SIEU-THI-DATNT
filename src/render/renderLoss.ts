/**
 * Lời cảnh báo khi mất ngữ cảnh render (GĐ175) — tách khỏi scene.ts để test thuần được
 * (scene.ts có matchMedia/WebGPU ở cấp module, node test không nạp được).
 */
export function renderLossMessage(backend: 'webgl' | 'webgpu', reason?: string): string {
  const cause = reason ? ` (${reason})` : '';
  return backend === 'webgpu'
    ? `⚠️ GPU ngắt kết nối${cause} — đồ hoạ tạm dừng. Tải lại trang (F5) để vào lại tiệm, bản lưu tự động không mất gì.`
    : '⚠️ Mất ngữ cảnh đồ hoạ WebGL — đang thử phục hồi. Cảnh đứng im thì tải lại trang (F5).';
}
