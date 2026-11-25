import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  LLM_API_KEY: z.string().optional().default(''),
  LLM_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
  LLM_MODEL: z.string().default('llama-3.3-70b-versatile'),
});

export const config = schema.parse(process.env);
