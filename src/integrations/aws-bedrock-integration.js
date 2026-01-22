/*
 * GÖDEL TASK ROUTER - AWS Bedrock Integration Module
 * Enterprise-grade AI code review using Claude 3 models on AWS Bedrock.
 *
 * QUANTUM_WATERMARK: GÖDEL_SEAL=40668c787c463ca5 V=3.2 INTEGRATION=BEDROCK
 */

const crypto = require('crypto');

/**
 * AWS Signature V4 implementation for Bedrock API calls
 */
class AWSSignatureV4 {
    constructor(credentials) {
        this.accessKeyId = credentials.accessKeyId;
        this.secretAccessKey = credentials.secretAccessKey;
        this.sessionToken = credentials.sessionToken;
        this.region = credentials.region || 'us-east-1';
        this.service = 'bedrock-runtime';
    }

    /**
     * Sign a request using AWS Signature Version 4
     */
    sign(request) {
        const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
        const date = datetime.slice(0, 8);

        const headers = {
            ...request.headers,
            'x-amz-date': datetime,
            'host': request.host
        };

        if (this.sessionToken) {
            headers['x-amz-security-token'] = this.sessionToken;
        }

        const canonicalRequest = this.createCanonicalRequest(request.method, request.path, headers, request.body);
        const stringToSign = this.createStringToSign(datetime, date, canonicalRequest);
        const signature = this.calculateSignature(date, stringToSign);

        const signedHeaders = Object.keys(headers)
            .map(k => k.toLowerCase())
            .sort()
            .join(';');

        headers['Authorization'] = [
            `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${date}/${this.region}/${this.service}/aws4_request`,
            `SignedHeaders=${signedHeaders}`,
            `Signature=${signature}`
        ].join(', ');

        return headers;
    }

    createCanonicalRequest(method, path, headers, body) {
        const sortedHeaders = Object.keys(headers)
            .map(k => k.toLowerCase())
            .sort();

        const canonicalHeaders = sortedHeaders
            .map(k => `${k}:${headers[k.toLowerCase()] || headers[k]}`)
            .join('\n');

        const signedHeaders = sortedHeaders.join(';');
        const bodyHash = crypto.createHash('sha256').update(body || '').digest('hex');

        return [
            method,
            path,
            '',
            canonicalHeaders + '\n',
            signedHeaders,
            bodyHash
        ].join('\n');
    }

    createStringToSign(datetime, date, canonicalRequest) {
        const scope = `${date}/${this.region}/${this.service}/aws4_request`;
        const hash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');

        return [
            'AWS4-HMAC-SHA256',
            datetime,
            scope,
            hash
        ].join('\n');
    }

    calculateSignature(date, stringToSign) {
        const kDate = this.hmac(`AWS4${this.secretAccessKey}`, date);
        const kRegion = this.hmac(kDate, this.region);
        const kService = this.hmac(kRegion, this.service);
        const kSigning = this.hmac(kService, 'aws4_request');
        return this.hmac(kSigning, stringToSign, 'hex');
    }

    hmac(key, data, encoding) {
        return crypto.createHmac('sha256', key).update(data).digest(encoding);
    }
}

/**
 * BedrockCodeReviewer - Claude 3 powered code review
 */
class BedrockCodeReviewer {
    constructor(config = {}) {
        this.region = config.region || process.env.AWS_REGION || 'us-east-1';
        this.model = config.model || 'claude-3-haiku-20240307';
        this.maxTokens = config.maxTokens || 4096;

        // Model mapping
        this.modelIds = {
            'claude-3-sonnet': 'anthropic.claude-3-sonnet-20240229-v1:0',
            'claude-3-haiku': 'anthropic.claude-3-haiku-20240307-v1:0',
            'claude-3-opus': 'anthropic.claude-3-opus-20240229-v1:0',
            'claude-3-5-sonnet': 'anthropic.claude-3-5-sonnet-20241022-v2:0'
        };

        // Credentials from environment
        this.credentials = {
            accessKeyId: config.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: config.sessionToken || process.env.AWS_SESSION_TOKEN,
            region: this.region
        };

        this.signer = new AWSSignatureV4(this.credentials);
        this.enabled = !!(this.credentials.accessKeyId && this.credentials.secretAccessKey);
    }

    /**
     * Check if Bedrock integration is configured
     */
    isConfigured() {
        return this.enabled;
    }

    /**
     * Get the full model ID for Bedrock
     */
    getModelId(modelName) {
        return this.modelIds[modelName] || this.modelIds['claude-3-haiku'];
    }

    /**
     * Perform AI code review using Claude 3
     */
    async reviewCode(files, options = {}) {
        if (!this.enabled) {
            return { success: false, reason: 'AWS Bedrock not configured' };
        }

        const {
            focusAreas = ['security', 'performance', 'quality', 'maintainability'],
            autoFix = false,
            strictMode = false
        } = options;

        const modelId = this.getModelId(options.model || 'claude-3-haiku');

        // Build review prompt
        const prompt = this.buildReviewPrompt(files, focusAreas, autoFix, strictMode);

        try {
            const response = await this.invokeModel(modelId, prompt);
            return this.parseReviewResponse(response, files);
        } catch (error) {
            return {
                success: false,
                error: error.message,
                fallback: true
            };
        }
    }

    /**
     * Build comprehensive review prompt
     */
    buildReviewPrompt(files, focusAreas, autoFix, strictMode) {
        const fileContents = files.map(f => `
### File: ${f.path}
\`\`\`${this.getLanguage(f.path)}
${f.content?.substring(0, 8000) || '// Empty or unreadable'}
\`\`\`
`).join('\n');

        const focusInstructions = focusAreas.map(area => {
            const areaPrompts = {
                security: '- **Security**: Check for SQL injection, XSS, command injection, hardcoded secrets, insecure dependencies',
                performance: '- **Performance**: Identify N+1 queries, unnecessary loops, memory leaks, blocking operations',
                quality: '- **Quality**: Evaluate code structure, naming conventions, DRY principles, error handling',
                maintainability: '- **Maintainability**: Assess complexity, documentation, test coverage indicators, coupling'
            };
            return areaPrompts[area] || '';
        }).join('\n');

        return `You are an expert code reviewer for the Gödel Task Router system. Analyze the following code files and provide a detailed review.

## Focus Areas
${focusInstructions}

## Review Requirements
1. Identify all issues with severity levels: critical, warning, info
2. Provide specific line numbers where applicable
3. ${autoFix ? 'Suggest exact code fixes for each issue' : 'Describe the issue and potential solutions'}
4. ${strictMode ? 'Apply strict coding standards - flag all deviations' : 'Focus on significant issues'}

## Code Files
${fileContents}

## Response Format
Respond with a JSON object:
{
  "summary": "Brief overall assessment",
  "score": <0-100 integrity score>,
  "findings": [
    {
      "severity": "critical|warning|info",
      "category": "security|performance|quality|maintainability",
      "file": "path/to/file",
      "line": <line number or null>,
      "issue": "Description of the issue",
      "recommendation": "How to fix it",
      "fix": ${autoFix ? '"Exact code replacement if applicable"' : 'null'}
    }
  ],
  "metrics": {
    "securityScore": <0-100>,
    "performanceScore": <0-100>,
    "qualityScore": <0-100>,
    "maintainabilityScore": <0-100>
  }
}`;
    }

    /**
     * Get language from file extension
     */
    getLanguage(filePath) {
        const ext = filePath.split('.').pop()?.toLowerCase();
        const langMap = {
            js: 'javascript',
            ts: 'typescript',
            jsx: 'jsx',
            tsx: 'tsx',
            py: 'python',
            rb: 'ruby',
            go: 'go',
            rs: 'rust',
            java: 'java',
            cpp: 'cpp',
            c: 'c',
            cs: 'csharp',
            php: 'php',
            sol: 'solidity'
        };
        return langMap[ext] || ext || 'text';
    }

    /**
     * Invoke Bedrock model
     */
    async invokeModel(modelId, prompt) {
        const host = `bedrock-runtime.${this.region}.amazonaws.com`;
        const path = `/model/${modelId}/invoke`;

        const body = JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: this.maxTokens,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        const request = {
            method: 'POST',
            host,
            path,
            headers: {
                'Content-Type': 'application/json'
            },
            body
        };

        const signedHeaders = this.signer.sign(request);

        const response = await fetch(`https://${host}${path}`, {
            method: 'POST',
            headers: signedHeaders,
            body
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Bedrock API error: ${response.status} - ${error}`);
        }

        return await response.json();
    }

    /**
     * Parse Claude's review response
     */
    parseReviewResponse(response, files) {
        try {
            const content = response.content?.[0]?.text || '';

            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return {
                    success: false,
                    error: 'Could not parse review response',
                    rawResponse: content
                };
            }

            const review = JSON.parse(jsonMatch[0]);

            return {
                success: true,
                source: 'bedrock',
                model: this.model,
                summary: review.summary,
                score: review.score,
                consensus: review.score / 100,
                findings: review.findings || [],
                metrics: review.metrics,
                fixes: review.findings?.filter(f => f.fix).map(f => ({
                    file: f.file,
                    search: null,
                    replace: f.fix,
                    description: f.issue
                })) || []
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to parse response: ${error.message}`
            };
        }
    }

    /**
     * Perform security-focused review
     */
    async securityAudit(files) {
        return this.reviewCode(files, {
            focusAreas: ['security'],
            strictMode: true,
            autoFix: true
        });
    }

    /**
     * Generate documentation for code
     */
    async generateDocumentation(files, options = {}) {
        if (!this.enabled) {
            return { success: false, reason: 'AWS Bedrock not configured' };
        }

        const { style = 'jsdoc', includeExamples = true } = options;
        const modelId = this.getModelId('claude-3-sonnet');

        const fileContents = files.map(f => `
### File: ${f.path}
\`\`\`${this.getLanguage(f.path)}
${f.content?.substring(0, 6000) || ''}
\`\`\`
`).join('\n');

        const prompt = `Generate ${style} documentation for the following code files.
${includeExamples ? 'Include usage examples for public functions.' : ''}

${fileContents}

Return a JSON object with:
{
  "files": [
    {
      "path": "path/to/file",
      "documentation": "Generated documentation as a string"
    }
  ]
}`;

        try {
            const response = await this.invokeModel(modelId, prompt);
            const content = response.content?.[0]?.text || '';
            const jsonMatch = content.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                return {
                    success: true,
                    ...JSON.parse(jsonMatch[0])
                };
            }

            return { success: false, error: 'Could not parse documentation response' };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Suggest refactoring improvements
     */
    async suggestRefactoring(files, options = {}) {
        if (!this.enabled) {
            return { success: false, reason: 'AWS Bedrock not configured' };
        }

        const { patterns = ['extract-function', 'reduce-complexity', 'improve-naming'] } = options;
        const modelId = this.getModelId('claude-3-sonnet');

        const fileContents = files.map(f => `
### File: ${f.path}
\`\`\`${this.getLanguage(f.path)}
${f.content?.substring(0, 6000) || ''}
\`\`\`
`).join('\n');

        const prompt = `Analyze the following code and suggest refactoring improvements.
Focus on these patterns: ${patterns.join(', ')}

${fileContents}

Return a JSON object with:
{
  "suggestions": [
    {
      "file": "path/to/file",
      "pattern": "refactoring pattern name",
      "currentCode": "code to be refactored",
      "suggestedCode": "refactored code",
      "explanation": "why this improves the code",
      "impact": "high|medium|low"
    }
  ]
}`;

        try {
            const response = await this.invokeModel(modelId, prompt);
            const content = response.content?.[0]?.text || '';
            const jsonMatch = content.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                return {
                    success: true,
                    ...JSON.parse(jsonMatch[0])
                };
            }

            return { success: false, error: 'Could not parse refactoring response' };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

/**
 * SecurityHubExporter - Export findings to AWS Security Hub
 */
class SecurityHubExporter {
    constructor(config = {}) {
        this.region = config.region || process.env.AWS_REGION || 'us-east-1';
        this.accountId = config.accountId || process.env.AWS_ACCOUNT_ID;

        this.credentials = {
            accessKeyId: config.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: config.sessionToken || process.env.AWS_SESSION_TOKEN,
            region: this.region
        };

        this.enabled = !!(this.credentials.accessKeyId && this.accountId);
    }

    /**
     * Check if Security Hub export is configured
     */
    isConfigured() {
        return this.enabled;
    }

    /**
     * Export findings to Security Hub
     */
    async exportFindings(findings, context) {
        if (!this.enabled) {
            return { success: false, reason: 'AWS Security Hub not configured' };
        }

        const securityHubFindings = findings
            .filter(f => f.severity === 'critical' || f.severity === 'warning')
            .map(f => this.convertToSecurityHubFormat(f, context));

        if (securityHubFindings.length === 0) {
            return { success: true, imported: 0, message: 'No security findings to export' };
        }

        try {
            const host = `securityhub.${this.region}.amazonaws.com`;
            const path = '/findings/import';

            const signer = new AWSSignatureV4({
                ...this.credentials,
                service: 'securityhub'
            });

            const body = JSON.stringify({
                Findings: securityHubFindings
            });

            const request = {
                method: 'POST',
                host,
                path,
                headers: { 'Content-Type': 'application/json' },
                body
            };

            const signedHeaders = signer.sign(request);

            const response = await fetch(`https://${host}${path}`, {
                method: 'POST',
                headers: signedHeaders,
                body
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Security Hub API error: ${response.status} - ${error}`);
            }

            const result = await response.json();

            return {
                success: true,
                imported: result.SuccessCount || securityHubFindings.length,
                failed: result.FailedCount || 0
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Convert Gödel finding to Security Hub format (ASFF)
     */
    convertToSecurityHubFormat(finding, context) {
        const now = new Date().toISOString();
        const id = crypto.randomUUID();

        const severityMap = {
            critical: { Label: 'CRITICAL', Normalized: 90 },
            warning: { Label: 'HIGH', Normalized: 70 },
            info: { Label: 'LOW', Normalized: 20 }
        };

        return {
            SchemaVersion: '2018-10-08',
            Id: `godel-${id}`,
            ProductArn: `arn:aws:securityhub:${this.region}:${this.accountId}:product/${this.accountId}/default`,
            GeneratorId: 'godel-task-router',
            AwsAccountId: this.accountId,
            Types: ['Software and Configuration Checks/Code Review'],
            CreatedAt: now,
            UpdatedAt: now,
            Severity: severityMap[finding.severity] || severityMap.info,
            Title: finding.message || finding.issue,
            Description: `${finding.category || 'code-review'}: ${finding.message || finding.issue}`,
            Resources: [
                {
                    Type: 'Other',
                    Id: finding.file || context.repository,
                    Details: {
                        Other: {
                            File: finding.file || 'unknown',
                            Line: String(finding.line || 0),
                            Repository: context.repository || 'unknown',
                            CommitSha: context.sha || 'unknown'
                        }
                    }
                }
            ],
            ProductFields: {
                'godel/version': '3.2',
                'godel/quantum-seal': '40668c787c463ca5',
                'godel/category': finding.category || 'code-review'
            },
            RecordState: 'ACTIVE',
            Workflow: {
                Status: finding.fixed ? 'RESOLVED' : 'NEW'
            }
        };
    }
}

/**
 * BedrockUsageTracker - Track and optimize Bedrock API usage
 */
class BedrockUsageTracker {
    constructor() {
        this.usage = {
            totalCalls: 0,
            totalInputTokens: 0,
            totalOutputTokens: 0,
            byModel: new Map(),
            costEstimate: 0
        };

        // Pricing per 1M tokens (as of 2024)
        this.pricing = {
            'claude-3-haiku': { input: 0.25, output: 1.25 },
            'claude-3-sonnet': { input: 3.00, output: 15.00 },
            'claude-3-opus': { input: 15.00, output: 75.00 },
            'claude-3-5-sonnet': { input: 3.00, output: 15.00 }
        };
    }

    /**
     * Track API call usage
     */
    track(model, inputTokens, outputTokens) {
        this.usage.totalCalls++;
        this.usage.totalInputTokens += inputTokens;
        this.usage.totalOutputTokens += outputTokens;

        const modelStats = this.usage.byModel.get(model) || { calls: 0, input: 0, output: 0 };
        modelStats.calls++;
        modelStats.input += inputTokens;
        modelStats.output += outputTokens;
        this.usage.byModel.set(model, modelStats);

        // Calculate cost
        const pricing = this.pricing[model] || this.pricing['claude-3-haiku'];
        const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1000000;
        this.usage.costEstimate += cost;
    }

    /**
     * Get usage summary
     */
    getSummary() {
        return {
            ...this.usage,
            byModel: Object.fromEntries(this.usage.byModel)
        };
    }

    /**
     * Reset usage tracking
     */
    reset() {
        this.usage = {
            totalCalls: 0,
            totalInputTokens: 0,
            totalOutputTokens: 0,
            byModel: new Map(),
            costEstimate: 0
        };
    }
}

// Export for use in main module
module.exports = {
    AWSSignatureV4,
    BedrockCodeReviewer,
    SecurityHubExporter,
    BedrockUsageTracker
};
