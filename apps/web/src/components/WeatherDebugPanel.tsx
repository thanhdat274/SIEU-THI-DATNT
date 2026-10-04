import React, { useState, useEffect } from 'react';
import { getWeatherFxSettings, getWeatherVisualModel, getWeatherVisualState, setWeatherFxSettings, setDebugVisualTime } from '@game/renderer';
import type { WeatherPresetId, WeatherQuality } from '@game/data';

/** Bảng debug thời tiết. Chỉ hiện khi nhấn Shift+F5 hoặc bật flag trong localStorage. */
const PRESETS: Array<[WeatherPresetId, string]> = [
  ['clear', 'Clear'], ['cloudy', 'Cloudy'], ['rain_light', 'Light Rain'], ['rain', 'Rain'],
  ['rain_heavy', 'Heavy Rain'], ['storm', 'Storm'], ['wind_light', 'Wind light'], ['wind_strong', 'Wind strong'],
];

const box: React.CSSProperties = { position: 'fixed', left: 8, bottom: 8, zIndex: 9999, background: 'rgba(16,22,30,0.92)', color: '#dfe8ff', font: '11px monospace', padding: 8, borderRadius: 6, maxWidth: 260, maxHeight: '70vh', overflowY: 'auto' };
const btn: React.CSSProperties = { margin: 2, padding: '3px 6px', font: '11px monospace', cursor: 'pointer' };

export const WeatherDebugPanel: React.FC = () => {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Chỉ hiện nút Weather nếu người dùng bật flag debug trong localStorage
    const isDebug = localStorage.getItem('show_debug_weather') === '1';
    if (!isDebug) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'F5') {
        e.preventDefault();
        setShow(s => !s);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const [rain, setRain] = useState(0);
  const [wind, setWind] = useState(0);
  const [dir, setDir] = useState(0);
  const [cloud, setCloud] = useState(0.1);
  const [dark, setDark] = useState<number | null>(() => getWeatherVisualModel()?.getDarknessOverride() ?? null);
  const [settings, setSettings] = useState(getWeatherFxSettings());
  const [, tick] = useState(0);
  const model = () => getWeatherVisualModel();
  const apply = (nextRain: number, nextWind: number, nextCloud: number, nextDir: number) => {
    const m = model();
    if (!m) return;
    m.setWindOverride(nextWind, nextDir);
    m.transitionToTargets({ rain: nextRain, wind: nextWind, cloud: nextCloud, lightning: nextRain > 0.85 && nextWind > 0.7 }, 3000);
  };
  const state = getWeatherVisualState();

  if (!show && !open) return null;
  if (!open) return <button style={{ ...box, padding: '4px 8px', cursor: 'pointer' }} onClick={() => setOpen(true)}>☁ Weather Debug</button>;
  return (
    <div style={box}>
      <div><b>Weather Debug</b> <button style={btn} onClick={() => { setOpen(false); setShow(false); localStorage.removeItem('show_debug_weather'); }}>x</button> <button style={btn} onClick={() => tick(n => n + 1)}>refresh</button></div>
      <div>
        {PRESETS.map(([id, label]) => (
          <button key={id} style={btn} onClick={() => { model()?.setWindOverride(null, null); model()?.transitionWeather(id, 15000); }}>{label}</button>
        ))}
        <button style={btn} onClick={() => { model()?.clearOverride(); setDebugVisualTime(null); }}>Auto (sim)</button>
      </div>
      <label>Rain {rain.toFixed(2)}<input type="range" min={0} max={1} step={0.01} value={rain} onChange={e => { const v = +e.target.value; setRain(v); apply(v, wind, cloud, dir); }} style={{ width: '100%' }} /></label>
      <label>Wind {wind.toFixed(2)}<input type="range" min={0} max={1} step={0.01} value={wind} onChange={e => { const v = +e.target.value; setWind(v); apply(rain, v, cloud, dir); }} style={{ width: '100%' }} /></label>
      <label>Wind dir {dir.toFixed(2)} rad<input type="range" min={-3.14} max={3.14} step={0.05} value={dir} onChange={e => { const v = +e.target.value; setDir(v); apply(rain, wind, cloud, v); }} style={{ width: '100%' }} /></label>
      <label>Cloud {cloud.toFixed(2)}<input type="range" min={0} max={1} step={0.01} value={cloud} onChange={e => { const v = +e.target.value; setCloud(v); apply(rain, wind, v, dir); }} style={{ width: '100%' }} /></label>
      <label>Darkness {dark === null ? 'auto' : dark.toFixed(2)}<input type="range" min={0} max={1} step={0.01} value={dark ?? state?.darkness ?? 0} onChange={e => { const v = +e.target.value; setDark(v); model()?.setDarknessOverride(v); }} style={{ width: '100%' }} /></label>
      <button style={btn} onClick={() => { setDark(null); model()?.setDarknessOverride(null); }}>Reset Darkness</button>
      <div><button style={btn} onClick={() => model()?.triggerLightning()}>Lightning</button>
        <button style={btn} onClick={() => { model()?.transitionWeather('storm', 15000); }}>Transition test (15s → storm)</button></div>
      <hr />
      <label><input type="checkbox" checked={settings.enabled} onChange={e => setSettings(setWeatherFxSettings({ enabled: e.target.checked }))} /> FX enabled</label>
      <label style={{ display: 'block' }}>FX intensity {settings.intensity.toFixed(2)}<input type="range" min={0} max={1} step={0.05} value={settings.intensity} onChange={e => setSettings(setWeatherFxSettings({ intensity: +e.target.value }))} style={{ width: '100%' }} /></label>
      <label>Quality <select value={settings.quality ?? 'auto'} onChange={e => setSettings(setWeatherFxSettings({ quality: e.target.value === 'auto' ? null : e.target.value as WeatherQuality }))}>
        <option value="auto">auto</option><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label>
      {state && <pre style={{ margin: '6px 0 0' }}>{`type ${state.type}\nrain ${state.rainIntensity.toFixed(2)} wind ${state.windIntensity.toFixed(2)}\ndir ${state.windDirection.toFixed(2)} cloud ${state.cloudIntensity.toFixed(2)}\ndark ${state.darkness.toFixed(2)} puddle ${state.puddleLevel.toFixed(2)}\nflash ${state.lightningIntensity.toFixed(2)}`}</pre>}
    </div>
  );
};
