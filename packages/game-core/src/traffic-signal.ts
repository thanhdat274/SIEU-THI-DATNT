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

/** Số giây còn lại của pha đi bộ (0 nếu không đang ở pha đi). */
export function pedestrianWalkSecondsLeft(elapsedSec: number): number {
  const cycle = TRAFFIC_SIGNAL_CYCLE_SEC;
  const t = ((elapsedSec % cycle) + cycle) % cycle;
  const walkEnd = TRAFFIC_SIGNAL.greenSec + TRAFFIC_SIGNAL.yellowSec + TRAFFIC_SIGNAL.pedLeadSec + TRAFFIC_SIGNAL.pedWalkSec;
  const walkStart = walkEnd - TRAFFIC_SIGNAL.pedWalkSec;
  return t >= walkStart && t < walkEnd ? walkEnd - t : 0;
}
