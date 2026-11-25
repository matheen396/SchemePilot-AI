# API examples

Base URL: `http://localhost:4000`. All bodies are JSON. Invalid inputs return `400`; protected routes return `401` without a bearer token.

## Search

```http
POST /api/search
Content-Type: application/json

{"query":"education help for a student","state":"Karnataka","category":"Education","limit":8,"profile":{"age":21}}
```

The response contains ranked records, similarity values, measured request latency, and a demo-data notice when applicable.

## Register and save a profile

```http
POST /api/auth/register
Content-Type: application/json

{"email":"demo@example.com","password":"use-a-unique-demo-password"}
```

Use the returned token as `Authorization: Bearer <token>` for `PUT /api/me/profile` with body `{"state":"Karnataka","age":21,"annualIncome":240000,"employment":"student"}`.

## Stream a grounded answer

```http
POST /api/chat
Content-Type: application/json

{"question":"What should I verify before applying?","state":"Karnataka"}
```

The response streams Server-Sent Events: first `citations`, then `token` events, and finally `done`. With no LLM key, it emits an extractive answer from retrieved records.
