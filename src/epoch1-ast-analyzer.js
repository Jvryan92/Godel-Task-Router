/**
 * EPOCH1 AST ANALYZER - Enhanced Code Analysis Engine
 * ====================================================
 * Waterseal: 3b85cd4f-30d9-4576-b579-8d9155fde7ef
 * RAS Root: 40668c787c463ca5
 * 
 * @version 1.0.0
 * @license MIT
 * @copyright 2025 EpochCore
 */

const crypto = require('crypto');

// ============================================================================
// EPOCH1 AGENT - AST ANALYSIS ENGINE
// ============================================================================

class EPOCH1ASTAnalyzer {
  constructor(options = {}) {
    this.config = {
      maxFileSize: options.maxFileSize || 100000,
      analysisDepth: options.analysisDepth || 'deep',
      qualityThreshold: options.qualityThreshold || 70,
      ...options
    };
    this.metrics = {
      filesAnalyzed: 0,
      issuesFound: 0,
      qualityScore: 100
    };
  }

  async analyzeCode(content, filePath) {
    const result = {
      path: filePath,
      score: 100,
      complexity: 0,
      maintainability: 100,
      issues: [],
      suggestions: []
    };

    // 1. Complexity Analysis
    result.complexity = this.calculateComplexity(content);
    if (result.complexity > 10) {
      result.issues.push({
        severity: 'warning',
        type: 'complexity',
        message: `High cyclomatic complexity: ${result.complexity}`
      });
      result.score -= Math.min(20, result.complexity - 10);
    }

    // 2. Pattern Detection
    const patterns = this.detectPatterns(content);
    result.issues.push(...patterns.issues);
    result.suggestions.push(...patterns.suggestions);

    // 3. Security Analysis
    const security = this.analyzeSecurityPatterns(content);
    result.issues.push(...security);

    // 4. Maintainability Index
    result.maintainability = this.calculateMaintainability(content, result.complexity);

    this.metrics.filesAnalyzed++;
    this.metrics.issuesFound += result.issues.length;

    return result;
  }

  calculateComplexity(content) {
    let complexity = 1;
    const patterns = [
      /\bif\b/g, /\belse\b/g, /\bwhile\b/g, /\bfor\b/g,
      /\bswitch\b/g, /\bcase\b/g, /\bcatch\b/g,
      /\?\s*[^:]+\s*:/g, /&&/g, /\|\|/g
    ];
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length;
    }
    return complexity;
  }

  calculateMaintainability(content, complexity) {
    const lines = content.split('\n');
    const loc = lines.length;
    const comments = (content.match(/\/\/.*|/\*[\s\S]*?\*\//g) || []).length;
    const commentRatio = comments / Math.max(1, loc);
    let maintainability = 171 - 5.2 * Math.log(complexity) - 0.23 * complexity - 16.2 * Math.log(loc);
    maintainability = Math.max(0, Math.min(100, maintainability));
    maintainability += commentRatio * 10;
    return Math.round(maintainability);
  }

  detectPatterns(content) {
    const issues = [];
    const suggestions = [];

    // Anti-patterns
    if (/\.then\([^)]*\)\.then\([^)]*\)\.then/.test(content)) {
      issues.push({ severity: 'info', type: 'pattern', message: 'Consider async/await over promise chains' });
    }
    if (/callback\s*\(.*callback/.test(content)) {
      issues.push({ severity: 'warning', type: 'pattern', message: 'Callback hell detected' });
    }

    // Optimization opportunities
    if (/for\s*\([^)]*\.length/.test(content)) {
      suggestions.push({ message: 'Cache array length for loop optimization' });
    }
    if (/JSON\.parse\(JSON\.stringify/.test(content)) {
      suggestions.push({ message: 'Consider structuredClone() for deep cloning' });
    }

    return { issues, suggestions };
  }

  analyzeSecurityPatterns(content) {
    const issues = [];
    const securityPatterns = [
      { regex: /eval\s*\(/, severity: 'critical', message: 'eval() usage detected - security risk' },
      { regex: /innerHTML\s*=/, severity: 'warning', message: 'innerHTML assignment - XSS risk' },
      { regex: /document\.write/, severity: 'warning', message: 'document.write usage - security risk' },
      { regex: /\$\{.*\}.*SELECT|INSERT|UPDATE|DELETE/i, severity: 'critical', message: 'Potential SQL injection' },
      { regex: /exec\s*\(|spawn\s*\(/, severity: 'warning', message: 'Command execution detected' }
    ];

    for (const pattern of securityPatterns) {
      if (pattern.regex.test(content)) {
        issues.push({ severity: pattern.severity, type: 'security', message: pattern.message });
      }
    }
    return issues;
  }

  getMetrics() {
    return {
      ...this.metrics,
      qualityScore: Math.round(this.metrics.qualityScore - (this.metrics.issuesFound * 2))
    };
  }
}

// ============================================================================
// QUALITY SCORING ENGINE
// ============================================================================

class QualityScoringEngine {
  constructor() {
    this.weights = {
      complexity: 0.25,
      maintainability: 0.25,
      security: 0.30,
      patterns: 0.20
    };
  }

  calculateOverallScore(analysisResults) {
    let totalScore = 0;
    let fileCount = 0;

    for (const result of analysisResults) {
      let fileScore = 100;
      fileScore -= result.issues.filter(i => i.severity === 'critical').length * 15;
      fileScore -= result.issues.filter(i => i.severity === 'warning').length * 5;
      fileScore -= result.issues.filter(i => i.severity === 'info').length * 1;
      fileScore = Math.max(0, fileScore);
      totalScore += fileScore;
      fileCount++;
    }

    return fileCount > 0 ? Math.round(totalScore / fileCount) : 100;
  }

  generateReport(results, options = {}) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: results.length,
        overallScore: this.calculateOverallScore(results),
        criticalIssues: 0,
        warnings: 0,
        suggestions: 0
      },
      details: []
    };

    for (const result of results) {
      report.summary.criticalIssues += result.issues.filter(i => i.severity === 'critical').length;
      report.summary.warnings += result.issues.filter(i => i.severity === 'warning').length;
      report.summary.suggestions += result.suggestions.length;
      report.details.push({
        file: result.path,
        score: result.score,
        complexity: result.complexity,
        maintainability: result.maintainability,
        issues: result.issues,
        suggestions: result.suggestions
      });
    }

    return report;
  }
}

// ============================================================================
// STANDALONE ANALYSIS FUNCTION
// ============================================================================

/**
 * Generate a complete analysis report for a set of files
 * This is the main entry point for standalone analysis
 *
 * @param {Array} files - Array of { path, content } objects
 * @param {Object} options - Analysis options
 * @returns {Object} Complete analysis report with markdown output
 */
async function generateAnalysisReport(files, options = {}) {
  const analyzer = new EPOCH1ASTAnalyzer(options);
  const scorer = new QualityScoringEngine();
  const results = [];

  // Analyze each file
  for (const file of files) {
    if (!file.content) continue;
    try {
      const result = await analyzer.analyzeCode(file.content, file.path || file.relativePath);
      results.push(result);
    } catch (error) {
      results.push({
        path: file.path || file.relativePath,
        score: 0,
        error: error.message,
        issues: [],
        suggestions: []
      });
    }
  }

  // Generate the report
  const report = scorer.generateReport(results, options);

  // Add markdown output
  report.markdown = generateMarkdownReport(report);
  report.metrics = analyzer.getMetrics();

  return report;
}

/**
 * Generate markdown formatted report
 */
function generateMarkdownReport(report) {
  const lines = [
    '# EPOCH1 AST Analysis Report',
    '',
    `**Generated:** ${report.timestamp}`,
    `**Files Analyzed:** ${report.summary.totalFiles}`,
    `**Overall Score:** ${report.summary.overallScore}/100`,
    '',
    '## Summary',
    '',
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Critical Issues | ${report.summary.criticalIssues} |`,
    `| Warnings | ${report.summary.warnings} |`,
    `| Suggestions | ${report.summary.suggestions} |`,
    ''
  ];

  // Add file details if there are issues
  const filesWithIssues = report.details.filter(d => d.issues.length > 0);
  if (filesWithIssues.length > 0) {
    lines.push('## Files with Issues', '');

    for (const file of filesWithIssues) {
      lines.push(`### ${file.file}`);
      lines.push(`- **Score:** ${file.score}/100`);
      lines.push(`- **Complexity:** ${file.complexity}`);
      lines.push(`- **Maintainability:** ${file.maintainability}`);
      lines.push('');

      if (file.issues.length > 0) {
        lines.push('**Issues:**');
        for (const issue of file.issues) {
          const icon = issue.severity === 'critical' ? '!' :
                       issue.severity === 'warning' ? '?' : 'i';
          lines.push(`- [${icon}] ${issue.message}`);
        }
        lines.push('');
      }

      if (file.suggestions.length > 0) {
        lines.push('**Suggestions:**');
        for (const suggestion of file.suggestions) {
          lines.push(`- ${suggestion.message}`);
        }
        lines.push('');
      }
    }
  }

  lines.push('---');
  lines.push('*Generated by EPOCH1 AST Analyzer v1.0 | EpochCore Quantum Enterprise*');

  return lines.join('\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  EPOCH1ASTAnalyzer,
  QualityScoringEngine,
  generateAnalysisReport,
  generateMarkdownReport
};
