import { Hono } from 'hono';
import { Env, WebhookPayload } from './types';
import { verifyWebhookSignature } from './github/auth';
import { handlePush } from './webhooks/push';
import { handlePullRequest } from './webhooks/pull_request';
import { handleInstallation } from './webhooks/installation';
import {
  verifyTrinityCapsule,
  verifyBlake3Hash,
  storeTrinitySeal,
  batchStoreTrinitySeal,
  QCMCapsule,
  PHI,
  RAS_ROOT,
  TRINITY_NODES
} from './integrity/trinity';

const app = new Hono<{ Bindings: Env }>();

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'IntegrityGate',
    version: '1.0.0',
    status: 'operational'
  });
});

// GitHub webhook endpoint
app.post('/webhook', async (c) => {
  const signature = c.req.header('x-hub-signature-256');
  const event = c.req.header('x-github-event');
  const deliveryId = c.req.header('x-github-delivery');

  if (!signature || !event) {
    return c.json({ error: 'Missing signature or event header' }, 400);
  }

  const body = await c.req.text();

  // Verify webhook signature
  const isValid = await verifyWebhookSignature(
    body,
    signature,
    c.env.GITHUB_WEBHOOK_SECRET
  );

  if (!isValid) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  const payload: WebhookPayload = JSON.parse(body);

  console.log(`Received ${event} event (delivery: ${deliveryId})`);

  try {
    switch (event) {
      case 'push':
        await handlePush(c.env, payload);
        break;

      case 'pull_request':
        if (['opened', 'synchronize', 'reopened'].includes(payload.action || '')) {
          await handlePullRequest(c.env, payload);
        }
        break;

      case 'installation':
      case 'installation_repositories':
        await handleInstallation(c.env, payload);
        break;

      default:
        console.log(`Unhandled event: ${event}`);
    }

    return c.json({ received: true });
  } catch (error) {
    console.error(`Error handling ${event}:`, error);
    return c.json({ error: 'Internal error' }, 500);
  }
});

// API: Get installation status (for dashboard)
app.get('/api/installation/:installationId', async (c) => {
  const installationId = parseInt(c.req.param('installationId'));

  const installation = await c.env.DB.prepare(
    'SELECT * FROM installations WHERE github_installation_id = ?'
  ).bind(installationId).first();

  if (!installation) {
    return c.json({ error: 'Installation not found' }, 404);
  }

  return c.json(installation);
});

// API: Get usage stats
app.get('/api/installation/:installationId/usage', async (c) => {
  const installationId = parseInt(c.req.param('installationId'));
  const month = new Date().toISOString().slice(0, 7);

  const usage = await c.env.DB.prepare(
    'SELECT * FROM usage WHERE installation_id = ? AND month = ?'
  ).bind(installationId, month).first();

  return c.json(usage || { check_runs: 0, deep_analyses: 0 });
});

// API: Update settings
app.post('/api/installation/:installationId/settings', async (c) => {
  const installationId = parseInt(c.req.param('installationId'));
  const settings = await c.req.json();

  await c.env.DB.prepare(
    'UPDATE installations SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE github_installation_id = ?'
  ).bind(JSON.stringify(settings), installationId).run();

  return c.json({ success: true });
});

// Stripe webhook for subscription updates
app.post('/stripe/webhook', async (c) => {
  // TODO: Implement Stripe webhook verification
  const payload = await c.req.json();

  if (payload.type === 'customer.subscription.updated' ||
      payload.type === 'customer.subscription.deleted') {
    const customerId = payload.data.object.customer;
    const status = payload.data.object.status;

    const plan = status === 'active'
      ? determinePlanFromSubscription(payload.data.object)
      : 'free';

    await c.env.DB.prepare(
      'UPDATE installations SET plan = ?, updated_at = CURRENT_TIMESTAMP WHERE stripe_customer_id = ?'
    ).bind(plan, customerId).run();
  }

  return c.json({ received: true });
});

function determinePlanFromSubscription(subscription: any): string {
  // Map Stripe price IDs to plans
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const pricePlanMap: Record<string, string> = {
    'price_starter': 'starter',
    'price_pro': 'pro',
    'price_vanguard': 'vanguard'
  };
  return pricePlanMap[priceId] || 'starter';
}

// ═══════════════════════════════════════════════════════════════════
// TRINITY VERIFICATION API - EpochCore Quantum Watermarking
// ═══════════════════════════════════════════════════════════════════

// Verify a Trinity-sealed QCM capsule
app.post('/api/verify-trinity', async (c) => {
  const body = await c.req.json();
  const { capsule, file_hash } = body;

  if (!capsule) {
    return c.json({ error: 'Missing capsule in request body' }, 400);
  }

  const result = await verifyTrinityCapsule(capsule as QCMCapsule, file_hash);

  return c.json({
    verified: result.valid,
    coherence: result.coherence,
    details: result
  });
});

// Verify a Blake3 hash against stored Trinity seals
app.get('/api/verify-trinity/:hash', async (c) => {
  const hash = c.req.param('hash');

  const result = await verifyBlake3Hash(c.env, hash);

  if (!result.found) {
    return c.json({
      found: false,
      message: 'No Trinity seal found for this hash'
    }, 404);
  }

  return c.json({
    found: true,
    verified: result.verification?.valid,
    coherence: result.verification?.coherence,
    timestamp: result.verification?.timestamp,
    phi_resonance: result.verification?.phi_resonance,
    trinity_signatures: result.verification?.trinity_signatures
  });
});

// Store a single Trinity seal (sync from air-gapped hardware)
app.post('/api/trinity/seal', async (c) => {
  const capsule = await c.req.json() as QCMCapsule;

  const result = await storeTrinitySeal(c.env, capsule);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({
    success: true,
    message: 'Trinity seal stored successfully'
  });
});

// Batch store Trinity seals (sync 626+ files from air-gapped hardware)
app.post('/api/trinity/seal/batch', async (c) => {
  const { capsules } = await c.req.json();

  if (!Array.isArray(capsules)) {
    return c.json({ error: 'Expected array of capsules' }, 400);
  }

  const result = await batchStoreTrinitySeal(c.env, capsules);

  return c.json({
    success: result.success,
    failed: result.failed,
    total: capsules.length,
    coherence_rate: result.success / capsules.length,
    errors: result.errors.slice(0, 10) // First 10 errors only
  });
});

// Get Trinity system status
app.get('/api/trinity/status', async (c) => {
  const totalSeals = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM trinity_seals'
  ).first<{ count: number }>();

  const recentSeals = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM trinity_seals WHERE created_at > datetime("now", "-24 hours")'
  ).first<{ count: number }>();

  const avgCoherence = await c.env.DB.prepare(
    'SELECT AVG(coherence) as avg FROM trinity_seals'
  ).first<{ avg: number }>();

  return c.json({
    system: 'Trinity Flash Sync',
    version: 'QCM/1',
    nodes: TRINITY_NODES,
    phi: PHI,
    ras_root: RAS_ROOT,
    stats: {
      total_seals: totalSeals?.count || 0,
      seals_24h: recentSeals?.count || 0,
      avg_coherence: avgCoherence?.avg || 0
    },
    status: 'OPERATIONAL'
  });
});

// ═══════════════════════════════════════════════════════════════════
// R2 SYNC - Pull seals directly from EpochCore Genesis bucket
// ═══════════════════════════════════════════════════════════════════

// List available capsules in R2
app.get('/api/trinity/r2/list', async (c) => {
  const prefix = c.req.query('prefix') || 'trinity_watermark_output/';
  const limit = parseInt(c.req.query('limit') || '100');

  const listed = await c.env.R2.list({ prefix, limit });

  return c.json({
    prefix,
    count: listed.objects.length,
    truncated: listed.truncated,
    objects: listed.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded
    }))
  });
});

// Sync all capsules from R2 to D1
app.post('/api/trinity/r2/sync', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const prefix = body.prefix || 'trinity_watermark_output/';
  const dryRun = body.dry_run || false;

  let cursor: string | undefined;
  let totalFiles = 0;
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  // Paginate through all objects
  do {
    const listed = await c.env.R2.list({
      prefix,
      limit: 500,
      cursor
    });

    for (const obj of listed.objects) {
      // Only process .json capsule files
      if (!obj.key.endsWith('.json')) continue;

      totalFiles++;

      if (dryRun) {
        synced++;
        continue;
      }

      try {
        const file = await c.env.R2.get(obj.key);
        if (!file) continue;

        const text = await file.text();
        const capsule = JSON.parse(text) as QCMCapsule;

        const result = await storeTrinitySeal(c.env, capsule);
        if (result.success) {
          synced++;
        } else {
          failed++;
          errors.push(`${obj.key}: ${result.error}`);
        }
      } catch (err) {
        failed++;
        errors.push(`${obj.key}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return c.json({
    dry_run: dryRun,
    total_files: totalFiles,
    synced,
    failed,
    coherence_rate: totalFiles > 0 ? synced / totalFiles : 0,
    errors: errors.slice(0, 20) // First 20 errors
  });
});

// Sync a single file from R2 by key
app.post('/api/trinity/r2/sync/:key', async (c) => {
  const key = decodeURIComponent(c.req.param('key'));

  const file = await c.env.R2.get(key);
  if (!file) {
    return c.json({ error: 'File not found in R2' }, 404);
  }

  try {
    const text = await file.text();
    const capsule = JSON.parse(text) as QCMCapsule;

    const result = await storeTrinitySeal(c.env, capsule);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({
      success: true,
      key,
      message: 'Seal synced from R2 to D1'
    });
  } catch (err) {
    return c.json({
      error: err instanceof Error ? err.message : 'Failed to parse capsule'
    }, 400);
  }
});

// Get R2 bucket stats
app.get('/api/trinity/r2/stats', async (c) => {
  const prefix = 'trinity_watermark_output/';

  let totalFiles = 0;
  let totalSize = 0;
  let cursor: string | undefined;

  do {
    const listed = await c.env.R2.list({ prefix, limit: 1000, cursor });

    for (const obj of listed.objects) {
      if (obj.key.endsWith('.json')) {
        totalFiles++;
        totalSize += obj.size;
      }
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  // Get D1 sync status
  const dbCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM trinity_seals'
  ).first<{ count: number }>();

  return c.json({
    r2: {
      bucket: 'epochcore-genesis',
      prefix,
      total_capsules: totalFiles,
      total_size_bytes: totalSize,
      total_size_mb: (totalSize / (1024 * 1024)).toFixed(2)
    },
    d1: {
      synced_seals: dbCount?.count || 0
    },
    sync_status: {
      pending: totalFiles - (dbCount?.count || 0),
      complete: (dbCount?.count || 0) >= totalFiles
    }
  });
});

export default app;
