#!/usr/bin/env bash
set -euo pipefail

# Interactive helper to inspect giftcard_holds constraints and optionally run the concurrency test.
# IMPORTANT: you run this locally. Secrets (DATABASE_URL, CODE) are NOT sent anywhere.

echo "=== Giftcard inspection helper ==="

# Prompt for DATABASE_URL (hidden input optional)
read -p "Enter DATABASE_URL (postgres://user:pass@host:port/dbname): " DATABASE_URL_INPUT
if [ -z "$DATABASE_URL_INPUT" ]; then
  echo "No DATABASE_URL provided. Exiting." >&2
  exit 1
fi
export DATABASE_URL="$DATABASE_URL_INPUT"

echo
echo "-> Running constraints inspection for table giftcard_holds..."
psql "$DATABASE_URL" -c "SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'giftcard_holds'::regclass;" || echo "(psql returned non-zero exit code)"

echo
read -p "Do you want to run the concurrency test now? (y/N): " RUN_CONC
if [[ "$RUN_CONC" =~ ^[Yy] ]]; then
  read -p "Enter BASE_URL (e.g. https://staging.example.com): " BASE_URL_INPUT
  if [ -z "$BASE_URL_INPUT" ]; then
    echo "No BASE_URL provided. Skipping concurrency test." 
  else
    read -p "Enter CODE (giftcard code, e.g. GC-ABC123): " CODE_INPUT
    if [ -z "$CODE_INPUT" ]; then
      echo "No CODE provided. Skipping concurrency test."
    else
      read -p "Enter CONCURRENCY (default 20): " CONCURRENCY_INPUT
      CONCURRENCY_INPUT=${CONCURRENCY_INPUT:-20}
      read -p "Enter REQUESTS (default 200): " REQUESTS_INPUT
      REQUESTS_INPUT=${REQUESTS_INPUT:-200}
      # Optionally ask for CLEANUP_SECRET but not required for basic create-hold
      read -p "Enter CLEANUP_SECRET (optional, press Enter to skip): " CLEANUP_SECRET_INPUT

      echo
      echo "-> Running concurrency test: target ${BASE_URL_INPUT}/api/giftcards/create-hold (concurrency=${CONCURRENCY_INPUT}, requests=${REQUESTS_INPUT})"
      echo "This will make HTTP requests from your machine. Monitor network/CPU." 

      # Export envs for the script and run it
      export BASE_URL="$BASE_URL_INPUT"
      export CODE="$CODE_INPUT"
      export CONCURRENCY="$CONCURRENCY_INPUT"
      export REQUESTS="$REQUESTS_INPUT"
      if [ -n "$CLEANUP_SECRET_INPUT" ]; then
        export CLEANUP_SECRET="$CLEANUP_SECRET_INPUT"
      fi

      node scripts/test-giftcard-concurrency.cjs || echo "(concurrency script returned non-zero exit code)"
    fi
  fi
fi

echo
echo "=== Done. If you want me to analyze the outputs, paste them here or say 'I ran it' and attach the output. ==="
