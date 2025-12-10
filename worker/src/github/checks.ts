import { IntegrityResult, CheckRunOutput } from '../types';

const GITHUB_API = 'https://api.github.com';

interface CheckRun {
  id: number;
  status: string;
  conclusion: string | null;
}

// Create a new check run (status: queued)
export async function createCheckRun(
  token: string,
  owner: string,
  repo: string,
  sha: string,
  name: string = 'IntegrityGate'
): Promise<number> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/check-runs`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'IntegrityGate-App/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        head_sha: sha,
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create check run: ${error}`);
  }

  const data = await response.json() as CheckRun;
  return data.id;
}

// Update check run with results
export async function completeCheckRun(
  token: string,
  owner: string,
  repo: string,
  checkRunId: number,
  result: IntegrityResult
): Promise<void> {
  const conclusion = determineConclusion(result);
  const output = formatOutput(result);

  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/check-runs/${checkRunId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'IntegrityGate-App/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'completed',
        conclusion,
        completed_at: new Date().toISOString(),
        output
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update check run: ${error}`);
  }
}

// Determine check conclusion based on results
function determineConclusion(result: IntegrityResult): string {
  if (result.errors.length > 0) {
    return 'failure';
  }
  if (result.integrityScore < 70) {
    return 'failure';
  }
  if (result.warnings.length > 0 && result.integrityScore >= 70) {
    return 'neutral';
  }
  return 'success';
}

// Format output for GitHub check run
function formatOutput(result: IntegrityResult): CheckRunOutput {
  const title = `Integrity Score: ${result.integrityScore}/100`;

  let summary = `## IntegrityGate Report\n\n`;
  summary += `| Metric | Value |\n`;
  summary += `|--------|-------|\n`;
  summary += `| Integrity Score | ${result.integrityScore}/100 |\n`;
  summary += `| Signature Status | ${result.signatureStatus} |\n`;
  summary += `| Merkle Root | ${result.merkleRoot ? `\`${result.merkleRoot.substring(0, 16)}...\`` : 'N/A'} |\n`;
  summary += `| Policy Violations | ${result.policyViolations} |\n`;
  summary += `| Files Analyzed | ${result.filesAnalyzed} |\n`;

  let text = '';

  if (result.warnings.length > 0) {
    text += `### Warnings\n\n`;
    for (const warning of result.warnings) {
      text += `- ⚠️ ${warning}\n`;
    }
    text += '\n';
  }

  if (result.errors.length > 0) {
    text += `### Errors\n\n`;
    for (const error of result.errors) {
      text += `- ❌ ${error}\n`;
    }
    text += '\n';
  }

  if (result.merkleRoot) {
    text += `### Merkle Root\n\n`;
    text += `\`\`\`\n${result.merkleRoot}\n\`\`\`\n\n`;
    text += `This hash uniquely identifies the exact state of all files in this commit.\n`;
  }

  return { title, summary, text: text || undefined };
}

// Fail a check run with an error message
export async function failCheckRun(
  token: string,
  owner: string,
  repo: string,
  checkRunId: number,
  errorMessage: string
): Promise<void> {
  await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/check-runs/${checkRunId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'IntegrityGate-App/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'completed',
        conclusion: 'failure',
        completed_at: new Date().toISOString(),
        output: {
          title: 'IntegrityGate Error',
          summary: `An error occurred during integrity analysis:\n\n\`\`\`\n${errorMessage}\n\`\`\``
        }
      })
    }
  );
}
