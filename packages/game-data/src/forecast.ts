/** Luật lập kế hoạch tồn kho, cấu hình bằng dữ liệu. */
export const FORECAST_RULES = {
  /** Số ngày nhu cầu muốn phủ sau khi hàng về. */
  horizonDays: 3,
  /** Số ngày nhìn lại để coi là chậm bán. */
  slowSellDays: 5,
  /** Bán trung bình dưới ngưỡng này (đơn vị/ngày) mà còn tồn thì coi là chậm bán. */
  slowMaxPerDay: 0.2,
  /** Tồn tối thiểu để xét chậm bán. */
  slowMinStock: 3,
  /** Chưa có doanh số: nhu cầu thử = độ phổ biến × hệ số này (đơn vị/ngày). */
  trialUnitsPerPopularity: 5,
  /** Chênh nhu cầu so với hôm nay vượt ngưỡng này mới tính là tăng/giảm. */
  trendThreshold: 0.05,
  /** Số lý do hiển thị cho mỗi món. */
  reasonsShown: 2,
  /** Số món trong danh sách xu hướng. */
  trendingShown: 5,
} as const;
