import { db } from '../../db.js';

export type CrowdLevel = 'low' | 'moderate' | 'high';

export interface CrowdReportInput {
  busNumber: string;
  level: CrowdLevel;
  approxPeople?: number;
  seatAvailability?: 'seats_available' | 'standing_only' | 'full';
  lat?: number;
  lon?: number;
}

export interface CrowdSummary {
  busNumber: string;
  level: CrowdLevel | null;
  lastReportMinutesAgo: number | null;
  reportCount: number;
  basis: string;
}

const LEVEL_WEIGHT: Record<CrowdLevel, number> = { low: 1, moderate: 2, high: 3 };
const RELEVANT_WINDOW_MS = 90 * 60 * 1000; // reports older than 90 min are ignored

export class CrowdService {
  static report(input: CrowdReportInput) {
    const reportedAt = Date.now();
    db.prepare(
      `INSERT INTO crowd_reports (bus_number, level, approx_people, seat_availability, lat, lon, reported_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      input.busNumber,
      input.level,
      input.approxPeople ?? null,
      input.seatAvailability ?? null,
      input.lat ?? null,
      input.lon ?? null,
      reportedAt
    );
    return this.summary(input.busNumber);
  }

  /** Recency-weighted aggregation: reports in the last 15 min count much more than older ones. */
  static summary(busNumber: string): CrowdSummary {
    const since = Date.now() - RELEVANT_WINDOW_MS;
    const rows = db
      .prepare(`SELECT level, reported_at as reportedAt FROM crowd_reports WHERE bus_number = ? AND reported_at >= ? ORDER BY reported_at DESC`)
      .all(busNumber, since) as { level: CrowdLevel; reportedAt: number }[];

    if (!rows.length) {
      return { busNumber, level: null, lastReportMinutesAgo: null, reportCount: 0, basis: 'No recent user reports.' };
    }

    const now = Date.now();
    let weightedSum = 0;
    let weightTotal = 0;
    for (const r of rows) {
      const ageMin = (now - r.reportedAt) / 60000;
      const recencyWeight = Math.max(0.05, 1 - ageMin / 90); // linear decay over 90 min
      weightedSum += LEVEL_WEIGHT[r.level] * recencyWeight;
      weightTotal += recencyWeight;
    }
    const avg = weightedSum / weightTotal;
    const level: CrowdLevel = avg < 1.5 ? 'low' : avg < 2.5 ? 'moderate' : 'high';
    const lastReportMinutesAgo = Math.round((now - rows[0].reportedAt) / 60000);

    return {
      busNumber,
      level,
      lastReportMinutesAgo,
      reportCount: rows.length,
      basis: 'Based on recent user reports.',
    };
  }
}
