CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state text,
  age integer CHECK (age IS NULL OR age BETWEEN 0 AND 120),
  annual_income numeric(12,2),
  employment text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL,
  benefits text NOT NULL,
  eligibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  state text NOT NULL DEFAULT 'ALL',
  category text NOT NULL,
  source_url text NOT NULL,
  reviewed_at date,
  demo_only boolean NOT NULL DEFAULT true,
  content_tsv tsvector GENERATED ALWAYS AS
    (setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
     setweight(to_tsvector('english', coalesce(summary,'')), 'B') ||
     setweight(to_tsvector('english', coalesce(benefits,'')), 'C')) STORED,
  embedding vector(384),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS programs_embedding_hnsw
  ON programs USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);
CREATE INDEX IF NOT EXISTS programs_content_gin ON programs USING gin (content_tsv);
CREATE INDEX IF NOT EXISTS programs_state_category_idx ON programs (state, category);
CREATE TABLE IF NOT EXISTS saved_programs (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, program_id)
);
CREATE INDEX IF NOT EXISTS saved_programs_program_idx ON saved_programs(program_id);
CREATE TABLE IF NOT EXISTS search_events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  query_length smallint NOT NULL,
  result_count smallint NOT NULL,
  duration_ms integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS search_events_created_idx ON search_events(created_at DESC);
