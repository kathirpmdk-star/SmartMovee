export type TrafficCondition = 'low' | 'moderate' | 'heavy';

export interface TrafficResult {
  condition: TrafficCondition;
  delayMin: number;
  isLive: boolean; // true only when backed by a real live traffic API
  source: string;
}

export interface TrafficProvider {
  name: string;
  getTraffic(routeGeometry: [number, number][], baselineDurationMin: number): Promise<TrafficResult>;
}
