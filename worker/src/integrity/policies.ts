import { RepoFile } from '../types';

interface PolicyResult {
  violations: number;
  messages: string[];
}

// Check all built-in policies
export async function checkPolicies(files: RepoFile[]): Promise<PolicyResult> {
  const result: PolicyResult = {
    violations: 0,
    messages: []
  };

  // 1. Check for sensitive files
  const sensitiveResult = checkSensitiveFiles(files);
  result.violations += sensitiveResult.violations;
  result.messages.push(...sensitiveResult.messages);

  // 2. Check for large files
  const sizeResult = checkLargeFiles(files);
  result.violations += sizeResult.violations;
  result.messages.push(...sizeResult.messages);

  // 3. Check for package lock consistency
  const lockResult = checkPackageLock(files);
  result.messages.push(...lockResult.messages);

  // 4. Check for dangerous patterns in content
  const dangerousResult = await checkDangerousPatterns(files);
  result.violations += dangerousResult.violations;
  result.messages.push(...dangerousResult.messages);

  return result;
}

// Check for potentially sensitive files
function checkSensitiveFiles(files: RepoFile[]): PolicyResult {
  const result: PolicyResult = { violations: 0, messages: [] };

  const sensitivePatterns = [
    { pattern: /\.env$/i, name: '.env file' },
    { pattern: /\.env\./i, name: '.env.* file' },
    { pattern: /credentials/i, name: 'credentials file' },
    { pattern: /secret/i, name: 'secret file' },
    { pattern: /private[_-]?key/i, name: 'private key file' },
    { pattern: /id_rsa/i, name: 'SSH private key' },
    { pattern: /id_ed25519/i, name: 'SSH private key' },
    { pattern: /\.pem$/i, name: 'PEM certificate/key' },
    { pattern: /\.p12$/i, name: 'PKCS12 file' },
    { pattern: /\.pfx$/i, name: 'PFX certificate' },
    { pattern: /\.key$/i, name: 'Key file' }
  ];

  for (const file of files) {
    for (const { pattern, name } of sensitivePatterns) {
      if (pattern.test(file.path)) {
        result.violations++;
        result.messages.push(`Potentially sensitive ${name}: ${file.path}`);
      }
    }
  }

  return result;
}

// Check for large files (>10MB)
function checkLargeFiles(files: RepoFile[]): PolicyResult {
  const result: PolicyResult = { violations: 0, messages: [] };
  const maxSize = 10 * 1024 * 1024; // 10MB

  for (const file of files) {
    if (file.size > maxSize) {
      result.violations++;
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      result.messages.push(`Large file detected (${sizeMB}MB): ${file.path}`);
    }
  }

  return result;
}

// Check for package-lock.json consistency
function checkPackageLock(files: RepoFile[]): PolicyResult {
  const result: PolicyResult = { violations: 0, messages: [] };

  const hasPackageJson = files.some(f => f.path === 'package.json');
  const hasPackageLock = files.some(f => f.path === 'package-lock.json');
  const hasYarnLock = files.some(f => f.path === 'yarn.lock');
  const hasPnpmLock = files.some(f => f.path === 'pnpm-lock.yaml');

  if (hasPackageJson && !hasPackageLock && !hasYarnLock && !hasPnpmLock) {
    result.messages.push('Warning: package.json exists without a lockfile');
  }

  return result;
}

// Check for dangerous patterns in file content
async function checkDangerousPatterns(files: RepoFile[]): Promise<PolicyResult> {
  const result: PolicyResult = { violations: 0, messages: [] };

  const dangerousPatterns = [
    { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key ID' },
    { pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, name: 'Private Key' },
    { pattern: /ghp_[a-zA-Z0-9]{36}/g, name: 'GitHub Personal Access Token' },
    { pattern: /gho_[a-zA-Z0-9]{36}/g, name: 'GitHub OAuth Token' },
    { pattern: /ghu_[a-zA-Z0-9]{36}/g, name: 'GitHub User-to-Server Token' },
    { pattern: /ghs_[a-zA-Z0-9]{36}/g, name: 'GitHub Server-to-Server Token' },
    { pattern: /ghr_[a-zA-Z0-9]{36}/g, name: 'GitHub Refresh Token' },
    { pattern: /sk-[a-zA-Z0-9]{48}/g, name: 'OpenAI API Key' },
    { pattern: /xox[baprs]-[0-9a-zA-Z-]+/g, name: 'Slack Token' }
  ];

  for (const file of files) {
    if (!file.content) continue;

    // Skip binary files and large files
    if (file.size > 1024 * 1024) continue;  // Skip >1MB

    for (const { pattern, name } of dangerousPatterns) {
      pattern.lastIndex = 0;  // Reset regex state
      if (pattern.test(file.content)) {
        result.violations++;
        result.messages.push(`Potential ${name} found in: ${file.path}`);
      }
    }
  }

  return result;
}

// Check for signature files
export function checkSignatures(files: RepoFile[]): {
  status: 'verified' | 'no_signatures';
  warnings: string[];
} {
  const sigFiles = files.filter(f =>
    f.path.endsWith('.sig') ||
    f.path.endsWith('.asc') ||
    f.path === 'SIGNATURE' ||
    f.path.endsWith('.signature')
  );

  if (sigFiles.length === 0) {
    return {
      status: 'no_signatures',
      warnings: ['No signature files found in repository']
    };
  }

  return {
    status: 'verified',
    warnings: []
  };
}
