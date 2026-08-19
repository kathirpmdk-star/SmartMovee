import type { TrafficProvider, TrafficResult, TrafficCondition } from './TrafficProvider.js';

// Used only when no live traffic API is configured or the live call fails.
// This is a time-of-day heuristic, NOT live data, and is always labeled as such
// (isLive: false) so the frontend can display "estimated, not live traffic".
export class HeuristicFallbackProvider implements TrafficProvider {
  name = 'Time-of-day heuristic (not live)';

  async getTraffic(_routeGeometry: [number, number][], baselineDurationMin: number): Promise<TrafficResult> {
    const hour = new Date().getHours();
    const isRushHour = (hour >= 8 && hour <= 10.5) || (hour >= 17.5 && hour <= 20.5);
    const isModerate = (hour >= 7 && hour < 8) || (hour > 10.5 && hour <= 12) || (hour >= 16 && hour < 17.5) || (hour > 20.5 && hour <= 22);

    const condition: TrafficCondition = isRushHour ? 'heavy' : isModerate ? 'moderate' : 'low';
    const delayFactor = condition === 'heavy' ? 0.55 : condition === 'moderate' ? 0.25 : 0.05;

    return {
      condition,
      delayMin: baselineDurationMin * delayFactor,
      isLive: false,
      source: this.name,
    };
  }
}
