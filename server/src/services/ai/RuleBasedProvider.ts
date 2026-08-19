import type { AIProvider, RecommendationRequest, RecommendationResult } from './AIProvider.js';

function pickByPriority(req: RecommendationRequest) {
  const { candidates, priority } = req;
  switch (priority) {
    case 'fastest':
      return [...candidates].sort((a, b) => a.durationMin - b.durationMin)[0];
    case 'emissions':
      return [...candidates].sort((a, b) => a.co2Grams - b.co2Grams)[0] ?? candidates[0];
    case 'cheapest':
      return [...candidates].sort((a, b) => (a.fareRupees ?? 0) - (b.fareRupees ?? 0))[0];
    case 'safety':
      return [...candidates].sort((a, b) => b.safetyScore - a.safetyScore)[0];
    case 'balanced':
    default:
      return [...candidates].sort((a, b) => b.overallScore - a.overallScore)[0];
  }
}

export class RuleBasedProvider implements AIProvider {
  name = 'Rule-based fallback (no LLM)';

  async recommend(req: RecommendationRequest): Promise<RecommendationResult> {
    const best = pickByPriority(req);
    const fastest = [...req.candidates].sort((a, b) => a.durationMin - b.durationMin)[0];
    const timeDelta = Math.round(best.durationMin - fastest.durationMin);

    const explanation =
      timeDelta === 0
        ? `${best.label} is the fastest option with ${best.co2Label.toLowerCase()}.`
        : `${best.label} balances speed and ${best.co2Label.toLowerCase()}, only ${timeDelta} min slower than the quickest option.`;

    return { bestLabel: best.label, explanation, isAiGenerated: false };
  }
}
