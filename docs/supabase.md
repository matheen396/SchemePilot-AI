# Supabase Postgres setup

1. Create a project and enable the `vector` extension.
2. Copy its database connection URI from **Connect** to server-side `DATABASE_URL`. Use the pooler for serverless; App Runner can use direct connections within project limits. Set `DB_SSL=true` when required by the selected endpoint.
3. Run `npm run db:migrate`. The schema uses 384-dimensional vectors, an HNSW cosine index, GIN full-text index and B-tree filter indexes.
4. Seed only a development database. The sample records are synthetic.

The starter implements its own demo users/JWT; it does not claim Supabase Auth integration. RLS policies do not replace Express authorization, especially when connecting with a privileged database role. For production, integrate Supabase Auth or use a least-privilege DB role and rigorously test any transaction-scoped RLS policies. Never expose a service-role key in the browser.
