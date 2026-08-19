import { db } from '../../db.js';
import { distanceToPolylineMeters } from '../../utils/geo.js';

export type Severity = 'minor' | 'moderate' | 'severe';

export interface IncidentReport {
  id: number;
  lat: number;
  lon: number;
  severity: Severity;
  note: string | null;
  reportedAt: number;
}

const NEAR_ROUTE_BUFFER_M = 150;
const RELEVANT_WINDOW_MS = 6 * 60 * 60 * 1000; // last 6 hours are shown as "recent"

// Crowd-sourced incident reporting (the "SOS button"). This is real user-submitted
// data, not an official accident statistic -- always labeled as a community report.
export class IncidentService {
  static report(lat: number, lon: number, severity: Severity, note?: string): IncidentReport {
    const reportedAt = Date.now();
    const stmt = db.prepare(
      `INSERT INTO incidents (lat, lon, severity, note, reported_at) VALUES (?, ?, ?, ?, ?)`
    );
    const info = stmt.run(lat, lon, severity, note ?? null, reportedAt);
    return { id: Number(info.lastInsertRowid), lat, lon, severity, note: note ?? null, reportedAt };
  }

  static recent(hours = 24): IncidentReport[] {
    const since = Date.now() - hours * 60 * 60 * 1000;
    const rows = db
      .prepare(`SELECT id, lat, lon, severity, note, reported_at as reportedAt FROM incidents WHERE reported_at >= ? ORDER BY reported_at DESC`)
      .all(since) as IncidentReport[];
    return rows;
  }

  /** Incidents that fall within NEAR_ROUTE_BUFFER_M of the given route geometry. */
  static onRoute(geometry: [number, number][], hours = 24): IncidentReport[] {
    const all = this.recent(hours);
    return all.filter((i) => distanceToPolylineMeters([i.lat, i.lon], geometry) <= NEAR_ROUTE_BUFFER_M);
  }

  /**
   * Safety score derived only from real crowd-reported incidents near this route.
   * No route is ever called "safe" -- absence of reports just means no data, phrased
   * as "lower recorded risk based on available reports."
   */
  static scoreForRoute(geometry: [number, number][]): { score: number; incidentCount: number; label: string } {
    const nearby = this.onRoute(geometry, RELEVANT_WINDOW_MS / (60 * 60 * 1000));
    const weight = { minor: 5, moderate: 12, severe: 25 };
    const penalty = nearby.reduce((sum, i) => sum + weight[i.severity], 0);
    // Base of 70, not 100: absence of reports means "no data", not "proven safe".
    const score = Math.max(20, 70 - penalty);

    const label = nearby.length === 0
      ? 'Lower recorded risk based on available community reports (no confirmed incidents; this does not guarantee safety).'
      : `${nearby.length} community-reported incident${nearby.length > 1 ? 's' : ''} near this route in the last 6 hours.`;

    return { score, incidentCount: nearby.length, label };
  }
}
