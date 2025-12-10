import { Env, WebhookPayload, IntegrityResult, InstallationSettings } from '../types';
import { getInstallationToken } from '../github/auth';
import { fetchRepoFiles, fetchAndHashFiles } from '../github/content';
import { createCheckRun, completeCheckRun, failCheckRun } from '../github/checks';
import { computeMerkleRoot } from '../integrity/merkle';
import { checkPolicies, checkSignatures } from '../integrity/policies';
import { canRunCheck, incrementUsage, canRunDeepAnalysis } from '../billing/stripe';

export async function handlePush(env: Env, payload: WebhookPayload): Promise<void> {
  const installationId = payload.installation?.id;
  const repo = payload.repository;
  const sha = payload.after;

  if (!installationId || !repo || !sha) {
    console.log('Missing required push payload fields');
    return;
  }

  // Skip if pushing to delete a branch
  if (sha === '0000000000000000000000000000000000000000') {
    return;
  }

  const owner = repo.owner.login;
  const repoName = repo.name;

  console.log(`Processing push to ${repo.full_name} @ ${sha.substring(0, 7)}`);

  // Check billing limits
  const canRun = await canRunCheck(env, installationId);
  if (!canRun.allowed) {
    console.log(`Skipping check: ${canRun.reason}`);
    // Could optionally create a check run with neutral conclusion explaining the limit
    return;
  }

  // Get installation token
  const token = await getInstallationToken(env, installationId);

  // Create check run
  const checkRunId = await createCheckRun(token, owner, repoName, sha);

  try {
    // Get installation settings
    const settings = await getInstallationSettings(env, installationId);

    // Run integrity check
    const result = await runIntegrityCheck(
      env,
      token,
      owner,
      repoName,
      sha,
      installationId,
      settings
    );

    // Complete check run with results
    await completeCheckRun(token, owner, repoName, checkRunId, result);

    // Increment usage
    await incrementUsage(env, installationId);

    // Store check run in history
    await storeCheckRun(env, installationId, repo.full_name, sha, result);

    console.log(`Check completed: score ${result.integrityScore}/100`);

  } catch (error) {
    console.error('Error running integrity check:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await failCheckRun(token, owner, repoName, checkRunId, errorMessage);
  }
}

async function runIntegrityCheck(
  env: Env,
  token: string,
  owner: string,
  repo: string,
  sha: string,
  installationId: number,
  settings: InstallationSettings
): Promise<IntegrityResult> {
  const result: IntegrityResult = {
    integrityScore: 100,
    signatureStatus: 'not_checked',
    merkleRoot: null,
    policyViolations: 0,
    warnings: [],
    errors: [],
    filesAnalyzed: 0
  };

  // Fetch repository files
  console.log('Fetching repository files...');
  let files = await fetchRepoFiles(token, owner, repo, sha);

  // Apply exclude patterns from settings
  if (settings.excludePatterns.length > 0) {
    const patterns = settings.excludePatterns.map(p => new RegExp(p));
    files = files.filter(f => !patterns.some(p => p.test(f.path)));
  }

  result.filesAnalyzed = files.length;
  console.log(`Found ${files.length} files`);

  // Merkle tree validation
  if (settings.merkleValidate) {
    console.log('Computing Merkle tree...');
    // Fetch content and compute hashes
    const filesWithHashes = await fetchAndHashFiles(token, owner, repo, files);
    result.merkleRoot = await computeMerkleRoot(filesWithHashes);

    // Use hashed files for policy checks (they have content)
    files = filesWithHashes;
  }

  // Signature verification
  if (settings.signatureVerify) {
    console.log('Checking signatures...');
    const sigResult = checkSignatures(files);
    result.signatureStatus = sigResult.status;
    result.warnings.push(...sigResult.warnings);
  }

  // Policy checks
  console.log('Running policy checks...');
  const policyResult = await checkPolicies(files);
  result.policyViolations = policyResult.violations;

  if (policyResult.violations > 0) {
    result.integrityScore -= (policyResult.violations * 5);
    result.warnings.push(...policyResult.messages);
  }

  // Deep analysis (Pro feature)
  if (settings.mode === 'deep') {
    const canDeep = await canRunDeepAnalysis(env, installationId);
    if (canDeep) {
      console.log('Running deep analysis...');
      // TODO: Implement deep analysis call to AI service
    } else {
      result.warnings.push('Deep analysis requires Pro plan');
    }
  }

  // Ensure score is within bounds
  result.integrityScore = Math.max(0, Math.min(100, result.integrityScore));

  return result;
}

async function getInstallationSettings(
  env: Env,
  installationId: number
): Promise<InstallationSettings> {
  const row = await env.DB.prepare(
    'SELECT settings FROM installations WHERE github_installation_id = ?'
  ).bind(installationId).first<{ settings: string }>();

  const defaults: InstallationSettings = {
    mode: 'standard',
    signatureVerify: true,
    merkleValidate: true,
    failOnWarning: false,
    excludePatterns: []
  };

  if (!row?.settings) return defaults;

  try {
    return { ...defaults, ...JSON.parse(row.settings) };
  } catch {
    return defaults;
  }
}

async function storeCheckRun(
  env: Env,
  installationId: number,
  repoFullName: string,
  sha: string,
  result: IntegrityResult
): Promise<void> {
  const conclusion = result.errors.length > 0 || result.integrityScore < 70
    ? 'failure'
    : result.warnings.length > 0
    ? 'neutral'
    : 'success';

  await env.DB.prepare(`
    INSERT INTO check_runs (
      installation_id, repo_full_name, sha, integrity_score,
      merkle_root, policy_violations, signature_status, conclusion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    installationId,
    repoFullName,
    sha,
    result.integrityScore,
    result.merkleRoot,
    result.policyViolations,
    result.signatureStatus,
    conclusion
  ).run();
}
