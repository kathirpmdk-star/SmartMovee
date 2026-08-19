import { Router } from 'express';
import { CrowdService, type CrowdReportInput } from '../services/crowd/CrowdService.js';

export const crowdRouter = Router();

crowdRouter.get('/crowd/:busNumber', (req, res) => {
  res.json(CrowdService.summary(req.params.busNumber));
});

crowdRouter.post('/crowd', (req, res) => {
  const input = req.body as CrowdReportInput;
  if (!input.busNumber || !input.level) return res.status(400).json({ error: 'busNumber and level are required' });
  res.status(201).json(CrowdService.report(input));
});
