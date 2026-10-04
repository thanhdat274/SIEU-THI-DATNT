import type { TrafficSignalState } from '@game/shared';
import { TRAFFIC_SIGNAL, TRAFFIC_SIGNAL_CYCLE_SEC } from '@game/data';

/** Trạng thái đèn tại thời điểm `elapsedSec` của chu kỳ. Hàm thuần: cùng đầu vào cho cùng kết quả. */
export function trafficSignalAt(elapsedSec: number): TrafficSignalState {
  const cycle = TRAFFIC_SIGNAL_CYCLE_SEC;
  const t = ((elapsedSec % cycle) + cycle) % cycle;
  const { greenSec, yellowSec, redSec, pedLeadSec, pedWalkSec } = TRAFFIC_SIGNAL;
  if (t < greenSec) return { vehicle: 'green', pedestrian: 'dont_walk', secondsLeft: greenSec - t };
  if (t < greenSec + yellowSec) return { vehicle: 'yellow', pedestrian: 'dont_walk', secondsLeft: greenSec + yellowSec - t };
  const r = t - greenSec - yellowSec;
  const pedestrian = r < pedLeadSec ? 'dont_walk' : r < pedLeadSec + pedWalkSec ? 'walk' : 'clearing';
  return { vehicle: 'red', pedestrian, secondsLeft: redSec - r };
}

/** Đèn một ngã tư: `main` cho đường ngang (xe + người đi bộ qua đường ngang), `avenue` cho đường dọc. */
export interface IntersectionSignals { main: TrafficSignalState; avenue: TrafficSignalState }

/**
 * Hai pha xen kẽ dùng lại chu kỳ của đèn trước tiệm: đường ngang xanh → vàng → đỏ; trong lúc đỏ đường ngang thì đường dọc xanh
 * (vàng ở 3 giây cuối pha dọn đường). Người đi bộ đi cùng chiều với dòng xe đang xanh: qua đường ngang khi đường ngang đỏ,
 * qua đường dọc khi đường ngang xanh (nhấp nháy dọn đường lúc vàng).
 */
export function intersectionSignalsAt(elapsedSec: number): IntersectionSignals {
  const main = trafficSignalAt(elapsedSec);
  const { yellowSec } = TRAFFIC_SIGNAL;
  let avenueVehicle: TrafficSignalState['vehicle'] = 'red';
  if (main.vehicle === 'red') {
    if (main.pedestrian === 'walk') avenueVehicle = 'green';
    else if (main.pedestrian === 'clearing') avenueVehicle = main.secondsLeft <= yellowSec ? 'yellow' : 'green';
  }
  const avenuePedestrian: TrafficSignalState['pedestrian'] = main.vehicle === 'green' ? 'walk' : main.vehicle === 'yellow' ? 'clearing' : 'dont_walk';
  return { main, avenue: { vehicle: avenueVehicle, pedestrian: avenuePedestrian, secondsLeft: main.secondsLeft } };
}
