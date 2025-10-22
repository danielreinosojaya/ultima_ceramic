#!/usr/bin/env bash
# Usage:
# APP_URL=http://localhost:5173 ADMIN_USER=admin@example.com ./scripts/test_approve_giftcard.sh
set -euo pipefail
APP_URL=${APP_URL:-http://localhost:5173}
ADMIN_USER=${ADMIN_USER:-admin@example.com}
RECIPIENT_EMAIL=${RECIPIENT_EMAIL:-danielreinosojaya@gmail.com}
BUYER_EMAIL=${BUYER_EMAIL:-danielreinosojaya@gmail.com}

echo "Using APP_URL=$APP_URL"

# 1) Create a giftcard request
CODE="TEST-$(head /dev/urandom | tr -dc A-Z0-9 | head -c6)"
CREATE_PAYLOAD=$(jq -n --arg buyerName "Daniel" --arg buyerEmail "$BUYER_EMAIL" --arg recipientName "Daniel" --arg recipientEmail "$RECIPIENT_EMAIL" --arg amount "50" --arg code "$CODE" '{buyerName:$buyerName,buyerEmail:$buyerEmail,recipientName:$recipientName,recipientEmail:$recipientEmail,amount:($amount|tonumber),code:$code}')

echo "Creating giftcard request with code $CODE"
CREATE_RES=$(curl -s -X POST "$APP_URL/api/data?action=addGiftcardRequest" -H "Content-Type: application/json" -d "$CREATE_PAYLOAD")
echo "Create response: $CREATE_RES"

REQUEST_ID=$(echo "$CREATE_RES" | jq -r '.id')
if [ -z "$REQUEST_ID" ] || [ "$REQUEST_ID" = "null" ]; then
  echo "Failed to create giftcard request; aborting"
  exit 1
fi

# 2) Approve the giftcard request
APPROVE_PAYLOAD=$(jq -n --arg id "$REQUEST_ID" --arg note "Automated test approval" '{id:($id|tonumber), note:$note}')

echo "Approving giftcard request id=$REQUEST_ID"
APPROVE_RES=$(curl -s -X POST "$APP_URL/api/data?action=approveGiftcardRequest" -H "Content-Type: application/json" -H "x-admin-user: $ADMIN_USER" -d "$APPROVE_PAYLOAD")

echo "Approve response: $APPROVE_RES"

# Print summary
echo "\nSummary:\n  requestId=$REQUEST_ID\n  createResponse=$CREATE_RES\n  approveResponse=$APPROVE_RES\n"

# If jq is available, pretty print key fields
if command -v jq >/dev/null 2>&1; then
  echo "Parsed approve response:"
  echo "$APPROVE_RES" | jq '.'
fi

exit 0
