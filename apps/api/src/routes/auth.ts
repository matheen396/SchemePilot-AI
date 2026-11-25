import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { config } from '../config.js';

export const authRouter = Router();
const credentials = z.object({ email: z.string().email().max(254).transform((v) => v.toLowerCase()), password: z.string().min(10).max(128) });

authRouter.post('/register', async (req, res) => {
  const { email, password } = credentials.parse(req.body);
  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query('INSERT INTO users(email,password_hash) VALUES($1,$2) ON CONFLICT(email) DO NOTHING RETURNING id,email', [email, hash]);
  if (!result.rowCount) return res.status(409).json({ error: 'An account with this email already exists.' });
  const user = result.rows[0] as { id: string; email: string };
  const token = jwt.sign({}, config.JWT_SECRET, { subject: user.id, expiresIn: '8h', issuer: 'schemepilot' });
  return res.status(201).json({ token, user });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = credentials.parse(req.body);
  const result = await pool.query('SELECT id,email,password_hash FROM users WHERE email=$1', [email]);
  const user = result.rows[0] as { id: string; email: string; password_hash: string } | undefined;
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
  const token = jwt.sign({}, config.JWT_SECRET, { subject: user.id, expiresIn: '8h', issuer: 'schemepilot' });
  return res.json({ token, user: { id: user.id, email: user.email } });
});
