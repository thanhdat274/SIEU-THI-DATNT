import { t } from '../core/i18n';
/** GĐ635: bảng phím tắt trong menu Thêm — tách khỏi Hud để nạp lười (gói tải ban đầu sát trần). */
export const CONTROLS = [
  [t('hud.wasd_bam_chuot'), t('hud.di_lai')],
  ['N', t('hud.di_ngu_o_giuong')],
  ['B', t('hud.bay_hang_o_ke_tu')],
  ['K', t('hud.dat_hang_xem_kho_o_kho')],
  ['G', t('hud.giao_hang_o_cua_nha_khach')],
  ['M', t('hud.nau_an_o_tram_nau')],
  ['O', t('hud.dong_mo_cua_tiem')],
  [t('hud.keo_chuot_trai'), t('hud.nhin_quanh')],
  [t('hud.chuot_phai_q_e'), 'Xoay camera'],
  [t('hud.cuon_chuot'), t('hud.phong_to_thu_nho')],
  ['Esc', t('hud.dong_bang')],
];

export function HudKeys() {
  return (
    <div className="hud-help">
      {CONTROLS.map(([k, v]) => (
        <div key={k}><kbd>{k}</kbd><span>{v}</span></div>
      ))}
    </div>
  );
}
