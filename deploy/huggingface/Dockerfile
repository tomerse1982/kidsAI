# Image for the private Hugging Face Docker Space.
# .github/workflows/deploy-huggingface.yml copies it to the root of the Space with the code.
# Secrets are set in the Space settings, never here: DATABASE_URL (Neon pooled URL, used by the app),
# DATABASE_URL_UNPOOLED (Neon direct URL, used by prisma migrate at start), SESSION_SECRET.
FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Spaces run the container as uid 1000: the "node" user of this image
USER node
WORKDIR /home/node/app

ENV NODE_ENV=production \
    PORT=7860 \
    NEXT_TELEMETRY_DISABLED=1 \
    MODEL_DIR=/home/node/app/models \
    MODEL_CACHE_DIR=/tmp/model-cache \
    SOURCE_FILES_DIR=/home/node/app/source-files \
    UPLOAD_DIR=/tmp/uploads \
    IMPORT_WORKER_MODE=external \
    EMBEDDING_THREADS=2 \
    RATE_LIMIT_STORE=memory \
    ALLOWED_FRAME_ANCESTORS=https://huggingface.co

# prisma generate (postinstall) and next build only need a well-formed URL, not a database
ARG BUILD_DATABASE_URL=postgresql://build:build@127.0.0.1:1/build

COPY --chown=node package.json package-lock.json prisma.config.ts ./
COPY --chown=node prisma ./prisma
# dev dependencies are needed for the build and for `prisma migrate deploy` at start
RUN DATABASE_URL=$BUILD_DATABASE_URL npm ci --include=dev

COPY --chown=node . .
RUN sh scripts/download-model.sh
RUN DATABASE_URL=$BUILD_DATABASE_URL npm run build

EXPOSE 7860
# apply pending migrations (no-op when up to date), then serve
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -H 0.0.0.0 -p $PORT"]
