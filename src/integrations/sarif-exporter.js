/*
 * GÖDEL TASK ROUTER - SARIF Exporter Module
 * Export code review findings in SARIF format for GitHub Code Scanning
 * and other SARIF-compatible security tools.
 *
 * QUANTUM_WATERMARK: GÖDEL_SEAL=40668c787c463ca5 V=3.2 INTEGRATION=SARIF
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * SARIFExporter - Generate SARIF 2.1.0 compliant output
 * SARIF = Static Analysis Results Interchange Format
 */
class SARIFExporter {
    constructor(config = {}) {
        this.toolName = config.toolName || 'Gödel Task Router';
        this.toolVersion = config.toolVersion || '3.2.0';
        this.toolUri = config.toolUri || 'https://github.com/EpochCore/godel-task-router';
        this.organization = config.organization || 'EpochCore Quantum';

        // Rule definitions for different finding categories
        this.ruleDefinitions = this.initializeRules();
    }

    /**
     * Initialize rule definitions for SARIF output
     */
    initializeRules() {
        return {
            // Security Rules
            'GODEL-SEC-001': {
                id: 'GODEL-SEC-001',
                name: 'HardcodedSecret',
                shortDescription: { text: 'Hardcoded secret detected' },
                fullDescription: { text: 'Hardcoded credentials, API keys, or secrets were detected in source code.' },
                helpUri: 'https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password',
                defaultConfiguration: { level: 'error' },
                properties: { category: 'security', 'security-severity': '9.0' }
            },
            'GODEL-SEC-002': {
                id: 'GODEL-SEC-002',
                name: 'SQLInjection',
                shortDescription: { text: 'Potential SQL injection vulnerability' },
                fullDescription: { text: 'User input is concatenated directly into SQL queries without proper sanitization.' },
                helpUri: 'https://owasp.org/www-community/attacks/SQL_Injection',
                defaultConfiguration: { level: 'error' },
                properties: { category: 'security', 'security-severity': '9.8' }
            },
            'GODEL-SEC-003': {
                id: 'GODEL-SEC-003',
                name: 'XSSVulnerability',
                shortDescription: { text: 'Cross-site scripting (XSS) vulnerability' },
                fullDescription: { text: 'Unescaped user input is rendered in HTML, enabling XSS attacks.' },
                helpUri: 'https://owasp.org/www-community/attacks/xss/',
                defaultConfiguration: { level: 'error' },
                properties: { category: 'security', 'security-severity': '7.5' }
            },
            'GODEL-SEC-004': {
                id: 'GODEL-SEC-004',
                name: 'UnsafeEval',
                shortDescription: { text: 'Unsafe use of eval()' },
                fullDescription: { text: 'Dynamic code execution using eval() can lead to code injection vulnerabilities.' },
                helpUri: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!',
                defaultConfiguration: { level: 'error' },
                properties: { category: 'security', 'security-severity': '8.0' }
            },
            'GODEL-SEC-005': {
                id: 'GODEL-SEC-005',
                name: 'CommandInjection',
                shortDescription: { text: 'Potential command injection' },
                fullDescription: { text: 'User input is passed to shell commands without sanitization.' },
                helpUri: 'https://owasp.org/www-community/attacks/Command_Injection',
                defaultConfiguration: { level: 'error' },
                properties: { category: 'security', 'security-severity': '9.5' }
            },

            // Performance Rules
            'GODEL-PERF-001': {
                id: 'GODEL-PERF-001',
                name: 'SequentialAwaits',
                shortDescription: { text: 'Sequential awaits in loop' },
                fullDescription: { text: 'Multiple await calls in a loop could be parallelized using Promise.all().' },
                helpUri: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all',
                defaultConfiguration: { level: 'warning' },
                properties: { category: 'performance' }
            },
            'GODEL-PERF-002': {
                id: 'GODEL-PERF-002',
                name: 'UncachedArrayLength',
                shortDescription: { text: 'Array length not cached in loop' },
                fullDescription: { text: 'Accessing array.length on each iteration is inefficient for large arrays.' },
                defaultConfiguration: { level: 'note' },
                properties: { category: 'performance' }
            },
            'GODEL-PERF-003': {
                id: 'GODEL-PERF-003',
                name: 'MemoryLeakRisk',
                shortDescription: { text: 'Potential memory leak' },
                fullDescription: { text: 'Event listeners or subscriptions may not be properly cleaned up.' },
                defaultConfiguration: { level: 'warning' },
                properties: { category: 'performance' }
            },

            // Quality Rules
            'GODEL-QUAL-001': {
                id: 'GODEL-QUAL-001',
                name: 'HighComplexity',
                shortDescription: { text: 'High cyclomatic complexity' },
                fullDescription: { text: 'Function has high cyclomatic complexity, making it difficult to test and maintain.' },
                defaultConfiguration: { level: 'warning' },
                properties: { category: 'maintainability' }
            },
            'GODEL-QUAL-002': {
                id: 'GODEL-QUAL-002',
                name: 'LargeFile',
                shortDescription: { text: 'File exceeds recommended size' },
                fullDescription: { text: 'Large files are harder to maintain. Consider splitting into smaller modules.' },
                defaultConfiguration: { level: 'note' },
                properties: { category: 'maintainability' }
            },
            'GODEL-QUAL-003': {
                id: 'GODEL-QUAL-003',
                name: 'DuplicateCode',
                shortDescription: { text: 'Duplicate code detected' },
                fullDescription: { text: 'Similar code blocks exist that could be refactored into shared functions.' },
                defaultConfiguration: { level: 'warning' },
                properties: { category: 'maintainability' }
            },
            'GODEL-QUAL-004': {
                id: 'GODEL-QUAL-004',
                name: 'LowDocumentation',
                shortDescription: { text: 'Insufficient documentation' },
                fullDescription: { text: 'Public functions lack JSDoc or other documentation comments.' },
                defaultConfiguration: { level: 'note' },
                properties: { category: 'maintainability' }
            },

            // Dependency Rules
            'GODEL-DEP-001': {
                id: 'GODEL-DEP-001',
                name: 'VulnerableDependency',
                shortDescription: { text: 'Vulnerable dependency detected' },
                fullDescription: { text: 'A package dependency has known security vulnerabilities.' },
                helpUri: 'https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities',
                defaultConfiguration: { level: 'error' },
                properties: { category: 'security', 'security-severity': '8.0' }
            },
            'GODEL-DEP-002': {
                id: 'GODEL-DEP-002',
                name: 'OutdatedDependency',
                shortDescription: { text: 'Outdated dependency' },
                fullDescription: { text: 'A package dependency is significantly behind the latest version.' },
                defaultConfiguration: { level: 'note' },
                properties: { category: 'maintenance' }
            }
        };
    }

    /**
     * Export findings to SARIF format
     */
    export(findings, context = {}) {
        const runId = crypto.randomUUID();
        const timestamp = new Date().toISOString();

        // Collect all rules used in findings
        const usedRules = new Map();
        const results = findings.map(finding => this.convertFinding(finding, usedRules));

        const sarif = {
            $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
            version: '2.1.0',
            runs: [
                {
                    tool: {
                        driver: {
                            name: this.toolName,
                            version: this.toolVersion,
                            informationUri: this.toolUri,
                            organization: this.organization,
                            rules: Array.from(usedRules.values()),
                            properties: {
                                'quantum-seal': '40668c787c463ca5',
                                'godel-version': 'v3.2'
                            }
                        }
                    },
                    invocations: [
                        {
                            executionSuccessful: true,
                            startTimeUtc: timestamp,
                            endTimeUtc: timestamp,
                            workingDirectory: {
                                uri: context.workingDirectory || process.cwd()
                            }
                        }
                    ],
                    results,
                    automationDetails: {
                        id: `godel/${runId}`,
                        guid: runId,
                        description: {
                            text: `Gödel Task Router code review - ${context.repository || 'local'}`
                        }
                    },
                    versionControlProvenance: context.sha ? [
                        {
                            repositoryUri: context.repositoryUri || `https://github.com/${context.repository}`,
                            revisionId: context.sha,
                            branch: context.ref?.replace('refs/heads/', '')
                        }
                    ] : undefined,
                    properties: {
                        integrityScore: context.integrityScore,
                        swarmConsensus: context.swarmConsensus,
                        merkleRoot: context.merkleRoot
                    }
                }
            ]
        };

        return sarif;
    }

    /**
     * Convert a Gödel finding to SARIF result format
     */
    convertFinding(finding, usedRules) {
        const ruleId = this.mapToRuleId(finding);
        const rule = this.ruleDefinitions[ruleId];

        // Add rule to used rules map
        if (rule && !usedRules.has(ruleId)) {
            usedRules.set(ruleId, rule);
        }

        const level = this.mapSeverityToLevel(finding.severity);

        const result = {
            ruleId,
            level,
            message: {
                text: finding.message || finding.issue || 'Issue detected'
            },
            locations: finding.file ? [
                {
                    physicalLocation: {
                        artifactLocation: {
                            uri: finding.file,
                            uriBaseId: '%SRCROOT%'
                        },
                        region: finding.line ? {
                            startLine: finding.line,
                            startColumn: finding.column || 1
                        } : undefined
                    }
                }
            ] : [],
            properties: {
                category: finding.category || 'general',
                agent: finding.agent,
                fixed: finding.fixed || false
            }
        };

        // Add fix if available
        if (finding.fix || finding.recommendation) {
            result.fixes = [
                {
                    description: {
                        text: finding.recommendation || 'Apply suggested fix'
                    },
                    artifactChanges: finding.fix ? [
                        {
                            artifactLocation: {
                                uri: finding.file
                            },
                            replacements: [
                                {
                                    deletedRegion: {
                                        startLine: finding.line || 1
                                    },
                                    insertedContent: {
                                        text: finding.fix
                                    }
                                }
                            ]
                        }
                    ] : []
                }
            ];
        }

        return result;
    }

    /**
     * Map finding to appropriate rule ID
     */
    mapToRuleId(finding) {
        const message = (finding.message || finding.issue || '').toLowerCase();
        const category = (finding.category || '').toLowerCase();

        // Security mappings
        if (message.includes('secret') || message.includes('key') || message.includes('password')) {
            return 'GODEL-SEC-001';
        }
        if (message.includes('sql injection') || message.includes('sql query')) {
            return 'GODEL-SEC-002';
        }
        if (message.includes('xss') || message.includes('innerhtml')) {
            return 'GODEL-SEC-003';
        }
        if (message.includes('eval')) {
            return 'GODEL-SEC-004';
        }
        if (message.includes('command') || message.includes('exec') || message.includes('spawn')) {
            return 'GODEL-SEC-005';
        }

        // Performance mappings
        if (message.includes('await') && message.includes('loop')) {
            return 'GODEL-PERF-001';
        }
        if (message.includes('length') && message.includes('loop')) {
            return 'GODEL-PERF-002';
        }
        if (message.includes('memory') || message.includes('leak')) {
            return 'GODEL-PERF-003';
        }

        // Quality mappings
        if (message.includes('complexity') || message.includes('complex')) {
            return 'GODEL-QUAL-001';
        }
        if (message.includes('large file') || message.includes('lines')) {
            return 'GODEL-QUAL-002';
        }
        if (message.includes('duplicate')) {
            return 'GODEL-QUAL-003';
        }
        if (message.includes('documentation') || message.includes('jsdoc')) {
            return 'GODEL-QUAL-004';
        }

        // Dependency mappings
        if (message.includes('vulnerability') || message.includes('vulnerable')) {
            return 'GODEL-DEP-001';
        }
        if (message.includes('outdated')) {
            return 'GODEL-DEP-002';
        }

        // Default based on category
        const categoryDefaults = {
            security: 'GODEL-SEC-001',
            performance: 'GODEL-PERF-001',
            quality: 'GODEL-QUAL-001',
            maintainability: 'GODEL-QUAL-001'
        };

        return categoryDefaults[category] || 'GODEL-QUAL-001';
    }

    /**
     * Map severity to SARIF level
     */
    mapSeverityToLevel(severity) {
        const levelMap = {
            critical: 'error',
            warning: 'warning',
            info: 'note'
        };
        return levelMap[severity] || 'note';
    }

    /**
     * Save SARIF to file
     */
    saveToFile(sarif, outputPath) {
        const content = JSON.stringify(sarif, null, 2);
        fs.writeFileSync(outputPath, content, 'utf8');
        return outputPath;
    }

    /**
     * Generate SARIF summary statistics
     */
    getSummary(sarif) {
        const results = sarif.runs?.[0]?.results || [];

        const summary = {
            totalFindings: results.length,
            byLevel: {
                error: results.filter(r => r.level === 'error').length,
                warning: results.filter(r => r.level === 'warning').length,
                note: results.filter(r => r.level === 'note').length
            },
            byCategory: {},
            fixable: results.filter(r => r.fixes?.length > 0).length
        };

        for (const result of results) {
            const category = result.properties?.category || 'other';
            summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
        }

        return summary;
    }
}

/**
 * GitHubCodeScanningUploader - Upload SARIF to GitHub Code Scanning
 */
class GitHubCodeScanningUploader {
    constructor(config = {}) {
        this.token = config.token || process.env.GITHUB_TOKEN;
        this.apiUrl = config.apiUrl || 'https://api.github.com';
    }

    /**
     * Check if uploader is configured
     */
    isConfigured() {
        return !!this.token;
    }

    /**
     * Upload SARIF to GitHub Code Scanning API
     */
    async upload(sarif, context) {
        if (!this.isConfigured()) {
            return { success: false, reason: 'GitHub token not configured' };
        }

        const { owner, repo, sha, ref } = context;

        if (!owner || !repo || !sha) {
            return { success: false, reason: 'Missing repository context (owner, repo, sha)' };
        }

        try {
            // Compress SARIF content
            const sarifContent = JSON.stringify(sarif);
            const base64Content = Buffer.from(sarifContent).toString('base64');

            const response = await fetch(
                `${this.apiUrl}/repos/${owner}/${repo}/code-scanning/sarifs`,
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/vnd.github+json',
                        'Authorization': `Bearer ${this.token}`,
                        'X-GitHub-Api-Version': '2022-11-28',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        commit_sha: sha,
                        ref: ref || `refs/heads/main`,
                        sarif: base64Content,
                        tool_name: 'Gödel Task Router'
                    })
                }
            );

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`GitHub API error: ${response.status} - ${error}`);
            }

            const result = await response.json();

            return {
                success: true,
                sarifId: result.id,
                url: result.url
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Check upload status
     */
    async checkStatus(owner, repo, sarifId) {
        if (!this.isConfigured()) {
            return { success: false, reason: 'GitHub token not configured' };
        }

        try {
            const response = await fetch(
                `${this.apiUrl}/repos/${owner}/${repo}/code-scanning/sarifs/${sarifId}`,
                {
                    headers: {
                        'Accept': 'application/vnd.github+json',
                        'Authorization': `Bearer ${this.token}`,
                        'X-GitHub-Api-Version': '2022-11-28'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Export for use in main module
module.exports = {
    SARIFExporter,
    GitHubCodeScanningUploader
};
