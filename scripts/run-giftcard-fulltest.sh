#!/usr/bin/env bash
set -euo pipefail

echo
echo "=== Giftcard full test helper ==="
echo "This script will run a schema inspection and a concurrency test for a giftcard code on your machine." 
echo "Secrets stay on your machine; you will be prompted interactively."
echo

read -p "Enter DATABASE_URL (postgres://...): " DATABASE_URL
read -p "Enter BASE_URL (e.g. https://staging.example.com): " BASE_URL
read -p "Enter GIFT_CODE (e.g. GC-XXXXXX): " GIFT_CODE

read -p "TEST_CONCURRENCY (default 50): " TEST_CONCURRENCY
TEST_CONCURRENCY=${TEST_CONCURRENCY:-50}
read -p "TEST_ROUNDS (default 100): " TEST_ROUNDS
TEST_ROUNDS=${TEST_ROUNDS:-100}

export DATABASE_URL BASE_URL GIFT_CODE TEST_CONCURRENCY TEST_ROUNDS

echo
echo "Using: BASE_URL=$BASE_URL, GIFT_CODE=$GIFT_CODE, TEST_CONCURRENCY=$TEST_CONCURRENCY, TEST_ROUNDS=$TEST_ROUNDS"
echo

echo "1) Running schema inspection (will query pg constraints and produce a short sample)."
echo "(No further prompts — if psql is not available we'll try the bundled helper with the provided DATABASE_URL.)"
if command -v psql >/dev/null 2>&1; then
  echo "Checking giftcard_holds constraints..."
  export PGSSLMODE=${PGSSLMODE:-prefer}
  # Let psql parse connection string directly
  psql "$DATABASE_URL" -c "SELECT conname, pg_get_constraintdef(c.oid) as def FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'giftcard_holds';" || true

  echo
  echo "Checking column types for giftcards.id and giftcard_holds.giftcard_id..."
  psql "$DATABASE_URL" -c "SELECT column_name, udt_name FROM information_schema.columns WHERE table_name='giftcards' AND column_name='id';" || true
  psql "$DATABASE_URL" -c "SELECT column_name, udt_name FROM information_schema.columns WHERE table_name='giftcard_holds' AND column_name='giftcard_id';" || true

  echo
  echo "Fetching sample giftcard row for code $GIFT_CODE (if exists)..."
  psql "$DATABASE_URL" -c "SELECT id, code, balance, initial_value, expires_at FROM giftcards WHERE code = '$GIFT_CODE' LIMIT 1;" || true
  echo
  echo "Active holds summary for this giftcard (sum/count):"
  psql "$DATABASE_URL" -c "SELECT COUNT(*) as active_holds, COALESCE(SUM(amount),0) as total_holds FROM giftcard_holds WHERE giftcard_id IN (SELECT id FROM giftcards WHERE code = '$GIFT_CODE') AND expires_at > NOW();" || true
else
  if [ -x "./scripts/run-giftcard-inspect.sh" ]; then
    echo "psql not found — falling back to bundled inspect helper (non-interactive)."
    # Try to call the helper with the DATABASE_URL as argument (many helpers accept this); if it ignores args, it may still prompt.
    ./scripts/run-giftcard-inspect.sh "$DATABASE_URL" || true
  else
    echo "psql not installed and bundled helper missing — cannot run inspection automatically."
    echo "Please install psql or run ./scripts/run-giftcard-inspect.sh manually." 
  fi
fi

echo
echo "2) Running concurrency test script (best-effort). This will make multiple requests to the API and may create temporary holds."
if [ -f "scripts/test-giftcard-concurrency.cjs" ]; then
  echo "Running: node scripts/test-giftcard-concurrency.cjs"
  # Pass env vars to the script so it can use them (script is expected to read from env or args)
  BASE_URL="$BASE_URL" CODE="$GIFT_CODE" CONCURRENCY="$TEST_CONCURRENCY" ROUNDS="$TEST_ROUNDS" node scripts/test-giftcard-concurrency.cjs || echo "Concurrency script exited with errors (non-zero). Check output above."
else
  echo "scripts/test-giftcard-concurrency.cjs not found. Please ensure the file exists in the scripts/ folder." 
fi

echo
echo "Done. Please copy & paste the output of both steps here so I can analyze results and recommend next steps."
