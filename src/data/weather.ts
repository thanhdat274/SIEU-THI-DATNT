/** Thời tiết mỗi ngày: đổi cảnh (mưa, mây, sương) và số khách ra đường. */
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'fog';

export interface WeatherInfo {
  name: string;
  icon: string;
  /** Nhân số người đi đường ghé tiệm. */
  traffic: number;
  /** Tỉ lệ bầu trời phủ mây 0–1 (tối trời, nhiều đám mây). */
  clouds: number;
  /** Số hạt mưa trên tổng tối đa 0–1. */
  rain: number;
  /** Độ dày sương mù 0–1. */
  fog: number;
  tip: string;
}

export const WEATHER: Record<Weather, WeatherInfo> = {
  sunny: { name: 'Nắng đẹp', icon: '☀️', traffic: 1.1, clouds: 0.15, rain: 0, fog: 0, tip: 'Trời đẹp, đông người qua lại.' },
  cloudy: { name: 'Nhiều mây', icon: '⛅', traffic: 1, clouds: 0.55, rain: 0, fog: 0.1, tip: 'Mát trời, khách như thường lệ.' },
  rain: { name: 'Mưa', icon: '🌧️', traffic: 0.8, clouds: 0.9, rain: 0.6, fog: 0.3, tip: 'Mưa, ít người ra đường hơn.' },
  storm: { name: 'Giông bão', icon: '⛈️', traffic: 0.55, clouds: 1, rain: 1, fog: 0.45, tip: 'Giông lớn, phần đông ở nhà.' },
  fog: { name: 'Sương mù', icon: '🌫️', traffic: 0.9, clouds: 0.4, rain: 0, fog: 1, tip: 'Sương sáng sớm, đường mờ.' },
};

/** Xác suất thời tiết ngày mai theo hôm nay (chuỗi Markov): trời hay "dai", mưa dễ kéo sang hôm sau. */
const NEXT: Record<Weather, [Weather, number][]> = {
  sunny: [['sunny', 0.55], ['cloudy', 0.25], ['rain', 0.1], ['storm', 0.03], ['fog', 0.07]],
  cloudy: [['sunny', 0.3], ['cloudy', 0.3], ['rain', 0.25], ['storm', 0.07], ['fog', 0.08]],
  rain: [['sunny', 0.2], ['cloudy', 0.3], ['rain', 0.35], ['storm', 0.1], ['fog', 0.05]],
  storm: [['sunny', 0.15], ['cloudy', 0.35], ['rain', 0.35], ['storm', 0.1], ['fog', 0.05]],
  fog: [['sunny', 0.45], ['cloudy', 0.3], ['rain', 0.12], ['storm', 0.03], ['fog', 0.1]],
};

/** Số ngẫu nhiên 0–1 cố định theo hạt giống, ngày và kênh: cùng đầu vào luôn ra cùng số. */
function hash01(seed: number, day: number, channel: number): number {
  let h = (seed ^ Math.imul(day, 0x9e3779b1) ^ Math.imul(channel, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function newWeatherSeed(): number {
  return Math.floor(Math.random() * 4294967296);
}

/** Thời tiết của ngày `day` khi hôm trước là `prev`. Cố định theo hạt giống nên dự báo luôn đúng. */
export function nextWeather(seed: number, day: number, prev: Weather): Weather {
  let r = hash01(seed, day, 1);
  for (const [w, p] of NEXT[prev]) if ((r -= p) < 0) return w;
  return prev;
}

/** Dự báo hai ngày sau `day`, nối tiếp từ thời tiết hôm nay. */
export function forecastFrom(seed: number, day: number, today: Weather): Weather[] {
  const tomorrow = nextWeather(seed, day + 1, today);
  return [tomorrow, nextWeather(seed, day + 2, tomorrow)];
}

/** Cơn mưa trong ngày (phút trong ngày). */
export interface RainSpell { start: number; end: number }

/** Khung giờ mưa của ngày `day`; null nếu hôm đó không mưa. Giông ngắn hơn, hay về chiều. */
export function rainSpell(seed: number, day: number, weather: Weather): RainSpell | null {
  if (weather !== 'rain' && weather !== 'storm') return null;
  const storm = weather === 'storm';
  const length = Math.round((storm ? 90 + hash01(seed, day, 2) * 90 : 120 + hash01(seed, day, 2) * 180) / 15) * 15;
  const from = storm ? 12 * 60 : 7 * 60;
  const start = from + Math.round((hash01(seed, day, 3) * (21 * 60 - length - from)) / 15) * 15;
  return { start, end: start + length };
}

/** Độ mưa 0–1 lúc `minutes`: nặng hạt dần, đạt đỉnh giữa cơn rồi tạnh dần. */
export function rainIntensity(spell: RainSpell | null, minutes: number): number {
  if (!spell || minutes <= spell.start || minutes >= spell.end) return 0;
  return Math.sin(((minutes - spell.start) / (spell.end - spell.start)) * Math.PI) ** 0.6;
}

/** Trời lúc này: ngày mưa nhưng ngoài cơn mưa thì như trời nhiều mây; mây kéo đến trước khi mưa một giờ. */
export interface Sky extends Pick<WeatherInfo, 'clouds' | 'rain' | 'fog' | 'traffic'> {
  /** Đang có giông (sấm chớp). */
  thunder: boolean;
}

// Đối tượng trời dùng lại: skyAt chạy mỗi khung hình, ai gọi cũng đọc xong ngay trong khung nên dùng chung được
const skyScratch: Sky = { clouds: 0, rain: 0, fog: 0, traffic: 1, thunder: false };

export function skyAt(seed: number, day: number, weather: Weather, minutes: number): Sky {
  const sky = skyScratch;
  const info = WEATHER[weather];
  const spell = rainSpell(seed, day, weather);
  if (!spell) {
    sky.clouds = info.clouds;
    sky.rain = info.rain;
    sky.fog = info.fog;
    sky.traffic = info.traffic;
    sky.thunder = false;
    return sky;
  }
  const wet = rainIntensity(spell, minutes);
  const dry = WEATHER.cloudy;
  // Mây dày lên trong giờ trước cơn mưa và tan dần trong giờ sau
  const gap = minutes < spell.start ? spell.start - minutes : minutes > spell.end ? minutes - spell.end : 0;
  const overcast = Math.max(wet, 1 - Math.min(gap / 60, 1));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  sky.clouds = lerp(dry.clouds, info.clouds, overcast);
  sky.rain = info.rain * wet;
  sky.fog = lerp(dry.fog, info.fog, wet);
  sky.traffic = lerp(dry.traffic, info.traffic, wet);
  sky.thunder = weather === 'storm' && wet > 0.5;
  return sky;
}

/** Hệ số khách trung bình trong giờ mở cửa (6h–22h) của một ngày, để nhập hàng theo dự báo. */
export function dayTraffic(seed: number, day: number, weather: Weather): number {
  let sum = 0;
  let n = 0;
  for (let m = 6 * 60; m < 22 * 60; m += 30, n++) sum += skyAt(seed, day, weather, m).traffic;
  return sum / n;
}

function clock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Ví dụ "Mưa 14:00–16:15"; chuỗi rỗng nếu không mưa. */
export function describeRain(spell: RainSpell | null, weather: Weather): string {
  return spell ? `${WEATHER[weather].name} ${clock(spell.start)}–${clock(spell.end)}` : '';
}

/** Một dòng tóm tắt cho ngày: tên thời tiết, kèm khung giờ nếu mưa. */
export function describeDay(seed: number, day: number, weather: Weather): string {
  const spell = rainSpell(seed, day, weather);
  return `${WEATHER[weather].icon} ${spell ? describeRain(spell, weather) : WEATHER[weather].name}`;
}
