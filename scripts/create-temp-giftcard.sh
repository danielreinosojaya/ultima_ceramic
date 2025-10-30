#!/usr/bin/env bash
# Create a temporary giftcard in the local DB for testing concurrency.
# Usage:
#   DATABASE_URL="postgresql://..." ./scripts/create-temp-giftcard.sh [BALANCE]
# If DATABASE_URL is not set, the script will prompt for it.

#!/usr/bin/env bash
set -euo pipefail

DB="${DATABASE_URL:-}"
if [ -z "$DB" ]; then
  read -rp "Enter DATABASE_URL (postgresql://...): " DB
fi

BALANCE="${1:-200}"


# Generate a compact uppercase code safely (avoid zsh globbing edge-cases)
RANDHEX=$(openssl rand -hex 3 2>/dev/null || head -c6 /dev/urandom | od -An -tx1 | tr -d ' \n')
RANDHEX=$(echo "$RANDHEX" | tr 'a-f' 'A-F')
CODE="GC-TEST-${RANDHEX}"

echo "Creating temporary giftcard: code=${CODE}, balance=${BALANCE}"

# Try to insert with the common production columns first. If that fails, try a minimal insert.
set +e
# Include status='active' to satisfy NOT NULL constraints in common schemas
SQL1="INSERT INTO giftcards (code, balance, initial_value, value, status, expires_at, metadata) VALUES ('${CODE}', ${BALANCE}, ${BALANCE}, ${BALANCE}, 'active', NOW() + INTERVAL '3 months', '{\"test\":true}'::jsonb) RETURNING id, code, balance;"
echo "Running: psql <your db> -c \"${SQL1}\""
psql "$DB" -v ON_ERROR_STOP=1 -q -c "${SQL1}"
RC=$?
if [ $RC -ne 0 ]; then
  echo "Primary insert failed (maybe different schema). Trying minimal insert (code + metadata + status)..."
  SQL2="INSERT INTO giftcards (code, status, metadata) VALUES ('${CODE}', 'active', '{\"test\":true}'::jsonb) RETURNING id, code;"
  echo "Running fallback: psql <your db> -c \"${SQL2}\""
  psql "$DB" -v ON_ERROR_STOP=1 -q -c "${SQL2}"
  RC2=$?
  if [ $RC2 -ne 0 ]; then
    echo "Both insert attempts failed. Showing last psql error output." >&2
    # Re-run primary insert without -q to show error details
    psql "$DB" -v ON_ERROR_STOP=1 -c "${SQL1}" || true
    exit 2
  fi
fi

echo "Temporary giftcard created successfully. Use code: ${CODE}"
echo "Run: bash ./scripts/run-giftcard-fulltest.sh and enter the code when prompted to run the concurrency test against it."

exit 0
