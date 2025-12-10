import { Env, WebhookPayload } from '../types';

export async function handleInstallation(env: Env, payload: WebhookPayload): Promise<void> {
  const action = payload.action;
  const installation = payload.installation;

  if (!installation) {
    console.log('Missing installation in payload');
    return;
  }

  const installationId = installation.id;
  const accountLogin = installation.account.login;
  const accountType = installation.account.type;

  switch (action) {
    case 'created':
      await handleInstallationCreated(env, installationId, accountLogin, accountType);
      break;

    case 'deleted':
      await handleInstallationDeleted(env, installationId);
      break;

    case 'suspend':
      await handleInstallationSuspended(env, installationId);
      break;

    case 'unsuspend':
      await handleInstallationUnsuspended(env, installationId);
      break;

    default:
      console.log(`Unhandled installation action: ${action}`);
  }
}

async function handleInstallationCreated(
  env: Env,
  installationId: number,
  accountLogin: string,
  accountType: string
): Promise<void> {
  console.log(`New installation: ${accountLogin} (${accountType}) - ID: ${installationId}`);

  // Insert new installation record
  await env.DB.prepare(`
    INSERT INTO installations (
      github_installation_id,
      account_login,
      account_type,
      plan,
      settings
    ) VALUES (?, ?, ?, 'free', '{}')
    ON CONFLICT(github_installation_id) DO UPDATE SET
      account_login = excluded.account_login,
      account_type = excluded.account_type,
      updated_at = CURRENT_TIMESTAMP
  `).bind(installationId, accountLogin, accountType).run();

  // Initialize usage tracking for current month
  const month = new Date().toISOString().slice(0, 7);
  await env.DB.prepare(`
    INSERT OR IGNORE INTO usage (installation_id, month, check_runs, deep_analyses)
    VALUES (?, ?, 0, 0)
  `).bind(installationId, month).run();

  console.log(`Installation ${installationId} created successfully`);
}

async function handleInstallationDeleted(
  env: Env,
  installationId: number
): Promise<void> {
  console.log(`Installation deleted: ${installationId}`);

  // We keep the record for billing/audit purposes but could mark as deleted
  // For now, just log it - you might want to:
  // 1. Cancel any active Stripe subscription
  // 2. Mark the installation as deleted
  // 3. Clean up after a grace period

  await env.DB.prepare(`
    UPDATE installations
    SET settings = json_set(settings, '$.deleted', true),
        updated_at = CURRENT_TIMESTAMP
    WHERE github_installation_id = ?
  `).bind(installationId).run();

  console.log(`Installation ${installationId} marked as deleted`);
}

async function handleInstallationSuspended(
  env: Env,
  installationId: number
): Promise<void> {
  console.log(`Installation suspended: ${installationId}`);

  await env.DB.prepare(`
    UPDATE installations
    SET settings = json_set(settings, '$.suspended', true),
        updated_at = CURRENT_TIMESTAMP
    WHERE github_installation_id = ?
  `).bind(installationId).run();
}

async function handleInstallationUnsuspended(
  env: Env,
  installationId: number
): Promise<void> {
  console.log(`Installation unsuspended: ${installationId}`);

  await env.DB.prepare(`
    UPDATE installations
    SET settings = json_set(settings, '$.suspended', false),
        updated_at = CURRENT_TIMESTAMP
    WHERE github_installation_id = ?
  `).bind(installationId).run();
}
