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
import { WHATS_NEW } from '../data/whatsNew';
import { telemetryOptedIn, setTelemetryOptIn } from '../data/telemetryConsent';
import { deleteTelemetry, exportReportsJson, flushReports } from '../core/dayReport';
import { TelemetrySampleView } from './TelemetrySampleView';
import { Dropdown } from './Dropdown';

type Tab = 'img' | 'gfx' | 'audio' | 'play' | 'a11y' | 'data' | 'game';
/** Việc của ván đang chơi (chỉ có khi mở từ trong game; ở màn đăng nhập tab này ẩn). */
export interface GameActions { online: boolean; save: () => void; restore: () => void; backToMenu: () => void; newGame: () => void }
const TABS: [Tab, string][] = [
  ['img', '👁 Hình ảnh'], ['gfx', '🎨 Đồ họa'], ['audio', '🔊 Âm thanh'], ['play', '🎮 Chơi'], ['a11y', '♿ Trợ năng'], ['data', '💾 Dữ liệu'],
];
const GAME_TAB: [Tab, string] = ['game', '🏠 Ván chơi'];

const GFX_NOTE: Record<GfxChoice, string> = {
  auto: 'Máy tự hạ/nâng mức theo FPS thật. Hợp với hầu hết máy.',
  low: 'Ít bóng, ít mưa/mây/sao. Dành cho máy yếu hoặc điện thoại cũ.',
  medium: 'Cân bằng giữa đẹp và mượt.',
  high: 'Bóng, mưa, mây, sao đầy đủ. Cần máy khá.',
};

const CHANNELS: [VolChannel, string][] = [
  ['master', 'Tổng'], ['sfx', 'Hiệu ứng (chuông cửa, thu tiền…)'],
  ['music', 'Nhạc nền'], ['amb', 'Môi trường (mưa, chim, dế)'],
  ['ui', 'Giao diện (lên cấp, thưởng, nhiệm vụ)'],
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
      <Row label="Độ phân giải" hint="Độ nét hình 3D bên trong, luôn co giãn vừa cửa sổ. Thấp hơn = nhẹ máy hơn">
        <Select label="Độ phân giải" value={s.resolution}
          options={[['auto', 'Tự động'], ['native', 'Gốc màn hình'], ['1080', '1080p'], ['720', '720p']]}
          onChange={(v) => set({ resolution: v })} />
      </Row>
      <Row label="Chế độ hiển thị" hint="Trình duyệt yêu cầu thao tác người dùng để vào toàn màn hình">
        <Select label="Chế độ hiển thị" value={full ? 'full' : 'win'} options={[['win', 'Cửa sổ'], ['full', 'Toàn màn hình']]} onChange={(v) => toggleFull(v === 'full')} />
      </Row>
      <Row label="Giới hạn FPS (V-Sync)" hint="Không giới hạn = đồng bộ theo màn hình (V-Sync luôn bật trên trình duyệt). Thấp hơn = mát máy, đỡ hao pin">
        <Select label="Giới hạn FPS" value={s.fpsCap} options={[[0, 'Theo màn hình'], [30, '30'], [60, '60'], [120, '120']]} onChange={(v) => set({ fpsCap: v })} />
      </Row>
      <Row label="Chống nóng máy" hint="60 FPS khi đang chạm/sạc, 30 FPS khi đứng xem — máy đỡ nóng, pin đỡ tụt. Giới hạn FPS phía trên thấp hơn thì vẫn thắng">
        <Switch label="Chống nóng máy" on={s.coolMode} onChange={(v) => set({ coolMode: v })} />
      </Row>
      <Row label="Hiện FPS"><Switch label="Hiện FPS" on={perf} onChange={(v) => { setPerf(v); setP(v); }} /></Row>
      <Row label="Độ sáng"><Slider label="Độ sáng" value={s.brightness} min={0.7} max={1.3} step={0.05} fmt={pct} onChange={(v) => set({ brightness: v })} /></Row>
      <Row label="Tỷ lệ render" hint="Thấp hơn = nhanh hơn trên máy yếu">
        <Slider label="Tỷ lệ render" value={s.renderScale} min={0.5} max={1} step={0.05} fmt={pct} onChange={(v) => set({ renderScale: v })} />
      </Row>
      <Row label="Tự giữ khung hình mượt" hint="Tự hạ độ phân giải khi máy bị giật, nâng lại khi mượt">
        <Switch label="Tự giữ khung hình mượt" on={choice === 'auto'}
          onChange={(v) => { const c: GfxChoice = v ? 'auto' : gfxStatus().level; setGfxChoice(c); setChoice(c); }} />
      </Row>
      <Row label="Cỡ giao diện"><Slider label="Cỡ giao diện" value={s.uiScale} min={0.8} max={1.4} step={0.05} fmt={pct} onChange={(v) => set({ uiScale: v })} /></Row>
      <Row label="Tiền tệ hiển thị" hint="Chỉ đổi cách hiện số (1 USD = 25.000 VND), áp dụng ngay cho mọi màn. Giá trong game không đổi">
        <Select label="Tiền tệ hiển thị" value={s.currency} options={[['vnd', 'Đồng (đ)'], ['usd', 'Đô la ($)']]} onChange={(v) => set({ currency: v })} />
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
      <Row label="Thiết lập sẵn" hint="Đồ họa không ảnh hưởng số khách hay logic mô phỏng">
        <Select label="Thiết lập sẵn" value={choice}
          options={GFX_CYCLE.map((c) => [c, c === 'auto' ? 'Tự động' : GFX_LABEL[c]] as [GfxChoice, string])}
          onChange={(c) => { setGfxChoice(c); setChoice(c); }} />
      </Row>
      <p style={{ margin: '8px 0', fontSize: 13 }}>
        {GFX_NOTE[choice]} Đang chạy mức <b>{GFX_LABEL[lv]}</b> · ~{Math.round(gfxStatus().fps)} FPS. Các mục bên dưới đổi ngay khi đang chơi.
      </p>
      <Row label="Khoảng cách chi tiết" hint="Nhân vật ở xa đứng yên cho nhẹ máy. Gần = nhẹ hơn, Xa = đẹp hơn">
        <Select label="Khoảng cách chi tiết" value={s.detailDist} options={[['near', 'Gần'], ['normal', 'Vừa'], ['far', 'Xa']]} onChange={(v) => set({ detailDist: v })} />
      </Row>
      <Row label="Bóng đổ" hint="Tắt để nhẹ máy; bật lại chỉ có bóng nếu mức đồ họa có bóng">
        <Switch label="Bóng đổ" on={s.shadows} onChange={(v) => set({ shadows: v })} />
      </Row>
      <Row label="Chất lượng ánh sáng" hint="Số đèn thật quanh camera (đèn đường, đèn tiệm)">
        <Select label="Chất lượng ánh sáng" value={s.lightQuality} options={[['low', 'Thấp'], ['normal', 'Vừa'], ['high', 'Cao']]} onChange={(v) => set({ lightQuality: v })} />
      </Row>
      <Row label="Mật độ mưa">
        <Select label="Mật độ mưa" value={s.rainDensity} options={[[0, 'Tắt'], [0.5, 'Thưa'], [1, 'Đủ']]} onChange={(v) => set({ rainDensity: v })} />
      </Row>
      <Row label="Mây trên trời"><Switch label="Mây trên trời" on={s.clouds} onChange={(v) => set({ clouds: v })} /></Row>
      <Row label="Sao ban đêm"><Switch label="Sao ban đêm" on={s.stars} onChange={(v) => set({ stars: v })} /></Row>
      <Row label="Cây lá chuyển động" hint="Cây, lúa lắc theo gió">
        <Switch label="Cây lá chuyển động" on={s.foliageSway} onChange={(v) => set({ foliageSway: v })} />
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
      <Row label="Bật âm thanh"><Switch label="Bật âm thanh" on={!muted} onChange={(v) => { initAudio(); setMuted(!v); setM(!v); }} /></Row>
      <Row label="Bật nhạc nền"><Switch label="Bật nhạc nền" on={music} onChange={(v) => { setMusic(v); setMu(v); }} /></Row>
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
      <Row label="Tự động lưu" hint="Khi tắt, game chỉ lưu khi bạn bấm Lưu hoặc đóng/ẩn tab">
        <Switch label="Tự động lưu" on={s.autosave} onChange={(v) => set({ autosave: v })} />
      </Row>
      <Row label="Chu kỳ tự động lưu" hint="Dài hơn thì ít giật máy yếu; thoát/ẩn tab vẫn lưu ngay">
        <Select label="Chu kỳ tự động lưu" value={s.autosaveEvery}
          options={[[0, 'Mặc định (ngay khi đổi)'], [60, '1 phút'], [180, '3 phút'], [300, '5 phút']]}
          onChange={(v) => set({ autosaveEvery: v })} />
      </Row>
      <Row label="Hiện biểu tượng sốt ruột của khách" hint="😕😤😠 trên đầu khách chờ lâu">
        <Switch label="Hiện biểu tượng sốt ruột" on={s.showPatience} onChange={(v) => set({ showPatience: v })} />
      </Row>
      <Row label="Tự về 1× khi tiệm quá tải" hint="Khách xếp hàng từ 4 người mà đang chạy nhanh">
        <Switch label="Tự về 1×" on={s.autoSlow} onChange={(v) => set({ autoSlow: v })} />
      </Row>
      <Row label="Tạm dừng khi mở menu" hint="Mở một bảng (nhập hàng, kho…) là thời gian trong game tạm dừng, đóng bảng chạy tiếp đúng tốc độ cũ">
        <Switch label="Tạm dừng khi mở menu" on={s.pauseOnMenu} onChange={(v) => set({ pauseOnMenu: v })} />
      </Row>
      <Row label="Xác nhận trước khi kết thúc ngày" hint="Hỏi lại khi nằm lên giường đi ngủ">
        <Switch label="Xác nhận kết thúc ngày" on={s.confirmEndDay} onChange={(v) => set({ confirmEndDay: v })} />
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
      <Row label="Cỡ giao diện"><Slider label="Cỡ giao diện" value={s.uiScale} min={0.8} max={1.4} step={0.05} fmt={pct} onChange={(v) => set({ uiScale: v })} /></Row>
      <Row label="Cỡ chữ">
        <Select label="Cỡ chữ" value={s.fontSize} options={[['small', 'Nhỏ'], ['normal', 'Vừa'], ['large', 'Lớn']]} onChange={(v) => set({ fontSize: v })} />
      </Row>
      <Row label="Giảm chuyển động" hint="Tắt hiệu ứng chuyển cảnh và hoạt ảnh giao diện">
        <Switch label="Giảm chuyển động" on={s.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
      </Row>
      <Row label="Tương phản cao" hint="Tăng độ rõ của giao diện">
        <Switch label="Tương phản cao" on={s.highContrast} onChange={(v) => set({ highContrast: v })} />
      </Row>
      <Row label="Lọc màu cho người mù màu" hint="Đổi dải màu của cả cảnh và giao diện">
        <Select label="Lọc màu" value={s.colorblind}
          options={[['off', 'Tắt'], ['protan', 'Khó phân biệt đỏ'], ['deutan', 'Khó phân biệt lục'], ['tritan', 'Khó phân biệt lam']]}
          onChange={(v) => set({ colorblind: v })} />
      </Row>
      <Row label="Tắt chớp sáng" hint="Không loé sáng khi có giông sét">
        <Switch label="Tắt chớp sáng" on={s.noFlash} onChange={(v) => set({ noFlash: v })} />
      </Row>
      <Row label="Icon tương phản cao" hint="Viền trắng + nền đậm quanh icon nhỏ trên thanh công cụ — nhìn rõ hơn dưới nắng hoặc mắt yếu">
        <Switch label="Icon tương phản cao" on={s.iconContrast} onChange={(v) => set({ iconContrast: v })} />
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
          <Row label="Lưu game" hint="Game tự lưu mỗi ngày; bấm để lưu ngay"><button style={dlgBtnPrimary} onClick={game.save}>Lưu</button></Row>
          <Row label="Khôi phục bản lưu trước" hint="Quay về bản lưu cuối ngày hôm trước; khôi phục lần nữa là trở lại"><button style={dlgBtn} onClick={game.restore}>Khôi phục</button></Row>
        </>
      )}
      <Row label="Lịch tự động" hint="Tự mở cửa đúng giờ, 22h30 đóng cửa, 23h kiểm kê và tự về nhà ngủ — khỏi lo ngất vì thức khuya">
        <Switch label="Lịch tự động" on={autoRoutine} onChange={(v) => useGame.setState({ autoRoutine: v })} />
      </Row>
      {autoRoutine && (
        <Row label="Giờ mở cửa" hint="Mở sớm (6h–6h30) đón thêm nửa giờ vàng buổi sáng">
          <Select label="Giờ mở cửa" value={String(autoOpenAt)} options={AUTO_OPEN_PRESETS.map((m) => [String(m), fmtAt(m)] as [string, string])}
            onChange={(v) => useGame.setState({ autoOpenAt: Number(v) })} />
        </Row>
      )}
      <Row label="Về màn hình chính" hint="Lưu rồi thoát ra màn đăng nhập"><button style={dlgBtn} onClick={game.backToMenu}>Về menu</button></Row>
      {!game.online && (
        <Row label="Chơi lại từ đầu" hint="Xoá bản lưu và bắt đầu ván mới (có hỏi lại trước khi xoá)"><button style={{ ...dlgBtn, color: '#b3261e', borderColor: '#b3261e' }} onClick={game.newGame}>Chơi lại…</button></Row>
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
      setMsg({ ok: true, text: copied ? 'Đã chép mã vào bộ nhớ tạm. Dán sang máy mới ở ô "Nhập mã".' : 'Mã nằm ở ô bên dưới — chép toàn bộ rồi dán sang máy mới.' });
    } catch { setMsg({ ok: false, text: 'Không xuất được mã trên trình duyệt này.' }); }
  };
  const check = async () => {
    const r = await decodeSaveCode(code);
    if (!r.ok) { setPending(null); return setMsg({ ok: false, text: r.error }); }
    setPending(r.data);
    setMsg({ ok: true, text: `Mã hợp lệ: ngày ${r.data.day}, cấp ${r.data.level}. Bấm "Nạp vào máy này" để thay ván đang chơi (ván hiện tại được cất lại để khôi phục).` });
  };
  const load = () => {
    if (!pending) return;
    importSaveData(pending);
    setPending(null);
    setMsg({ ok: true, text: 'Đã nạp xong. Ván cũ được cất lại ở màn đăng nhập (mục khôi phục).' });
  };
  return (
    <div>
      <Row label="Mã chuyển máy" hint="Biến ván đang chơi thành một chuỗi chữ để chép sang máy khác">
        <button style={dlgBtnPrimary} onClick={exportCode}>Xuất mã</button>
      </Row>
      <div style={{ padding: '10px 0' }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Nhập mã</div>
        <textarea aria-label="Mã chuyển máy" value={code} rows={4} placeholder="Dán mã TH3D1.… vào đây"
          onChange={(e) => { setCode(e.target.value); setPending(null); setMsg(null); }}
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 11, fontFamily: 'monospace', borderRadius: 8, border: '1px solid #b9825a', background: '#fffdf6', padding: '6px 8px' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button style={{ ...dlgBtn, ...(!code.trim() ? dlgBtnDisabled : null) }} onClick={check} disabled={!code.trim()}>Kiểm tra mã</button>
          <button style={{ ...dlgBtnPrimary, ...(!pending ? dlgBtnDisabled : null) }} onClick={load} disabled={!pending}>Nạp vào máy này</button>
        </div>
        {msg && <div role="status" style={{ marginTop: 6, fontSize: 12, color: msg.ok ? '#2a7a3a' : '#b3261e' }}>{msg.text}</div>}
      </div>
      <div style={{ fontWeight: 700, margin: '8px 0 4px' }}>📊 Nhật ký & số liệu chơi thử</div>
      <Row label="Xuất nhật ký chơi thử" hint="Tải file 30 ngày gần nhất lưu trên máy (không gửi đi đâu) để gửi cho người làm game">
        <button style={dlgBtn} onClick={downloadPlayLog}>Tải về</button>
      </Row>
      <Row label="Gửi số liệu ẩn danh" hint="Mặc định tắt; tắt thì xoá số liệu đã gửi">
        <Switch label="Gửi số liệu ẩn danh" on={tele}
          onChange={(v) => { setTelemetryOptIn(v); setT(v); if (v) void flushReports(); else void deleteTelemetry(); }} />
      </Row>
      <Row label="Xem gửi những gì" hint="Bản ghi mẫu đúng như những gì sẽ gửi">
        <button style={dlgBtn} onClick={() => setTeleView(!teleView)}>{teleView ? 'Ẩn' : 'Xem'}</button>
      </Row>
      {teleView && <TelemetrySampleView />}
      <div style={{ fontWeight: 700, margin: '8px 0 4px' }}>📰 Có gì mới</div>
      {WHATS_NEW.map((w) => (
        <div key={w.date} style={{ padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,.08)' }}>
          <div style={{ fontWeight: 600 }}>{w.title} <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.6 }}>· {w.date}</span></div>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 13 }}>{w.lines.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      ))}
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
    <div role="dialog" aria-label="Cài đặt" onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fffaf0', color: '#4a2f1c', borderRadius: 14, width: 'min(520px, 94vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,.4)',
          // Ghi đè biến --ctl-* (mặc định tông panel tối) để dropdown/điều khiển tự vẽ theo tông sáng của dialog
          ...lightCtl,
        }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 0' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0 }}>⚙️ Cài đặt</h3>
            <div style={{ fontSize: 12, opacity: 0.65 }}>Hình ảnh, âm thanh, cách chơi, trợ năng</div>
          </div>
          <button aria-label="Đóng" style={dlgBtn} onClick={onClose}>✕</button>
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
          <span style={{ flex: 1 }}>Cài đặt lưu riêng trên máy, áp dụng cho mọi save, không ảnh hưởng mô phỏng.</span>
          <button style={dlgBtn} onClick={reset}>Mặc định</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
