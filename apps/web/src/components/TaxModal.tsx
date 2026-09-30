import React from 'react';
import { summarizeAnnualRevenue } from '@game/core';
import type { DailyRecord, WorldTime } from '@game/shared';
import { PixelDialog, money } from './pixel';

interface Props {
  day: number;
  worldTime: WorldTime;
  dailyRecords: Record<number, DailyRecord>;
  currentDayRecord: DailyRecord | null;
  onClose: () => void;
}

export const TaxModal: React.FC<Props> = ({ day, worldTime, dailyRecords, currentDayRecord, onClose }) => {
  const annual = summarizeAnnualRevenue(dailyRecords, day, currentDayRecord ?? undefined);
  return <PixelDialog title="Thuế & sổ kinh doanh" subtitle="Theo dõi doanh thu, tìm hiểu nghĩa vụ" icon="book" onClose={onClose}>
    <div className="summary-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <strong>Doanh thu năm trong game {annual.year}: {money(annual.revenue)}</strong>
      <span className="muted">Năm trong game tính theo 365 ngày, không đại diện cho năm tính thuế theo pháp luật.</span>
      {annual.referenceThreshold !== null && <>
        <div className="pixel-progress" role="progressbar" aria-label="Tiến độ so với ngưỡng tham khảo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(annual.progress * 100)}>
          <span style={{ width: `${Math.round(annual.progress * 100)}%` }} />
        </div>
        <span>Ngưỡng tham khảo đang nghiên cứu: {money(annual.referenceThreshold)}/năm</span>
      </>}
    </div>

    <div className="action-reason" style={{ marginTop: 14 }}>
      <strong>Chưa đủ căn cứ tính thuế</strong>
      <p style={{ marginBottom: 0 }}>{annual.note} Số thuế phải nộp chưa được xác định trong trò chơi.</p>
    </div>

    <section style={{ marginTop: 16 }} aria-labelledby="tax-status-heading">
      <h3 id="tax-status-heading">Hồ sơ kinh doanh</h3>
      <p>Tiệm hiện chưa có hồ sơ đăng ký kinh doanh hoặc lựa chọn loại hình được lưu trong tiến trình.</p>
      <p>Ngày trong game: {day} · Giờ: {String(worldTime.hour).padStart(2, '0')}:{String(worldTime.minute).padStart(2, '0')}</p>
      <p className="muted">Chưa có khai thuế, hóa đơn pháp lý, hạn nộp hay khoản thuế được trừ khỏi tiền trong hòm.</p>
    </section>

    <section style={{ marginTop: 16 }} aria-labelledby="tax-sources-heading">
      <h3 id="tax-sources-heading">Nguồn đang nghiên cứu</h3>
      <ul>
        <li><a href="https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-so-141-2026-nd-cp-nang-nguong-doanh-thu-khong-phai-chiu-thue-len-1-ty-dong-119260504154326455.htm" target="_blank" rel="noreferrer">Nghị định 141/2026/NĐ-CP — bài toàn văn trên Cổng Chính phủ</a></li>
        <li><a href="https://xaydungchinhsach.chinhphu.vn/nghi-dinh-68-2026-nd-cp.html" target="_blank" rel="noreferrer">Nghị định 68/2026/NĐ-CP — chính sách thuế hộ kinh doanh</a></li>
      </ul>
      <p className="muted">Bản tóm tắt và nguồn tham khảo chưa đủ để xác nhận công thức, điều kiện hoặc điều khoản chuyển tiếp. Hóa đơn và chứng từ trong game (nếu được bổ sung) chỉ là mô phỏng.</p>
    </section>
  </PixelDialog>;
};
