// Geocoding via Nominatim (OpenStreetMap). No API key required.
// Usage policy: max 1 req/sec, must set a real User-Agent, cache results.
// https://operations.osmfoundation.org/policies/nominatim/

const cache = new Map<string, { lat: number; lon: number; displayName: string }>();
let lastRequestAt = 0;

async function throttle() {
  const elapsed = Date.now() - lastRequestAt;
  const minGap = 1100;
  if (elapsed < minGap) {
    await new Promise((r) => setTimeout(r, minGap - elapsed));
  }
  lastRequestAt = Date.now();
}

export async function geocode(query: string) {
  const key = query.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  await throttle();
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  // Bias toward Chennai/Tamil Nadu for this prototype's demo scope.
  url.searchParams.set('countrycodes', 'in');
  url.searchParams.set('viewbox', '79.7,13.3,80.5,12.7');
  url.searchParams.set('bounded', '0');

  const res = await fetch(url, {
    headers: { 'User-Agent': 'SmartMove-Hackathon-Prototype/1.0 (contact: stickydeena@gmail.com)' },
  });
  if (!res.ok) throw new Error(`Nominatim geocode failed: ${res.status}`);
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!data.length) throw new Error(`No geocoding result for "${query}"`);

  const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), displayName: data[0].display_name };
  cache.set(key, result);
  return result;
}

export interface PlaceSuggestion {
  lat: number;
  lon: number;
  displayName: string;
}

const suggestCache = new Map<string, PlaceSuggestion[]>();

export async function suggestPlaces(query: string): Promise<PlaceSuggestion[]> {
  const key = query.trim().toLowerCase();
  if (key.length < 3) return [];
  if (suggestCache.has(key)) return suggestCache.get(key)!;

  await throttle();
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('countrycodes', 'in');
  url.searchParams.set('viewbox', '79.7,13.3,80.5,12.7');
  url.searchParams.set('bounded', '0');

  const res = await fetch(url, {
    headers: { 'User-Agent': 'SmartMove-Hackathon-Prototype/1.0 (contact: stickydeena@gmail.com)' },
  });
  if (!res.ok) throw new Error(`Nominatim suggest failed: ${res.status}`);
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;

  const results = data.map((d) => ({ lat: parseFloat(d.lat), lon: parseFloat(d.lon), displayName: d.display_name }));
  suggestCache.set(key, results);
  return results;
}

const reverseCache = new Map<string, string>();

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (reverseCache.has(key)) return reverseCache.get(key)!;

  await throttle();
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('format', 'json');

  const res = await fetch(url, {
    headers: { 'User-Agent': 'SmartMove-Hackathon-Prototype/1.0 (contact: stickydeena@gmail.com)' },
  });
  if (!res.ok) throw new Error(`Nominatim reverse geocode failed: ${res.status}`);
  const data = (await res.json()) as { display_name?: string };
  const displayName = data.display_name ?? 'Current location';
  reverseCache.set(key, displayName);
  return displayName;
}
