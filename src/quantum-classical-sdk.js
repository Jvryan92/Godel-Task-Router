/**
 * GÖDEL TASK ROUTER - QUANTUM-CLASSICAL SDK
 * ==========================================
 * Unified SDK for the first-to-market quantum-classical code analysis platform
 *
 * This SDK provides seamless integration of:
 * - EPOCH1 AST Analyzer (Classical code analysis)
 * - Quantum-Classical Mesh (QCM) Integration Hub
 * - Swarm Flash Sync Engine (Distributed consensus)
 * - Gödel Number Signatures (Mathematical provenance)
 *
 * @version 1.0.0
 * @author EpochCore Quantum Enterprise
 * @waterseal 40668c787c463ca5
 */

// ============================================================================
// IMPORTS
// ============================================================================

const {
  EPOCH1ASTAnalyzer,
  QualityScoringEngine,
  generateAnalysisReport,
  generateMarkdownReport
} = require('./epoch1-ast-analyzer');

const {
  QuantumClassicalMesh,
  createQCMIntegration,
  analyzeWithQCM,
  PHI: QCM_PHI,
  RESONANCE_FREQ: QCM_RESONANCE,
  QUANTUM_SEAL: QCM_SEAL
} = require('./qcm-integration-hub');

const {
  SwarmNode,
  SwarmMatrix,
  FlashSyncEngine,
  ConsensusProtocol,
  GodelSignatureGenerator,
  SwarmController,
  createSwarmController,
  runSwarmAnalysis,
  PHI: SWARM_PHI,
  RESONANCE_FREQ: SWARM_RESONANCE,
  QUANTUM_SEAL: SWARM_SEAL,
  CASCADE_LEVELS,
  PHI_MULTIPLIERS
} = require('./swarm-flash-sync');

// ============================================================================
// UNIFIED CONSTANTS
// ============================================================================

const SDK_VERSION = '1.0.0';
const PHI = 1.618033988749895;
const RESONANCE_FREQ = 7777.77;
const QUANTUM_SEAL = '40668c787c463ca5';

// ============================================================================
// UNIFIED GÖDEL TASK ROUTER CLASS
// ============================================================================

class GodelTaskRouter {
  constructor(options = {}) {
    this.config = {
      mode: options.mode || 'standard',
      phiAmplification: options.phiAmplification !== false,
      flashSyncEnabled: options.flashSyncEnabled !== false,
      coherenceThreshold: options.coherenceThreshold || 0.85,
      swarmSize: options.swarmSize || 26,
      ...options
    };

    // Initialize all components
    this.astAnalyzer = new EPOCH1ASTAnalyzer(options.astConfig || {});
    this.scoringEngine = new QualityScoringEngine();
    this.qcmMesh = createQCMIntegration(this.config);
    this.swarmController = createSwarmController(this.config);
    this.godelGenerator = new GodelSignatureGenerator();

    // State
    this.lastAnalysis = null;
    this.analysisHistory = [];
  }

  /**
   * Run full quantum-classical analysis on files
   * @param {Array} files - Array of { path, content } objects
   * @param {Object} options - Analysis options
   * @returns {Object} Complete analysis results
   */
  async analyze(files, options = {}) {
    const startTime = Date.now();
    const results = {
      version: SDK_VERSION,
      timestamp: new Date().toISOString(),
      quantumSeal: QUANTUM_SEAL,
      config: this.config,

      // Phase results
      classical: null,
      quantum: null,
      swarm: null,
      flash: null,

      // Unified results
      unified: {
        score: 0,
        grade: 'N/A',
        findings: [],
        godelSignature: null
      },

      // Metadata
      processingTime: 0,
      filesAnalyzed: 0
    };

    try {
      // Phase 1: Classical AST Analysis
      console.log('[GTR] Phase 1: Classical AST Analysis...');
      results.classical = await this.runClassicalAnalysis(files);

      // Phase 2: Quantum-Classical Mesh
      console.log('[GTR] Phase 2: Quantum-Classical Mesh Integration...');
      const qcmResult = await this.qcmMesh.analyzeRepository(
        files.map(f => ({ path: f.path, content: f.content, hash: f.hash || '' }))
      );
      results.quantum = {
        coherence: qcmResult.quantum.coherence,
        entanglementCount: qcmResult.quantum.entanglementCount,
        godelSignature: qcmResult.quantum.godelSignature
      };

      // Phase 3: Swarm Consensus
      console.log('[GTR] Phase 3: Swarm Flash Sync...');
      const scores = results.classical.files.map(f => f.score || 50);
      const swarmResult = await this.swarmController.analyze({ scores }, {
        coherence: qcmResult.quantum.coherence,
        consensusAlgorithm: options.consensusAlgorithm || 'phi_weighted'
      });
      results.swarm = {
        nodesActive: swarmResult.swarm.activeNodes,
        consensus: swarmResult.consensus?.consensus || 0,
        method: swarmResult.consensus?.method || 'none'
      };
      results.flash = swarmResult.flashSync;

      // Calculate unified score
      results.unified = this.calculateUnifiedResults(results, qcmResult);
      results.filesAnalyzed = files.length;
      results.processingTime = Date.now() - startTime;

      // Store in history
      this.lastAnalysis = results;
      this.analysisHistory.push({
        timestamp: results.timestamp,
        score: results.unified.score,
        filesAnalyzed: results.filesAnalyzed
      });

    } catch (error) {
      results.error = error.message;
      results.unified.score = 0;
      results.unified.grade = 'ERROR';
    }

    return results;
  }

  async runClassicalAnalysis(files) {
    const analysisResults = [];

    for (const file of files) {
      if (!file.content) continue;

      try {
        const result = await this.astAnalyzer.analyzeCode(file.content, file.path);
        analysisResults.push(result);
      } catch (error) {
        analysisResults.push({
          path: file.path,
          score: 0,
          error: error.message,
          issues: [],
          suggestions: []
        });
      }
    }

    return {
      files: analysisResults,
      summary: this.scoringEngine.generateReport(analysisResults)
    };
  }

  calculateUnifiedResults(results, qcmResult) {
    // Weighted combination of all phases
    const weights = {
      classical: 0.35,
      quantum: 0.20,
      swarm: 0.30,
      flash: 0.15
    };

    const classicalScore = results.classical.summary?.overallScore || 50;
    const quantumScore = results.quantum.coherence * 100;
    const swarmScore = results.swarm.consensus * 100;
    const flashScore = results.flash.synced ?
      (results.flash.resonanceAchieved ? 100 : 80) : 50;

    const unifiedScore = Math.round(
      classicalScore * weights.classical +
      quantumScore * weights.quantum +
      swarmScore * weights.swarm +
      flashScore * weights.flash
    );

    const score = Math.max(0, Math.min(100, unifiedScore));

    // Calculate grade
    let grade;
    if (score >= 90) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 80) grade = 'A-';
    else if (score >= 75) grade = 'B+';
    else if (score >= 70) grade = 'B';
    else if (score >= 65) grade = 'B-';
    else if (score >= 60) grade = 'C+';
    else if (score >= 55) grade = 'C';
    else if (score >= 50) grade = 'C-';
    else if (score >= 40) grade = 'D';
    else grade = 'F';

    // Collect all findings
    const findings = [];
    if (results.classical.files) {
      for (const file of results.classical.files) {
        for (const issue of (file.issues || [])) {
          findings.push({
            ...issue,
            file: file.path,
            source: 'classical'
          });
        }
      }
    }

    // Generate final Gödel signature
    const godelSignature = this.godelGenerator.generate([
      score,
      results.filesAnalyzed || 0,
      results.quantum.coherence,
      results.swarm.consensus,
      QUANTUM_SEAL,
      Date.now()
    ]);

    return {
      score,
      grade,
      findings,
      godelSignature,
      breakdown: {
        classical: { score: classicalScore, weight: weights.classical },
        quantum: { score: quantumScore, weight: weights.quantum },
        swarm: { score: swarmScore, weight: weights.swarm },
        flash: { score: flashScore, weight: weights.flash }
      }
    };
  }

  /**
   * Quick analysis - just AST analysis without full quantum-classical integration
   */
  async quickAnalyze(files) {
    return await this.runClassicalAnalysis(files);
  }

  /**
   * Generate markdown report from last analysis
   */
  generateReport() {
    if (!this.lastAnalysis) {
      return '# No Analysis Available\nRun analyze() first.';
    }

    const r = this.lastAnalysis;
    const lines = [
      '# Gödel Task Router Analysis Report',
      '',
      `**Version:** ${r.version}`,
      `**Timestamp:** ${r.timestamp}`,
      `**Quantum Seal:** \`${r.quantumSeal}\``,
      '',
      '## Summary',
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Unified Score | ${r.unified.score}/100 (${r.unified.grade}) |`,
      `| Files Analyzed | ${r.filesAnalyzed} |`,
      `| Processing Time | ${r.processingTime}ms |`,
      `| Gödel Signature | \`${r.unified.godelSignature?.slice(0, 16)}...\` |`,
      '',
      '## Phase Results',
      '',
      '### Classical Analysis',
      `- **Score:** ${r.classical?.summary?.overallScore || 'N/A'}/100`,
      `- **Critical Issues:** ${r.classical?.summary?.criticalIssues || 0}`,
      `- **Warnings:** ${r.classical?.summary?.warnings || 0}`,
      '',
      '### Quantum State',
      `- **Coherence:** ${((r.quantum?.coherence || 0) * 100).toFixed(2)}%`,
      `- **Entanglement Count:** ${r.quantum?.entanglementCount || 0}`,
      '',
      '### Swarm Consensus',
      `- **Active Nodes:** ${r.swarm?.nodesActive || 0}/26`,
      `- **Consensus:** ${((r.swarm?.consensus || 0) * 100).toFixed(2)}%`,
      `- **Method:** ${r.swarm?.method || 'N/A'}`,
      '',
      '### Flash Sync',
      `- **Status:** ${r.flash?.synced ? 'SYNCED' : 'PARTIAL'}`,
      `- **Resonance:** ${r.flash?.resonanceAchieved ? `ACHIEVED @ ${RESONANCE_FREQ}Hz` : 'Not achieved'}`,
      `- **Synced Nodes:** ${r.flash?.syncedNodeCount || 0}`,
      '',
      '## Score Breakdown',
      '',
      '| Component | Score | Weight | Contribution |',
      '|-----------|-------|--------|--------------|'
    ];

    if (r.unified.breakdown) {
      for (const [key, data] of Object.entries(r.unified.breakdown)) {
        const contribution = (data.score * data.weight).toFixed(1);
        lines.push(`| ${key.charAt(0).toUpperCase() + key.slice(1)} | ${data.score.toFixed(1)} | ${(data.weight * 100).toFixed(0)}% | ${contribution} |`);
      }
    }

    lines.push('');
    lines.push('---');
    lines.push('*Generated by Gödel Task Router Quantum-Classical SDK v1.0*');

    return lines.join('\n');
  }

  /**
   * Get analysis history
   */
  getHistory() {
    return this.analysisHistory;
  }

  /**
   * Reset the router state
   */
  reset() {
    this.qcmMesh.reset();
    this.swarmController.reset();
    this.lastAnalysis = null;
  }
}

// ============================================================================
// QUICK FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new Gödel Task Router instance
 */
function createGodelRouter(options = {}) {
  return new GodelTaskRouter(options);
}

/**
 * Quick full analysis without creating persistent instance
 */
async function analyzeCode(files, options = {}) {
  const router = createGodelRouter(options);
  return await router.analyze(files, options);
}

/**
 * Quick AST-only analysis
 */
async function quickAnalyzeCode(files, options = {}) {
  const router = createGodelRouter(options);
  return await router.quickAnalyze(files);
}

// ============================================================================
// COMPONENT REGISTRY
// ============================================================================

const COMPONENT_REGISTRY = {
  // Core Components
  GodelTaskRouter: {
    class: GodelTaskRouter,
    version: SDK_VERSION,
    description: 'Main unified quantum-classical analysis router'
  },

  // Classical Components
  EPOCH1ASTAnalyzer: {
    class: EPOCH1ASTAnalyzer,
    version: '1.0.0',
    description: 'Classical AST analysis engine'
  },
  QualityScoringEngine: {
    class: QualityScoringEngine,
    version: '1.0.0',
    description: 'Code quality scoring engine'
  },

  // Quantum-Classical Components
  QuantumClassicalMesh: {
    class: QuantumClassicalMesh,
    version: '1.0.0',
    description: 'Quantum-classical integration mesh'
  },

  // Swarm Components
  SwarmController: {
    class: SwarmController,
    version: '1.0.0',
    description: 'Distributed swarm consensus controller'
  },
  SwarmMatrix: {
    class: SwarmMatrix,
    version: '1.0.0',
    description: '26-node A-Z swarm matrix'
  },
  FlashSyncEngine: {
    class: FlashSyncEngine,
    version: '1.0.0',
    description: 'Flash sync cascade engine @ 7777.77Hz'
  },
  ConsensusProtocol: {
    class: ConsensusProtocol,
    version: '1.0.0',
    description: 'Multi-algorithm consensus protocol'
  },
  GodelSignatureGenerator: {
    class: GodelSignatureGenerator,
    version: '1.0.0',
    description: 'Gödel number signature generator'
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main Router
  GodelTaskRouter,
  createGodelRouter,
  analyzeCode,
  quickAnalyzeCode,

  // Classical Components
  EPOCH1ASTAnalyzer,
  QualityScoringEngine,
  generateAnalysisReport,
  generateMarkdownReport,

  // Quantum-Classical Components
  QuantumClassicalMesh,
  createQCMIntegration,
  analyzeWithQCM,

  // Swarm Components
  SwarmNode,
  SwarmMatrix,
  FlashSyncEngine,
  ConsensusProtocol,
  GodelSignatureGenerator,
  SwarmController,
  createSwarmController,
  runSwarmAnalysis,

  // Constants
  SDK_VERSION,
  PHI,
  RESONANCE_FREQ,
  QUANTUM_SEAL,
  CASCADE_LEVELS,
  PHI_MULTIPLIERS,

  // Registry
  COMPONENT_REGISTRY
};
