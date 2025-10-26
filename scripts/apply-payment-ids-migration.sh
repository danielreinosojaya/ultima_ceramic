#!/bin/bash
# Script to apply payment IDs migration to production database
# Usage: ./apply-payment-ids-migration.sh

set -e  # Exit on error

echo "🔧 Payment IDs Migration Script"
echo "================================"
echo ""

# Check if POSTGRES_URL is set
if [ -z "$POSTGRES_URL" ]; then
    echo "❌ Error: POSTGRES_URL environment variable is not set"
    echo "Please set it with: export POSTGRES_URL='your_connection_string'"
    exit 1
fi

echo "📊 Database connection: ${POSTGRES_URL%%@*}@***"
echo ""

# Prompt for confirmation
read -p "⚠️  This will add unique IDs to all payment records. Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "📝 Running migration..."
echo ""

# Execute the migration SQL file
psql "$POSTGRES_URL" -f migrations/20251026_add_payment_ids.sql

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Verify payments have IDs with: SELECT id, jsonb_pretty(payment_details) FROM bookings WHERE payment_details IS NOT NULL LIMIT 5;"
echo "2. Deploy the updated application code"
echo "3. Monitor logs for any 'Payment has no ID' warnings"
echo ""
