import { Hono } from 'hono';
import { Env, WebhookPayload } from './types';
import { verifyWebhookSignature } from './github/auth';
import { handlePush } from './webhooks/push';
import { handlePullRequest } from './webhooks/pull_request';
import { handleInstallation } from './webhooks/installation';

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

export default app;
