/**
 * Bảng Cài đặt: Hình ảnh · Đồ họa · Âm thanh · Chơi · Trợ năng.
 * Chỉ là tuỳ chọn riêng máy (localStorage), không vào save, không đổi mô phỏng → không lệch golden.
 */
import { useState } from 'react';
import { useGame } from '../core/store';
import { AUTO_OPEN_PRESETS } from '../core/gameTypes';
import { createPortal } from 'react-dom';
import { GFX_CYCLE, GFX_LABEL, gfxStatus, setGfxChoice, type GfxChoice } from '../render/graphicsQuality';
import {
  getVolume, initAudio, isMuted, isMusic, playSfx, setMuted, setMusic, setVolume, VOL_DEFAULT, type VolChannel,
} from '../core/audio';
import { perfOn, setPerf } from '../core/perf';
import { getSettings, resetSettings, setSettings, type Settings } from '../core/settings';
import { importSaveData, snapshot, type SaveData } from '../core/save';
import { decodeSaveCode, encodeSaveCode } from '../core/saveCode';
import { WhatsNewList } from './WhatsNewList';
import { telemetryOptedIn, setTelemetryOptIn } from '../data/telemetryConsent';
import { deleteTelemetry, exportReportsJson, flushReports } from '../core/dayReport';
import { TelemetrySampleView } from './TelemetrySampleView';
import { Dropdown } from './Dropdown';
import { LANG_OPTIONS, t } from '../core/i18n';

type Tab = 'img' | 'gfx' | 'audio' | 'play' | 'a11y' | 'data' | 'game';
/** Việc của ván đang chơi (chỉ có khi mở từ trong game; ở màn đăng nhập tab này ẩn). */
export interface GameActions { online: boolean; save: () => void; restore: () => void; backToMenu: () => void; newGame: () => void }
const TABS: [Tab, string][] = (['img', 'gfx', 'audio', 'play', 'a11y', 'data'] as const).map((id) => [id, t(`settings.tab.${id}`)]);
const GAME_TAB: [Tab, string] = ['game', t('settings.tab.game')];

const GFX_NOTE: Record<GfxChoice, string> = {
  auto: t('settings.may_tu_ha_nang_muc_theo'),
  low: t('settings.it_bong_it_mua_may_sao'),
  medium: t('settings.can_bang_giua_dep_va_muot'),
  high: t('settings.bong_mua_may_sao_day_du'),
};

const CHANNELS: [VolChannel, string][] = [
  ['master', t('settings.tong')], ['sfx', t('settings.hieu_ung_chuong_cua_thu_tien')],
  ['music', t('settings.nhac_nen')], ['amb', t('settings.moi_truong_mua_chim_de')],
  ['ui', t('settings.giao_dien_len_cap_thuong_nhiem')],
];

const rowCss: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,.08)' };

// Nút của dialog Cài đặt: trước đây để mặc định trình duyệt (trần trụi, mỗi máy một kiểu).
// Bảng màu bám theo tab (viền #b9825a, nền kem; action chính = cam #c8663f như tab đang chọn).
const dlgBtn: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 8, border: '1px solid #b9825a',
  background: '#fff7ec', color: '#4a2f1c', font: 'inherit', fontSize: 13, cursor: 'pointer',
};
const dlgBtnPrimary: React.CSSProperties = { ...dlgBtn, background: '#c8663f', borderColor: '#c8663f', color: '#fff', fontWeight: 600 };
const dlgBtnDisabled: React.CSSProperties = { opacity: 0.5, cursor: 'default' };
// Tông sáng cho điều khiển tự vẽ (Dropdown): kem + viền nâu, action cam — bám bảng màu tab/dialog.
// accentColor nhuộm luôn slider/checkbox thuần của trình duyệt (trước đây xanh mặc định, lệch tông).
const lightCtl = {
  accentColor: '#c8663f',
  '--ctl-bg': '#fff7ec', '--ctl-bg-hover': '#f8e8d0', '--ctl-border': '#b9825a',
  '--ctl-text': '#4a2f1c', '--ctl-accent': '#c8663f',
  '--ctl-list-bg': '#fffdf6', '--ctl-opt-active': 'rgba(200, 102, 63, 0.16)',
} as React.CSSProperties;

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={rowCss}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, opacity: 0.65 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      style={{ width: 44, height: 24, borderRadius: 12, border: 0, cursor: 'pointer', background: on ? '#c8663f' : '#d4cbbd', position: 'relative', padding: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'left .15s' }} />
    </button>
  );
}

function Select<T extends string | number>({ value, options, onChange, label }: {
  value: T; options: [T, string][]; onChange: (v: T) => void; label: string;
}) {
  // Dropdown tự vẽ thay <select>: danh sách thả của <select> do hệ điều hành vẽ — không bo góc,
  // không đổi kiểu được. Component Dropdown dùng lại được ở mọi context (biến --ctl-* quyết định tông).
  const opts = options.map(([v, t]) => ({ value: String(v), label: t }));
  return (
    <Dropdown
      value={String(value)}
      options={opts}
      ariaLabel={label}
      onChange={(sv) => { const o = options.find(([v]) => String(v) === sv); if (o) onChange(o[0]); }}
    />
  );
}

function Slider({ value, min, max, step = 1, onChange, label, fmt }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label: string; fmt: (v: number) => string;
}) {
  return (
    <>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span style={{ width: 44, textAlign: 'right', fontWeight: 600 }}>{fmt(value)}</span>
    </>
  );
}

/** Giữ bản sao cài đặt trong state để giao diện cập nhật ngay khi kéo. */
function useSettings() {
  const [s, setS] = useState<Settings>({ ...getSettings() });
  const set = (p: Partial<Settings>) => { setSettings(p); setS({ ...getSettings() }); };
  return [s, set] as const;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

function ImgTab() {
  const [s, set] = useSettings();
  const [perf, setP] = useState(perfOn());
  const [full, setFull] = useState(!!document.fullscreenElement);
  const [choice, setChoice] = useState<GfxChoice>(gfxStatus().choice);
  const toggleFull = (want: boolean) => {
    const p = want ? document.documentElement.requestFullscreen?.() : document.exitFullscreen?.();
    void Promise.resolve(p).catch(() => { /* trình duyệt chặn */ }).finally(() => setFull(!!document.fullscreenElement));
  };
  return (
    <div>
      <Row label={t('settings.do_phan_giai')} hint={t('settings.do_net_hinh_3d_ben_trong')}>
        <Select label={t('settings.do_phan_giai')} value={s.resolution}
          options={[['auto', t('settings.tu_dong')], ['native', t('settings.goc_man_hinh')], ['1080', '1080p'], ['720', '720p']]}
          onChange={(v) => set({ resolution: v })} />
      </Row>
      <Row label={t('settings.che_do_hien_thi')} hint={t('settings.trinh_duyet_yeu_cau_thao_tac')}>
        <Select label={t('settings.che_do_hien_thi')} value={full ? 'full' : 'win'} options={[['win', t('settings.cua_so')], ['full', t('settings.toan_man_hinh')]]} onChange={(v) => toggleFull(v === 'full')} />
      </Row>
      <Row label={t('settings.gioi_han_fps_v_sync')} hint={t('settings.khong_gioi_han_dong_bo_theo')}>
        <Select label={t('settings.gioi_han_fps')} value={s.fpsCap} options={[[0, t('settings.theo_man_hinh')], [30, '30'], [60, '60'], [120, '120']]} onChange={(v) => set({ fpsCap: v })} />
      </Row>
      <Row label={t('settings.chong_nong_may')} hint={t('settings.60_fps_khi_dang_cham_sac')}>
        <Switch label={t('settings.chong_nong_may')} on={s.coolMode} onChange={(v) => set({ coolMode: v })} />
      </Row>
      <Row label={t('settings.hien_fps')}><Switch label={t('settings.hien_fps')} on={perf} onChange={(v) => { setPerf(v); setP(v); }} /></Row>
      <Row label={t('settings.do_sang')}><Slider label={t('settings.do_sang')} value={s.brightness} min={0.7} max={1.3} step={0.05} fmt={pct} onChange={(v) => set({ brightness: v })} /></Row>
      <Row label={t('settings.ty_le_render')} hint={t('settings.thap_hon_nhanh_hon_tren_may')}>
        <Slider label={t('settings.ty_le_render')} value={s.renderScale} min={0.5} max={1} step={0.05} fmt={pct} onChange={(v) => set({ renderScale: v })} />
      </Row>
      <Row label={t('settings.tu_giu_khung_hinh_muot')} hint={t('settings.tu_ha_do_phan_giai_khi')}>
        <Switch label={t('settings.tu_giu_khung_hinh_muot')} on={choice === 'auto'}
          onChange={(v) => { const c: GfxChoice = v ? 'auto' : gfxStatus().level; setGfxChoice(c); setChoice(c); }} />
      </Row>
      <Row label={t('settings.co_giao_dien')}><Slider label={t('settings.co_giao_dien')} value={s.uiScale} min={0.8} max={1.4} step={0.05} fmt={pct} onChange={(v) => set({ uiScale: v })} /></Row>
      <Row label={t('settings.lang')} hint={t('settings.lang.hint')}>
        {/* Đổi ngôn ngữ → reload; pagehide trong save.ts ghi ván trước khi tải lại */}
        <Select label={t('settings.lang')} value={s.lang} options={LANG_OPTIONS} onChange={(v) => { if (v === s.lang) return; set({ lang: v }); location.reload(); }} />
      </Row>
      <Row label={t('settings.tien_te_hien_thi')} hint={t('settings.chi_doi_cach_hien_so_1')}>
        <Select label={t('settings.tien_te_hien_thi')} value={s.currency} options={[['vnd', t('settings.dong_d')], ['usd', t('settings.do_la')]]} onChange={(v) => set({ currency: v })} />
      </Row>
    </div>
  );
}

function GfxTab() {
  const [s, set] = useSettings();
  const [choice, setChoice] = useState<GfxChoice>(gfxStatus().choice);
  const lv = gfxStatus().level;
  return (
    <div>
      <Row label={t('settings.thiet_lap_san')} hint={t('settings.do_hoa_khong_anh_huong_so')}>
        <Select label={t('settings.thiet_lap_san')} value={choice}
          options={GFX_CYCLE.map((c) => [c, c === 'auto' ? t('settings.tu_dong') : GFX_LABEL[c]] as [GfxChoice, string])}
          onChange={(c) => { setGfxChoice(c); setChoice(c); }} />
      </Row>
      <p style={{ margin: '8px 0', fontSize: 13 }}>
        {GFX_NOTE[choice]}{' '}{t('settings.dang_chay_muc')}{' '}<b>{GFX_LABEL[lv]}</b> · ~{Math.round(gfxStatus().fps)}{' '}{t('settings.fps_cac_muc_ben_duoi_doi')}
      </p>
      <Row label={t('settings.khoang_cach_chi_tiet')} hint={t('settings.nhan_vat_o_xa_dung_yen')}>
        <Select label={t('settings.khoang_cach_chi_tiet')} value={s.detailDist} options={[['near', t('settings.gan')], ['normal', t('settings.vua')], ['far', 'Xa']]} onChange={(v) => set({ detailDist: v })} />
      </Row>
      <Row label={t('settings.bong_do')} hint={t('settings.tat_de_nhe_may_bat_lai')}>
        <Switch label={t('settings.bong_do')} on={s.shadows} onChange={(v) => set({ shadows: v })} />
      </Row>
      <Row label={t('settings.chat_luong_anh_sang')} hint={t('settings.so_den_that_quanh_camera_den')}>
        <Select label={t('settings.chat_luong_anh_sang')} value={s.lightQuality} options={[['low', t('settings.thap')], ['normal', t('settings.vua')], ['high', 'Cao']]} onChange={(v) => set({ lightQuality: v })} />
      </Row>
      <Row label={t('settings.mat_do_mua')}>
        <Select label={t('settings.mat_do_mua')} value={s.rainDensity} options={[[0, t('settings.tat')], [0.5, t('settings.thua')], [1, t('settings.du')]]} onChange={(v) => set({ rainDensity: v })} />
      </Row>
      <Row label={t('settings.may_tren_troi')}><Switch label={t('settings.may_tren_troi')} on={s.clouds} onChange={(v) => set({ clouds: v })} /></Row>
      <Row label={t('settings.sao_ban_dem')}><Switch label={t('settings.sao_ban_dem')} on={s.stars} onChange={(v) => set({ stars: v })} /></Row>
      <Row label={t('settings.cay_la_chuyen_dong')} hint={t('settings.cay_lua_lac_theo_gio')}>
        <Switch label={t('settings.cay_la_chuyen_dong')} on={s.foliageSway} onChange={(v) => set({ foliageSway: v })} />
      </Row>
    </div>
  );
}

function AudioTab() {
  const [, bump] = useState(0);
  const [muted, setM] = useState(isMuted());
  const [music, setMu] = useState(isMusic());
  return (
    <div>
      <Row label={t('settings.bat_am_thanh')}><Switch label={t('settings.bat_am_thanh')} on={!muted} onChange={(v) => { initAudio(); setMuted(!v); setM(!v); }} /></Row>
      <Row label={t('settings.bat_nhac_nen')}><Switch label={t('settings.bat_nhac_nen')} on={music} onChange={(v) => { setMusic(v); setMu(v); }} /></Row>
      {CHANNELS.map(([ch, label]) => (
        <Row key={ch} label={label}>
          <Slider label={label} value={getVolume(ch)} min={0} max={1} step={0.05} fmt={pct}
            onChange={(v) => { initAudio(); setVolume(ch, v); bump((n) => n + 1); if (ch === 'sfx') playSfx('sale'); else if (ch === 'ui') playSfx('quest'); }} />
        </Row>
      ))}
    </div>
  );
}

function PlayTab() {
  const [s, set] = useSettings();
  return (
    <div>
      <Row label={t('settings.tu_dong_luu')} hint={t('settings.khi_tat_game_chi_luu_khi')}>
        <Switch label={t('settings.tu_dong_luu')} on={s.autosave} onChange={(v) => set({ autosave: v })} />
      </Row>
      <Row label={t('settings.chu_ky_tu_dong_luu')} hint={t('settings.dai_hon_thi_it_giat_may')}>
        <Select label={t('settings.chu_ky_tu_dong_luu')} value={s.autosaveEvery}
          options={[[0, t('settings.mac_dinh_ngay_khi_doi')], [60, t('settings.1_phut')], [180, t('settings.3_phut')], [300, t('settings.5_phut')]]}
          onChange={(v) => set({ autosaveEvery: v })} />
      </Row>
      <Row label={t('settings.hien_bieu_tuong_sot_ruot_cua')} hint={t('settings.tren_dau_khach_cho_lau')}>
        <Switch label={t('settings.hien_bieu_tuong_sot_ruot')} on={s.showPatience} onChange={(v) => set({ showPatience: v })} />
      </Row>
      <Row label={t('settings.tu_ve_1_khi_tiem_qua')} hint={t('settings.khach_xep_hang_tu_4_nguoi')}>
        <Switch label={t('settings.tu_ve_1')} on={s.autoSlow} onChange={(v) => set({ autoSlow: v })} />
      </Row>
      <Row label={t('settings.tam_dung_khi_mo_menu')} hint={t('settings.mo_mot_bang_nhap_hang_kho')}>
        <Switch label={t('settings.tam_dung_khi_mo_menu')} on={s.pauseOnMenu} onChange={(v) => set({ pauseOnMenu: v })} />
      </Row>
      <Row label={t('settings.xac_nhan_truoc_khi_ket_thuc')} hint={t('settings.hoi_lai_khi_nam_len_giuong')}>
        <Switch label={t('settings.xac_nhan_ket_thuc_ngay')} on={s.confirmEndDay} onChange={(v) => set({ confirmEndDay: v })} />
      </Row>
    </div>
  );
}

/** Tải file JSON 30 bản ghi ngày ẩn danh (SPEC-TOI-UU §T1) — người chơi thử gửi qua tin nhắn. */
function downloadPlayLog() {
  try {
    const blob = new Blob([exportReportsJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tap-hoa-nhat-ky-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch { /* bỏ qua */ }
}

function A11yTab() {
  const [s, set] = useSettings();
  return (
    <div>
      <Row label={t('settings.co_giao_dien')}><Slider label={t('settings.co_giao_dien')} value={s.uiScale} min={0.8} max={1.4} step={0.05} fmt={pct} onChange={(v) => set({ uiScale: v })} /></Row>
      <Row label={t('settings.co_chu')}>
        <Select label={t('settings.co_chu')} value={s.fontSize} options={[['small', t('settings.nho')], ['normal', t('settings.vua')], ['large', t('settings.lon')]]} onChange={(v) => set({ fontSize: v })} />
      </Row>
      <Row label={t('settings.giam_chuyen_dong')} hint={t('settings.tat_hieu_ung_chuyen_canh_va')}>
        <Switch label={t('settings.giam_chuyen_dong')} on={s.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
      </Row>
      <Row label={t('settings.tuong_phan_cao')} hint={t('settings.tang_do_ro_cua_giao_dien')}>
        <Switch label={t('settings.tuong_phan_cao')} on={s.highContrast} onChange={(v) => set({ highContrast: v })} />
      </Row>
      <Row label={t('settings.loc_mau_cho_nguoi_mu_mau')} hint={t('settings.doi_dai_mau_cua_ca_canh')}>
        <Select label={t('settings.loc_mau')} value={s.colorblind}
          options={[['off', t('settings.tat')], ['protan', t('settings.kho_phan_biet_do')], ['deutan', t('settings.kho_phan_biet_luc')], ['tritan', t('settings.kho_phan_biet_lam')]]}
          onChange={(v) => set({ colorblind: v })} />
      </Row>
      <Row label={t('settings.tat_chop_sang')} hint={t('settings.khong_loe_sang_khi_co_giong')}>
        <Switch label={t('settings.tat_chop_sang')} on={s.noFlash} onChange={(v) => set({ noFlash: v })} />
      </Row>
      <Row label={t('settings.icon_tuong_phan_cao')} hint={t('settings.vien_trang_nen_dam_quanh_icon')}>
        <Switch label={t('settings.icon_tuong_phan_cao')} on={s.iconContrast} onChange={(v) => set({ iconContrast: v })} />
      </Row>
    </div>
  );
}

const fmtAt = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? '30' : ''}`;

/** Ván chơi: lưu/khôi phục, lịch tự động (mở 6h–8h, đóng 22h30, về nhà ngủ 23h), về màn chính, chơi lại. */
function GameTab({ game }: { game: GameActions }) {
  const autoRoutine = useGame((s) => s.autoRoutine);
  const autoOpenAt = useGame((s) => s.autoOpenAt);
  return (
    <div>
      {!game.online && (
        <>
          <Row label={t('settings.luu_game')} hint={t('settings.game_tu_luu_moi_ngay_bam')}><button style={dlgBtnPrimary} onClick={game.save}>{t('settings.luu')}</button></Row>
          <Row label={t('settings.khoi_phuc_ban_luu_truoc')} hint={t('settings.quay_ve_ban_luu_cuoi_ngay')}><button style={dlgBtn} onClick={game.restore}>{t('settings.khoi_phuc')}</button></Row>
        </>
      )}
      <Row label={t('settings.lich_tu_dong')} hint={t('settings.tu_mo_cua_dung_gio_22h30')}>
        <Switch label={t('settings.lich_tu_dong')} on={autoRoutine} onChange={(v) => useGame.setState({ autoRoutine: v })} />
      </Row>
      {autoRoutine && (
        <Row label={t('settings.gio_mo_cua')} hint={t('settings.mo_som_6h_6h30_don_them')}>
          <Select label={t('settings.gio_mo_cua')} value={String(autoOpenAt)} options={AUTO_OPEN_PRESETS.map((m) => [String(m), fmtAt(m)] as [string, string])}
            onChange={(v) => useGame.setState({ autoOpenAt: Number(v) })} />
        </Row>
      )}
      <Row label={t('settings.ve_man_hinh_chinh')} hint={t('settings.luu_roi_thoat_ra_man_dang')}><button style={dlgBtn} onClick={game.backToMenu}>{t('settings.ve_menu')}</button></Row>
      {!game.online && (
        <Row label={t('settings.choi_lai_tu_dau')} hint={t('settings.xoa_ban_luu_va_bat_dau')}><button style={{ ...dlgBtn, color: '#b3261e', borderColor: '#b3261e' }} onClick={game.newGame}>{t('settings.choi_lai')}</button></Row>
      )}
    </div>
  );
}

function DataTab() {
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<SaveData | null>(null);
  const [tele, setT] = useState(telemetryOptedIn());
  const [teleView, setTeleView] = useState(false);
  const exportCode = async () => {
    try {
      const c = await encodeSaveCode(snapshot());
      setCode(c);
      let copied = false;
      try { await navigator.clipboard.writeText(c); copied = true; } catch { /* trình duyệt chặn: người chơi tự chép từ ô bên dưới */ }
      setMsg({ ok: true, text: copied ? t('settings.da_chep_ma_vao_bo_nho') : t('settings.ma_nam_o_o_ben_duoi') });
    } catch { setMsg({ ok: false, text: t('settings.khong_xuat_duoc_ma_tren_trinh') }); }
  };
  const check = async () => {
    const r = await decodeSaveCode(code);
    if (!r.ok) { setPending(null); return setMsg({ ok: false, text: r.error }); }
    setPending(r.data);
    setMsg({ ok: true, text: t('settings.ma_hop_le_ngay_cap_bam', { day: r.data.day, level: r.data.level }) });
  };
  const load = () => {
    if (!pending) return;
    importSaveData(pending);
    setPending(null);
    setMsg({ ok: true, text: t('settings.da_nap_xong_van_cu_duoc') });
  };
  return (
    <div>
      <Row label={t('settings.ma_chuyen_may')} hint={t('settings.bien_van_dang_choi_thanh_mot')}>
        <button style={dlgBtnPrimary} onClick={exportCode}>{t('settings.xuat_ma')}</button>
      </Row>
      <div style={{ padding: '10px 0' }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('settings.nhap_ma')}</div>
        <textarea aria-label={t('settings.ma_chuyen_may')} value={code} rows={4} placeholder={t('settings.dan_ma_th3d1_vao_day')}
          onChange={(e) => { setCode(e.target.value); setPending(null); setMsg(null); }}
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 11, fontFamily: 'monospace', borderRadius: 8, border: '1px solid #b9825a', background: '#fffdf6', padding: '6px 8px' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button style={{ ...dlgBtn, ...(!code.trim() ? dlgBtnDisabled : null) }} onClick={check} disabled={!code.trim()}>{t('settings.kiem_tra_ma')}</button>
          <button style={{ ...dlgBtnPrimary, ...(!pending ? dlgBtnDisabled : null) }} onClick={load} disabled={!pending}>{t('settings.nap_vao_may_nay')}</button>
        </div>
        {msg && <div role="status" style={{ marginTop: 6, fontSize: 12, color: msg.ok ? '#2a7a3a' : '#b3261e' }}>{msg.text}</div>}
      </div>
      <div style={{ fontWeight: 700, margin: '8px 0 4px' }}>{t('settings.nhat_ky_so_lieu')}</div>
      <Row label={t('settings.xuat_nhat_ky_choi_thu')} hint={t('settings.tai_file_30_ngay_gan_nhat')}>
        <button style={dlgBtn} onClick={downloadPlayLog}>{t('settings.tai_ve')}</button>
      </Row>
      <Row label={t('settings.gui_so_lieu_an_danh')} hint={t('settings.mac_dinh_tat_tat_thi_xoa')}>
        <Switch label={t('settings.gui_so_lieu_an_danh')} on={tele}
          onChange={(v) => { setTelemetryOptIn(v); setT(v); if (v) void flushReports(); else void deleteTelemetry(); }} />
      </Row>
      <Row label={t('settings.xem_gui_nhung_gi')} hint={t('settings.ban_ghi_mau_dung_nhu_nhung')}>
        <button style={dlgBtn} onClick={() => setTeleView(!teleView)}>{teleView ? t('settings.an') : 'Xem'}</button>
      </Row>
      {teleView && <TelemetrySampleView />}
      <div style={{ fontWeight: 700, margin: '8px 0 4px' }}>{t('settings.co_gi_moi')}</div>
      <WhatsNewList />
    </div>
  );
}

export function SettingsPanel({ onClose, game, initialTab }: { onClose: () => void; game?: GameActions; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab === 'game' && !game ? 'img' : initialTab ?? 'img');
  const [rev, setRev] = useState(0);
  const reset = () => {
    resetSettings();
    for (const [c] of CHANNELS) setVolume(c, VOL_DEFAULT[c]);
    setGfxChoice('auto');
    setPerf(false);
    setRev((n) => n + 1);
  };
  return createPortal(
    <div role="dialog" aria-label={t('settings.cai_dat')} onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fffaf0', color: '#4a2f1c', borderRadius: 14, width: 'min(520px, 94vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,.4)',
          // Ghi đè biến --ctl-* (mặc định tông panel tối) để dropdown/điều khiển tự vẽ theo tông sáng của dialog
          ...lightCtl,
        }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 0' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0 }}>{t('settings.title')}</h3>
            <div style={{ fontSize: 12, opacity: 0.65 }}>{t('settings.subtitle')}</div>
          </div>
          <button aria-label={t('common.close')} style={dlgBtn} onClick={onClose}>✕</button>
        </div>
        <div role="tablist" style={{ display: 'flex', gap: 4, margin: '12px 16px' }}>
          {(game ? [GAME_TAB, ...TABS] : TABS).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              style={{ flex: 1, padding: '6px 2px', fontSize: 12, borderRadius: 8, border: '1px solid #b9825a', background: tab === id ? '#c8663f' : '#fff7ec', color: tab === id ? '#fff' : '#4a2f1c', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <div key={rev} style={{ padding: '0 16px', overflow: 'auto', flex: 1 }}>
          {tab === 'img' && <ImgTab />}
          {tab === 'gfx' && <GfxTab />}
          {tab === 'audio' && <AudioTab />}
          {tab === 'play' && <PlayTab />}
          {tab === 'a11y' && <A11yTab />}
          {tab === 'data' && <DataTab />}
          {tab === 'game' && game && <GameTab game={game} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderTop: '1px solid rgba(0,0,0,.1)', fontSize: 12, opacity: 0.85 }}>
          <span style={{ flex: 1 }}>{t('settings.cai_dat_luu_rieng_tren_may')}</span>
          <button style={dlgBtn} onClick={reset}>{t('settings.mac_dinh')}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
