import type { TrafficSignalState } from '@game/shared';
import { INTERSECTION_SIGNAL, STORE_FRONT_SIGNAL, TRAFFIC_SIGNAL_CYCLE_SEC, type TrafficSignalConfig } from '@game/data';

/**
 * Mốc bắt đầu chu kỳ đèn: ngày 1, 07:00 (lúc mở cửa). Độ dài pha trong `TRAFFIC_SIGNAL_CYCLE_SEC` tính theo PHÚT GAME
 * (không phải giây thực), nên chu kỳ là số nguyên phút — cho phép suy pha một cách thuần túy từ worldTime (ngày + phút),
 * độc lập với tần suất khung hình, nhịp dt, tốc độ ban đêm ×3 và catch-up. Cùng giờ → cùng pha ở mọi client và WorldRuntime.
 *
 * Có HAI tín hiệu cùng chia chu kỳ 39 phút này: vạch trước cửa tiệm (`STORE_FRONT_SIGNAL`, ưu tiên người đi bộ) và
 * các ngã tư (`INTERSECTION_SIGNAL`, ưu tiên xe). Vì chu kỳ bằng nhau nên pha worldTime là duy nhất cho cả hai.
 */
const SIGNAL_EPOCH_MINUTES = 1 * 1440 + 7 * 60; // ngày 1, 07:00

/** Vị trí (phút) trong chu kỳ đèn suy từ giờ game — hàm thuần, được dùng như nhau ở client và WorldRuntime (không gửi qua mạng mỗi khung). */
export function trafficSignalPhaseFromWorldClock(day: number, hour: number, minute: number): number {
  const cycle = TRAFFIC_SIGNAL_CYCLE_SEC; // chu kỳ tính theo phút game
  const elapsedMinutes = (day * 1440 + hour * 60 + minute) - SIGNAL_EPOCH_MINUTES;
  return ((elapsedMinutes % cycle) + cycle) % cycle;
}

/** Trạng thái đèn tại vị trí `elapsedSec` (trong chu kỳ 39 phút) theo cấu hình `config`. Hàm thuần: cùng đầu vào cho cùng kết quả. */
export function signalStateAt(elapsedSec: number, config: TrafficSignalConfig): TrafficSignalState {
  const cycle = TRAFFIC_SIGNAL_CYCLE_SEC;
  const t = ((elapsedSec % cycle) + cycle) % cycle;
  const { greenSec, yellowSec, redSec, pedLeadSec, pedWalkSec } = config;
  if (t < greenSec) return { vehicle: 'green', pedestrian: 'dont_walk', secondsLeft: greenSec - t };
  if (t < greenSec + yellowSec) return { vehicle: 'yellow', pedestrian: 'dont_walk', secondsLeft: greenSec + yellowSec - t };
  const r = t - greenSec - yellowSec;
  const pedestrian = r < pedLeadSec ? 'dont_walk' : r < pedLeadSec + pedWalkSec ? 'walk' : 'clearing';
  return { vehicle: 'red', pedestrian, secondsLeft: redSec - r };
}

/** Đèn vạch trước cửa tiệm (khách thật băng qua đường): chu kỳ ưu tiên người đi bộ. */
export function storeFrontSignalAt(elapsedSec: number): TrafficSignalState {
  return signalStateAt(elapsedSec, STORE_FRONT_SIGNAL);
}

/** Đèn một ngã tư: `main` cho đường ngang (xe + người đi bộ qua đường ngang), `avenue` cho đường dọc. */
export interface IntersectionSignals { main: TrafficSignalState; avenue: TrafficSignalState }

/**
 * Hai pha xen kẽ dùng chu kỳ ưu tiên xe (`INTERSECTION_SIGNAL`): đường ngang xanh → vàng → đỏ; trong lúc đỏ đường ngang
 * thì đường dọc xanh (vàng ở 3 phút cuối pha dọn đường). Người đi bộ đi cùng chiều với dòng xe đang xanh: qua đường ngang
 * khi đường ngang đỏ, qua đường dọc khi đường ngang xanh (nhấp nháy dọn đường lúc vàng).
 */
export function intersectionSignalsAt(elapsedSec: number): IntersectionSignals {
  const main = signalStateAt(elapsedSec, INTERSECTION_SIGNAL);
  const { yellowSec } = INTERSECTION_SIGNAL;
  let avenueVehicle: TrafficSignalState['vehicle'] = 'red';
  if (main.vehicle === 'red') {
    if (main.pedestrian === 'walk') avenueVehicle = 'green';
    else if (main.pedestrian === 'clearing') avenueVehicle = main.secondsLeft <= yellowSec ? 'yellow' : 'green';
  }
  const avenuePedestrian: TrafficSignalState['pedestrian'] = main.vehicle === 'green' ? 'walk' : main.vehicle === 'yellow' ? 'clearing' : 'dont_walk';
  return { main, avenue: { vehicle: avenueVehicle, pedestrian: avenuePedestrian, secondsLeft: main.secondsLeft } };
}
