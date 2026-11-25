import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { embedText } from '../services/embeddings.js';

export const chatRouter = Router();
const schema = z.object({ question: z.string().trim().min(5).max(1000), state: z.string().max(80).optional() });

chatRouter.post('/', async (req, res) => {
  const input = schema.parse(req.body);
  const vector = await embedText(input.question);
  const { rows } = await pool.query(
    `SELECT id,title,summary,benefits,eligibility,state,category,source_url,demo_only,
       1-(embedding <=> $1::vector) AS similarity
     FROM programs WHERE embedding IS NOT NULL AND ($2::text IS NULL OR state='ALL' OR lower(state)=lower($2))
     ORDER BY embedding <=> $1::vector LIMIT 5`, [`[${vector.join(',')}]`, input.state ?? null],
  );
  const sources = rows.map((r, i) => ({ index: i + 1, id: r.id, title: r.title, url: r.source_url, demoOnly: r.demo_only }));
  const evidence = rows.map((r, i) => `[${i + 1}] ${r.title}\nSummary: ${r.summary}\nBenefits: ${r.benefits}\nEligibility: ${JSON.stringify(r.eligibility)}\nState: ${r.state}\nOfficial source: ${r.source_url}\nDemo record: ${r.demo_only}`).join('\n\n');
  res.set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write(`event: citations\ndata: ${JSON.stringify(sources)}\n\n`);

  if (!config.LLM_API_KEY) {
    const fallback = rows.length
      ? `Based only on the retrieved records, these programs may be relevant:\n\n${rows.map((r, i) => `${i + 1}. ${r.title}: ${r.summary} Source: ${r.source_url}`).join('\n\n')}\n\nThese are illustrative demo records; check the official source for current rules. This extractive response is not a generated eligibility decision.`
      : 'No matching program records were found. Try broader terms or another category.';
    for (const piece of fallback.match(/.{1,100}(?:\s|$)/gs) ?? [fallback]) res.write(`event: token\ndata: ${JSON.stringify(piece)}\n\n`);
    res.write('event: done\ndata: {}\n\n'); return res.end();
  }

  try {
    const base = config.LLM_BASE_URL.replace(/\/$/, '');
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST', headers: { Authorization: `Bearer ${config.LLM_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({ model: config.LLM_MODEL, stream: true, temperature: 0.15,
        messages: [
          { role: 'system', content: 'Answer using only the supplied program records. State clearly when the records do not answer the question. Do not invent rules, benefit amounts, deadlines, or eligibility. Cite claims with source numbers such as [1]. The records may be illustrative, so clearly tell the user to verify current rules at official sources.' },
          { role: 'user', content: `Question: ${input.question}\n\nRetrieved records:\n${evidence || '(No records retrieved)'}` },
        ],
      }),
    });
    if (!response.ok || !response.body) throw new Error(`LLM provider returned ${response.status}`);
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let pending = '';
    while (true) {
      const { done, value } = await reader.read(); if (done) break; pending += decoder.decode(value, { stream: true });
      const lines = pending.split('\n'); pending = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6); if (data === '[DONE]') continue;
        try { const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> }; const token = parsed.choices?.[0]?.delta?.content; if (token) res.write(`event: token\ndata: ${JSON.stringify(token)}\n\n`); } catch { /* Ignore incomplete provider frames. */ }
      }
    }
    res.write('event: done\ndata: {}\n\n'); return res.end();
  } catch (error) {
    res.write(`event: error\ndata: ${JSON.stringify(error instanceof Error ? error.message : 'Assistant unavailable')}\n\n`);
    return res.end();
  }
});
