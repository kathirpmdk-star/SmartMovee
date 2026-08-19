export type TravelMode = 'car' | 'bike' | 'cycle' | 'walk';

export interface RoutePoint {
  lat: number;
  lon: number;
}

export interface RouteResult {
  mode: TravelMode;
  distanceKm: number;
  durationMin: number; // baseline duration from the routing engine (no live traffic)
  geometry: [number, number][]; // [lat, lon] pairs for the polyline
  provider: string;
}

export interface RoutingProvider {
  name: string;
  getRoute(from: RoutePoint, to: RoutePoint, mode: TravelMode): Promise<RouteResult>;
}
