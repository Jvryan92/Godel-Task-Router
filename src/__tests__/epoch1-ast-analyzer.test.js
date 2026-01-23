/**
 * EPOCH1 AST Analyzer Test Suite
 * Tests for the core AST analysis and quality scoring engine
 */

const { EPOCH1ASTAnalyzer, QualityScoringEngine, generateAnalysisReport } = require('../epoch1-ast-analyzer');

describe('EPOCH1ASTAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new EPOCH1ASTAnalyzer({
      qualityThreshold: 70,
      analysisDepth: 'deep'
    });
  });

  describe('analyzeCode', () => {
    test('should analyze simple code without issues', async () => {
      const code = `
        const add = (a, b) => a + b;
        const result = add(1, 2);
      `;
      const result = await analyzer.analyzeCode(code, 'test.js');

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('complexity');
      expect(result).toHaveProperty('maintainability');
      expect(result).toHaveProperty('issues');
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    test('should detect high complexity', async () => {
      const complexCode = `
        function complex(a, b, c) {
          if (a) {
            if (b) {
              if (c) {
                for (let i = 0; i < 10; i++) {
                  while (true) {
                    switch (i) {
                      case 1: break;
                      case 2: break;
                      default: break;
                    }
                  }
                }
              }
            }
          }
        }
      `;
      const result = await analyzer.analyzeCode(complexCode, 'complex.js');

      expect(result.complexity).toBeGreaterThan(10);
      expect(result.issues.some(i => i.type === 'complexity')).toBe(true);
    });

    test('should detect security patterns', async () => {
      const insecureCode = `
        const userInput = req.body.data;
        eval(userInput);
        document.innerHTML = userInput;
      `;
      const result = await analyzer.analyzeCode(insecureCode, 'insecure.js');

      expect(result.issues.some(i => i.type === 'security')).toBe(true);
    });

    test('should detect promise chain anti-pattern', async () => {
      const promiseCode = `
        fetch('/api').then(r => r.json()).then(data => process(data)).then(result => save(result));
      `;
      const result = await analyzer.analyzeCode(promiseCode, 'promises.js');

      expect(result.issues.some(i => i.type === 'pattern')).toBe(true);
    });
  });

  describe('calculateComplexity', () => {
    test('should calculate cyclomatic complexity', () => {
      const simpleCode = 'const x = 1;';
      const complexCode = 'if (a) { if (b) { for (c) { while (d) { } } } }';

      const simpleComplexity = analyzer.calculateComplexity(simpleCode);
      const highComplexity = analyzer.calculateComplexity(complexCode);

      expect(simpleComplexity).toBeLessThan(highComplexity);
    });
  });

  describe('getMetrics', () => {
    test('should return accumulated metrics', async () => {
      await analyzer.analyzeCode('const x = 1;', 'file1.js');
      await analyzer.analyzeCode('const y = 2;', 'file2.js');

      const metrics = analyzer.getMetrics();

      expect(metrics.filesAnalyzed).toBe(2);
      expect(metrics).toHaveProperty('qualityScore');
    });
  });
});

describe('QualityScoringEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new QualityScoringEngine();
  });

  describe('calculateOverallScore', () => {
    test('should calculate 100 for perfect code', () => {
      const results = [
        { issues: [], suggestions: [] },
        { issues: [], suggestions: [] }
      ];

      const score = engine.calculateOverallScore(results);
      expect(score).toBe(100);
    });

    test('should penalize critical issues', () => {
      const results = [
        { issues: [{ severity: 'critical' }], suggestions: [] }
      ];

      const score = engine.calculateOverallScore(results);
      expect(score).toBeLessThan(100);
    });
  });

  describe('generateReport', () => {
    test('should generate a complete report', () => {
      const results = [
        {
          path: 'test.js',
          score: 85,
          complexity: 5,
          maintainability: 80,
          issues: [{ severity: 'warning', message: 'test warning' }],
          suggestions: [{ message: 'test suggestion' }]
        }
      ];

      const report = engine.generateReport(results);

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('details');
      expect(report.summary.totalFiles).toBe(1);
      expect(report.summary.warnings).toBe(1);
    });
  });
});

describe('generateAnalysisReport', () => {
  test('should generate markdown report', () => {
    const results = [
      {
        path: 'test.js',
        score: 90,
        complexity: 3,
        maintainability: 85,
        issues: [],
        suggestions: []
      }
    ];

    const output = generateAnalysisReport(results);

    expect(output).toHaveProperty('report');
    expect(output).toHaveProperty('markdown');
    expect(output).toHaveProperty('score');
    expect(output.markdown).toContain('# EPOCH1 Code Analysis Report');
  });
});
