import type { TravelMode } from '../routing/RoutingProvider.js';

// Estimated emission factors in grams CO2 per km, per passenger where relevant.
// These are widely-cited rough averages (ICCT / UK DEFRA style figures) used ONLY
// for a relative, estimated comparison between modes -- not a certified measurement.
// Configurable in one place rather than scattered across the frontend.
export const EMISSION_FACTORS_G_PER_KM: Record<TravelMode | 'bus' | 'metro', number> = {
  car: 171,
  bike: 83,
  cycle: 0,
  walk: 0,
  bus: 68, // per-passenger average, assumes typical urban occupancy
  metro: 28, // per-passenger average, grid-electricity weighted
};

export interface EmissionEstimate {
  co2Grams: number;
  co2Label: string;
  category: 'none' | 'very low' | 'low' | 'medium' | 'high';
  ecoScore: number; // 0-100, higher is better
}

const MAX_REFERENCE_G_PER_KM = EMISSION_FACTORS_G_PER_KM.car;

export class EmissionService {
  static estimate(mode: TravelMode | 'bus' | 'metro', distanceKm: number): EmissionEstimate {
    const factor = EMISSION_FACTORS_G_PER_KM[mode];
    const co2Grams = factor * distanceKm;

    let category: EmissionEstimate['category'];
    if (factor === 0) category = 'none';
    else if (factor <= 30) category = 'very low';
    else if (factor <= 90) category = 'low';
    else if (factor <= 150) category = 'medium';
    else category = 'high';

    const ecoScore = Math.round(100 - (factor / MAX_REFERENCE_G_PER_KM) * 100);

    const co2Label = co2Grams === 0
      ? 'Near-zero direct emissions'
      : co2Grams < 1000
        ? `${Math.round(co2Grams)} g CO2 (est.)`
        : `${(co2Grams / 1000).toFixed(1)} kg CO2 (est.)`;

    return { co2Grams, co2Label, category, ecoScore: Math.max(0, Math.min(100, ecoScore)) };
  }
}
