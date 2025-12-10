import { RepoFile } from '../types';

// Compute Merkle root from file hashes
export async function computeMerkleRoot(files: RepoFile[]): Promise<string | null> {
  if (files.length === 0) return null;

  // Get valid hashes only
  let hashes = files
    .map(f => f.hash)
    .filter((h): h is string => h !== undefined && h !== 'error');

  if (hashes.length === 0) return null;

  // Build Merkle tree
  while (hashes.length > 1) {
    const newHashes: string[] = [];

    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left;  // Duplicate last if odd
      const combined = await sha256(left + right);
      newHashes.push(combined);
    }

    hashes = newHashes;
  }

  return hashes[0];
}

// Compute SHA-256 hash
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(hashBuffer);
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate Merkle proof for a specific file (optional, for verification)
export async function generateMerkleProof(
  files: RepoFile[],
  targetPath: string
): Promise<{ proof: string[]; index: number } | null> {
  const targetFile = files.find(f => f.path === targetPath);
  if (!targetFile || !targetFile.hash) return null;

  let hashes = files
    .map(f => f.hash)
    .filter((h): h is string => h !== undefined && h !== 'error');

  const index = hashes.indexOf(targetFile.hash);
  if (index === -1) return null;

  const proof: string[] = [];
  let currentIndex = index;

  while (hashes.length > 1) {
    const newHashes: string[] = [];

    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left;

      // If current index is in this pair, add sibling to proof
      if (i === currentIndex || i + 1 === currentIndex) {
        const sibling = i === currentIndex ? right : left;
        proof.push(sibling);
      }

      const combined = await sha256(left + right);
      newHashes.push(combined);
    }

    currentIndex = Math.floor(currentIndex / 2);
    hashes = newHashes;
  }

  return { proof, index };
}
