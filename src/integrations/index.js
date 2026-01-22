/*
 * GÖDEL TASK ROUTER - Integrations Module Index
 * Unified export for all integration modules.
 *
 * QUANTUM_WATERMARK: GÖDEL_SEAL=40668c787c463ca5 V=3.2 INTEGRATION=INDEX
 */

// Slack Integration
const { SlackIntegration, SlackNotificationQueue } = require('./slack-integration');

// AWS Bedrock Integration
const {
    AWSSignatureV4,
    BedrockCodeReviewer,
    SecurityHubExporter,
    BedrockUsageTracker
} = require('./aws-bedrock-integration');

// SARIF Export
const { SARIFExporter, GitHubCodeScanningUploader } = require('./sarif-exporter');

// Webhook Server
const { WebhookServer, RateLimiter, WebhookQueue } = require('./webhook-server');

// Integration Configuration
const {
    PRICING_TIERS,
    INTEGRATIONS,
    IntegrationManager,
    createIntegrationManager,
    getFeatureMatrix
} = require('./integration-config');

/**
 * IntegrationHub - Centralized integration management
 * Provides a unified interface for all integrations
 */
class IntegrationHub {
    constructor(config = {}) {
        this.licenseKey = config.licenseKey || process.env.GODEL_LICENSE_KEY;
        this.manager = createIntegrationManager(this.licenseKey);

        // Initialize integrations based on configuration
        this.slack = null;
        this.bedrock = null;
        this.securityHub = null;
        this.sarif = null;
        this.webhookServer = null;

        // Auto-initialize available integrations
        this.initialize(config);
    }

    /**
     * Initialize all configured integrations
     */
    initialize(config) {
        const tier = this.manager.tier;

        // Always available: SARIF export for pro+
        if (this.manager.hasFeature('sarifExport')) {
            this.sarif = new SARIFExporter({
                toolVersion: config.version || '3.2.0'
            });
        }

        // Slack integration (pro+)
        if (this.manager.hasFeature('slackIntegration') && config.slack) {
            this.slack = new SlackIntegration(config.slack);
            this.manager.enableIntegration('slack', config.slack);
        }

        // AWS Bedrock (enterprise)
        if (this.manager.hasFeature('awsBedrock') && config.awsBedrock) {
            this.bedrock = new BedrockCodeReviewer(config.awsBedrock);
            this.manager.enableIntegration('aws_bedrock', config.awsBedrock);
        }

        // AWS Security Hub (enterprise)
        if (this.manager.hasFeature('awsSecurityHub') && config.awsSecurityHub) {
            this.securityHub = new SecurityHubExporter(config.awsSecurityHub);
            this.manager.enableIntegration('aws_security_hub', config.awsSecurityHub);
        }

        // Webhook server (enterprise)
        if (this.manager.hasFeature('customWebhooks') && config.webhookServer) {
            this.webhookServer = new WebhookServer(config.webhookServer);
            this.manager.enableIntegration('webhook', config.webhookServer);
        }
    }

    /**
     * Get integration status
     */
    getStatus() {
        return {
            tier: this.manager.tier,
            tierInfo: this.manager.getTierInfo(),
            integrations: {
                slack: {
                    enabled: !!this.slack,
                    configured: this.slack?.isConfigured() || false
                },
                bedrock: {
                    enabled: !!this.bedrock,
                    configured: this.bedrock?.isConfigured() || false
                },
                securityHub: {
                    enabled: !!this.securityHub,
                    configured: this.securityHub?.isConfigured() || false
                },
                sarif: {
                    enabled: !!this.sarif,
                    configured: true
                },
                webhookServer: {
                    enabled: !!this.webhookServer,
                    platforms: this.webhookServer?.getRegisteredPlatforms() || []
                }
            },
            summary: this.manager.getSummary()
        };
    }

    /**
     * Send review notification to all configured channels
     */
    async notifyReviewComplete(reviewData) {
        const results = {};

        // Slack notification
        if (this.slack?.isConfigured()) {
            results.slack = await this.slack.sendReviewNotification(reviewData);
        }

        return results;
    }

    /**
     * Send security alert to all configured channels
     */
    async notifySecurityAlert(alertData) {
        const results = {};

        // Slack security alert
        if (this.slack?.isConfigured()) {
            results.slack = await this.slack.sendSecurityAlert(alertData);
        }

        // AWS Security Hub export
        if (this.securityHub?.isConfigured()) {
            results.securityHub = await this.securityHub.exportFindings(
                [alertData],
                { repository: alertData.repository }
            );
        }

        return results;
    }

    /**
     * Perform AI-enhanced review using Bedrock
     */
    async performAIReview(files, options = {}) {
        if (!this.bedrock?.isConfigured()) {
            return { success: false, reason: 'AWS Bedrock not configured' };
        }

        return await this.bedrock.reviewCode(files, options);
    }

    /**
     * Export findings to SARIF format
     */
    exportToSARIF(findings, context = {}) {
        if (!this.sarif) {
            return { success: false, reason: 'SARIF export not available in current tier' };
        }

        return this.sarif.export(findings, context);
    }

    /**
     * Export to all configured destinations
     */
    async exportFindings(findings, context = {}) {
        const results = {};

        // SARIF export
        if (this.sarif) {
            const sarif = this.sarif.export(findings, context);
            results.sarif = sarif;

            // Upload to GitHub Code Scanning if token available
            if (process.env.GITHUB_TOKEN) {
                const uploader = new GitHubCodeScanningUploader();
                results.githubCodeScanning = await uploader.upload(sarif, context);
            }
        }

        // Security Hub export
        if (this.securityHub?.isConfigured()) {
            results.securityHub = await this.securityHub.exportFindings(findings, context);
        }

        return results;
    }
}

/**
 * Quick setup function for common configurations
 */
function quickSetup(options = {}) {
    const config = {
        licenseKey: options.licenseKey || process.env.GODEL_LICENSE_KEY,
        version: options.version || '3.2.0'
    };

    // Auto-detect Slack configuration
    if (process.env.SLACK_WEBHOOK_URL || process.env.SLACK_BOT_TOKEN) {
        config.slack = {
            webhookUrl: process.env.SLACK_WEBHOOK_URL,
            botToken: process.env.SLACK_BOT_TOKEN,
            defaultChannel: process.env.SLACK_CHANNEL || '#code-reviews'
        };
    }

    // Auto-detect AWS configuration
    if (process.env.AWS_ACCESS_KEY_ID) {
        if (options.enableBedrock !== false) {
            config.awsBedrock = {
                region: process.env.AWS_REGION || 'us-east-1',
                model: options.bedrockModel || 'claude-3-haiku'
            };
        }

        if (options.enableSecurityHub) {
            config.awsSecurityHub = {
                region: process.env.AWS_REGION || 'us-east-1',
                accountId: process.env.AWS_ACCOUNT_ID
            };
        }
    }

    return new IntegrationHub(config);
}

// Export everything
module.exports = {
    // Main hub
    IntegrationHub,
    quickSetup,

    // Individual integrations
    SlackIntegration,
    SlackNotificationQueue,
    BedrockCodeReviewer,
    SecurityHubExporter,
    BedrockUsageTracker,
    SARIFExporter,
    GitHubCodeScanningUploader,
    WebhookServer,
    WebhookQueue,
    RateLimiter,

    // Configuration
    PRICING_TIERS,
    INTEGRATIONS,
    IntegrationManager,
    createIntegrationManager,
    getFeatureMatrix,

    // AWS helpers
    AWSSignatureV4
};
