import type { RoutingProvider, RoutePoint, RouteResult, TravelMode } from './RoutingProvider.js';

// OSRM public demo server (router.project-osrm.org). No API key.
// Usage policy: demo/non-commercial use only, ~1 req/sec, can be withdrawn any time.
// https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy
//
// VERIFIED LIMITATION: the public demo server accepts /foot/ and /cycling/ in the
// URL but actually only serves the driving-network dataset -- it silently returns
// the same duration as the driving profile for every mode (confirmed by direct
// testing: a 46km "foot" route came back as 42 minutes, i.e. ~65 km/h walking).
// So for non-motorized modes we keep OSRM's road-network *distance* (still real,
// routed distance) but compute duration ourselves from standard average speeds.
// This is a documented modeling assumption, not fabricated live data.
const BASE_URL = 'https://router.project-osrm.org';

const PROFILE: Record<TravelMode, string> = {
  car: 'driving',
  bike: 'driving',
  cycle: 'driving',
  walk: 'driving',
};

const BIKE_SPEED_FACTOR = 1.22; // bikes ~22% faster than car baseline in dense urban traffic
const AVERAGE_SPEED_KMH: Partial<Record<TravelMode, number>> = {
  cycle: 15,
  walk: 4.5,
};

let lastRequestAt = 0;
async function throttle() {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < 1000) await new Promise((r) => setTimeout(r, 1000 - elapsed));
  lastRequestAt = Date.now();
}

export class OsrmProvider implements RoutingProvider {
  name = 'OSRM (public demo server)';

  async getRoute(from: RoutePoint, to: RoutePoint, mode: TravelMode): Promise<RouteResult> {
    await throttle();
    const profile = PROFILE[mode];
    const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
    const url = `${BASE_URL}/route/v1/${profile}/${coords}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM routing failed: ${res.status}`);
    const data = (await res.json()) as any;
    if (data.code !== 'Ok' || !data.routes?.length) {
      throw new Error(`OSRM returned no route: ${data.code}`);
    }

    const route = data.routes[0];
    const distanceKm = route.distance / 1000;
    let durationMin = route.duration / 60;
    if (mode === 'bike') durationMin = durationMin / BIKE_SPEED_FACTOR;
    if (AVERAGE_SPEED_KMH[mode]) durationMin = (distanceKm / AVERAGE_SPEED_KMH[mode]!) * 60;

    return {
      mode,
      distanceKm: route.distance / 1000,
      durationMin,
      geometry: route.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]),
      provider: this.name,
    };
  }
}
