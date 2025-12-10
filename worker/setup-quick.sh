#!/bin/bash
# IntegrityGate - Quick Setup (non-interactive)
# Usage: ./setup-quick.sh <APP_ID> <WEBHOOK_SECRET> <PRIVATE_KEY_PATH> <STRIPE_KEY>

set -e

APP_ID=$1
WEBHOOK_SECRET=$2
PRIVATE_KEY_PATH=$3
STRIPE_KEY=$4

if [ -z "$APP_ID" ] || [ -z "$WEBHOOK_SECRET" ] || [ -z "$PRIVATE_KEY_PATH" ] || [ -z "$STRIPE_KEY" ]; then
    echo "Usage: ./setup-quick.sh <APP_ID> <WEBHOOK_SECRET> <PRIVATE_KEY_PATH> <STRIPE_KEY>"
    echo ""
    echo "Example:"
    echo "  ./setup-quick.sh 123456 'webhook-secret-here' ./my-app.pem sk_live_xxx"
    exit 1
fi

echo "Installing dependencies..."
npm install

echo "Creating D1 database..."
DB_ID=$(wrangler d1 create integrity-gate 2>&1 | grep "database_id" | awk -F'"' '{print $2}' || wrangler d1 list | grep integrity-gate | awk '{print $1}')
sed -i "s/YOUR_D1_DATABASE_ID/$DB_ID/g" wrangler.toml 2>/dev/null || sed -i '' "s/YOUR_D1_DATABASE_ID/$DB_ID/g" wrangler.toml

echo "Running migrations..."
wrangler d1 execute integrity-gate --file=./src/db/schema.sql --remote

echo "Setting secrets..."
echo "$APP_ID" | wrangler secret put GITHUB_APP_ID
echo "$WEBHOOK_SECRET" | wrangler secret put GITHUB_WEBHOOK_SECRET
cat "$PRIVATE_KEY_PATH" | wrangler secret put GITHUB_PRIVATE_KEY
echo "$STRIPE_KEY" | wrangler secret put STRIPE_SECRET_KEY

echo "Deploying..."
wrangler deploy

echo ""
echo "Done! Update your GitHub App webhook URL to point to your worker."
