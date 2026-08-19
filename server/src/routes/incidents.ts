import { Router } from 'express';
import { IncidentService, type Severity } from '../services/safety/IncidentService.js';

export const incidentsRouter = Router();

incidentsRouter.get('/incidents', (req, res) => {
  const hours = Number(req.query.hours ?? 24);
  res.json(IncidentService.recent(hours));
});

incidentsRouter.post('/incidents', (req, res) => {
  const { lat, lon, severity, note } = req.body as { lat: number; lon: number; severity: Severity; note?: string };
  if (typeof lat !== 'number' || typeof lon !== 'number' || !severity) {
    return res.status(400).json({ error: 'lat, lon, severity are required' });
  }
  const report = IncidentService.report(lat, lon, severity, note);
  res.status(201).json(report);
});
