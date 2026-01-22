/**
 * Quantum-Classical Mesh Integration Hub Tests
 * Tests for QCM pipeline, quantum state simulation, and unified scoring
 */

const {
  QuantumClassicalMesh,
  createQCMIntegration,
  analyzeWithQCM,
  PHI,
  RESONANCE_FREQ
} = require('../qcm-integration-hub');

describe('QuantumClassicalMesh', () => {
  let qcm;

  beforeEach(() => {
    qcm = new QuantumClassicalMesh({
      phiAmplification: true,
      flashSyncEnabled: true,
      coherenceThreshold: 0.85,
      swarmSize: 26
    });
  });

  test('should initialize with correct configuration', () => {
    expect(qcm.config.phiAmplification).toBe(true);
    expect(qcm.config.flashSyncEnabled).toBe(true);
    expect(qcm.config.swarmSize).toBe(26);
  });

  test('should analyze repository with files', async () => {
    const files = [
      {
        path: 'src/utils.js',
        content: `
          function helper(x) {
            return x * 2;
          }
        `,
        hash: 'abc123'
      },
      {
        path: 'src/main.js',
        content: `
          const helper = require('./utils');
          console.log(helper(5));
        `,
        hash: 'def456'
      }
    ];

    const result = await qcm.analyzeRepository(files);

    expect(result.classical).toBeDefined();
    expect(result.quantum).toBeDefined();
    expect(result.swarm).toBeDefined();
    expect(result.flash).toBeDefined();
    expect(result.unified).toBeDefined();
  });

  test('should calculate quantum coherence', async () => {
    const files = [{
      path: 'test.js',
      content: 'const x = 1;',
      hash: 'test123'
    }];

    const result = await qcm.analyzeRepository(files);

    expect(result.quantum.coherence).toBeGreaterThanOrEqual(0);
    expect(result.quantum.coherence).toBeLessThanOrEqual(1);
  });

  test('should generate Gödel signature', async () => {
    const files = [{
      path: 'test.js',
      content: 'function test() {}',
      hash: 'abc'
    }];

    const result = await qcm.analyzeRepository(files);

    expect(result.quantum.godelSignature).toBeDefined();
    expect(typeof result.quantum.godelSignature).toBe('string');
  });

  test('should return flash sync status', async () => {
    const files = [{
      path: 'test.js',
      content: 'const x = 1;',
      hash: 'abc'
    }];

    const result = await qcm.analyzeRepository(files);

    expect(result.flash.synced).toBeDefined();
    expect(result.flash.cascadeLevel).toBeDefined();
  });

  test('should activate swarm nodes', async () => {
    const files = [{
      path: 'test.js',
      content: 'const x = 1;',
      hash: 'abc'
    }];

    const result = await qcm.analyzeRepository(files);

    expect(result.swarm.nodesActive).toBeGreaterThan(0);
    expect(result.swarm.nodesActive).toBeLessThanOrEqual(26);
  });

  test('should calculate unified score', async () => {
    const files = [{
      path: 'clean.js',
      content: `
        function clean(x) {
          return x + 1;
        }
      `,
      hash: 'abc'
    }];

    const result = await qcm.analyzeRepository(files);

    expect(result.unified.score).toBeGreaterThan(0);
    expect(result.unified.score).toBeLessThanOrEqual(100);
  });

  test('should handle empty files array', async () => {
    const result = await qcm.analyzeRepository([]);

    expect(result.classical.files).toHaveLength(0);
    expect(result.unified.score).toBeDefined(); // Score is calculated even for empty
  });
});

describe('createQCMIntegration', () => {
  test('should create QCM instance with factory function', () => {
    const qcm = createQCMIntegration({
      phiAmplification: false,
      swarmSize: 10
    });

    expect(qcm).toBeInstanceOf(QuantumClassicalMesh);
  });

  test('should use default options', () => {
    const qcm = createQCMIntegration();
    expect(qcm.config.phiAmplification).toBe(true);
  });
});

describe('analyzeWithQCM', () => {
  test('should run quick analysis', async () => {
    const files = [{
      path: 'test.js',
      content: 'const x = 1;',
      hash: 'abc'
    }];

    const result = await analyzeWithQCM(files);

    expect(result.unified).toBeDefined();
    expect(result.unified.score).toBeGreaterThan(0);
  });

  test('should accept custom options', async () => {
    const files = [{
      path: 'test.js',
      content: 'const x = 1;',
      hash: 'abc'
    }];

    const result = await analyzeWithQCM(files, {
      coherenceThreshold: 0.9,
      swarmSize: 10
    });

    expect(result).toBeDefined();
  });
});

describe('QCM Pipeline Phases', () => {
  let qcm;

  beforeEach(() => {
    qcm = new QuantumClassicalMesh();
  });

  test('Phase 1: Classical AST analysis should run', async () => {
    const files = [{
      path: 'test.js',
      content: `
        function complexFunc(x, y) {
          if (x > 0) {
            return y * 2;
          }
          return y;
        }
      `,
      hash: 'abc'
    }];

    const result = await qcm.analyzeRepository(files);

    expect(result.classical.files.length).toBe(1);
    expect(result.classical.summary).toBeDefined();
  });

  test('Phase 2: Quantum state preparation should calculate amplitudes', async () => {
    const files = [
      { path: 'a.js', content: 'const a = 1;', hash: 'a' },
      { path: 'b.js', content: 'const b = 2;', hash: 'b' }
    ];

    const result = await qcm.analyzeRepository(files);

    expect(result.quantum).toBeDefined();
    expect(result.quantum.coherence).toBeGreaterThan(0);
  });

  test('Phase 3: Swarm consensus should be reached', async () => {
    const files = [{
      path: 'test.js',
      content: 'const x = 1;',
      hash: 'abc'
    }];

    const result = await qcm.analyzeRepository(files);

    expect(result.swarm.consensus).toBeGreaterThanOrEqual(0);
    expect(result.swarm.consensus).toBeLessThanOrEqual(1);
  });

  test('Phase 4: Flash sync cascade should execute', async () => {
    const files = [{
      path: 'test.js',
      content: 'const x = 1;',
      hash: 'abc'
    }];

    const result = await qcm.analyzeRepository(files);

    expect(result.flash.cascadeLevel).toBeGreaterThanOrEqual(0);
    expect(result.flash.cascadeLevel).toBeLessThanOrEqual(4);
  });

  test('Phase 5: Unified scoring should blend all phases', async () => {
    const files = [{
      path: 'test.js',
      content: 'function test() { return 1; }',
      hash: 'abc'
    }];

    const result = await qcm.analyzeRepository(files);

    // Unified score should be calculated from all components
    expect(result.unified.score).toBeDefined();
    expect(result.unified.score).toBeGreaterThan(0);
    // Classical, quantum, and swarm results should exist
    expect(result.classical).toBeDefined();
    expect(result.quantum).toBeDefined();
    expect(result.swarm).toBeDefined();
  });
});

describe('Constants', () => {
  test('PHI should match golden ratio', () => {
    expect(PHI).toBeCloseTo(1.618033988749895, 10);
  });

  test('RESONANCE_FREQ should be correct', () => {
    expect(RESONANCE_FREQ).toBe(7777.77);
  });
});

describe('Edge Cases', () => {
  let qcm;

  beforeEach(() => {
    qcm = new QuantumClassicalMesh();
  });

  test('should handle files with syntax errors gracefully', async () => {
    const files = [{
      path: 'broken.js',
      content: 'function broken( { return; }',
      hash: 'broken'
    }];

    // Should not throw, just return lower scores
    const result = await qcm.analyzeRepository(files);
    expect(result).toBeDefined();
  });

  test('should handle very large files', async () => {
    const largeContent = 'const x = 1;\n'.repeat(1000);
    const files = [{
      path: 'large.js',
      content: largeContent,
      hash: 'large'
    }];

    const result = await qcm.analyzeRepository(files);
    expect(result.unified.score).toBeDefined();
  });

  test('should handle files with security vulnerabilities', async () => {
    const files = [{
      path: 'vulnerable.js',
      content: `
        function dangerous(input) {
          eval(input);
          document.innerHTML = input;
        }
      `,
      hash: 'vuln'
    }];

    const result = await qcm.analyzeRepository(files);

    // Score should be penalized for security issues
    expect(result.unified.score).toBeLessThan(90);
  });
});
