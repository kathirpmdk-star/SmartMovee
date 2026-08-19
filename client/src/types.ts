export type TravelMode = 'car' | 'bike' | 'cycle' | 'walk';
export type TrafficCondition = 'low' | 'moderate' | 'heavy';
export type Priority = 'fastest' | 'emissions' | 'cheapest' | 'safety' | 'balanced';
export type Severity = 'minor' | 'moderate' | 'severe';
export type CrowdLevel = 'low' | 'moderate' | 'high';

export interface GeoPoint {
  lat: number;
  lon: number;
  displayName: string;
  query: string;
}

export interface RouteResult {
  mode: TravelMode;
  distanceKm: number;
  durationMin: number;
  geometry: [number, number][];
  provider: string;
}

export interface TrafficResult {
  condition: TrafficCondition;
  delayMin: number;
  isLive: boolean;
  source: string;
}

export interface EmissionEstimate {
  co2Grams: number;
  co2Label: string;
  category: string;
  ecoScore: number;
}

export interface SafetyResult {
  score: number;
  incidentCount: number;
  label: string;
}

export interface ScoreBreakdown {
  overall: number;
  timeScore: number;
  trafficScore: number;
  emissionScore: number;
  safetyScore: number;
}

export interface PrivateOption {
  mode: TravelMode;
  route: RouteResult;
  traffic: TrafficResult;
  trafficNote: string | null;
  emission: EmissionEstimate;
  safety: SafetyResult;
  etaMin: number;
  score: ScoreBreakdown;
}

export interface BusOption {
  busNumber: string;
  routeName: string;
  fromStop: string;
  toStop: string;
  departure: string;
  arrival: string;
  journeyMin: number;
  stopsCount: number;
  fare: number | null;
  etaType: 'scheduled';
}

export interface ParkingSpot {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceFromDestinationM: number;
  fee: string | null;
  openingHours: string | null;
  source: string;
  availabilityLabel: string;
}

export interface IncidentReport {
  id: number;
  lat: number;
  lon: number;
  severity: Severity;
  note: string | null;
  reportedAt: number;
}

export interface Recommendation {
  bestLabel: string;
  explanation: string;
  isAiGenerated: boolean;
}

export interface PlanResponse {
  origin: GeoPoint;
  destination: GeoPoint;
  isShortTrip: boolean;
  straightLineKm: number;
  private: PrivateOption[];
  public: {
    buses: BusOption[];
    dataSource: string;
    isDemoData: boolean;
  };
  parking: ParkingSpot[];
  incidents: IncidentReport[];
  recommendation: Recommendation | null;
  aiProviderUsed: string;
}

export interface CrowdSummary {
  busNumber: string;
  level: CrowdLevel | null;
  lastReportMinutesAgo: number | null;
  reportCount: number;
  basis: string;
}
