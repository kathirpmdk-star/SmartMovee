import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';
import { db } from '../../db.js';

// Ingests a standard GTFS zip (routes.txt, stops.txt, trips.txt, stop_times.txt,
// calendar.txt) into the local SQLite schema. Works with any GTFS export --
// point it at an official CUMTA/MTC/CMRL feed when one is available.
export function importGtfsZip(zipPath: string, sourceLabel: string) {
  const zip = new AdmZip(zipPath);

  const readCsv = (filename: string): Record<string, string>[] => {
    const entry = zip.getEntry(filename);
    if (!entry) return [];
    return parse(entry.getData().toString('utf-8'), { columns: true, skip_empty_lines: true, trim: true });
  };

  const routes = readCsv('routes.txt');
  const stops = readCsv('stops.txt');
  const trips = readCsv('trips.txt');
  const stopTimes = readCsv('stop_times.txt');

  const tx = db.transaction(() => {
    db.exec('DELETE FROM gtfs_stop_times; DELETE FROM gtfs_trips; DELETE FROM gtfs_routes; DELETE FROM gtfs_stops;');

    const insertRoute = db.prepare(`INSERT OR REPLACE INTO gtfs_routes (route_id, route_short_name, route_long_name) VALUES (?, ?, ?)`);
    for (const r of routes) insertRoute.run(r.route_id, r.route_short_name ?? '', r.route_long_name ?? '');

    const insertStop = db.prepare(`INSERT OR REPLACE INTO gtfs_stops (stop_id, stop_name, lat, lon) VALUES (?, ?, ?, ?)`);
    for (const s of stops) insertStop.run(s.stop_id, s.stop_name ?? '', parseFloat(s.stop_lat), parseFloat(s.stop_lon));

    const insertTrip = db.prepare(`INSERT OR REPLACE INTO gtfs_trips (trip_id, route_id, trip_headsign) VALUES (?, ?, ?)`);
    for (const t of trips) insertTrip.run(t.trip_id, t.route_id, t.trip_headsign ?? '');

    const insertStopTime = db.prepare(
      `INSERT INTO gtfs_stop_times (trip_id, stop_id, stop_sequence, arrival_time, departure_time) VALUES (?, ?, ?, ?, ?)`
    );
    for (const st of stopTimes) {
      insertStopTime.run(st.trip_id, st.stop_id, parseInt(st.stop_sequence, 10), st.arrival_time, st.departure_time);
    }

    db.prepare(`INSERT OR REPLACE INTO gtfs_meta (key, value) VALUES ('source', ?)`).run(sourceLabel);
    db.prepare(`INSERT OR REPLACE INTO gtfs_meta (key, value) VALUES ('imported_at', ?)`).run(String(Date.now()));
  });
  tx();

  return { routes: routes.length, stops: stops.length, trips: trips.length, stopTimes: stopTimes.length };
}
