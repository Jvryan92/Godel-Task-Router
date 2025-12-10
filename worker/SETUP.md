# IntegrityGate GitHub App Setup

## Prerequisites

- Cloudflare account with Workers enabled
- Stripe account (for billing)
- GitHub account

## Step 1: Create D1 Database

```bash
cd worker
npm install
wrangler d1 create integrity-gate
```

Copy the database_id from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "integrity-gate"
database_id = "YOUR_DATABASE_ID_HERE"
```

Run migrations:

```bash
npm run db:migrate
```

## Step 2: Deploy Worker (to get URL)

```bash
wrangler deploy
```

Note your worker URL: `https://integrity-gate.<your-subdomain>.workers.dev`

## Step 3: Create GitHub App

Go to: https://github.com/settings/apps/new

Fill in:

| Field | Value |
|-------|-------|
| **GitHub App name** | IntegrityGate |
| **Homepage URL** | https://your-website.com |
| **Webhook URL** | `https://integrity-gate.<subdomain>.workers.dev/webhook` |
| **Webhook secret** | Generate a random string (save this!) |

### Permissions

**Repository permissions:**
- Contents: `Read-only`
- Checks: `Read and write`
- Pull requests: `Read-only`
- Metadata: `Read-only`

**Subscribe to events:**
- [x] Push
- [x] Pull request
- [x] Installation

Click "Create GitHub App"

## Step 4: Generate Private Key

On your app's settings page:
1. Scroll to "Private keys"
2. Click "Generate a private key"
3. Download the `.pem` file

## Step 5: Add Secrets to Worker

```bash
# Your App ID (shown on app settings page)
wrangler secret put GITHUB_APP_ID

# The webhook secret you created
wrangler secret put GITHUB_WEBHOOK_SECRET

# The private key (paste entire PEM contents)
wrangler secret put GITHUB_PRIVATE_KEY

# Your Stripe secret key
wrangler secret put STRIPE_SECRET_KEY
```

## Step 6: Re-deploy

```bash
wrangler deploy
```

## Step 7: Install on a Repository

1. Go to your GitHub App's public page:
   `https://github.com/apps/YOUR-APP-NAME`
2. Click "Install"
3. Select repositories

## Testing Locally

Use [smee.io](https://smee.io) to proxy webhooks to localhost:

```bash
# Terminal 1: Start smee proxy
npx smee -u https://smee.io/YOUR_CHANNEL -t http://localhost:8787/webhook

# Terminal 2: Start worker
npm run dev
```

Update your GitHub App webhook URL to the smee.io URL for testing.

## Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://integrity-gate.<subdomain>.workers.dev/stripe/webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

## File Structure

```
worker/
├── wrangler.toml          # Cloudflare config
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Main router
│   ├── types.ts           # TypeScript types
│   ├── github/
│   │   ├── auth.ts        # JWT + token exchange
│   │   ├── content.ts     # Fetch repo files
│   │   └── checks.ts      # Check Runs API
│   ├── webhooks/
│   │   ├── push.ts        # Handle push events
│   │   ├── pull_request.ts
│   │   └── installation.ts
│   ├── integrity/
│   │   ├── merkle.ts      # Merkle tree computation
│   │   └── policies.ts    # Policy checks
│   ├── billing/
│   │   └── stripe.ts      # Subscription validation
│   └── db/
│       └── schema.sql     # D1 schema
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| POST | `/webhook` | GitHub webhooks |
| POST | `/stripe/webhook` | Stripe webhooks |
| GET | `/api/installation/:id` | Get installation info |
| GET | `/api/installation/:id/usage` | Get usage stats |
| POST | `/api/installation/:id/settings` | Update settings |

## Environment Variables

| Name | Description |
|------|-------------|
| `GITHUB_APP_ID` | Your GitHub App ID |
| `GITHUB_PRIVATE_KEY` | PEM private key |
| `GITHUB_WEBHOOK_SECRET` | Webhook signature secret |
| `STRIPE_SECRET_KEY` | Stripe API key |
