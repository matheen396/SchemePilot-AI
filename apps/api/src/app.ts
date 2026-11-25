import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { authRouter } from './routes/auth.js';
import { profileRouter } from './routes/profile.js';
import { searchRouter } from './routes/search.js';
import { chatRouter } from './routes/chat.js';
import { savedRouter } from './routes/saved.js';
import { metricsRouter } from './routes/metrics.js';
import { ZodError } from 'zod';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.WEB_ORIGIN, methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '32kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));
app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); return res.json({ status: 'ok', database: 'ok' }); }
  catch { return res.status(503).json({ status: 'unavailable', database: 'unavailable' }); }
});
app.use('/api/auth', authRouter);
app.use('/api/me/profile', profileRouter);
app.use('/api/search', searchRouter);
app.use('/api/chat', chatRouter);
app.use('/api/saved', savedRouter);
app.use('/api/metrics', metricsRouter);
app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) return res.status(400).json({ error: 'Invalid request.', details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
  console.error('API request failed', error);
  return res.status(500).json({ error: 'The request could not be completed.' });
});
