import { db } from '../../db.js';
import { haversineMeters } from '../../utils/geo.js';

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
  etaType: 'scheduled'; // no live GPS feed available -- always labeled scheduled, never "live"
}

const STOP_SEARCH_RADIUS_M = 4000; // generous enough to absorb Nominatim's variance when geocoding broad area names

export class PublicTransportService {
  static isDemoData(): boolean {
    const row = db.prepare(`SELECT value FROM gtfs_meta WHERE key = 'source'`).get() as { value: string } | undefined;
    return !!row && row.value.startsWith('DEMO');
  }

  static dataSourceLabel(): string {
    const row = db.prepare(`SELECT value FROM gtfs_meta WHERE key = 'source'`).get() as { value: string } | undefined;
    return row?.value ?? 'No GTFS data imported';
  }

  static findBuses(originLat: number, originLon: number, destLat: number, destLon: number): BusOption[] {
    const stops = db.prepare(`SELECT stop_id, stop_name, lat, lon FROM gtfs_stops`).all() as
      { stop_id: string; stop_name: string; lat: number; lon: number }[];

    const nearOrigin = new Set(stops.filter((s) => haversineMeters(originLat, originLon, s.lat, s.lon) <= STOP_SEARCH_RADIUS_M).map((s) => s.stop_id));
    const nearDest = new Set(stops.filter((s) => haversineMeters(destLat, destLon, s.lat, s.lon) <= STOP_SEARCH_RADIUS_M).map((s) => s.stop_id));

    if (!nearOrigin.size || !nearDest.size) return [];

    const trips = db.prepare(`
      SELECT t.trip_id, t.trip_headsign, r.route_short_name, r.route_long_name
      FROM gtfs_trips t JOIN gtfs_routes r ON r.route_id = t.route_id
    `).all() as { trip_id: string; trip_headsign: string; route_short_name: string; route_long_name: string }[];

    const results: BusOption[] = [];

    for (const trip of trips) {
      const stopTimes = db.prepare(`
        SELECT st.stop_id, st.stop_sequence, st.arrival_time, st.departure_time, st.fare, s.stop_name
        FROM gtfs_stop_times st JOIN gtfs_stops s ON s.stop_id = st.stop_id
        WHERE st.trip_id = ? ORDER BY st.stop_sequence ASC
      `).all(trip.trip_id) as { stop_id: string; stop_sequence: number; arrival_time: string; departure_time: string; fare: number | null; stop_name: string }[];

      const fromIdx = stopTimes.findIndex((st) => nearOrigin.has(st.stop_id));
      const toIdx = stopTimes.findIndex((st, i) => i > (fromIdx === -1 ? -1 : fromIdx) && nearDest.has(st.stop_id));

      if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) continue;

      const fromStopTime = stopTimes[fromIdx];
      const toStopTime = stopTimes[toIdx];
      const journeyMin = timeDiffMin(fromStopTime.departure_time, toStopTime.arrival_time);
      const fare = stopTimes.slice(fromIdx + 1, toIdx + 1).reduce((sum, st) => sum + (st.fare ?? 0), 0);

      results.push({
        busNumber: trip.route_short_name,
        routeName: trip.route_long_name,
        fromStop: fromStopTime.stop_name,
        toStop: toStopTime.stop_name,
        departure: fromStopTime.departure_time,
        arrival: toStopTime.arrival_time,
        journeyMin,
        stopsCount: toIdx - fromIdx,
        fare: fare || null,
        etaType: 'scheduled',
      });
    }

    return results.sort((a, b) => a.departure.localeCompare(b.departure));
  }
}

function timeDiffMin(t1: string, t2: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  let diff = toMin(t2) - toMin(t1);
  if (diff < 0) diff += 24 * 60;
  return diff;
}
