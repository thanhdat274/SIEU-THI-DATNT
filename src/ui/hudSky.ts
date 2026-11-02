import { describeDay, rainSpell, WEATHER, type Weather } from '../data/weather';

/** GĐ953: trời hiện tại + dự báo cho chip thời tiết của Hud, tách thành hàm thuần. */
export function skyState(weatherSeed: number, day: number, weather: Weather, minutes: number) {
  const spell = rainSpell(weatherSeed, day, weather);
  // Ngày mưa mà chưa tới hoặc đã qua cơn mưa thì trời chỉ nhiều mây
  const raining = !!spell && minutes >= spell.start && minutes < spell.end;
  const skyIcon = spell && !raining ? WEATHER.cloudy.icon : WEATHER[weather].icon;
  return { spell, raining, skyIcon };
}

export function forecastTextOf(weatherSeed: number, day: number, forecast: Weather[]): string {
  return forecast.map((w, i) => `${i ? 'Ngày kia' : 'Ngày mai'}: ${describeDay(weatherSeed, day + 1 + i, w)}`).join('\n');
}
