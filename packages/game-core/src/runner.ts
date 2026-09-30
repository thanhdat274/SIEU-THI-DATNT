import { GameSimulation } from './simulation';

/** Fixed-step simulation clock independent of Pixi, browser events, and DOM. */
export class FixedStepSimulationRunner {
  private accumulatedSeconds = 0;
  constructor(
    private readonly simulation: Pick<GameSimulation, 'update'>,
    private readonly stepSeconds = 1 / 60,
    private readonly maxFrameSeconds = 0.25,
    private readonly maxStepsPerFrame = 15,
  ) {
    if (stepSeconds <= 0 || maxFrameSeconds <= 0 || maxStepsPerFrame < 1) throw new Error('Invalid simulation runner limits');
  }

  advance(elapsedSeconds: number): number {
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) throw new Error('Invalid elapsed time');
    this.accumulatedSeconds += Math.min(elapsedSeconds, this.maxFrameSeconds);
    let steps = 0;
    while (this.accumulatedSeconds >= this.stepSeconds && steps < this.maxStepsPerFrame) {
      this.simulation.update(this.stepSeconds);
      this.accumulatedSeconds -= this.stepSeconds;
      steps++;
    }
    if (steps === this.maxStepsPerFrame && this.accumulatedSeconds >= this.stepSeconds) {
      this.accumulatedSeconds %= this.stepSeconds;
    }
    return steps;
  }

  reset(): void { this.accumulatedSeconds = 0; }
}
