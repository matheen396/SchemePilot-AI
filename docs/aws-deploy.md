# AWS hosting quick path

This configuration is ready for deployment but has **not** been deployed. Fastest project path: Supabase Postgres for managed pgvector, an App Runner API service from the API Docker image, and an App Runner web service from the Next.js Docker image. You need AWS/Supabase accounts, secrets and a domain before there can be a live link.

## Prepare the database

Create a Supabase project, enable `vector`, apply migrations, and replace demo records with current human-reviewed official data before inviting applicants. Keep `DATABASE_URL`, `JWT_SECRET` (random 32+ characters), optional `LLM_API_KEY`, and other secrets server-side.

## Publish images to ECR

In an AWS-authenticated Docker terminal (replace the capitalized values):

```bash
aws ecr get-login-password --region REGION | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com
docker build -f apps/api/Dockerfile -t schemepilot-api .
docker tag schemepilot-api:latest ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/schemepilot-api:latest
docker push ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/schemepilot-api:latest
docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://API-URL -t schemepilot-web .
docker tag schemepilot-web:latest ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/schemepilot-web:latest
docker push ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/schemepilot-web:latest
```

Create private ECR repos `schemepilot-api` and `schemepilot-web` first. In AWS Console, create two App Runner services from those ECR images: API port `4000`, web port `3000`. Set API health check `/api/health`; add an ECR access role, CPU/memory suitable for the embedding model, and API secrets through the service/Secrets Manager configuration. Set API `WEB_ORIGIN` to the web HTTPS origin. Rebuild the web image after you know the API HTTPS URL because `NEXT_PUBLIC_API_URL` is baked in at build time.

Configure a custom HTTPS domain, logs/alarms, scale limits and database backups. Measure model cold-start, memory, p50/p95 and HNSW recall on your deployed data before stating performance. For larger use, serve embeddings from a dedicated model service and keep API instances stateless.
