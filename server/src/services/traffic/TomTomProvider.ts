import type { TrafficProvider, TrafficResult, TrafficCondition } from './TrafficProvider.js';
import { env } from '../../env.js';

// TomTom Traffic API (Flow Segment Data) - real live traffic.
// Free tier: 2,500 non-tile requests/day, no card required.
// https://developer.tomtom.com/traffic-api/documentation/product-information/introduction
const FLOW_URL = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json';

function sampleGeometry(geometry: [number, number][], count: number): [number, number][] {
  if (geometry.length <= count) return geometry;
  const step = Math.floor(geometry.length / count);
  const samples: [number, number][] = [];
  for (let i = 0; i < count; i++) samples.push(geometry[i * step]);
  return samples;
}

function conditionFromRatio(ratio: number): TrafficCondition {
  // ratio = currentSpeed / freeFlowSpeed
  if (ratio >= 0.75) return 'low';
  if (ratio >= 0.45) return 'moderate';
  return 'heavy';
}

export class TomTomProvider implements TrafficProvider {
  name = 'TomTom Traffic API (live)';

  async getTraffic(routeGeometry: [number, number][], baselineDurationMin: number): Promise<TrafficResult> {
    if (!env.TOMTOM_API_KEY) throw new Error('TOMTOM_API_KEY not configured');

    const samplePoints = sampleGeometry(routeGeometry, 5);
    const ratios: number[] = [];

    for (const [lat, lon] of samplePoints) {
      const url = `${FLOW_URL}?point=${lat},${lon}&key=${env.TOMTOM_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = (await res.json()) as any;
      const flow = data?.flowSegmentData;
      if (flow?.freeFlowSpeed > 0) {
        ratios.push(flow.currentSpeed / flow.freeFlowSpeed);
      }
    }

    if (!ratios.length) throw new Error('TomTom returned no usable flow data for this route');

    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const condition = conditionFromRatio(avgRatio);
    const delayMin = Math.max(0, baselineDurationMin * (1 / avgRatio - 1));

    return {
      condition,
      delayMin,
      isLive: true,
      source: this.name,
    };
  }
}
