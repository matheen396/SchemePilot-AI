import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const savedRouter = Router();
savedRouter.use(requireAuth);
savedRouter.get('/', async (req, res) => {
  const { rows } = await pool.query(`SELECT p.id,p.title,p.summary,p.category,p.source_url,p.demo_only,s.created_at AS "savedAt"
    FROM saved_programs s JOIN programs p ON p.id=s.program_id WHERE s.user_id=$1 ORDER BY s.created_at DESC`, [req.userId]);
  return res.json({ saved: rows });
});
savedRouter.post('/', async (req, res) => {
  const { programId } = z.object({ programId: z.string().uuid() }).parse(req.body);
  const { rowCount } = await pool.query('INSERT INTO saved_programs(user_id,program_id) SELECT $1,id FROM programs WHERE id=$2 ON CONFLICT(user_id,program_id) DO UPDATE SET created_at=saved_programs.created_at', [req.userId, programId]);
  if (!rowCount) return res.status(404).json({ error: 'Program not found.' });
  return res.status(201).json({ saved: true });
});
savedRouter.delete('/:programId', async (req, res) => {
  const { programId } = z.object({ programId: z.string().uuid() }).parse(req.params);
  await pool.query('DELETE FROM saved_programs WHERE user_id=$1 AND program_id=$2', [req.userId, programId]);
  return res.status(204).end();
});
