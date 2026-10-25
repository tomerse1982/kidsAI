#!/usr/bin/env sh
# Copies the local database (schema + content) into an EMPTY cloud database (Neon).
# Personal data stays local: conversations, messages, bookmarks, audit log and rate-limit
# counters are copied as empty tables.
#
#   The cloud URL is DATABASE_URL_UNPOOLED from .env.neon (written by `neon env pull --file .env.neon`,
#   gitignored); dumps and restores need the direct, not the pooled, connection. Local: DATABASE_URL from .env.
#   PG_BIN: folder with pg_dump / pg_restore (major version >= the local server).
#   Usage: sh scripts/copy-db-to-cloud.sh
set -eu

[ -f .env ] && . ./.env
: "${DATABASE_URL:?DATABASE_URL missing (.env)}"
# read only the direct URL, so the local DATABASE_URL is not overridden
CLOUD_DATABASE_URL="$(sed -n "s/^DATABASE_URL_UNPOOLED=//p" .env.neon 2>/dev/null | tr -d "\"'\r")"
: "${CLOUD_DATABASE_URL:?DATABASE_URL_UNPOOLED missing (.env.neon: run neon env pull --file .env.neon)}"
BIN="${PG_BIN:+$PG_BIN/}"
LOCAL="${DATABASE_URL%%\?*}"  # pg tools do not understand Prisma's ?schema=public

# options before -d / -c: the Windows build of psql misreads a URL given as the first argument
if [ "$("${BIN}psql" -A -t -d "$CLOUD_DATABASE_URL" -c "select count(*) from pg_tables where schemaname='public'")" != "0" ]; then
  echo "The cloud database is not empty; refusing to overwrite it." >&2
  exit 1
fi

DUMP="$(mktemp)"
trap 'rm -f "$DUMP"' EXIT
"${BIN}pg_dump" -d "$LOCAL" -Fc --no-owner --no-acl \
  --exclude-table-data=conversations --exclude-table-data=messages --exclude-table-data=bookmarks \
  --exclude-table-data=admin_audit_log --exclude-table-data=rate_limit_counters \
  -f "$DUMP"
"${BIN}pg_restore" --no-owner --no-acl --exit-on-error -d "$CLOUD_DATABASE_URL" "$DUMP"

echo "Copied. Rows in the cloud database:"
"${BIN}psql" -A -t -d "$CLOUD_DATABASE_URL" -c "select 'milestones', count(*) from milestones union all select 'videos', count(*) from videos union all select 'knowledge_chunks', count(*) from knowledge_chunks union all select 'conversations', count(*) from conversations"
