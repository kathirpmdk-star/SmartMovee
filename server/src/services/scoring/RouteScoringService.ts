// Configurable weights -- change here, not scattered across the frontend.
export const SCORE_WEIGHTS = {
  time: 0.35,
  traffic: 0.2,
  emissions: 0.25,
  safety: 0.2,
};

// Traffic (hardcoded "low" for non-motorized modes) + emissions + safety alone can
// contribute up to (0.2 + 0.25 + 0.2) * 100 = 65 points regardless of how long a
// mode actually takes -- e.g. a 6-hour walk still gets full eco/safety credit.
// We only discount that floor once a mode's absolute time cost (not just its
// ratio to the fastest option) becomes significant -- a walk that's "5x slower"
// but only 7 minutes different from biking is a legitimate lifestyle choice on a
// short trip; a walk that's 500+ minutes different on a long trip is not, even
// though both cases might have a similarly bad ratio.
const PRACTICALITY_GRACE_MINUTES = 15; // extra minutes over the fastest option treated as fully practical
const PRACTICALITY_DECAY_MINUTES = 45; // extra minutes (beyond the grace period) that roughly triples the penalty
const PRACTICALITY_FLOOR_MULTIPLIER = 0.15;

export interface ScoreInput {
  durationMin: number; // including traffic delay
  fastestDurationMin: number; // quickest option being compared, for normalization
  trafficCondition: 'low' | 'moderate' | 'heavy';
  ecoScore: number; // 0-100 from EmissionService
  safetyScore: number; // 0-100 from IncidentService
}

const TRAFFIC_SCORE: Record<ScoreInput['trafficCondition'], number> = { low: 100, moderate: 60, heavy: 25 };

export interface ScoreBreakdown {
  overall: number;
  timeScore: number;
  trafficScore: number;
  emissionScore: number;
  safetyScore: number;
}

export class RouteScoringService {
  static score(input: ScoreInput): ScoreBreakdown {
    // Ratio against the fastest option, not the slowest: a mode taking several
    // times longer than the quickest one should score near zero on time, rather
    // than being diluted just because an even slower outlier (e.g. walking a
    // 46km trip) is also in the comparison set.
    const ratio = input.fastestDurationMin / Math.max(input.durationMin, 1);
    const normalizedTimeScore = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    const trafficScore = TRAFFIC_SCORE[input.trafficCondition];
    const emissionScore = input.ecoScore;
    const safetyScore = input.safetyScore;

    const weightedSum =
      normalizedTimeScore * SCORE_WEIGHTS.time +
      trafficScore * SCORE_WEIGHTS.traffic +
      emissionScore * SCORE_WEIGHTS.emissions +
      safetyScore * SCORE_WEIGHTS.safety;

    const extraMinutes = Math.max(0, input.durationMin - input.fastestDurationMin);
    const excessOverGrace = Math.max(0, extraMinutes - PRACTICALITY_GRACE_MINUTES);
    const practicalityMultiplier =
      excessOverGrace === 0 ? 1 : Math.max(PRACTICALITY_FLOOR_MULTIPLIER, 1 / (1 + excessOverGrace / PRACTICALITY_DECAY_MINUTES));

    const overall = Math.round(weightedSum * practicalityMultiplier);

    return { overall, timeScore: normalizedTimeScore, trafficScore, emissionScore, safetyScore };
  }
}
