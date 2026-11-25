import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const profileRouter = Router();
profileRouter.use(requireAuth);
const profileSchema = z.object({
  state: z.string().trim().max(80).optional().nullable(),
  age: z.number().int().min(0).max(120).optional().nullable(),
  annualIncome: z.number().min(0).max(1_000_000_000).optional().nullable(),
  employment: z.enum(['student','employed','seeking_work','farmer','self_employed','other']).optional().nullable(),
});

profileRouter.get('/', async (req, res) => {
  const result = await pool.query('SELECT state,age,annual_income AS "annualIncome",employment,updated_at AS "updatedAt" FROM profiles WHERE user_id=$1', [req.userId]);
  return res.json({ profile: result.rows[0] ?? null });
});

profileRouter.put('/', async (req, res) => {
  const p = profileSchema.parse(req.body);
  const result = await pool.query(
    `INSERT INTO profiles(user_id,state,age,annual_income,employment,updated_at)
     VALUES($1,$2,$3,$4,$5,now()) ON CONFLICT(user_id) DO UPDATE SET
     state=EXCLUDED.state,age=EXCLUDED.age,annual_income=EXCLUDED.annual_income,
     employment=EXCLUDED.employment,updated_at=now()
     RETURNING state,age,annual_income AS "annualIncome",employment,updated_at AS "updatedAt"`,
    [req.userId, p.state ?? null, p.age ?? null, p.annualIncome ?? null, p.employment ?? null],
  );
  return res.json({ profile: result.rows[0] });
});
