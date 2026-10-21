#!/usr/bin/env sh
# Copies the local database (schema + content) into an EMPTY cloud database (Neon).
# Personal data stays local: conversations, messages, bookmarks, audit log and rate-limit
# counters are copied as empty tables.
#
#   CLOUD_DATABASE_URL is read from .env.deploy (gitignored); DATABASE_URL from .env.
#   PG_BIN: folder with pg_dump / pg_restore (major version >= the local server).
#   Usage: sh scripts/copy-db-to-cloud.sh
set -eu

[ -f .env ] && . ./.env
[ -f .env.deploy ] && . ./.env.deploy
: "${DATABASE_URL:?DATABASE_URL missing (.env)}"
: "${CLOUD_DATABASE_URL:?CLOUD_DATABASE_URL missing (.env.deploy)}"
BIN="${PG_BIN:+$PG_BIN/}"
LOCAL="${DATABASE_URL%%\?*}"  # pg tools do not understand Prisma's ?schema=public

if [ "$("${BIN}psql" "$CLOUD_DATABASE_URL" -Atc "select count(*) from pg_tables where schemaname='public'")" != "0" ]; then
  echo "The cloud database is not empty; refusing to overwrite it." >&2
  exit 1
fi

DUMP="$(mktemp)"
trap 'rm -f "$DUMP"' EXIT
"${BIN}pg_dump" "$LOCAL" -Fc --no-owner --no-acl \
  --exclude-table-data=conversations --exclude-table-data=messages --exclude-table-data=bookmarks \
  --exclude-table-data=admin_audit_log --exclude-table-data=rate_limit_counters \
  -f "$DUMP"
"${BIN}pg_restore" --no-owner --no-acl --exit-on-error -d "$CLOUD_DATABASE_URL" "$DUMP"

echo "Copied. Rows in the cloud database:"
"${BIN}psql" "$CLOUD_DATABASE_URL" -Atc "select 'milestones', count(*) from milestones union all select 'videos', count(*) from videos union all select 'knowledge_chunks', count(*) from knowledge_chunks union all select 'conversations', count(*) from conversations"
