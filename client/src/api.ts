import type { PlanResponse, Priority, Severity, CrowdSummary, CrowdLevel } from './types';

export async function fetchPlan(
  from: string,
  to: string,
  priority: Priority,
  fromCoords?: { lat: number; lon: number },
  toCoords?: { lat: number; lon: number }
): Promise<PlanResponse> {
  const res = await fetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      priority,
      fromLat: fromCoords?.lat,
      fromLon: fromCoords?.lon,
      toLat: toCoords?.lat,
      toLon: toCoords?.lon,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function reverseGeocode(lat: number, lon: number): Promise<{ lat: number; lon: number; displayName: string }> {
  const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error('Reverse geocoding failed');
  return res.json();
}

export interface PlaceSuggestion {
  lat: number;
  lon: number;
  displayName: string;
}

export async function suggestPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (query.trim().length < 3) return [];
  const res = await fetch(`/api/places?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function reportIncident(lat: number, lon: number, severity: Severity, note?: string) {
  const res = await fetch('/api/incidents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lon, severity, note }),
  });
  if (!res.ok) throw new Error('Failed to report incident');
  return res.json();
}

export async function fetchCrowdSummary(busNumber: string): Promise<CrowdSummary> {
  const res = await fetch(`/api/crowd/${encodeURIComponent(busNumber)}`);
  if (!res.ok) throw new Error('Failed to fetch crowd summary');
  return res.json();
}

export async function reportCrowd(busNumber: string, level: CrowdLevel, seatAvailability?: string) {
  const res = await fetch('/api/crowd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ busNumber, level, seatAvailability }),
  });
  if (!res.ok) throw new Error('Failed to report crowd level');
  return res.json();
}
