/*
 * GÖDEL TASK ROUTER - Integration Configuration Module
 * Centralized configuration for all integrations with pricing tiers.
 *
 * QUANTUM_WATERMARK: GÖDEL_SEAL=40668c787c463ca5 V=3.2 INTEGRATION=CONFIG
 */

/**
 * Pricing tier definitions
 */
const PRICING_TIERS = {
    community: {
        name: 'Community',
        price: 0,
        priceDisplay: 'Free',
        agents: 8,
        features: {
            swarmReview: true,
            autoFix: true,
            securityScan: true,
            merkleValidation: true,
            signatureVerify: true,
            // Pro features
            optimize: false,
            compress: false,
            watermark: false,
            auditDeps: false,
            // Enterprise features
            slackIntegration: false,
            awsBedrock: false,
            awsSecurityHub: false,
            sarifExport: false,
            customWebhooks: false,
            whiteLabeling: false,
            sla: false,
            dedicatedSupport: false
        },
        limits: {
            reviewsPerMonth: 100,
            filesPerReview: 50,
            maxFileSize: 100 * 1024, // 100KB
            apiCalls: 500,
            retentionDays: 7
        },
        integrations: ['github']
    },

    pro: {
        name: 'Pro',
        price: 29,
        priceDisplay: '$29/month',
        agents: 26,
        features: {
            swarmReview: true,
            autoFix: true,
            securityScan: true,
            merkleValidation: true,
            signatureVerify: true,
            // Pro features
            optimize: true,
            compress: true,
            watermark: true,
            auditDeps: true,
            // Enterprise features
            slackIntegration: true,
            awsBedrock: false,
            awsSecurityHub: false,
            sarifExport: true,
            customWebhooks: false,
            whiteLabeling: false,
            sla: false,
            dedicatedSupport: false
        },
        limits: {
            reviewsPerMonth: 1000,
            filesPerReview: 200,
            maxFileSize: 500 * 1024, // 500KB
            apiCalls: 5000,
            retentionDays: 30
        },
        integrations: ['github', 'gitlab', 'slack']
    },

    enterprise: {
        name: 'Enterprise',
        price: 199,
        priceDisplay: '$199/month',
        agents: 52,
        features: {
            swarmReview: true,
            autoFix: true,
            securityScan: true,
            merkleValidation: true,
            signatureVerify: true,
            // Pro features
            optimize: true,
            compress: true,
            watermark: true,
            auditDeps: true,
            // Enterprise features
            slackIntegration: true,
            awsBedrock: true,
            awsSecurityHub: true,
            sarifExport: true,
            customWebhooks: true,
            whiteLabeling: true,
            sla: true,
            dedicatedSupport: true
        },
        limits: {
            reviewsPerMonth: -1, // Unlimited
            filesPerReview: 1000,
            maxFileSize: 2 * 1024 * 1024, // 2MB
            apiCalls: -1, // Unlimited
            retentionDays: 365
        },
        integrations: ['github', 'gitlab', 'bitbucket', 'slack', 'teams', 'aws', 'custom']
    }
};

/**
 * Integration definitions
 */
const INTEGRATIONS = {
    github: {
        id: 'github',
        name: 'GitHub',
        type: 'vcs',
        description: 'GitHub pull request integration',
        requiredTier: 'community',
        config: {
            webhookEvents: ['pull_request', 'push', 'check_run'],
            tokenScopes: ['repo', 'write:discussion'],
            appPermissions: {
                checks: 'write',
                contents: 'read',
                pull_requests: 'write',
                statuses: 'write'
            }
        },
        features: ['pr-comments', 'check-runs', 'status-checks', 'code-scanning']
    },

    gitlab: {
        id: 'gitlab',
        name: 'GitLab',
        type: 'vcs',
        description: 'GitLab merge request integration',
        requiredTier: 'pro',
        config: {
            webhookEvents: ['Merge Request Hook', 'Push Hook'],
            tokenScopes: ['api', 'read_repository', 'write_repository'],
            systemHook: false
        },
        features: ['mr-comments', 'pipeline-trigger', 'status-updates']
    },

    bitbucket: {
        id: 'bitbucket',
        name: 'Bitbucket',
        type: 'vcs',
        description: 'Bitbucket pull request integration',
        requiredTier: 'enterprise',
        config: {
            webhookEvents: ['pullrequest:created', 'pullrequest:updated', 'repo:push'],
            appPermissions: ['pullrequest:write', 'repository:read']
        },
        features: ['pr-comments', 'build-status']
    },

    slack: {
        id: 'slack',
        name: 'Slack',
        type: 'messaging',
        description: 'Slack notifications and commands',
        requiredTier: 'pro',
        config: {
            botScopes: ['chat:write', 'commands', 'users:read'],
            slashCommands: ['/godel'],
            eventSubscriptions: ['app_mention', 'message.channels']
        },
        features: ['notifications', 'slash-commands', 'interactive-messages', 'thread-replies']
    },

    teams: {
        id: 'teams',
        name: 'Microsoft Teams',
        type: 'messaging',
        description: 'Microsoft Teams notifications',
        requiredTier: 'enterprise',
        config: {
            connectorType: 'incoming-webhook',
            cardFormat: 'adaptive'
        },
        features: ['notifications', 'adaptive-cards']
    },

    aws_bedrock: {
        id: 'aws_bedrock',
        name: 'AWS Bedrock',
        type: 'ai',
        description: 'Claude 3 AI-powered code review',
        requiredTier: 'enterprise',
        config: {
            models: ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'],
            regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
            features: ['code-review', 'documentation', 'refactoring']
        },
        features: ['ai-review', 'auto-documentation', 'refactoring-suggestions']
    },

    aws_security_hub: {
        id: 'aws_security_hub',
        name: 'AWS Security Hub',
        type: 'security',
        description: 'Export findings to AWS Security Hub',
        requiredTier: 'enterprise',
        config: {
            findingFormat: 'ASFF',
            productArn: 'arn:aws:securityhub:{region}:{account}:product/{account}/default'
        },
        features: ['finding-export', 'compliance-mapping']
    },

    sarif: {
        id: 'sarif',
        name: 'SARIF Export',
        type: 'reporting',
        description: 'SARIF 2.1.0 export for code scanning',
        requiredTier: 'pro',
        config: {
            version: '2.1.0',
            uploadToGitHub: true
        },
        features: ['sarif-export', 'github-code-scanning']
    },

    jira: {
        id: 'jira',
        name: 'Jira',
        type: 'project-management',
        description: 'Create Jira issues from findings',
        requiredTier: 'enterprise',
        config: {
            issueTypes: ['Bug', 'Security', 'Task'],
            fieldMapping: true
        },
        features: ['issue-creation', 'linking', 'status-sync']
    },

    webhook: {
        id: 'webhook',
        name: 'Custom Webhooks',
        type: 'custom',
        description: 'Send findings to custom webhook endpoints',
        requiredTier: 'enterprise',
        config: {
            methods: ['POST'],
            authentication: ['bearer', 'basic', 'hmac'],
            retries: 3
        },
        features: ['custom-payload', 'retry-logic', 'authentication']
    }
};

/**
 * IntegrationManager - Manage integration configuration and access
 */
class IntegrationManager {
    constructor(licenseKey = null) {
        this.licenseKey = licenseKey;
        this.tier = this.determineTier(licenseKey);
        this.enabledIntegrations = new Map();
        this.config = {};
    }

    /**
     * Determine pricing tier from license key
     */
    determineTier(licenseKey) {
        if (!licenseKey) return 'community';

        // License key format: TIER-XXXXXXXX-XXXXXXXX
        const tierMatch = licenseKey.match(/^(PRO|ENT|ENTERPRISE)-/i);

        if (tierMatch) {
            const tierPrefix = tierMatch[1].toUpperCase();
            if (tierPrefix === 'ENT' || tierPrefix === 'ENTERPRISE') {
                return 'enterprise';
            }
            if (tierPrefix === 'PRO') {
                return 'pro';
            }
        }

        return 'community';
    }

    /**
     * Get current tier information
     */
    getTierInfo() {
        return PRICING_TIERS[this.tier];
    }

    /**
     * Check if a feature is available in current tier
     */
    hasFeature(featureName) {
        const tierInfo = this.getTierInfo();
        return tierInfo.features[featureName] || false;
    }

    /**
     * Check if an integration is available in current tier
     */
    canUseIntegration(integrationId) {
        const integration = INTEGRATIONS[integrationId];
        if (!integration) return false;

        const requiredTier = integration.requiredTier;
        const tierOrder = ['community', 'pro', 'enterprise'];

        return tierOrder.indexOf(this.tier) >= tierOrder.indexOf(requiredTier);
    }

    /**
     * Get available integrations for current tier
     */
    getAvailableIntegrations() {
        return Object.values(INTEGRATIONS).filter(
            integration => this.canUseIntegration(integration.id)
        );
    }

    /**
     * Enable an integration with configuration
     */
    enableIntegration(integrationId, config = {}) {
        if (!this.canUseIntegration(integrationId)) {
            throw new Error(
                `Integration '${integrationId}' requires ${INTEGRATIONS[integrationId]?.requiredTier} tier or higher`
            );
        }

        const integration = INTEGRATIONS[integrationId];

        this.enabledIntegrations.set(integrationId, {
            ...integration,
            enabled: true,
            config: { ...integration.config, ...config },
            enabledAt: new Date().toISOString()
        });

        return this.enabledIntegrations.get(integrationId);
    }

    /**
     * Disable an integration
     */
    disableIntegration(integrationId) {
        this.enabledIntegrations.delete(integrationId);
    }

    /**
     * Get enabled integrations
     */
    getEnabledIntegrations() {
        return Array.from(this.enabledIntegrations.values());
    }

    /**
     * Check usage limits
     */
    checkLimit(limitName, currentUsage) {
        const tierInfo = this.getTierInfo();
        const limit = tierInfo.limits[limitName];

        if (limit === -1) return { allowed: true, unlimited: true };

        return {
            allowed: currentUsage < limit,
            current: currentUsage,
            limit,
            remaining: Math.max(0, limit - currentUsage)
        };
    }

    /**
     * Get configuration summary
     */
    getSummary() {
        const tierInfo = this.getTierInfo();

        return {
            tier: this.tier,
            tierName: tierInfo.name,
            price: tierInfo.priceDisplay,
            agents: tierInfo.agents,
            enabledIntegrations: this.getEnabledIntegrations().map(i => i.id),
            availableIntegrations: this.getAvailableIntegrations().map(i => i.id),
            limits: tierInfo.limits,
            features: Object.entries(tierInfo.features)
                .filter(([, enabled]) => enabled)
                .map(([name]) => name)
        };
    }

    /**
     * Validate configuration for an integration
     */
    validateIntegrationConfig(integrationId, config) {
        const integration = INTEGRATIONS[integrationId];
        if (!integration) {
            return { valid: false, error: `Unknown integration: ${integrationId}` };
        }

        const errors = [];
        const warnings = [];

        // Check required fields based on integration type
        switch (integration.type) {
            case 'vcs':
                if (!config.token && !config.appId) {
                    warnings.push('No authentication configured - using environment variables');
                }
                break;

            case 'messaging':
                if (!config.webhookUrl && !config.botToken) {
                    errors.push('Webhook URL or bot token required');
                }
                break;

            case 'ai':
                if (!config.accessKeyId && !process.env.AWS_ACCESS_KEY_ID) {
                    errors.push('AWS credentials required for Bedrock integration');
                }
                break;
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
}

/**
 * Create integration manager with license key
 */
function createIntegrationManager(licenseKey) {
    return new IntegrationManager(licenseKey);
}

/**
 * Get feature comparison matrix
 */
function getFeatureMatrix() {
    const features = new Set();
    Object.values(PRICING_TIERS).forEach(tier => {
        Object.keys(tier.features).forEach(f => features.add(f));
    });

    const matrix = {};
    features.forEach(feature => {
        matrix[feature] = {
            community: PRICING_TIERS.community.features[feature],
            pro: PRICING_TIERS.pro.features[feature],
            enterprise: PRICING_TIERS.enterprise.features[feature]
        };
    });

    return matrix;
}

// Export
module.exports = {
    PRICING_TIERS,
    INTEGRATIONS,
    IntegrationManager,
    createIntegrationManager,
    getFeatureMatrix
};
