/**
 * EPOCH1 AST Analyzer Tests
 * Tests for code analysis, quality scoring, and report generation
 */

const {
  EPOCH1ASTAnalyzer,
  QualityScoringEngine,
  generateAnalysisReport,
  generateMarkdownReport
} = require('../epoch1-ast-analyzer');

describe('EPOCH1ASTAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new EPOCH1ASTAnalyzer();
  });

  test('should analyze simple JavaScript code', async () => {
    const code = `
      function add(a, b) {
        return a + b;
      }
    `;
    const result = await analyzer.analyzeCode(code, 'test.js');
    expect(result).toBeDefined();
    expect(result.complexity).toBeDefined();
    expect(result.score).toBeDefined();
  });

  test('should detect security patterns - eval', async () => {
    const code = `
      function dangerous(input) {
        return eval(input);
      }
    `;
    const result = await analyzer.analyzeCode(code, 'test.js');
    expect(result.issues).toBeDefined();
    expect(result.issues.some(i => i.type === 'security' && i.message.includes('eval'))).toBe(true);
  });

  test('should detect security patterns - innerHTML', async () => {
    const code = `
      function xss(element, html) {
        element.innerHTML = html;
      }
    `;
    const result = await analyzer.analyzeCode(code, 'test.js');
    expect(result.issues.some(i => i.type === 'security' && i.message.includes('innerHTML'))).toBe(true);
  });

  test('should calculate cyclomatic complexity', async () => {
    const simpleCode = `function simple() { return 1; }`;
    const complexCode = `
      function complex(x) {
        if (x > 0) {
          if (x > 10) {
            return 'big';
          } else {
            return 'small';
          }
        } else if (x < 0) {
          return 'negative';
        }
        return 'zero';
      }
    `;

    const simple = await analyzer.analyzeCode(simpleCode, 'simple.js');
    const complex = await analyzer.analyzeCode(complexCode, 'complex.js');

    expect(complex.complexity).toBeGreaterThan(simple.complexity);
  });

  test('should detect anti-patterns', async () => {
    const code = `
      getData(callback(a, callback(b, callback(c))));
    `;
    const result = await analyzer.analyzeCode(code, 'test.js');
    expect(result.issues).toBeDefined();
  });

  test('should generate optimization suggestions', async () => {
    const code = `
      for (var i = 0; i < array.length; i++) {
        console.log(array[i]);
      }
    `;
    const result = await analyzer.analyzeCode(code, 'test.js');
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

describe('QualityScoringEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new QualityScoringEngine();
  });

  test('should calculate weighted quality score', () => {
    const analysisResults = [
      {
        path: 'test.js',
        score: 80,
        complexity: 5,
        maintainability: 80,
        issues: [],
        suggestions: []
      }
    ];

    const report = engine.generateReport(analysisResults);
    expect(report.summary.overallScore).toBeGreaterThan(0);
    expect(report.summary.overallScore).toBeLessThanOrEqual(100);
  });

  test('should penalize security issues', () => {
    const clean = [{
      path: 'clean.js',
      score: 90,
      complexity: 3,
      maintainability: 90,
      issues: [],
      suggestions: []
    }];

    const vulnerable = [{
      path: 'vuln.js',
      score: 90,
      complexity: 3,
      maintainability: 90,
      issues: [{ type: 'security', severity: 'critical', message: 'eval usage' }],
      suggestions: []
    }];

    const cleanReport = engine.generateReport(clean);
    const vulnReport = engine.generateReport(vulnerable);

    expect(vulnReport.summary.overallScore).toBeLessThan(cleanReport.summary.overallScore);
  });

  test('should generate report with summary', () => {
    const analysisResults = [{
      path: 'test.js',
      score: 75,
      complexity: 5,
      maintainability: 75,
      issues: [{ type: 'security', severity: 'warning', message: 'innerHTML usage' }],
      suggestions: [{ message: 'Use const instead of var' }]
    }];

    const report = engine.generateReport(analysisResults);
    expect(report.summary).toBeDefined();
    expect(report.summary.totalFiles).toBe(1);
    expect(report.summary.overallScore).toBeDefined();
  });
});

describe('generateAnalysisReport', () => {
  test('should generate report for multiple files', async () => {
    const files = [
      {
        path: 'src/utils.js',
        content: `
          function helper(x) {
            return x * 2;
          }
          module.exports = { helper };
        `
      },
      {
        path: 'src/main.js',
        content: `
          const { helper } = require('./utils');
          console.log(helper(5));
        `
      }
    ];

    const report = await generateAnalysisReport(files);
    expect(report.summary).toBeDefined();
    expect(report.summary.totalFiles).toBe(2);
    expect(report.files).toHaveLength(2);
  });

  test('should handle empty files array', async () => {
    const report = await generateAnalysisReport([]);
    expect(report.summary.totalFiles).toBe(0);
  });

  test('should include analysis version info', async () => {
    const files = [{
      path: 'test.js',
      content: 'const x = 1;'
    }];

    const report = await generateAnalysisReport(files);
    expect(report.summary).toBeDefined();
    expect(report.files).toBeDefined();
  });
});

describe('generateMarkdownReport', () => {
  test('should generate markdown formatted report', async () => {
    const files = [{
      path: 'test.js',
      content: `
        function test() {
          return 42;
        }
      `
    }];

    const markdown = await generateMarkdownReport(files);
    expect(typeof markdown).toBe('string');
    expect(markdown).toContain('EPOCH1');
    expect(markdown).toContain('test.js');
  });

  test('should include issues in markdown', async () => {
    const files = [{
      path: 'vulnerable.js',
      content: `
        function danger(x) {
          return eval(x);
        }
      `
    }];

    const markdown = await generateMarkdownReport(files);
    expect(markdown.length).toBeGreaterThan(0);
    expect(markdown).toContain('vulnerable.js');
  });
});
