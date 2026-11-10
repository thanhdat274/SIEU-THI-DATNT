/// <reference types="vite/client" />

interface Window {
  /** Lối vào console cho dev/người chơi thử (SPEC-TOI-UU §T1/T2): game.report(), game.bench(), game.perf()… */
  game?: Record<string, unknown>;
}

