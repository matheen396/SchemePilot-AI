FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/api/ apps/api/
COPY db/ db/
RUN npm run build -w @schemepilot/api

FROM node:20-bookworm-slim
ENV NODE_ENV=production PORT=4000
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev --workspace @schemepilot/api --include-workspace-root=false
COPY --from=build /app/apps/api/dist apps/api/dist
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
