export interface LandPlotDefinition {
  id: string;
  name: string;
  level: number;
  cost: number;
  tiles: { x: number; y: number }[];
  prerequisitePlotId?: string;
}

// Plot geometry is reviewed against map.ts: the final column in each plot is the new shop wall.
export const LAND_PLOTS: LandPlotDefinition[] = [
  { id: 'east-wing-a', name: 'Gian hàng bên hông', level: 5, cost: 250_000,
    tiles: Array.from({ length: 32 }, (_, i) => ({ x: 14 + i % 4, y: 3 + Math.floor(i / 4) })) },
  { id: 'east-wing-b', name: 'Gian hàng mở rộng', level: 10, cost: 600_000, prerequisitePlotId: 'east-wing-a',
    tiles: Array.from({ length: 32 }, (_, i) => ({ x: 18 + i % 4, y: 3 + Math.floor(i / 4) })) },
];

export const STARTER_OWNED_PLOT_IDS: string[] = [];
