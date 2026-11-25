import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

declare global {
  namespace Express { interface Request { userId?: string } }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in to access this resource.' });
  try {
    const payload = jwt.verify(token, config.JWT_SECRET, { issuer: 'schemepilot' });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') throw new Error('Invalid token subject');
    req.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ error: 'Session expired. Sign in again.' });
  }
}
