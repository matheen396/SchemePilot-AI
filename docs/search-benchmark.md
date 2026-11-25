# Search evaluation plan

The included demo records are synthetic and too small for performance or quality claims.

1. Create 30-100 human-reviewed queries with relevant program IDs; version the dataset.
2. Record embedding model revision, database/pgvector versions, row count, hardware and index settings.
3. Compare vector-only, PostgreSQL lexical-only and hybrid search at k=5 and k=10. Calculate recall@k, MRR@k and nDCG@k.
4. Tune the semantic/lexical weights and HNSW `ef_search` against a held-out query set; inspect eligibility errors manually.
5. Warm the embedding model, separate model-load from steady-state latency, then measure at least 100 queries at concurrency 1 and controlled higher concurrency.
6. Report p50/p95, throughput, error rate, dataset size and hardware. The API's seven-day search metrics are observations, not a load-test result.
