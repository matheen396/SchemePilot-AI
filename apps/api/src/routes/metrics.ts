import { Router } from 'express';
import { pool } from '../db/pool.js';
import { percentile } from '../domain/search.js';

export const metricsRouter = Router();
metricsRouter.get('/search', async (_req, res) => {
  const { rows } = await pool.query(`SELECT duration_ms FROM search_events WHERE created_at > now() - interval '7 days' ORDER BY created_at DESC LIMIT 5000`);
  const durations = rows.map((r) => Number(r.duration_ms));
  return res.json({ window: '7d', sampleSize: durations.length, p50Ms: percentile(durations, 0.50), p95Ms: percentile(durations, 0.95), measured: true });
});
