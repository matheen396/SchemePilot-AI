import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { embedText } from '../services/embeddings.js';
import { eligibleForProfile, type SearchFilter, type SearchRecord } from '../domain/search.js';

export const searchRouter = Router();
const searchSchema = z.object({
  query: z.string().trim().min(2).max(500),
  state: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  limit: z.number().int().min(1).max(20).default(8),
  profile: z.object({ age: z.number().int().min(0).max(120).optional(), annualIncome: z.number().min(0).optional(), employment: z.string().max(40).optional() }).optional(),
});

searchRouter.post('/', async (req, res) => {
  const started = performance.now();
  const input = searchSchema.parse(req.body);
  const vector = await embedText(input.query);
  const vectorLiteral = `[${vector.join(',')}]`;
  const { rows } = await pool.query(
    `WITH candidates AS MATERIALIZED (
       SELECT id FROM programs
       WHERE embedding IS NOT NULL
         AND ($3::text IS NULL OR state='ALL' OR lower(state)=lower($3))
         AND ($4::text IS NULL OR lower(category)=lower($4))
       ORDER BY embedding <=> $1::vector LIMIT LEAST($5::int * 5, 100)
     )
     SELECT p.id,p.title,p.summary,p.benefits,p.eligibility,p.state,p.category,p.source_url,p.reviewed_at,p.demo_only,
       1 - (p.embedding <=> $1::vector) AS similarity,
       ts_rank_cd(p.content_tsv,websearch_to_tsquery('english',$2)) AS lexical_rank
     FROM programs p JOIN candidates c ON c.id=p.id
     ORDER BY (0.8*(1-(p.embedding <=> $1::vector)) +
       0.2*(ts_rank_cd(p.content_tsv,websearch_to_tsquery('english',$2)) /
       (1+ts_rank_cd(p.content_tsv,websearch_to_tsquery('english',$2))))) DESC
     LIMIT $5`,
    [vectorLiteral, input.query, input.state ?? null, input.category ?? null, Math.min(input.limit * 3, 60)],
  );
  const filters: SearchFilter = { profile: input.profile };
  const eligible = (rows as SearchRecord[]).filter((row) => eligibleForProfile(row, filters.profile)).slice(0, input.limit);
  const durationMs = Math.round(performance.now() - started);
  await pool.query('INSERT INTO search_events(query_length,result_count,duration_ms) VALUES($1,$2,$3)', [input.query.length, eligible.length, durationMs]);
  return res.json({ query: input.query, results: eligible, durationMs, notice: eligible.some((r) => r.demo_only) ? 'Illustrative demo data: verify eligibility and requirements at the official source.' : undefined });
});
