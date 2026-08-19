import type { ParkingProvider, ParkingSpot } from './ParkingProvider.js';
import { haversineMeters } from '../../utils/geo.js';

// Overpass API (OpenStreetMap) - free, no API key.
// Public instances have soft fair-use limits; keep queries small and infrequent.
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export class OverpassProvider implements ParkingProvider {
  name = 'OpenStreetMap (Overpass API)';

  async findNearby(lat: number, lon: number, radiusM: number): Promise<ParkingSpot[]> {
    const query = `
      [out:json][timeout:20];
      (
        node["amenity"="parking"](around:${radiusM},${lat},${lon});
        way["amenity"="parking"](around:${radiusM},${lat},${lon});
        node["amenity"="bicycle_parking"](around:${radiusM},${lat},${lon});
      );
      out center tags;
    `;

    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'SmartMove-Hackathon-Prototype/1.0 (contact: stickydeena@gmail.com)',
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) throw new Error(`Overpass request failed: ${res.status}`);
    const data = (await res.json()) as any;

    const spots: ParkingSpot[] = (data.elements ?? []).map((el: any) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLon = el.lon ?? el.center?.lon;
      const tags = el.tags ?? {};
      return {
        id: `${el.type}/${el.id}`,
        name: tags.name || (tags.amenity === 'bicycle_parking' ? 'Bicycle Parking' : 'Parking Area'),
        lat: elLat,
        lon: elLon,
        distanceFromDestinationM: Math.round(haversineMeters(lat, lon, elLat, elLon)),
        fee: tags.fee ?? null,
        openingHours: tags.opening_hours ?? null,
        source: this.name,
        availabilityLabel: 'Parking location' as const,
      };
    }).filter((s: ParkingSpot) => Number.isFinite(s.lat) && Number.isFinite(s.lon));

    return spots.sort((a, b) => a.distanceFromDestinationM - b.distanceFromDestinationM).slice(0, 8);
  }
}
