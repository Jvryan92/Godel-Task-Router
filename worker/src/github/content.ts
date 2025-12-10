import { RepoFile } from '../types';

const GITHUB_API = 'https://api.github.com';

interface TreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

interface TreeResponse {
  sha: string;
  tree: TreeItem[];
  truncated: boolean;
}

// Fetch all files in a repository at a specific commit
export async function fetchRepoFiles(
  token: string,
  owner: string,
  repo: string,
  sha: string
): Promise<RepoFile[]> {
  // Get the tree recursively
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'IntegrityGate-App/1.0',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch tree: ${error}`);
  }

  const data = await response.json() as TreeResponse;

  // Filter to only blobs (files) and exclude common patterns
  const excludePatterns = [
    /^\.git\//,
    /^node_modules\//,
    /^dist\//,
    /^\./,  // Hidden files at root
    /\/\./  // Hidden files in subdirs
  ];

  const files: RepoFile[] = data.tree
    .filter(item => {
      if (item.type !== 'blob') return false;
      return !excludePatterns.some(pattern => pattern.test(item.path));
    })
    .map(item => ({
      path: item.path,
      sha: item.sha,
      size: item.size || 0
    }));

  return files;
}

// Fetch content of a specific file
export async function fetchFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${ref}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.raw+json',
        'User-Agent': 'IntegrityGate-App/1.0',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch file ${path}: ${response.status}`);
  }

  return response.text();
}

// Fetch blob content by SHA (more efficient for known SHAs)
export async function fetchBlobContent(
  token: string,
  owner: string,
  repo: string,
  sha: string
): Promise<string> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/blobs/${sha}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.raw+json',
        'User-Agent': 'IntegrityGate-App/1.0',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch blob ${sha}: ${response.status}`);
  }

  return response.text();
}

// Compute SHA-256 hash of content
export async function computeContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(hashBuffer);
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Fetch and hash files in batches (for Merkle tree)
export async function fetchAndHashFiles(
  token: string,
  owner: string,
  repo: string,
  files: RepoFile[],
  batchSize: number = 10
): Promise<RepoFile[]> {
  const results: RepoFile[] = [];

  // Process in batches to avoid rate limits
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (file) => {
        try {
          const content = await fetchBlobContent(token, owner, repo, file.sha);
          const hash = await computeContentHash(content);
          return { ...file, content, hash };
        } catch (error) {
          console.error(`Error fetching ${file.path}:`, error);
          return { ...file, hash: 'error' };
        }
      })
    );

    results.push(...batchResults);
  }

  return results;
}
