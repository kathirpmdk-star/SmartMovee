import { db } from '../../db.js';

// DEMO Chennai public-transport dataset.
//
// This is NOT official CUMTA/MTC/CMRL data. A live search found only an
// outdated/incomplete archived MTC GTFS feed (Transitland). This seed exists so the
// import pipeline, query engine, and UI can be demonstrated end-to-end; it should be
// replaced by importGtfsZip() with an official export as soon as one is available.
// Route numbers reused below (21G, 599, 570, 45B, M27M) are real Chennai MTC route
// numbers/corridors, but the stop list, coordinates, and timings here are
// illustrative, not measured.
const DEMO_SOURCE_LABEL = 'DEMO dataset v2 (illustrative, not official MTC/CUMTA data)';

export function seedDemoGtfs() {
  const existing = db.prepare(`SELECT value FROM gtfs_meta WHERE key = 'source'`).get() as { value: string } | undefined;
  // Only skip if a real import already happened, or this exact demo version is already seeded.
  if (existing && (!existing.value.startsWith('DEMO') || existing.value === DEMO_SOURCE_LABEL)) return;

  const tx = db.transaction(() => {
    const routes = [
      { route_id: 'R21G', route_short_name: '21G', route_long_name: 'Tambaram <> Broadway (via GST Road)' },
      { route_id: 'R599', route_short_name: '599', route_long_name: 'Kelambakkam <> Thiruvanmiyur (via OMR)' },
      { route_id: 'R570', route_short_name: '570', route_long_name: 'Siruseri <> T Nagar (via OMR / Anna Salai)' },
      { route_id: 'R45B', route_short_name: '45B', route_long_name: 'VIT Chennai <> Tambaram (via Vandalur)' },
      { route_id: 'RM27M', route_short_name: 'M27M', route_long_name: 'Porur <> Anna Nagar (via Koyambedu)' },
    ];
    const insertRoute = db.prepare(`INSERT OR REPLACE INTO gtfs_routes (route_id, route_short_name, route_long_name) VALUES (?, ?, ?)`);
    for (const r of routes) insertRoute.run(r.route_id, r.route_short_name, r.route_long_name);

    const stops = [
      { stop_id: 'S_VIT', stop_name: 'VIT Chennai (Kelambakkam)', lat: 12.8406, lon: 80.1533 },
      { stop_id: 'S_SIRUSERI', stop_name: 'Siruseri OMR', lat: 12.8266, lon: 80.2196 },
      { stop_id: 'S_SHOLINGANALLUR', stop_name: 'Sholinganallur', lat: 12.9010, lon: 80.2279 },
      { stop_id: 'S_THORAIPAKKAM', stop_name: 'Thoraipakkam', lat: 12.9410, lon: 80.2350 },
      { stop_id: 'S_THIRUVANMIYUR', stop_name: 'Thiruvanmiyur', lat: 12.9830, lon: 80.2593 },
      { stop_id: 'S_ADYAR', stop_name: 'Adyar Signal', lat: 13.0064, lon: 80.2565 },
      { stop_id: 'S_TNAGAR', stop_name: 'T Nagar Bus Stand', lat: 13.0418, lon: 80.2341 },
      { stop_id: 'S_SAIDAPET', stop_name: 'Saidapet', lat: 13.0206, lon: 80.2226 },
      { stop_id: 'S_TAMBARAM', stop_name: 'Tambaram', lat: 12.9249, lon: 80.1000 },
      { stop_id: 'S_GUINDY', stop_name: 'Guindy', lat: 13.0067, lon: 80.2206 },
      { stop_id: 'S_ANNASALAI', stop_name: 'Anna Salai', lat: 13.0569, lon: 80.2508 },
      { stop_id: 'S_CENTRAL', stop_name: 'Chennai Central', lat: 13.0827, lon: 80.2757 },
      { stop_id: 'S_VANDALUR', stop_name: 'Vandalur', lat: 12.8956, lon: 80.0827 },
      { stop_id: 'S_PORUR', stop_name: 'Porur', lat: 13.0381, lon: 80.1564 },
      { stop_id: 'S_KOYAMBEDU', stop_name: 'Koyambedu CMBT', lat: 13.0694, lon: 80.1948 },
      { stop_id: 'S_ANNANAGAR', stop_name: 'Anna Nagar Roundtana', lat: 13.0850, lon: 80.2101 },
    ];
    const insertStop = db.prepare(`INSERT OR REPLACE INTO gtfs_stops (stop_id, stop_name, lat, lon) VALUES (?, ?, ?, ?)`);
    for (const s of stops) insertStop.run(s.stop_id, s.stop_name, s.lat, s.lon);

    const insertTrip = db.prepare(`INSERT OR REPLACE INTO gtfs_trips (trip_id, route_id, trip_headsign) VALUES (?, ?, ?)`);
    const insertStopTime = db.prepare(
      `INSERT INTO gtfs_stop_times (trip_id, stop_id, stop_sequence, arrival_time, departure_time, fare) VALUES (?, ?, ?, ?, ?, ?)`
    );

    function seedRoute(routeId: string, tripPrefix: string, headsign: string, stopIds: string[], departures: string[], gapMin: number, fareStep: number) {
      departures.forEach((dep, idx) => {
        const tripId = `${tripPrefix}_${idx}`;
        insertTrip.run(tripId, routeId, headsign);
        let [h, m] = dep.split(':').map(Number);
        stopIds.forEach((stopId, seq) => {
          const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
          insertStopTime.run(tripId, stopId, seq + 1, t, t, seq === 0 ? 0 : fareStep);
          m += gapMin;
          if (m >= 60) { m -= 60; h += 1; }
        });
      });
    }

    // Route 599: VIT area -> Thiruvanmiyur
    seedRoute('R599', 'T599', 'Thiruvanmiyur', ['S_VIT', 'S_SIRUSERI', 'S_SHOLINGANALLUR', 'S_THORAIPAKKAM', 'S_THIRUVANMIYUR'],
      ['08:20:00', '09:15:00', '10:05:00', '17:40:00'], 12, 25);

    // Route 570: Siruseri -> T Nagar via OMR/Anna Salai
    seedRoute('R570', 'T570', 'T Nagar', ['S_SIRUSERI', 'S_SHOLINGANALLUR', 'S_THIRUVANMIYUR', 'S_ADYAR', 'S_GUINDY', 'S_TNAGAR'],
      ['09:25:00', '11:00:00', '18:10:00'], 13, 30);

    // Route 21G: Tambaram -> Broadway via GST Road / Saidapet / Anna Salai / Central
    seedRoute('R21G', 'T21G', 'Broadway', ['S_TAMBARAM', 'S_SAIDAPET', 'S_GUINDY', 'S_ANNASALAI', 'S_CENTRAL'],
      ['09:15:00', '10:30:00', '17:00:00'], 11, 20);

    // Route 45B: VIT Chennai -> Tambaram via Vandalur
    seedRoute('R45B', 'T45B', 'Tambaram', ['S_VIT', 'S_VANDALUR', 'S_TAMBARAM'],
      ['08:10:00', '09:40:00', '12:20:00', '18:30:00'], 15, 18);

    // Route M27M: Porur -> Anna Nagar via Koyambedu
    seedRoute('RM27M', 'TM27M', 'Anna Nagar', ['S_PORUR', 'S_KOYAMBEDU', 'S_ANNANAGAR'],
      ['08:05:00', '09:20:00', '13:15:00', '19:00:00'], 10, 12);

    db.prepare(`INSERT OR REPLACE INTO gtfs_meta (key, value) VALUES ('source', ?)`).run(DEMO_SOURCE_LABEL);
    db.prepare(`INSERT OR REPLACE INTO gtfs_meta (key, value) VALUES ('imported_at', ?)`).run(String(Date.now()));
  });
  tx();
}
