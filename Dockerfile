# Production image (Azure Container Apps). Built and pushed to ghcr.io by
# .github/workflows/deploy-azure.yml. Secrets are set on the container app, never here:
#   DATABASE_URL           Neon pooled URL (app traffic)
#   DATABASE_URL_UNPOOLED  Neon direct URL (prisma migrate deploy at start)
#   SESSION_SECRET         admin session signing key
FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

USER node
WORKDIR /home/node/app

ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1 \
    MODEL_DIR=/home/node/app/models \
    MODEL_CACHE_DIR=/tmp/model-cache \
    SOURCE_FILES_DIR=/home/node/app/source-files \
    UPLOAD_DIR=/tmp/uploads \
    IMPORT_WORKER_MODE=external \
    EMBEDDING_THREADS=1 \
    RATE_LIMIT_STORE=memory

# prisma generate (postinstall) and next build only need a well-formed URL, not a database
ARG BUILD_DATABASE_URL=postgresql://build:build@127.0.0.1:1/build

COPY --chown=node package.json package-lock.json prisma.config.ts ./
COPY --chown=node prisma ./prisma
# dev dependencies are needed for the build and for `prisma migrate deploy` at start
RUN DATABASE_URL=$BUILD_DATABASE_URL npm ci --include=dev

COPY --chown=node . .
RUN sh scripts/download-model.sh
RUN DATABASE_URL=$BUILD_DATABASE_URL npm run build

EXPOSE 3000
# apply pending migrations over the direct URL (no-op when up to date), then serve
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -H 0.0.0.0 -p $PORT"]
