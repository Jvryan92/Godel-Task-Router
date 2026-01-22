/*
 * GÖDEL TASK ROUTER - Enterprise Webhook Server Module
 * Standalone webhook server for GitLab, Bitbucket, and external integrations.
 * Can be deployed as AWS Lambda, Cloudflare Worker, or standalone Node.js server.
 *
 * QUANTUM_WATERMARK: GÖDEL_SEAL=40668c787c463ca5 V=3.2 INTEGRATION=WEBHOOK
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

/**
 * WebhookServer - Multi-platform webhook handler
 */
class WebhookServer extends EventEmitter {
    constructor(config = {}) {
        super();

        this.port = config.port || process.env.PORT || 3000;
        this.basePath = config.basePath || '/webhooks';
        this.secret = config.secret || process.env.WEBHOOK_SECRET;

        // Platform-specific secrets
        this.secrets = {
            github: config.githubSecret || process.env.GITHUB_WEBHOOK_SECRET,
            gitlab: config.gitlabSecret || process.env.GITLAB_WEBHOOK_SECRET,
            bitbucket: config.bitbucketSecret || process.env.BITBUCKET_WEBHOOK_SECRET,
            custom: config.customSecret || process.env.CUSTOM_WEBHOOK_SECRET
        };

        // Request handlers
        this.handlers = new Map();

        // Rate limiting
        this.rateLimiter = new RateLimiter({
            windowMs: config.rateLimitWindow || 60000,
            max: config.rateLimitMax || 100
        });

        // Request queue for async processing
        this.queue = [];
        this.processing = false;

        // Initialize default handlers
        this.initializeHandlers();
    }

    /**
     * Initialize default webhook handlers
     */
    initializeHandlers() {
        // GitHub webhook handler
        this.registerHandler('github', async (payload, headers) => {
            const event = headers['x-github-event'];
            const delivery = headers['x-github-delivery'];

            this.emit('github:event', { event, delivery, payload });

            switch (event) {
                case 'pull_request':
                    return this.handleGitHubPullRequest(payload);
                case 'push':
                    return this.handleGitHubPush(payload);
                case 'check_run':
                    return this.handleGitHubCheckRun(payload);
                default:
                    return { status: 'ignored', event };
            }
        });

        // GitLab webhook handler
        this.registerHandler('gitlab', async (payload, headers) => {
            const event = headers['x-gitlab-event'];
            const token = headers['x-gitlab-token'];

            this.emit('gitlab:event', { event, payload });

            switch (event) {
                case 'Merge Request Hook':
                    return this.handleGitLabMergeRequest(payload);
                case 'Push Hook':
                    return this.handleGitLabPush(payload);
                default:
                    return { status: 'ignored', event };
            }
        });

        // Bitbucket webhook handler
        this.registerHandler('bitbucket', async (payload, headers) => {
            const event = headers['x-event-key'];

            this.emit('bitbucket:event', { event, payload });

            switch (event) {
                case 'pullrequest:created':
                case 'pullrequest:updated':
                    return this.handleBitbucketPullRequest(payload);
                case 'repo:push':
                    return this.handleBitbucketPush(payload);
                default:
                    return { status: 'ignored', event };
            }
        });

        // Custom/generic webhook handler
        this.registerHandler('custom', async (payload, headers) => {
            const event = headers['x-custom-event'] || 'generic';

            this.emit('custom:event', { event, payload });

            return this.handleCustomEvent(payload, headers);
        });

        // Health check endpoint
        this.registerHandler('health', async () => ({
            status: 'healthy',
            version: '3.2.0',
            quantum_seal: '40668c787c463ca5',
            timestamp: new Date().toISOString()
        }));
    }

    /**
     * Register a custom webhook handler
     */
    registerHandler(platform, handler) {
        this.handlers.set(platform, handler);
    }

    /**
     * Verify webhook signature
     */
    verifySignature(platform, payload, headers) {
        const secret = this.secrets[platform] || this.secret;
        if (!secret) return true; // No secret configured, skip verification

        switch (platform) {
            case 'github':
                return this.verifyGitHubSignature(payload, headers, secret);
            case 'gitlab':
                return this.verifyGitLabSignature(headers, secret);
            case 'bitbucket':
                return true; // Bitbucket uses IP whitelisting
            default:
                return this.verifyHMACSignature(payload, headers, secret);
        }
    }

    /**
     * Verify GitHub webhook signature
     */
    verifyGitHubSignature(payload, headers, secret) {
        const signature = headers['x-hub-signature-256'] || headers['x-hub-signature'];
        if (!signature) return false;

        const algorithm = signature.startsWith('sha256=') ? 'sha256' : 'sha1';
        const expected = signature.replace(/^sha(1|256)=/, '');

        const hmac = crypto.createHmac(algorithm, secret);
        hmac.update(typeof payload === 'string' ? payload : JSON.stringify(payload));
        const calculated = hmac.digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(expected),
            Buffer.from(calculated)
        );
    }

    /**
     * Verify GitLab webhook token
     */
    verifyGitLabSignature(headers, secret) {
        const token = headers['x-gitlab-token'];
        return token === secret;
    }

    /**
     * Verify generic HMAC signature
     */
    verifyHMACSignature(payload, headers, secret) {
        const signature = headers['x-signature'] || headers['x-webhook-signature'];
        if (!signature) return false;

        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(typeof payload === 'string' ? payload : JSON.stringify(payload));
        const calculated = hmac.digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(calculated)
        );
    }

    /**
     * Process incoming webhook request
     */
    async processRequest(request) {
        const { platform, payload, headers, ip } = request;

        // Rate limiting check
        if (!this.rateLimiter.check(ip)) {
            return {
                statusCode: 429,
                body: { error: 'Too Many Requests' }
            };
        }

        // Signature verification
        if (!this.verifySignature(platform, payload, headers)) {
            this.emit('security:invalid_signature', { platform, ip });
            return {
                statusCode: 401,
                body: { error: 'Invalid signature' }
            };
        }

        // Get handler
        const handler = this.handlers.get(platform);
        if (!handler) {
            return {
                statusCode: 404,
                body: { error: `Unknown platform: ${platform}` }
            };
        }

        try {
            const result = await handler(payload, headers);

            this.emit('webhook:processed', { platform, result });

            return {
                statusCode: 200,
                body: result
            };

        } catch (error) {
            this.emit('webhook:error', { platform, error });

            return {
                statusCode: 500,
                body: { error: error.message }
            };
        }
    }

    /**
     * Handle GitHub Pull Request event
     */
    async handleGitHubPullRequest(payload) {
        const { action, pull_request, repository } = payload;

        if (!['opened', 'synchronize', 'reopened'].includes(action)) {
            return { status: 'ignored', action };
        }

        const reviewRequest = {
            platform: 'github',
            type: 'pull_request',
            repository: {
                owner: repository.owner.login,
                name: repository.name,
                fullName: repository.full_name,
                url: repository.html_url
            },
            pullRequest: {
                number: pull_request.number,
                title: pull_request.title,
                sha: pull_request.head.sha,
                baseBranch: pull_request.base.ref,
                headBranch: pull_request.head.ref,
                author: pull_request.user.login,
                url: pull_request.html_url
            },
            action
        };

        this.emit('review:request', reviewRequest);

        return {
            status: 'queued',
            requestId: crypto.randomUUID(),
            ...reviewRequest
        };
    }

    /**
     * Handle GitHub Push event
     */
    async handleGitHubPush(payload) {
        const { ref, commits, repository, pusher } = payload;

        const reviewRequest = {
            platform: 'github',
            type: 'push',
            repository: {
                owner: repository.owner.login || repository.owner.name,
                name: repository.name,
                fullName: repository.full_name
            },
            push: {
                ref,
                branch: ref.replace('refs/heads/', ''),
                commits: commits?.length || 0,
                pusher: pusher.name
            }
        };

        this.emit('push:event', reviewRequest);

        return { status: 'received', ...reviewRequest };
    }

    /**
     * Handle GitHub Check Run event
     */
    async handleGitHubCheckRun(payload) {
        const { action, check_run, repository } = payload;

        if (action !== 'rerequested') {
            return { status: 'ignored', action };
        }

        const reviewRequest = {
            platform: 'github',
            type: 'check_run_rerun',
            repository: {
                owner: repository.owner.login,
                name: repository.name
            },
            checkRun: {
                id: check_run.id,
                name: check_run.name,
                sha: check_run.head_sha
            }
        };

        this.emit('review:rerun', reviewRequest);

        return { status: 'queued', ...reviewRequest };
    }

    /**
     * Handle GitLab Merge Request event
     */
    async handleGitLabMergeRequest(payload) {
        const { object_attributes: mr, project, user } = payload;

        if (!['open', 'update', 'reopen'].includes(mr.action)) {
            return { status: 'ignored', action: mr.action };
        }

        const reviewRequest = {
            platform: 'gitlab',
            type: 'merge_request',
            repository: {
                id: project.id,
                name: project.name,
                fullName: project.path_with_namespace,
                url: project.web_url
            },
            mergeRequest: {
                iid: mr.iid,
                title: mr.title,
                sha: mr.last_commit?.id,
                sourceBranch: mr.source_branch,
                targetBranch: mr.target_branch,
                author: user.username,
                url: mr.url
            },
            action: mr.action
        };

        this.emit('review:request', reviewRequest);

        return {
            status: 'queued',
            requestId: crypto.randomUUID(),
            ...reviewRequest
        };
    }

    /**
     * Handle GitLab Push event
     */
    async handleGitLabPush(payload) {
        const { ref, commits, project, user_name } = payload;

        const reviewRequest = {
            platform: 'gitlab',
            type: 'push',
            repository: {
                id: project.id,
                name: project.name,
                fullName: project.path_with_namespace
            },
            push: {
                ref,
                branch: ref.replace('refs/heads/', ''),
                commits: commits?.length || 0,
                pusher: user_name
            }
        };

        this.emit('push:event', reviewRequest);

        return { status: 'received', ...reviewRequest };
    }

    /**
     * Handle Bitbucket Pull Request event
     */
    async handleBitbucketPullRequest(payload) {
        const { pullrequest, repository, actor } = payload;

        const reviewRequest = {
            platform: 'bitbucket',
            type: 'pull_request',
            repository: {
                uuid: repository.uuid,
                name: repository.name,
                fullName: repository.full_name,
                url: repository.links?.html?.href
            },
            pullRequest: {
                id: pullrequest.id,
                title: pullrequest.title,
                sha: pullrequest.source?.commit?.hash,
                sourceBranch: pullrequest.source?.branch?.name,
                destinationBranch: pullrequest.destination?.branch?.name,
                author: actor.username,
                url: pullrequest.links?.html?.href
            }
        };

        this.emit('review:request', reviewRequest);

        return {
            status: 'queued',
            requestId: crypto.randomUUID(),
            ...reviewRequest
        };
    }

    /**
     * Handle Bitbucket Push event
     */
    async handleBitbucketPush(payload) {
        const { push, repository, actor } = payload;

        const changes = push.changes || [];
        const commits = changes.reduce((acc, c) => acc + (c.commits?.length || 0), 0);

        const reviewRequest = {
            platform: 'bitbucket',
            type: 'push',
            repository: {
                uuid: repository.uuid,
                name: repository.name,
                fullName: repository.full_name
            },
            push: {
                changes: changes.length,
                commits,
                pusher: actor.username
            }
        };

        this.emit('push:event', reviewRequest);

        return { status: 'received', ...reviewRequest };
    }

    /**
     * Handle custom webhook event
     */
    async handleCustomEvent(payload, headers) {
        const reviewRequest = {
            platform: 'custom',
            type: headers['x-custom-event'] || 'generic',
            payload,
            timestamp: new Date().toISOString()
        };

        this.emit('custom:request', reviewRequest);

        return {
            status: 'received',
            requestId: crypto.randomUUID(),
            ...reviewRequest
        };
    }

    /**
     * Create Express middleware handler
     */
    createExpressMiddleware() {
        return async (req, res) => {
            const platform = req.params.platform || 'custom';
            const result = await this.processRequest({
                platform,
                payload: req.body,
                headers: req.headers,
                ip: req.ip || req.connection?.remoteAddress
            });

            res.status(result.statusCode).json(result.body);
        };
    }

    /**
     * Create AWS Lambda handler
     */
    createLambdaHandler() {
        return async (event, context) => {
            const body = typeof event.body === 'string'
                ? JSON.parse(event.body)
                : event.body;

            const platform = event.pathParameters?.platform || 'custom';

            const result = await this.processRequest({
                platform,
                payload: body,
                headers: event.headers,
                ip: event.requestContext?.identity?.sourceIp
            });

            return {
                statusCode: result.statusCode,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result.body)
            };
        };
    }

    /**
     * Create Cloudflare Worker handler
     */
    createCloudflareHandler() {
        return async (request, env, ctx) => {
            const url = new URL(request.url);
            const platform = url.pathname.split('/').pop() || 'custom';
            const body = await request.json();

            const headers = {};
            request.headers.forEach((value, key) => {
                headers[key.toLowerCase()] = value;
            });

            const result = await this.processRequest({
                platform,
                payload: body,
                headers,
                ip: headers['cf-connecting-ip']
            });

            return new Response(JSON.stringify(result.body), {
                status: result.statusCode,
                headers: { 'Content-Type': 'application/json' }
            });
        };
    }

    /**
     * Get registered platforms
     */
    getRegisteredPlatforms() {
        return Array.from(this.handlers.keys());
    }
}

/**
 * Simple rate limiter
 */
class RateLimiter {
    constructor(options = {}) {
        this.windowMs = options.windowMs || 60000;
        this.max = options.max || 100;
        this.requests = new Map();
    }

    check(key) {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        // Get or initialize request list for this key
        let requests = this.requests.get(key) || [];

        // Filter out old requests
        requests = requests.filter(time => time > windowStart);

        // Check if limit exceeded
        if (requests.length >= this.max) {
            return false;
        }

        // Add current request
        requests.push(now);
        this.requests.set(key, requests);

        return true;
    }

    reset(key) {
        if (key) {
            this.requests.delete(key);
        } else {
            this.requests.clear();
        }
    }
}

/**
 * WebhookQueue - Async processing queue for webhook events
 */
class WebhookQueue {
    constructor(options = {}) {
        this.queue = [];
        this.processing = false;
        this.concurrency = options.concurrency || 5;
        this.activeJobs = 0;
        this.handlers = new Map();
    }

    /**
     * Register event handler
     */
    on(event, handler) {
        this.handlers.set(event, handler);
    }

    /**
     * Add job to queue
     */
    enqueue(job) {
        this.queue.push({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            ...job
        });

        this.process();

        return job.id;
    }

    /**
     * Process queue
     */
    async process() {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0 && this.activeJobs < this.concurrency) {
            const job = this.queue.shift();
            this.activeJobs++;

            this.executeJob(job)
                .catch(err => console.error('Job failed:', err))
                .finally(() => {
                    this.activeJobs--;
                    this.process();
                });
        }

        this.processing = false;
    }

    /**
     * Execute single job
     */
    async executeJob(job) {
        const handler = this.handlers.get(job.type);

        if (!handler) {
            console.warn(`No handler for job type: ${job.type}`);
            return;
        }

        await handler(job);
    }

    /**
     * Get queue status
     */
    getStatus() {
        return {
            pending: this.queue.length,
            active: this.activeJobs,
            concurrency: this.concurrency
        };
    }
}

// Export for use in main module
module.exports = {
    WebhookServer,
    RateLimiter,
    WebhookQueue
};
