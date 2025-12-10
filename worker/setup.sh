#!/bin/bash
# IntegrityGate GitHub App - Setup Script
# Run this after creating your GitHub App at github.com/settings/apps/new

set -e

echo "═══════════════════════════════════════════════════════"
echo "  IntegrityGate Setup - EpochCore"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check for wrangler
if ! command -v wrangler &> /dev/null; then
    echo "Installing wrangler..."
    npm install -g wrangler
fi

# Install dependencies
echo "[1/6] Installing dependencies..."
npm install

# Create D1 database
echo ""
echo "[2/6] Creating D1 database..."
DB_OUTPUT=$(wrangler d1 create integrity-gate 2>&1 || true)

if echo "$DB_OUTPUT" | grep -q "already exists"; then
    echo "Database 'integrity-gate' already exists"
    DB_ID=$(wrangler d1 list | grep integrity-gate | awk '{print $1}')
else
    DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | awk -F'"' '{print $2}')
fi

if [ -n "$DB_ID" ]; then
    echo "Database ID: $DB_ID"
    # Update wrangler.toml with actual database ID
    sed -i "s/YOUR_D1_DATABASE_ID/$DB_ID/g" wrangler.toml 2>/dev/null || \
    sed -i '' "s/YOUR_D1_DATABASE_ID/$DB_ID/g" wrangler.toml
    echo "Updated wrangler.toml with database ID"
fi

# Run migrations
echo ""
echo "[3/6] Running database migrations..."
wrangler d1 execute integrity-gate --file=./src/db/schema.sql --remote

# Collect secrets
echo ""
echo "[4/6] Configuring secrets..."
echo ""
echo "You'll need these from your GitHub App settings page:"
echo "  - App ID (shown at top of app settings)"
echo "  - Webhook secret (you created this)"
echo "  - Private key (.pem file you downloaded)"
echo ""

read -p "Enter your GitHub App ID: " GITHUB_APP_ID
echo "$GITHUB_APP_ID" | wrangler secret put GITHUB_APP_ID

read -p "Enter your GitHub Webhook Secret: " GITHUB_WEBHOOK_SECRET
echo "$GITHUB_WEBHOOK_SECRET" | wrangler secret put GITHUB_WEBHOOK_SECRET

echo ""
echo "Paste your GitHub Private Key (the entire .pem contents)."
echo "Press Ctrl+D when done:"
wrangler secret put GITHUB_PRIVATE_KEY

read -p "Enter your Stripe Secret Key (sk_live_... or sk_test_...): " STRIPE_SECRET_KEY
echo "$STRIPE_SECRET_KEY" | wrangler secret put STRIPE_SECRET_KEY

# Deploy
echo ""
echo "[5/6] Deploying worker..."
wrangler deploy

# Get worker URL
echo ""
echo "[6/6] Getting worker URL..."
WORKER_URL=$(wrangler whoami 2>/dev/null | grep -oP 'https://[^\s]+' || echo "https://integrity-gate.<your-subdomain>.workers.dev")

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Setup Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Your webhook URL:"
echo "  ${WORKER_URL}/webhook"
echo ""
echo "Next steps:"
echo "  1. Go to your GitHub App settings"
echo "  2. Set Webhook URL to: ${WORKER_URL}/webhook"
echo "  3. Make the app public (optional)"
echo "  4. Install on a repo to test!"
echo ""
echo "Stripe webhook (for billing):"
echo "  ${WORKER_URL}/stripe/webhook"
echo ""
