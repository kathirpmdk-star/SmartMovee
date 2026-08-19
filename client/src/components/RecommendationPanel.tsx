import type { Recommendation } from '../types';

export function RecommendationPanel({ recommendation, aiProviderUsed }: { recommendation: Recommendation | null; aiProviderUsed: string }) {
  if (!recommendation) return null;
  return (
    <div className="border border-blue-700 bg-blue-50/50 rounded-lg p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">🧠 Smart Recommendation</h3>
        <span className="text-[11px] text-gray-400">{recommendation.isAiGenerated ? aiProviderUsed : 'Rule-based (AI unavailable)'}</span>
      </div>
      <p className="mt-2 text-sm">
        <span className="font-semibold text-blue-700">Best option: {recommendation.bestLabel}.</span>{' '}
        <span className="text-gray-700">{recommendation.explanation}</span>
      </p>
    </div>
  );
}
