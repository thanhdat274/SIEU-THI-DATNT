/** Chuẩn hóa tiêu đề tiếng Việt cho tòa nhà, tuyệt đối không để lọt ký tự '_' hay id kỹ thuật ra người chơi. */
export function sanitizeBuildingTitle(raw: string): string {
  if (!raw) return 'Công trình';
  if (raw === 'main' || /^grocery_main/.test(raw)) return 'Tiệm Tạp Hóa Đầu Hẻm';
  if (/^xoi/.test(raw)) return 'Tiệm Xôi Bác Năm';
  if (/^drink/.test(raw)) return 'Tiệm Nước Giải Khát';
  if (/^snack/.test(raw)) return 'Tiệm Ăn Vặt';
  if (/^cafe/.test(raw)) return 'Quán Cà Phê';
  if (/^com_restaurant/.test(raw)) return 'Quán Cơm Bình Dân';
  if (/^grocery_branch/.test(raw)) return 'Chi Nhánh Tạp Hóa';
  if (/^clinic/.test(raw)) return 'Trạm Y Tế';
  if (/^ward_police/.test(raw)) return 'Đồn Công An Phường';
  if (/^primary_school/.test(raw)) return 'Trường Tiểu Học';
  if (/^civic_wide/.test(raw) || /^building-wide/.test(raw)) return 'Trung Tâm Sinh Hoạt Cộng Đồng';
  if (/^parking_lot/.test(raw)) return 'Bãi Giữ Xe';
  if (/^park/.test(raw)) return 'Công Viên Cây Xanh';
  return raw.replace(/_/g, ' ').trim();
}

/** Chuẩn hóa dòng phụ (loại tòa) tiếng Việt, không để lọt ký tự '_'. */
export function sanitizeBuildingTypeLabel(raw: string, title?: string): string {
  if (!raw || raw === 'main' || /^grocery_main/.test(raw)) return 'Cửa hàng chính';
  if (/^xoi/.test(raw)) return 'Tiệm xôi';
  if (/^drink/.test(raw)) return 'Tiệm giải khát';
  if (/^snack/.test(raw)) return 'Tiệm ăn vặt';
  if (/^cafe/.test(raw)) return 'Quán cà phê';
  if (/^com_restaurant/.test(raw)) return 'Quán cơm';
  if (/^grocery_branch/.test(raw)) return 'Chi nhánh';
  if (/^(clinic|ward_police|primary_school|civic)/.test(raw)) return 'Công trình công cộng';
  if (/^parking_lot/.test(raw)) return 'Bãi đỗ xe';
  if (/^park/.test(raw)) return 'Khu công viên';
  const clean = raw.replace(/_/g, ' ').trim();
  return clean === title ? 'Công trình' : clean;
}
