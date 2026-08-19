export type Priority = 'fastest' | 'emissions' | 'cheapest' | 'safety' | 'balanced';

export interface RecommendationCandidate {
  label: string; // e.g. "Car", "Bike", "Bus 599", "Metro + Walking"
  category: 'private' | 'public';
  durationMin: number;
  distanceKm: number;
  trafficCondition?: 'low' | 'moderate' | 'heavy';
  co2Grams: number;
  co2Label: string;
  safetyScore: number;
  fareRupees?: number | null;
  overallScore: number;
}

export interface RecommendationRequest {
  from: string;
  to: string;
  priority: Priority;
  candidates: RecommendationCandidate[];
}

export interface RecommendationResult {
  bestLabel: string;
  explanation: string;
  isAiGenerated: boolean;
}

export interface AIProvider {
  name: string;
  recommend(req: RecommendationRequest): Promise<RecommendationResult>;
}
