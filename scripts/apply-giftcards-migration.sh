#!/usr/bin/env bash
set -euo pipefail

# apply-giftcards-migration.sh
# Safe helper to run the migration SQL file that normalizes giftcards schema.
# Usage:
#   export DATABASE_URL="postgresql://user:pass@host:port/dbname?sslmode=require"
#   ./scripts/apply-giftcards-migration.sh
# The script will:
#  - check the DATABASE_URL env var
#  - run pre-checks (count NULLs)
#  - ask for confirmation
#  - run the migration SQL file
#  - run post-checks
#  - print verification SELECT results

MIGRATION_FILE="migrations/20251024_normalize_giftcards_schema.sql"
ROLLBACK_FILE="migrations/20251024_normalize_giftcards_schema_rollback.sql"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set."
  echo "Set it with: export DATABASE_URL=\"postgresql://user:pass@host:port/dbname?sslmode=require\""
  exit 2
fi

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "ERROR: Migration file not found at $MIGRATION_FILE"
  exit 3
fi

echo "About to run giftcards normalization migration"
echo "Migration file: $MIGRATION_FILE"

echo "PLEASE ensure you have a DB snapshot / backup BEFORE proceeding."
read -p "Do you have a snapshot and want to continue? (yes/no) " answer
if [ "$answer" != "yes" ]; then
  echo "Aborting. Create a snapshot and re-run when ready.";
  exit 0
fi

echo "Running pre-checks..."
psql "$DATABASE_URL" -c "SELECT count(*) AS null_value_count FROM giftcards WHERE value IS NULL;"
psql "$DATABASE_URL" -c "SELECT count(*) AS null_balance_count FROM giftcards WHERE balance IS NULL;"
psql "$DATABASE_URL" -c "SELECT id, code, value, balance, initial_value FROM giftcards WHERE value IS NULL OR balance IS NULL LIMIT 10;"

read -p "Proceed to apply migration file? This will UPDATE rows and ALTER DEFAULTS. (yes/no) " confirm
if [ "$confirm" != "yes" ]; then
  echo "Migration cancelled by user.";
  exit 0
fi

echo "Applying migration..."
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

echo "Running post-checks..."
psql "$DATABASE_URL" -c "SELECT count(*) AS null_value_count_after FROM giftcards WHERE value IS NULL;"
psql "$DATABASE_URL" -c "SELECT count(*) AS null_balance_count_after FROM giftcards WHERE balance IS NULL;"
psql "$DATABASE_URL" -c "SELECT id, code, value, balance, initial_value, metadata FROM giftcards ORDER BY id DESC LIMIT 20;"

cat <<EOF

Migration finished.
If you need to rollback the DEFAULT/NOT NULL changes run:
  psql "$DATABASE_URL" -f "$ROLLBACK_FILE"

If you need full data restore, restore from the snapshot you took before running this script.
EOF
