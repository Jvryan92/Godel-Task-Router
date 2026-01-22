/**
 * Swarm Flash Sync Module Tests
 * Tests for 26-Node A-Z Matrix, Flash Sync, and Consensus Protocols
 */

const {
  SwarmNode,
  SwarmMatrix,
  FlashSyncEngine,
  ConsensusProtocol,
  GodelSignatureGenerator,
  SwarmController,
  createSwarmController,
  PHI,
  RESONANCE_FREQ,
  QUANTUM_SEAL
} = require('../swarm-flash-sync');

describe('SwarmNode', () => {
  test('should create node with correct properties', () => {
    const node = new SwarmNode('A', 'infrastructure', 0);
    expect(node.id).toBe('A');
    expect(node.layer).toBe('infrastructure');
    expect(node.index).toBe(0);
    expect(node.state).toBe('ready');
    expect(node.coherence).toBe(1.0);
  });

  test('should calculate PHI-weighted weight', () => {
    const node = new SwarmNode('B', 'infrastructure', 1);
    expect(node.weight).toBeCloseTo(PHI / PHI, 2); // PHI^1 / PHI
  });

  test('should have connections to adjacent and PHI-related nodes', () => {
    const node = new SwarmNode('M', 'application', 12);
    expect(node.connections).toContain('L'); // Adjacent
    expect(node.connections).toContain('N'); // Adjacent
    expect(node.connections.length).toBeGreaterThanOrEqual(3);
  });

  test('should activate and deactivate', () => {
    const node = new SwarmNode('A', 'infrastructure', 0);
    node.activate();
    expect(node.state).toBe('active');
    node.deactivate();
    expect(node.state).toBe('inactive');
  });

  test('should vote with weighted coherence', () => {
    const node = new SwarmNode('A', 'infrastructure', 0);
    node.coherence = 0.9;
    const vote = node.vote(80);
    expect(vote).toBeLessThan(80); // Weighted down
    expect(node.voteHistory.length).toBe(1);
  });

  test('should sync coherence with other nodes', () => {
    const node1 = new SwarmNode('A', 'infrastructure', 0);
    const node2 = new SwarmNode('B', 'infrastructure', 1);
    node1.coherence = 1.0;
    node2.coherence = 0.5;
    node2.sync(node1);
    expect(node2.coherence).toBeGreaterThan(0.5);
  });
});

describe('SwarmMatrix', () => {
  let matrix;

  beforeEach(() => {
    matrix = new SwarmMatrix();
  });

  test('should initialize 26 nodes (A-Z)', () => {
    expect(matrix.nodes.size).toBe(26);
  });

  test('should have 5 layers with correct node distribution', () => {
    expect(matrix.layers.infrastructure.length).toBe(6);  // A-F
    expect(matrix.layers.application.length).toBe(7);     // G-M
    expect(matrix.layers.intelligence.length).toBe(6);    // N-S
    expect(matrix.layers.orchestration.length).toBe(4);   // T-W
    expect(matrix.layers.quantum.length).toBe(3);         // X-Z
  });

  test('should get nodes by layer', () => {
    const infraNodes = matrix.getNodesByLayer('infrastructure');
    expect(infraNodes.length).toBe(6);
    expect(infraNodes[0].id).toBe('A');
  });

  test('should activate all nodes', () => {
    matrix.activateAll();
    const active = matrix.getActiveNodes();
    expect(active.length).toBe(26);
  });

  test('should activate by layer', () => {
    matrix.activateByLayer('quantum');
    const active = matrix.getActiveNodes();
    expect(active.length).toBe(3);
    expect(active.map(n => n.id)).toEqual(['X', 'Y', 'Z']);
  });

  test('should calculate average coherence', () => {
    matrix.activateAll();
    const coherence = matrix.getAverageCoherence();
    expect(coherence).toBe(1.0); // All nodes start with 1.0 coherence
  });

  test('should serialize to JSON', () => {
    matrix.activateAll();
    const json = matrix.toJSON();
    expect(json.totalNodes).toBe(26);
    expect(json.activeNodes).toBe(26);
    expect(json.layers).toHaveProperty('infrastructure');
  });
});

describe('FlashSyncEngine', () => {
  let matrix;
  let engine;

  beforeEach(() => {
    matrix = new SwarmMatrix();
    matrix.activateAll();
    engine = new FlashSyncEngine(matrix);
  });

  test('should execute cascade sync through all levels', async () => {
    const result = await engine.execute({ coherence: 0.85 });
    expect(result.scales.length).toBeGreaterThanOrEqual(1);
    expect(result.synced).toBeDefined();
  });

  test('should achieve resonance with high coherence', async () => {
    const result = await engine.execute({ coherence: 0.95 });
    expect(result.synced).toBe(true);
    expect(result.syncedNodeCount).toBeGreaterThan(0);
  });

  test('should track synced nodes', async () => {
    await engine.execute({ coherence: 0.85 });
    const state = engine.getState();
    expect(state.syncedNodes.length).toBeGreaterThan(0);
  });

  test('should reset state', () => {
    engine.reset();
    const state = engine.getState();
    expect(state.cascadeLevel).toBe(0);
    expect(state.syncedNodes.length).toBe(0);
  });
});

describe('ConsensusProtocol', () => {
  let matrix;
  let consensus;

  beforeEach(() => {
    matrix = new SwarmMatrix();
    matrix.activateAll();
    consensus = new ConsensusProtocol(matrix);
  });

  test('should run quantum_vote consensus', async () => {
    const scores = [80, 85, 90, 75, 88];
    const result = await consensus.runConsensus(scores, 'quantum_vote');
    expect(result.method).toBe('quantum_vote');
    expect(result.consensus).toBeGreaterThanOrEqual(0);
    expect(result.consensus).toBeLessThanOrEqual(1);
  });

  test('should run phi_weighted consensus', async () => {
    const scores = [80, 85, 90, 75, 88];
    const result = await consensus.runConsensus(scores, 'phi_weighted');
    expect(result.method).toBe('phi_weighted');
    expect(result.consensus).toBeGreaterThan(0);
  });

  test('should run byzantine consensus', async () => {
    const scores = [80, 85, 90, 75, 88, 95, 70];
    const result = await consensus.runConsensus(scores, 'byzantine');
    expect(result.method).toBe('byzantine');
    expect(result.threshold).toBeDefined();
  });

  test('should run raft_like consensus', async () => {
    const scores = [80, 85, 90, 75, 88];
    const result = await consensus.runConsensus(scores, 'raft_like');
    expect(result.method).toBe('raft_like');
    expect(result.leader).toBeDefined();
  });

  test('should run harmonic consensus', async () => {
    const scores = [80, 85, 90, 75, 88];
    const result = await consensus.runConsensus(scores, 'harmonic');
    expect(result.method).toBe('harmonic');
    expect(result.participatingNodes).toBe(5);
  });

  test('should throw on unknown algorithm', async () => {
    await expect(consensus.runConsensus([80], 'unknown'))
      .rejects.toThrow('Unknown consensus algorithm');
  });
});

describe('GodelSignatureGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new GodelSignatureGenerator();
  });

  test('should generate deterministic signatures', () => {
    const components = ['test', 'data', QUANTUM_SEAL];
    const sig1 = generator.generate(components);
    const sig2 = generator.generate(components);
    expect(sig1).toBe(sig2);
  });

  test('should generate different signatures for different inputs', () => {
    const sig1 = generator.generate(['a', 'b']);
    const sig2 = generator.generate(['c', 'd']);
    expect(sig1).not.toBe(sig2);
  });

  test('should verify signatures', () => {
    const components = ['test', 'data'];
    const signature = generator.generate(components);
    expect(generator.verify(signature, components)).toBe(true);
    expect(generator.verify(signature, ['wrong'])).toBe(false);
  });

  test('should generate signatures with metadata', () => {
    const components = ['test'];
    const result = generator.generateWithMetadata(components);
    expect(result.signature).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.quantumSeal).toBe(QUANTUM_SEAL);
  });
});

describe('SwarmController', () => {
  let controller;

  beforeEach(() => {
    controller = createSwarmController({
      phiAmplification: true
    });
  });

  test('should run full analysis', async () => {
    const result = await controller.analyze(
      { scores: [80, 85, 90, 75, 88] },
      { coherence: 0.85, consensusAlgorithm: 'phi_weighted' }
    );
    expect(result.swarm).toBeDefined();
    expect(result.flashSync).toBeDefined();
    expect(result.consensus).toBeDefined();
    expect(result.godelSignature).toBeDefined();
  });

  test('should run quick consensus', async () => {
    const result = await controller.quickConsensus([80, 85, 90]);
    expect(result.consensus).toBeGreaterThan(0);
  });

  test('should run quick flash sync', async () => {
    const result = await controller.quickFlashSync(0.9);
    expect(result.synced).toBeDefined();
  });

  test('should get current state', () => {
    const state = controller.getState();
    expect(state.matrix).toBeDefined();
    expect(state.flashSync).toBeDefined();
  });

  test('should reset all components', async () => {
    await controller.analyze({ scores: [80] });
    controller.reset();
    const state = controller.getState();
    expect(state.matrix.activeNodes).toBe(0);
  });
});

describe('Constants', () => {
  test('PHI should be golden ratio', () => {
    expect(PHI).toBeCloseTo(1.618033988749895, 10);
  });

  test('RESONANCE_FREQ should be 7777.77Hz', () => {
    expect(RESONANCE_FREQ).toBe(7777.77);
  });

  test('QUANTUM_SEAL should be defined', () => {
    expect(QUANTUM_SEAL).toBe('40668c787c463ca5');
  });
});
