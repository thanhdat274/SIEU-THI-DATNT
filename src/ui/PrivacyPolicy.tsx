import { useState } from 'react';
import { PRIVACY_VERSION, SUPPORT_CONTACT } from '../net/consentPolicy';
import './login.css';

/**
 * Panel đọc Chính sách Bảo mật / Điều khoản Sử dụng ngay trong màn đăng nhập, trước khi người chơi
 * tick đồng ý. Nội dung cô đọng khớp với bản đầy đủ ở `docs/CHINH-SACH-BAO-MAT.md` & `docs/DIEU-KHOAN-SU-DUNG.md`
 * (bản nháp tham khảo, đổi phiên bản thì đổi `PRIVACY_VERSION`).
 */
type Tab = 'privacy' | 'terms';

export function PrivacyPolicy({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('privacy');
  return (
    <div className="privacy-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="privacy-panel" onClick={(e) => e.stopPropagation()}>
        <header className="privacy-head">
          <div>
            <h2>Tạp Hoá 3D</h2>
            <span className="privacy-version">Phiên bản {PRIVACY_VERSION} · bản nháp tham khảo</span>
          </div>
          <button className="privacy-close" onClick={onClose} aria-label="Đóng">✕</button>
        </header>
        <nav className="privacy-tabs">
          <button className={tab === 'privacy' ? 'on' : ''} onClick={() => setTab('privacy')}>Chính sách bảo mật</button>
          <button className={tab === 'terms' ? 'on' : ''} onClick={() => setTab('terms')}>Điều khoản</button>
        </nav>
        <div className="privacy-body">{tab === 'privacy' ? <Privacy /> : <Terms />}</div>
        <footer className="privacy-foot">
          <button className="login-btn primary" onClick={onClose}>Đã hiểu, đóng lại</button>
        </footer>
      </div>
    </div>
  );
}

function Privacy() {
  return (
    <>
      <p>Chúng tôi xử lý một số dữ liệu cá nhân để vận hành trò chơi. Tóm tắt:</p>
      <ul>
        <li><b>Thu thập khi đăng nhập Google:</b> email, tên, ảnh đại diện, mã tài khoản (uid) — để xác thực và đồng bộ tiến trình.</li>
        <li><b>Lưu trữ:</b> bản lưu tiến trình ở cục bộ (trình duyệt) và đám mây (<b>MongoDB, có thể ở nước ngoài</b>). Tài khoản do Google quản lý.</li>
        <li><b>Online:</b> khi chơi hẻm, máy chủ lưu tên hiển thị Google của bạn trong danh sách thành viên và gửi tên cùng trạng thái chơi cho người cùng hẻm. Máy chủ không lưu email hay avatar.</li>
        <li><b>Không thu thập:</b> ảnh khác, số điện thoại, dữ liệu nhạy cảm; không theo dõi quảng cáo, không bán dữ liệu.</li>
        <li><b>Quyền của bạn:</b> xem, sửa, hạn chế, yêu cầu <b>xoá dữ liệu / tài khoản</b> (trong game), khiếu nại.</li>
        <li><b>Chơi không đăng nhập:</b> tiến trình chỉ lưu trong máy, không đồng bộ lên cloud.</li>
      </ul>
      <p><b>Liên hệ về dữ liệu cá nhân:</b> {SUPPORT_CONTACT || 'chưa công bố (bản thử nghiệm)'}</p>
      <p>Bản đầy đủ và chi tiết (căn cứ Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15) nằm trong tài liệu dự án.</p>
    </>
  );
}

function Terms() {
  return (
    <>
      <ul>
        <li><b>Chơi tự do, không mất phí:</b> tiền và hàng trong game là <b>ảo</b>, không đổi được thành tiền thật.</li>
        <li><b>Tài khoản:</b> bạn chịu trách nhiệm giữ an toàn tài khoản Google của mình.</li>
        <li><b>Cấm:</b> gian lận, phá hoại server, đánh cắp/quấy rối dữ liệu người khác, khai thác trái phép game.</li>
        <li><b>Dịch vụ:</b> cung cấp "nguyên trạng"; chúng tôi không cam kết không gián đoạn, lỗi hay mất dữ liệu. Bạn nên tự lưu ý bản lưu của mình.</li>
        <li><b>Sở hữu trí tuệ:</b> game, hình ảnh, âm thanh, nội dung thuộc về chúng tôi; không được dùng ngoài mục đích.</li>
        <li><b>Thay đổi:</b> điều khoản có thể được cập nhật; khi đó game sẽ hỏi lại và bạn cần tick đồng ý phiên bản mới. Im lặng hay tiếp tục chơi <b>không</b> được coi là đồng ý.</li>
        <li><b>Áp dụng pháp luật Việt Nam.</b></li>
      </ul>
    </>
  );
}
