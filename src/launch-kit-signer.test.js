/**
 * LAUNCH KIT SIGNER - TEST SUITE
 * ==============================
 * Tests for Blake3 + Triple SHA3 + GPG Capsule signing system
 */

const {
  Blake3Hasher,
  TripleSHA3Hasher,
  GPGKeyCapsule,
  HashNode,
  ParallelFlashSyncHasher,
  CLxLKS,
  createLaunchKitSigner,
  quickSignArtifact,
  flashSyncHashAllNodes,
  PHI,
  QUANTUM_SEAL,
  ALL_NODES
} = require('./launch-kit-signer');

// ============================================================================
// TEST UTILITIES
// ============================================================================

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function assertExists(value, name) {
  assert(value !== undefined && value !== null, `${name} should exist`);
}

function assertLength(value, minLen, name) {
  assert(
    value && value.length >= minLen,
    `${name} should have length >= ${minLen}, got ${value?.length}`
  );
}

async function runTest(name, testFn) {
  try {
    await testFn();
    console.log(`  [PASS] ${name}`);
    return true;
  } catch (error) {
    console.log(`  [FAIL] ${name}: ${error.message}`);
    return false;
  }
}

// ============================================================================
// BLAKE3 HASHER TESTS
// ============================================================================

async function testBlake3Hasher() {
  console.log('\n--- Blake3Hasher Tests ---');

  await runTest('should create hasher instance', () => {
    const hasher = new Blake3Hasher();
    assertExists(hasher, 'hasher');
    assertExists(hasher.hash, 'hash method');
  });

  await runTest('should hash string data', () => {
    const hasher = new Blake3Hasher();
    const hash = hasher.hash('test data');
    assertExists(hash, 'hash result');
    assertLength(hash, 64, 'hash hex'); // 32 bytes = 64 hex chars
  });

  await runTest('should produce deterministic hashes', () => {
    const hasher = new Blake3Hasher();
    const hash1 = hasher.hash('deterministic');
    const hash2 = hasher.hash('deterministic');
    assert(hash1 === hash2, 'Same input should produce same hash');
  });

  await runTest('should produce different hashes for different inputs', () => {
    const hasher = new Blake3Hasher();
    const hash1 = hasher.hash('input1');
    const hash2 = hasher.hash('input2');
    assert(hash1 !== hash2, 'Different inputs should produce different hashes');
  });

  await runTest('should support keyed hashing', () => {
    const hasher = new Blake3Hasher();
    const keyedHash = hasher.keyedHash('mykey', 'data', 32);
    assertExists(keyedHash, 'keyed hash');
    assertLength(keyedHash, 64, 'keyed hash hex');
  });

  await runTest('should support variable output lengths', () => {
    const hasher = new Blake3Hasher();
    const hash16 = hasher.hash('test', 16);
    const hash32 = hasher.hash('test', 32);
    const hash64 = hasher.hash('test', 64);
    assert(hash16.length === 32, '16 bytes = 32 hex chars');
    assert(hash32.length === 64, '32 bytes = 64 hex chars');
    assert(hash64.length === 128, '64 bytes = 128 hex chars');
  });
}

// ============================================================================
// TRIPLE SHA3 HASHER TESTS
// ============================================================================

async function testTripleSHA3Hasher() {
  console.log('\n--- TripleSHA3Hasher Tests ---');

  await runTest('should create hasher instance', () => {
    const hasher = new TripleSHA3Hasher();
    assertExists(hasher, 'hasher');
    assert(hasher.iterations === 3, 'Should have 3 iterations');
  });

  await runTest('should perform triple SHA3 cascade', () => {
    const hasher = new TripleSHA3Hasher();
    const result = hasher.hash('cascade test');
    assertExists(result.final, 'final hash');
    assertExists(result.intermediates, 'intermediates');
    assert(result.intermediates.length === 3, 'Should have 3 intermediates');
  });

  await runTest('should include correct variants', () => {
    const hasher = new TripleSHA3Hasher();
    const result = hasher.hash('variant test');
    const variants = result.intermediates.map(i => i.variant);
    assert(variants.includes('sha3-256'), 'Should include sha3-256');
    assert(variants.includes('sha3-384'), 'Should include sha3-384');
    assert(variants.includes('sha3-512'), 'Should include sha3-512');
  });

  await runTest('should support PHI amplification', () => {
    const hasher = new TripleSHA3Hasher();
    const result = hasher.hashWithPhi('phi test', 2);
    assertExists(result.amplified, 'amplified hash');
    assertExists(result.phiMultiplier, 'phi multiplier');
    assert(result.phiExponent === 2, 'Should have exponent 2');
  });
}

// ============================================================================
// GPG KEY CAPSULE TESTS
// ============================================================================

async function testGPGKeyCapsule() {
  console.log('\n--- GPGKeyCapsule Tests ---');

  await runTest('should create capsule with UUID', () => {
    const capsule = new GPGKeyCapsule();
    assertExists(capsule.uuid, 'uuid');
    assertLength(capsule.uuid, 20, 'uuid');
  });

  await runTest('should create capsule with custom UUID', () => {
    const customUUID = 'custom-test-uuid-1234';
    const capsule = new GPGKeyCapsule(customUUID);
    assert(capsule.uuid === customUUID, 'Should use custom UUID');
  });

  await runTest('should generate Ed25519 key pair', async () => {
    const capsule = new GPGKeyCapsule();
    const publicInfo = await capsule.generateEd25519();
    assertExists(publicInfo.publicKey, 'public key');
    assertExists(publicInfo.fingerprint, 'fingerprint');
    assert(publicInfo.algorithm === 'Ed25519', 'Should be Ed25519');
  });

  await runTest('should generate RSA key pair', async () => {
    const capsule = new GPGKeyCapsule();
    const publicInfo = await capsule.generateKeyPair(2048);
    assertExists(publicInfo.publicKey, 'public key');
    assertExists(publicInfo.fingerprint, 'fingerprint');
    assert(publicInfo.algorithm === 'RSA', 'Should be RSA');
  });

  await runTest('should sign and verify data', async () => {
    const capsule = new GPGKeyCapsule();
    await capsule.generateEd25519();

    const data = 'test message to sign';
    const signed = capsule.sign(data);
    assertExists(signed.signature, 'signature');
    assertExists(signed.capsuleUUID, 'capsule UUID');

    const verified = capsule.verify(data, signed.signature);
    assert(verified === true, 'Signature should verify');
  });

  await runTest('should reject invalid signature', async () => {
    const capsule = new GPGKeyCapsule();
    await capsule.generateEd25519();

    const data = 'original message';
    const signed = capsule.sign(data);

    const verified = capsule.verify('tampered message', signed.signature);
    assert(verified === false, 'Tampered data should not verify');
  });
}

// ============================================================================
// HASH NODE TESTS
// ============================================================================

async function testHashNode() {
  console.log('\n--- HashNode Tests ---');

  await runTest('should create node with correct properties', () => {
    const node = new HashNode('A', 'infrastructure');
    assert(node.id === 'A', 'ID should be A');
    assert(node.layer === 'infrastructure', 'Layer should be infrastructure');
    assert(node.state === 'idle', 'Initial state should be idle');
    assertExists(node.weight, 'weight');
  });

  await runTest('should process hash with hashers', async () => {
    const node = new HashNode('M', 'application');
    const hashers = {
      blake3: new Blake3Hasher(),
      sha3: new TripleSHA3Hasher()
    };

    const result = await node.processHash('test data', hashers);
    assertExists(result.blake3, 'blake3 hash');
    assertExists(result.sha3Triple, 'sha3 triple hash');
    assertExists(result.finalHash, 'final hash');
    assert(node.state === 'complete', 'State should be complete');
  });

  await runTest('should track hash history', async () => {
    const node = new HashNode('Z', 'quantum');
    const hashers = {
      blake3: new Blake3Hasher(),
      sha3: new TripleSHA3Hasher()
    };

    await node.processHash('data1', hashers);
    await node.processHash('data2', hashers);

    assert(node.hashHistory.length === 2, 'Should have 2 history entries');
  });
}

// ============================================================================
// PARALLEL FLASH SYNC HASHER TESTS
// ============================================================================

async function testParallelFlashSyncHasher() {
  console.log('\n--- ParallelFlashSyncHasher Tests ---');

  await runTest('should initialize all 26 nodes', () => {
    const hasher = new ParallelFlashSyncHasher();
    assert(hasher.nodes.size === 26, 'Should have 26 nodes');
    assert(ALL_NODES.length === 26, 'ALL_NODES should have 26 entries');
  });

  await runTest('should flash sync hash in parallel', async () => {
    const hasher = new ParallelFlashSyncHasher();
    const result = await hasher.flashSyncHash('parallel test data');

    assertExists(result.timestamp, 'timestamp');
    assert(result.nodeCount === 26, 'Should process all 26 nodes');
    assert(result.parallelProcessing === true, 'Should be parallel');
    assertExists(result.aggregateHash, 'aggregate hash');
    assertExists(result.aggregateHash.merkleRoot, 'merkle root');
  });

  await runTest('should calculate coherence', async () => {
    const hasher = new ParallelFlashSyncHasher();
    const result = await hasher.flashSyncHash('coherence test');

    assert(result.coherence >= 0 && result.coherence <= 1, 'Coherence should be 0-1');
  });

  await runTest('should create GPG capsules', async () => {
    const hasher = new ParallelFlashSyncHasher();
    const capsule = await hasher.createCapsule('test-artifact');

    assertExists(capsule.uuid, 'uuid');
    assertExists(capsule.fingerprint, 'fingerprint');
  });

  await runTest('should sign and verify artifacts', async () => {
    const hasher = new ParallelFlashSyncHasher();

    const signed = await hasher.signArtifact(
      'artifact content',
      'artifact-123'
    );

    assertExists(signed.capsuleUUID, 'capsule UUID');
    assertExists(signed.signature, 'signature');
    assertExists(signed.hashResult, 'hash result');

    const verification = await hasher.verifyArtifact(signed);
    assert(verification.valid === true, 'Should verify successfully');
  });

  await runTest('should batch sign multiple artifacts', async () => {
    const hasher = new ParallelFlashSyncHasher();

    const artifacts = [
      { data: 'artifact 1 content', id: 'art-1' },
      { data: 'artifact 2 content', id: 'art-2' },
      { data: 'artifact 3 content', id: 'art-3' }
    ];

    const batch = await hasher.batchSignArtifacts(artifacts);

    assertExists(batch.batchId, 'batch ID');
    assertExists(batch.batchHash, 'batch hash');
    assert(batch.artifactCount === 3, 'Should have 3 artifacts');
    assert(batch.artifacts.length === 3, 'Should have 3 signed artifacts');
  });
}

// ============================================================================
// CL x LKS INTERFACE TESTS
// ============================================================================

async function testCLxLKS() {
  console.log('\n--- CLxLKS Interface Tests ---');

  await runTest('should create interface instance', () => {
    const clxlks = new CLxLKS();
    assertExists(clxlks.sessionId, 'session ID');
    assertExists(clxlks.signer, 'signer');
  });

  await runTest('should quick sign data', async () => {
    const clxlks = new CLxLKS();
    const result = await clxlks.quickSign('quick sign test', 'quick-artifact');

    assertExists(result.artifactId, 'artifact ID');
    assertExists(result.capsuleUUID, 'capsule UUID');
    assertExists(result.signature, 'signature');
  });

  await runTest('should flash sync all nodes', async () => {
    const clxlks = new CLxLKS();
    const result = await clxlks.flashSyncAllNodes('flash sync data');

    assert(result.nodeCount === 26, 'Should sync all 26 nodes');
    assertExists(result.aggregateHash, 'aggregate hash');
  });

  await runTest('should create multiple launch kit capsules', async () => {
    const clxlks = new CLxLKS();
    const result = await clxlks.createLaunchKitCapsules(5);

    assert(result.capsuleCount === 5, 'Should create 5 capsules');
    assert(result.capsules.length === 5, 'Should have 5 capsule infos');
    assert(result.keyType === 'ed25519', 'Should use ed25519');
  });

  await runTest('should track session summary', async () => {
    const clxlks = new CLxLKS();
    await clxlks.quickSign('test 1');
    await clxlks.quickSign('test 2');

    const summary = clxlks.getSessionSummary();
    assert(summary.totalSignatures === 2, 'Should have 2 signatures');
    assertExists(summary.nodeStatus, 'node status');
  });
}

// ============================================================================
// FACTORY FUNCTION TESTS
// ============================================================================

async function testFactoryFunctions() {
  console.log('\n--- Factory Function Tests ---');

  await runTest('createLaunchKitSigner should work', () => {
    const signer = createLaunchKitSigner();
    assertExists(signer, 'signer');
    assertExists(signer.quickSign, 'quickSign method');
  });

  await runTest('quickSignArtifact should work', async () => {
    const result = await quickSignArtifact('factory test data', 'factory-artifact');
    assertExists(result.capsuleUUID, 'capsule UUID');
    assertExists(result.signature, 'signature');
  });

  await runTest('flashSyncHashAllNodes should work', async () => {
    const result = await flashSyncHashAllNodes('factory flash sync');
    assert(result.nodeCount === 26, 'Should hash with all 26 nodes');
    assertExists(result.aggregateHash.merkleRoot, 'merkle root');
  });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('LAUNCH KIT SIGNER - TEST SUITE');
  console.log('Blake3 + Triple SHA3 + GPG Capsule + Parallel Flash Sync');
  console.log('='.repeat(60));

  const startTime = Date.now();

  await testBlake3Hasher();
  await testTripleSHA3Hasher();
  await testGPGKeyCapsule();
  await testHashNode();
  await testParallelFlashSyncHasher();
  await testCLxLKS();
  await testFactoryFunctions();

  const elapsed = Date.now() - startTime;

  console.log('\n' + '='.repeat(60));
  console.log(`TEST SUITE COMPLETE - ${elapsed}ms`);
  console.log(`PHI: ${PHI}`);
  console.log(`QUANTUM_SEAL: ${QUANTUM_SEAL}`);
  console.log(`NODES: ${ALL_NODES.length} (A-Z)`);
  console.log('='.repeat(60));
}

// Run tests if this is the main module
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };
