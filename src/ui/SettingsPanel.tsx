/**
 * Bảng Cài đặt: Hình ảnh · Đồ họa · Âm thanh · Chơi · Trợ năng.
 * Chỉ là tuỳ chọn riêng máy (localStorage), không vào save, không đổi mô phỏng → không lệch golden.
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { GFX_CYCLE, GFX_LABEL, gfxStatus, setGfxChoice, type GfxChoice } from '../render/graphicsQuality';
import {
  getVolume, initAudio, isMuted, isMusic, playSfx, setMuted, setMusic, setVolume, VOL_DEFAULT, type VolChannel,
} from '../core/audio';
import { perfOn, setPerf } from '../core/perf';
import { getSettings, resetSettings, setSettings, type Settings } from '../core/settings';
import { telemetryOptedIn, setTelemetryOptIn } from '../data/telemetryConsent';
import { deleteTelemetry, flushReports } from '../core/dayReport';

type Tab = 'img' | 'gfx' | 'audio' | 'play' | 'a11y';
const TABS: [Tab, string][] = [
  ['img', '👁 Hình ảnh'], ['gfx', '🎨 Đồ họa'], ['audio', '🔊 Âm thanh'], ['play', '🎮 Chơi'], ['a11y', '♿ Trợ năng'],
];

const GFX_NOTE: Record<GfxChoice, string> = {
  auto: 'Máy tự hạ/nâng mức theo FPS thật. Hợp với hầu hết máy.',
  low: 'Ít bóng, ít mưa/mây/sao. Dành cho máy yếu hoặc điện thoại cũ.',
  medium: 'Cân bằng giữa đẹp và mượt.',
  high: 'Bóng, mưa, mây, sao đầy đủ. Cần máy khá.',
};

const CHANNELS: [VolChannel, string][] = [
  ['master', 'Tổng'], ['sfx', 'Hiệu ứng (chuông cửa, thu tiền…)'],
  ['music', 'Nhạc nền'], ['amb', 'Môi trường (mưa, chim, dế)'],
];

const rowCss: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,.08)' };

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
  return (
    <select aria-label={label} value={String(value)}
      onChange={(e) => { const o = options.find(([v]) => String(v) === e.target.value); if (o) onChange(o[0]); }}
      style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #b9825a', background: '#fff7ec', color: '#4a2f1c' }}>
      {options.map(([v, t]) => <option key={String(v)} value={String(v)}>{t}</option>)}
    </select>
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
      <Row label="Chế độ hiển thị" hint="Trình duyệt yêu cầu thao tác người dùng để vào toàn màn hình">
        <Select label="Chế độ hiển thị" value={full ? 'full' : 'win'} options={[['win', 'Cửa sổ'], ['full', 'Toàn màn hình']]} onChange={(v) => toggleFull(v === 'full')} />
      </Row>
      <Row label="Giới hạn FPS (V-Sync)" hint="Không giới hạn = đồng bộ theo màn hình (V-Sync luôn bật trên trình duyệt). Thấp hơn = mát máy, đỡ hao pin">
        <Select label="Giới hạn FPS" value={s.fpsCap} options={[[0, 'Theo màn hình'], [30, '30'], [60, '60'], [120, '120']]} onChange={(v) => set({ fpsCap: v })} />
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
            onChange={(v) => { initAudio(); setVolume(ch, v); bump((n) => n + 1); if (ch === 'sfx') playSfx('sale'); }} />
        </Row>
      ))}
    </div>
  );
}

function PlayTab() {
  const [s, set] = useSettings();
  const [tele, setT] = useState(telemetryOptedIn());
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
      <Row label="Xác nhận trước khi kết thúc ngày" hint="Hỏi lại khi nằm lên giường đi ngủ">
        <Switch label="Xác nhận kết thúc ngày" on={s.confirmEndDay} onChange={(v) => set({ confirmEndDay: v })} />
      </Row>
      <Row label="Gửi số liệu ẩn danh" hint="Mặc định tắt; tắt thì xoá số liệu đã gửi">
        <Switch label="Gửi số liệu ẩn danh" on={tele}
          onChange={(v) => { setTelemetryOptIn(v); setT(v); if (v) void flushReports(); else void deleteTelemetry(); }} />
      </Row>
    </div>
  );
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
    </div>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('img');
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
        style={{ background: '#fffaf0', color: '#4a2f1c', borderRadius: 14, width: 'min(520px, 94vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 0' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0 }}>⚙️ Cài đặt</h3>
            <div style={{ fontSize: 12, opacity: 0.65 }}>Hình ảnh, âm thanh, cách chơi, trợ năng</div>
          </div>
          <button aria-label="Đóng" onClick={onClose}>✕</button>
        </div>
        <div role="tablist" style={{ display: 'flex', gap: 4, margin: '12px 16px' }}>
          {TABS.map(([id, label]) => (
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
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderTop: '1px solid rgba(0,0,0,.1)', fontSize: 12, opacity: 0.85 }}>
          <span style={{ flex: 1 }}>Cài đặt lưu riêng trên máy, áp dụng cho mọi save, không ảnh hưởng mô phỏng.</span>
          <button onClick={reset}>Mặc định</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
