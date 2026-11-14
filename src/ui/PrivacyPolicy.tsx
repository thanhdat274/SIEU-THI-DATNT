import { useState } from 'react';
import { PRIVACY_VERSION, SUPPORT_CONTACT } from '../net/consentPolicy';
import { t } from '../core/i18n';
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
            <h2>{t('privacy.tap_hoa_3d')}</h2>
            <span className="privacy-version">{t('privacy.phien_ban')}{' '}{PRIVACY_VERSION}{' '}{t('privacy.ban_nhap_tham_khao')}</span>
          </div>
          <button className="privacy-close" onClick={onClose} aria-label={t('privacy.dong')}>✕</button>
        </header>
        <nav className="privacy-tabs">
          <button className={tab === 'privacy' ? 'on' : ''} onClick={() => setTab('privacy')}>{t('privacy.chinh_sach_bao_mat')}</button>
          <button className={tab === 'terms' ? 'on' : ''} onClick={() => setTab('terms')}>{t('privacy.dieu_khoan')}</button>
        </nav>
        <div className="privacy-body">{tab === 'privacy' ? <Privacy /> : <Terms />}</div>
        <footer className="privacy-foot">
          <button className="login-btn primary" onClick={onClose}>{t('privacy.da_hieu_dong_lai')}</button>
        </footer>
      </div>
    </div>
  );
}

function Privacy() {
  return (
    <>
      <p>{t('privacy.chung_toi_xu_ly_mot_so')}</p>
      <ul>
        <li><b>{t('privacy.thu_thap_khi_dang_nhap_google')}</b>{' '}{t('privacy.email_ten_anh_dai_dien_ma')}</li>
        <li><b>{t('privacy.luu_tru')}</b>{' '}{t('privacy.ban_luu_tien_trinh_o_cuc')}<b>{t('privacy.mongodb_co_the_o_nuoc_ngoai')}</b>{t('privacy.tai_khoan_do_google_quan_ly')}</li>
        <li><b>Online:</b>{' '}{t('privacy.khi_choi_hem_may_chu_luu')}</li>
        <li><b>{t('privacy.khong_thu_thap')}</b>{' '}{t('privacy.anh_khac_so_dien_thoai_du')}</li>
        <li><b>{t('privacy.quyen_cua_ban')}</b>{' '}{t('privacy.xem_sua_han_che_yeu_cau')}{' '}<b>{t('privacy.xoa_du_lieu_tai_khoan')}</b>{' '}{t('privacy.trong_game_khieu_nai')}</li>
        <li><b>{t('privacy.choi_khong_dang_nhap')}</b>{' '}{t('privacy.tien_trinh_chi_luu_trong_may')}</li>
      </ul>
      <p><b>{t('privacy.lien_he_ve_du_lieu_ca')}</b> {SUPPORT_CONTACT || t('privacy.chua_cong_bo_ban_thu_nghiem')}</p>
      <p>{t('privacy.ban_day_du_va_chi_tiet')}</p>
    </>
  );
}

function Terms() {
  return (
    <>
      <ul>
        <li><b>{t('privacy.choi_tu_do_khong_mat_phi')}</b>{' '}{t('privacy.tien_va_hang_trong_game_la')}{' '}<b>{t('privacy.ao')}</b>{t('privacy.khong_doi_duoc_thanh_tien_that')}</li>
        <li><b>{t('privacy.tai_khoan')}</b>{' '}{t('privacy.ban_chiu_trach_nhiem_giu_an')}</li>
        <li><b>{t('privacy.cam')}</b>{' '}{t('privacy.gian_lan_pha_hoai_server_danh')}</li>
        <li><b>{t('privacy.dich_vu')}</b>{' '}{t('privacy.cung_cap_nguyen_trang_chung_toi')}</li>
        <li><b>{t('privacy.so_huu_tri_tue')}</b>{' '}{t('privacy.game_hinh_anh_am_thanh_noi')}</li>
        <li><b>{t('privacy.thay_doi')}</b>{' '}{t('privacy.dieu_khoan_co_the_duoc_cap')}{' '}<b>{t('privacy.khong')}</b>{' '}{t('privacy.duoc_coi_la_dong_y')}</li>
        <li><b>{t('privacy.ap_dung_phap_luat_viet_nam')}</b></li>
      </ul>
    </>
  );
}
