import { Env, Installation } from '../types';

interface UsageLimits {
  checkRunsPerMonth: number;
  deepAnalysisAllowed: boolean;
  customPolicies: boolean;
}

const PLAN_LIMITS: Record<string, UsageLimits> = {
  free: {
    checkRunsPerMonth: 100,
    deepAnalysisAllowed: false,
    customPolicies: false
  },
  starter: {
    checkRunsPerMonth: -1,  // Unlimited
    deepAnalysisAllowed: false,
    customPolicies: false
  },
  pro: {
    checkRunsPerMonth: -1,
    deepAnalysisAllowed: true,
    customPolicies: true
  },
  vanguard: {
    checkRunsPerMonth: -1,
    deepAnalysisAllowed: true,
    customPolicies: true
  }
};

// Check if installation can run a check
export async function canRunCheck(
  env: Env,
  installationId: number
): Promise<{ allowed: boolean; reason?: string }> {
  // Get installation
  const installation = await env.DB.prepare(
    'SELECT * FROM installations WHERE github_installation_id = ?'
  ).bind(installationId).first<Installation>();

  if (!installation) {
    return { allowed: false, reason: 'Installation not found' };
  }

  const limits = PLAN_LIMITS[installation.plan] || PLAN_LIMITS.free;

  // Check monthly limits for free tier
  if (limits.checkRunsPerMonth > 0) {
    const month = new Date().toISOString().slice(0, 7);
    const usage = await env.DB.prepare(
      'SELECT check_runs FROM usage WHERE installation_id = ? AND month = ?'
    ).bind(installationId, month).first<{ check_runs: number }>();

    const currentUsage = usage?.check_runs || 0;

    if (currentUsage >= limits.checkRunsPerMonth) {
      return {
        allowed: false,
        reason: `Monthly limit reached (${limits.checkRunsPerMonth} checks). Upgrade to Starter for unlimited checks.`
      };
    }
  }

  return { allowed: true };
}

// Check if deep analysis is allowed
export async function canRunDeepAnalysis(
  env: Env,
  installationId: number
): Promise<boolean> {
  const installation = await env.DB.prepare(
    'SELECT plan FROM installations WHERE github_installation_id = ?'
  ).bind(installationId).first<{ plan: string }>();

  if (!installation) return false;

  const limits = PLAN_LIMITS[installation.plan] || PLAN_LIMITS.free;
  return limits.deepAnalysisAllowed;
}

// Increment usage counter
export async function incrementUsage(
  env: Env,
  installationId: number,
  type: 'check_runs' | 'deep_analyses' = 'check_runs'
): Promise<void> {
  const month = new Date().toISOString().slice(0, 7);

  // Upsert usage record
  await env.DB.prepare(`
    INSERT INTO usage (installation_id, month, ${type})
    VALUES (?, ?, 1)
    ON CONFLICT(installation_id, month)
    DO UPDATE SET ${type} = ${type} + 1
  `).bind(installationId, month).run();
}

// Get current plan limits
export function getPlanLimits(plan: string): UsageLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

// Validate Stripe webhook signature
export async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const sig = parts.find(p => p.startsWith('v1='))?.slice(3);

  if (!timestamp || !sig) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const expectedSig = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  const expectedHex = arrayBufferToHex(expectedSig);
  return sig === expectedHex;
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Create Stripe checkout session URL (for upgrade flow)
export function getCheckoutUrl(
  installationId: number,
  plan: 'starter' | 'pro' | 'vanguard',
  priceIds: Record<string, string>
): string {
  const priceId = priceIds[plan];
  // This would typically redirect to your billing portal
  return `https://your-domain.com/billing/checkout?installation=${installationId}&price=${priceId}`;
}
