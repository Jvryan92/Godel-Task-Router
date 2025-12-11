import { Env } from '../types';

// Trinity node identifiers
export const TRINITY_NODES = {
  GENESIS: 'epochGφ',
  CLOUD: 'epochCLOUDMEDUSA',
  TEMPORAL: 'epochLOOP'
} as const;

// PHI constant for resonance verification
export const PHI = 1.618033988749895;
export const PHI_TOLERANCE = 0.000000000001;

// RAS root from Genesis
export const RAS_ROOT = '40668c787c463ca5';
export const FLASH_SYNC_HASH = '211a78f37783';

export interface QCMCapsule {
  α: string;              // Protocol version (QCM/1)
  τ: string;              // Timestamp ISO8601
  Σ: string;              // Source node
  μ: string;              // Message identifier
  Ψ: string[];            // Hash chain [algorithm, hash, standard]
  φ: number;              // PHI resonance value
  trinity: {
    genesis: string;      // epochGφ signature
    cloud: string;        // epochCLOUDMEDUSA signature
    temporal: string;     // epochLOOP signature
  };
  seal: string;           // Combined trinity seal
}

export interface TrinityVerificationResult {
  valid: boolean;
  file_hash: string;
  algorithm: string;
  timestamp: string;
  phi_resonance: {
    value: number;
    valid: boolean;
  };
  trinity_signatures: {
    genesis: { node: string; valid: boolean };
    cloud: { node: string; valid: boolean };
    temporal: { node: string; valid: boolean };
  };
  ras_binding: {
    root: string;
    valid: boolean;
  };
  coherence: number;
  errors: string[];
}

// Verify a Trinity-sealed QCM capsule
export async function verifyTrinityCapsule(
  capsule: QCMCapsule,
  fileHash?: string
): Promise<TrinityVerificationResult> {
  const errors: string[] = [];

  const result: TrinityVerificationResult = {
    valid: false,
    file_hash: capsule.Ψ?.[1] || '',
    algorithm: capsule.Ψ?.[0] || 'unknown',
    timestamp: capsule.τ || '',
    phi_resonance: { value: 0, valid: false },
    trinity_signatures: {
      genesis: { node: TRINITY_NODES.GENESIS, valid: false },
      cloud: { node: TRINITY_NODES.CLOUD, valid: false },
      temporal: { node: TRINITY_NODES.TEMPORAL, valid: false }
    },
    ras_binding: { root: RAS_ROOT, valid: false },
    coherence: 0,
    errors: []
  };

  // 1. Verify protocol version
  if (capsule.α !== 'QCM/1') {
    errors.push(`Invalid protocol: expected QCM/1, got ${capsule.α}`);
  }

  // 2. Verify PHI resonance
  if (capsule.φ) {
    result.phi_resonance.value = capsule.φ;
    result.phi_resonance.valid = Math.abs(capsule.φ - PHI) < PHI_TOLERANCE;
    if (!result.phi_resonance.valid) {
      errors.push(`PHI resonance out of tolerance: ${capsule.φ}`);
    }
  }

  // 3. Verify file hash matches (if provided)
  if (fileHash && capsule.Ψ?.[1]) {
    const capsuleHash = capsule.Ψ[1].replace(/^(blake3|b3):/, '');
    const providedHash = fileHash.replace(/^(blake3|b3):/, '');
    if (capsuleHash !== providedHash) {
      errors.push('File hash does not match capsule hash');
    }
  }

  // 4. Verify trinity signatures exist
  if (capsule.trinity) {
    result.trinity_signatures.genesis.valid = !!capsule.trinity.genesis &&
      capsule.trinity.genesis.includes(TRINITY_NODES.GENESIS);
    result.trinity_signatures.cloud.valid = !!capsule.trinity.cloud &&
      capsule.trinity.cloud.includes(TRINITY_NODES.CLOUD);
    result.trinity_signatures.temporal.valid = !!capsule.trinity.temporal &&
      capsule.trinity.temporal.includes(TRINITY_NODES.TEMPORAL);
  }

  // 5. Verify RAS binding
  if (capsule.seal) {
    result.ras_binding.valid = capsule.seal.includes(RAS_ROOT) ||
      capsule.seal.includes(FLASH_SYNC_HASH);
  }

  // 6. Verify timestamp is valid ISO8601
  if (capsule.τ) {
    const timestamp = new Date(capsule.τ);
    if (isNaN(timestamp.getTime())) {
      errors.push('Invalid timestamp format');
    }
  }

  // Calculate coherence score
  let coherencePoints = 0;
  const maxPoints = 6;

  if (capsule.α === 'QCM/1') coherencePoints++;
  if (result.phi_resonance.valid) coherencePoints++;
  if (result.trinity_signatures.genesis.valid) coherencePoints++;
  if (result.trinity_signatures.cloud.valid) coherencePoints++;
  if (result.trinity_signatures.temporal.valid) coherencePoints++;
  if (result.ras_binding.valid) coherencePoints++;

  result.coherence = coherencePoints / maxPoints;
  result.errors = errors;

  // Valid if coherence >= 0.999 (6/6 checks pass)
  result.valid = result.coherence >= 0.999 && errors.length === 0;

  return result;
}

// Verify a Blake3 hash against stored Trinity seals
export async function verifyBlake3Hash(
  env: Env,
  hash: string
): Promise<{ found: boolean; capsule?: any; verification?: TrinityVerificationResult }> {
  // Normalize hash format
  const normalizedHash = hash.replace(/^(blake3|b3):/, '');

  // Check D1 for stored capsule
  const stored = await env.DB.prepare(`
    SELECT capsule_data FROM trinity_seals WHERE file_hash = ?
  `).bind(normalizedHash).first<{ capsule_data: string }>();

  if (!stored) {
    return { found: false };
  }

  const capsule = JSON.parse(stored.capsule_data) as QCMCapsule;
  const verification = await verifyTrinityCapsule(capsule, hash);

  return {
    found: true,
    capsule,
    verification
  };
}

// Store a new Trinity seal (for sync from air-gapped hardware)
export async function storeTrinitySeal(
  env: Env,
  capsule: QCMCapsule
): Promise<{ success: boolean; error?: string }> {
  const verification = await verifyTrinityCapsule(capsule);

  if (!verification.valid) {
    return {
      success: false,
      error: `Invalid capsule: ${verification.errors.join(', ')}`
    };
  }

  const fileHash = capsule.Ψ?.[1]?.replace(/^(blake3|b3):/, '') || '';

  await env.DB.prepare(`
    INSERT INTO trinity_seals (
      file_hash, algorithm, timestamp, phi_resonance,
      coherence, capsule_data, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(file_hash) DO UPDATE SET
      capsule_data = excluded.capsule_data,
      coherence = excluded.coherence
  `).bind(
    fileHash,
    capsule.Ψ?.[0] || 'blake3',
    capsule.τ,
    capsule.φ,
    verification.coherence,
    JSON.stringify(capsule)
  ).run();

  return { success: true };
}

// Batch store multiple seals (for syncing 626+ files)
export async function batchStoreTrinitySeal(
  env: Env,
  capsules: QCMCapsule[]
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  // Process in batches of 50
  for (let i = 0; i < capsules.length; i += 50) {
    const batch = capsules.slice(i, i + 50);

    const results = await Promise.all(
      batch.map(capsule => storeTrinitySeal(env, capsule))
    );

    for (const result of results) {
      if (result.success) {
        success++;
      } else {
        failed++;
        if (result.error) errors.push(result.error);
      }
    }
  }

  return { success, failed, errors };
}
