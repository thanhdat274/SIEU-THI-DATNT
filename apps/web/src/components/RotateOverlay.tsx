import React from 'react';

/**
 * Game chỉ chơi ở màn ngang. Màn cảm ứng đang dọc thì phủ lớp hướng dẫn xoay (CSS `.rotate-screen` trong responsive.css quyết định
 * hiện/ẩn theo hướng màn hình và kiểu nhập, không cần state nên xoay máy là cập nhật ngay). Chuột + cửa sổ hẹp vẫn chơi bình thường.
 */
export const RotateOverlay: React.FC = () => (
  <div className="rotate-screen" role="alert" aria-live="assertive">
    <svg className="rotate-hint-icon" viewBox="0 0 64 64" width="72" height="72" aria-hidden="true" shapeRendering="crispEdges">
      <rect x="22" y="6" width="20" height="40" rx="2" fill="none" stroke="currentColor" strokeWidth="4" />
      <rect x="30" y="40" width="4" height="2" fill="currentColor" />
      <path d="M10 54h44M46 46l8 8-8 8" fill="none" stroke="currentColor" strokeWidth="4" />
    </svg>
    <h2>Xoay ngang thiết bị để chơi game</h2>
    <p>Nếu máy không tự xoay, hãy tắt khóa xoay màn hình rồi xoay ngang thiết bị.</p>
  </div>
);
