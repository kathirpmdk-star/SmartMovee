import { Router } from 'express';
import { reverseGeocode } from '../services/geocode.js';

export const reverseGeocodeRouter = Router();

reverseGeocodeRouter.get('/reverse-geocode', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'lat and lon query params are required' });
  }
  try {
    const displayName = await reverseGeocode(lat, lon);
    res.json({ lat, lon, displayName });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Reverse geocode failed' });
  }
});
