/** Máy có tạo được ngữ cảnh WebGL không (dùng canvas tạm, không đụng canvas của game). Game chỉ có renderer 3D nên cần WebGL. */
export function detectWebGL(createCanvas: () => { getContext(id: string): unknown }): boolean {
  try {
    const canvas = createCanvas();
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export const WEBGL_UNAVAILABLE_MESSAGE = 'Máy hoặc trình duyệt không hỗ trợ đồ họa 3D (WebGL). Hãy bật tăng tốc phần cứng hoặc dùng trình duyệt khác.';

/** Ném khi máy không có WebGL: nơi bắt hiển thị `WEBGL_UNAVAILABLE_MESSAGE` thay cho thông báo lỗi chung. */
export class WebGLUnavailableError extends Error {
  constructor() {
    super(WEBGL_UNAVAILABLE_MESSAGE);
    this.name = 'WebGLUnavailableError';
  }
}
