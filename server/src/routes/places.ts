import { Router } from 'express';
import { suggestPlaces } from '../services/geocode.js';

export const placesRouter = Router();

placesRouter.get('/places', async (req, res) => {
  const q = String(req.query.q ?? '');
  try {
    const results = await suggestPlaces(q);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Place suggestion failed' });
  }
});
