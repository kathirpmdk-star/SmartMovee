import Database from 'better-sqlite3';
import path from 'node:path';

export const db = new Database(path.resolve(import.meta.dirname, '../../smartmove.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  severity TEXT NOT NULL, -- minor | moderate | severe
  note TEXT,
  reported_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS crowd_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bus_number TEXT NOT NULL,
  level TEXT NOT NULL, -- low | moderate | high
  approx_people INTEGER,
  seat_availability TEXT, -- seats_available | standing_only | full
  lat REAL,
  lon REAL,
  reported_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS gtfs_stops (
  stop_id TEXT PRIMARY KEY,
  stop_name TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS gtfs_routes (
  route_id TEXT PRIMARY KEY,
  route_short_name TEXT,
  route_long_name TEXT
);

CREATE TABLE IF NOT EXISTS gtfs_trips (
  trip_id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL,
  trip_headsign TEXT
);

CREATE TABLE IF NOT EXISTS gtfs_stop_times (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id TEXT NOT NULL,
  stop_id TEXT NOT NULL,
  stop_sequence INTEGER NOT NULL,
  arrival_time TEXT,
  departure_time TEXT,
  fare INTEGER
);

CREATE TABLE IF NOT EXISTS gtfs_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);
