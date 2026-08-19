import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { env } from './env.js';
import './db.js';
import { seedDemoGtfs } from './services/publicTransport/demoSeed.js';
import { planRouter } from './routes/plan.js';
import { incidentsRouter } from './routes/incidents.js';
import { crowdRouter } from './routes/crowd.js';
import { reverseGeocodeRouter } from './routes/reverseGeocode.js';
import { placesRouter } from './routes/places.js';

seedDemoGtfs();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    tomtomConfigured: !!env.TOMTOM_API_KEY,
    groqConfigured: !!env.GROQ_API_KEY,
  });
});

app.use('/api', planRouter);
app.use('/api', incidentsRouter);
app.use('/api', crowdRouter);
app.use('/api', reverseGeocodeRouter);
app.use('/api', placesRouter);

// In production (single-service deployment), serve the built React app from the
// same server so the frontend and API share one origin -- no CORS/env-var wiring
// needed between separate hosts. No-op locally, where the Vite dev server proxies
// /api instead.
const clientDist = path.resolve(import.meta.dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(env.PORT, () => {
  console.log(`SmartMove API listening on http://localhost:${env.PORT}`);
});
