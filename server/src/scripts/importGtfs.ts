import { importGtfsZip } from '../services/publicTransport/gtfsImport.js';

// Usage: npm run import-gtfs -- /path/to/official-gtfs.zip "CUMTA official export, imported 2026-08-19"
const [zipPath, label] = process.argv.slice(2);

if (!zipPath) {
  console.error('Usage: npm run import-gtfs -- <path-to-gtfs.zip> ["source label"]');
  process.exit(1);
}

const result = importGtfsZip(zipPath, label ?? `Imported from ${zipPath} on ${new Date().toISOString()}`);
console.log('GTFS import complete:', result);
