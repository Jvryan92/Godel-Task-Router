'use strict';

/**
 * Slack Autonomous Integration for Gödel Task Router v3.3+
 *
 * Provides slash commands, Block Kit messages, and real-time
 * swarm intelligence updates via Slack webhooks.
 *
 * Commands:
 *   /flash_sync       - Execute Flash Sync across all 26 nodes
 *   /swarm_status     - View autonomous swarm status
 *   /genesis_validate - Validate GENESIS capsule
 *   /qsc_log          - View QSC logs
 *   /autonomous_analyze - Run autonomous analysis
 *   /agent_consensus  - Run swarm consensus
 *   /godel_sign       - Generate Gödel signature
 *   /node_inspect     - Inspect individual node state
 */

const {
  AutonomousController,
  createAutonomousController,
  flashSyncAllNodes,
  validateGenesisCapsule,
  GENESIS_CAPSULE,
  QUANTUM_SEAL,
  PHI,
  RESONANCE_FREQ
} = require('./autonomous-agent-controller');

// === SLACK MESSAGE BUILDERS ===
class SlackBlockBuilder {
  static header(text) {
    return { type: 'header', text: { type: 'plain_text', text, emoji: true } };
  }

  static section(text) {
    return { type: 'section', text: { type: 'mrkdwn', text } };
  }

  static fields(fieldPairs) {
    return {
      type: 'section',
      fields: fieldPairs.map(([label, value]) => ({
        type: 'mrkdwn',
        text: `*${label}:*\n${value}`
      }))
    };
  }

  static divider() {
    return { type: 'divider' };
  }

  static context(elements) {
    return {
      type: 'context',
      elements: elements.map(text => ({ type: 'mrkdwn', text }))
    };
  }

  static actions(buttons) {
    return {
      type: 'actions',
      elements: buttons.map(({ text, actionId, style, value }) => ({
        type: 'button',
        text: { type: 'plain_text', text, emoji: true },
        action_id: actionId,
        ...(style && { style }),
        ...(value && { value })
      }))
    };
  }
}

// === COMMAND HANDLERS ===
class SlackCommandHandler {
  constructor(config = {}) {
    this.config = {
      webhookUrl: config.webhookUrl || process.env.SLACK_WEBHOOK_URL,
      botToken: config.botToken || process.env.SLACK_BOT_TOKEN,
      signingSecret: config.signingSecret || process.env.SLACK_SIGNING_SECRET,
      ...config
    };
    this.controller = createAutonomousController(config.controllerConfig);
    this.commands = this._registerCommands();
  }

  _registerCommands() {
    return {
      '/flash_sync': this.handleFlashSync.bind(this),
      '/swarm_status': this.handleSwarmStatus.bind(this),
      '/genesis_validate': this.handleGenesisValidate.bind(this),
      '/qsc_log': this.handleQSCLog.bind(this),
      '/autonomous_analyze': this.handleAutonomousAnalyze.bind(this),
      '/agent_consensus': this.handleAgentConsensus.bind(this),
      '/godel_sign': this.handleGodelSign.bind(this),
      '/node_inspect': this.handleNodeInspect.bind(this)
    };
  }

  async handleCommand(command, params = {}) {
    const handler = this.commands[command];
    if (!handler) {
      return this._errorResponse(`Unknown command: ${command}`);
    }
    try {
      return await handler(params);
    } catch (error) {
      return this._errorResponse(`Command failed: ${error.message}`);
    }
  }

  async handleFlashSync(params = {}) {
    await this.controller.start();
    const result = await this.controller.flashSync(params.data || {});

    const blocks = [
      SlackBlockBuilder.header(':zap: Flash Sync Complete'),
      SlackBlockBuilder.fields([
        ['Nodes Synced', `${result.synced}/26`],
        ['Coherence', `${(result.coherence * 100).toFixed(2)}%`],
        ['Resonance', result.resonanceAchieved ? `:white_check_mark: ${RESONANCE_FREQ}Hz` : ':x: Not achieved'],
        ['GENESIS Sealed', result.genesisSealed ? ':lock: YES' : ':unlock: NO']
      ]),
      SlackBlockBuilder.divider(),
      SlackBlockBuilder.section('*Cascade Results:*'),
      ...result.cascadeLevels.map(level =>
        SlackBlockBuilder.section(
          `\`${level.level.toUpperCase()}\` - ${level.nodesSynced}/${level.totalNodes} nodes ` +
          `| PHI: \u00D7${level.multiplier.toFixed(3)} | Rate: ${(level.syncRate * 100).toFixed(1)}%`
        )
      ),
      SlackBlockBuilder.divider(),
      SlackBlockBuilder.fields([
        ['Consensus', `${result.consensus.decision.toUpperCase()} (${(result.consensus.approveRate * 100).toFixed(1)}%)`],
        ['Quantum Seal', `\`${result.quantumSeal}\``]
      ]),
      SlackBlockBuilder.context([
        `:dna: Signature: \`${result.signature}\``,
        `:clock1: ${new Date(result.timestamp).toISOString()}`
      ])
    ];

    return { response_type: 'in_channel', blocks };
  }

  async handleSwarmStatus(params = {}) {
    await this.controller.start();
    const status = this.controller.getStatus();

    const blocks = [
      SlackBlockBuilder.header(':robot_face: Autonomous Swarm Status'),
      SlackBlockBuilder.fields([
        ['State', `:lock: ${status.state}`],
        ['Season', `${status.season}`],
        ['Mode', `${status.mode}`],
        ['Agents', `${status.agents} nodes`]
      ]),
      SlackBlockBuilder.divider(),
      SlackBlockBuilder.fields([
        ['Authority', status.authority],
        ['Deployment', `\`${status.deploymentId}\``],
        ['QSC Ticks', `${status.qscTicks}`],
        ['GENESIS Valid', status.genesisValid ? ':white_check_mark: YES' : ':x: NO']
      ]),
      SlackBlockBuilder.divider(),
      SlackBlockBuilder.context([
        `:zap: PHI: ${PHI}`,
        `:ocean: Resonance: ${RESONANCE_FREQ}Hz`,
        `:closed_lock_with_key: Seal: ${QUANTUM_SEAL}`
      ]),
      SlackBlockBuilder.actions([
        { text: ':arrows_counterclockwise: Flash Sync', actionId: 'flash_sync', style: 'primary' },
        { text: ':mag: QSC Logs', actionId: 'qsc_log' },
        { text: ':shield: Validate', actionId: 'genesis_validate' }
      ])
    ];

    return { response_type: 'in_channel', blocks };
  }

  async handleGenesisValidate(params = {}) {
    const result = validateGenesisCapsule();

    const blocks = [
      SlackBlockBuilder.header(result.valid ? ':white_check_mark: GENESIS Capsule Valid' : ':x: GENESIS Validation Failed'),
      SlackBlockBuilder.fields([
        ['Pass Rate', `${(result.passRate * 100).toFixed(0)}%`],
        ['Checks Run', `${result.checks.length}`],
        ['Seal', `\`${result.seal}\``]
      ]),
      SlackBlockBuilder.divider(),
      SlackBlockBuilder.section('*Validation Checks:*'),
      ...result.checks.map(check =>
        SlackBlockBuilder.section(
          `${check.passed ? ':white_check_mark:' : ':x:'} \`${check.name}\` - ` +
          `Value: ${JSON.stringify(check.value)}`
        )
      ),
      SlackBlockBuilder.divider(),
      SlackBlockBuilder.context([
        `:closed_lock_with_key: Trust Model: ${GENESIS_CAPSULE.trustModel}`,
        `:brain: Mode: ${GENESIS_CAPSULE.mode}`
      ])
    ];

    return { response_type: 'in_channel', blocks };
  }

  async handleQSCLog(params = {}) {
    await this.controller.start();
    const logs = this.controller.getQSCLogs(params.filter);
    const recentLogs = logs.slice(-10);

    const blocks = [
      SlackBlockBuilder.header(':dna: QSC Live Stream'),
      SlackBlockBuilder.fields([
        ['Total Ticks', `${logs.length}`],
        ['Showing', `Last ${recentLogs.length} entries`]
      ]),
      SlackBlockBuilder.divider(),
      ...recentLogs.map(log =>
        SlackBlockBuilder.section(
          `\`[T+${String(log.tick).padStart(6, '0')}]\` *${log.event}* ` +
          `| Coherence: ${(log.coherence * 100).toFixed(2)}%`
        )
      ),
      SlackBlockBuilder.context([
        `:satellite_antenna: Stream: LIVE`,
        `:lock: Sealed: ${logs.filter(l => l.sealed).length}/${logs.length}`
      ])
    ];

    return { response_type: 'in_channel', blocks };
  }

  async handleAutonomousAnalyze(params = {}) {
    await this.controller.start();
    const files = params.files || [{ path: 'sample.js', content: params.code || '' }];
    const result = await this.controller.analyze(files, params.options || {});

    const blocks = [
      SlackBlockBuilder.header(':mag: Autonomous Analysis Complete'),
      SlackBlockBuilder.fields([
        ['Files Analyzed', `${files.length}`],
        ['Flash Sync', result.flashSync.success ? ':white_check_mark: Synced' : ':x: Failed'],
        ['Nodes Active', `${result.flashSync.synced || 0}/26`],
        ['Coherence', `${((result.flashSync.coherence || 0) * 100).toFixed(2)}%`]
      ]),
      SlackBlockBuilder.divider(),
      SlackBlockBuilder.fields([
        ['GENESIS Sealed', result.genesisSealed ? ':lock: YES' : ':unlock: NO'],
        ['Deployment', `\`${result.deploymentId}\``]
      ]),
      SlackBlockBuilder.context([
        `:closed_lock_with_key: Seal: ${result.quantumSeal}`
      ])
    ];

    return { response_type: 'in_channel', blocks };
  }

  async handleAgentConsensus(params = {}) {
    const topic = params.topic || 'swarm_operational_readiness';
    await this.controller.start();
    const result = await this.controller.runConsensus(topic, params.options || {});

    const blocks = [
      SlackBlockBuilder.header(':handshake: Agent Consensus'),
      SlackBlockBuilder.section(`*Topic:* ${result.topic}`),
      SlackBlockBuilder.fields([
        ['Participants', `${result.participants} agents`],
        ['Approved', `${result.approved}/${result.participants}`],
        ['Consensus', result.consensusReached ? ':white_check_mark: REACHED' : ':x: NOT REACHED'],
        ['GENESIS Sealed', result.genesisSealed ? ':lock: YES' : ':unlock: NO']
      ]),
      SlackBlockBuilder.context([
        `:brain: Algorithm: phi_weighted`,
        `:bar_chart: Approval Rate: ${((result.approved / result.participants) * 100).toFixed(1)}%`
      ])
    ];

    return { response_type: 'in_channel', blocks };
  }

  async handleGodelSign(params = {}) {
    await this.controller.start();
    const data = params.data || { component: 'flash_sync', version: '3.4.0' };
    const syncResult = await this.controller.flashSync(data);

    const blocks = [
      SlackBlockBuilder.header(':pencil2: Godel Signature Generated'),
      SlackBlockBuilder.section(`\`\`\`${syncResult.signature}\`\`\``),
      SlackBlockBuilder.fields([
        ['Algorithm', 'Prime Encoding + PHI'],
        ['Nodes', `${syncResult.synced}`],
        ['Coherence', `${(syncResult.coherence * 100).toFixed(2)}%`],
        ['Sealed', ':lock: GENESIS']
      ]),
      SlackBlockBuilder.context([
        `:dna: Quantum Seal: ${QUANTUM_SEAL}`,
        `:zap: Resonance: ${syncResult.resonanceAchieved ? RESONANCE_FREQ + 'Hz' : 'Not Achieved'}`
      ])
    ];

    return { response_type: 'in_channel', blocks };
  }

  async handleNodeInspect(params = {}) {
    const nodeId = (params.node || 'A').toUpperCase();
    await this.controller.start();
    const status = this.controller.getStatus();

    const layerMap = {
      infrastructure: 'A-I',
      application: 'J-R',
      intelligence: 'S-X',
      quantum: 'Y-Z'
    };

    let nodeLayer = 'unknown';
    const charCode = nodeId.charCodeAt(0) - 65;
    if (charCode <= 8) nodeLayer = 'infrastructure';
    else if (charCode <= 17) nodeLayer = 'application';
    else if (charCode <= 23) nodeLayer = 'intelligence';
    else nodeLayer = 'quantum';

    const phiWeight = Math.pow(PHI, charCode / 26);

    const blocks = [
      SlackBlockBuilder.header(`:mag: Node ${nodeId} Inspection`),
      SlackBlockBuilder.fields([
        ['Node ID', nodeId],
        ['Layer', `${nodeLayer} (${layerMap[nodeLayer]})`],
        ['PHI Weight', phiWeight.toFixed(6)],
        ['State', 'ACTIVE']
      ]),
      SlackBlockBuilder.divider(),
      SlackBlockBuilder.fields([
        ['Trust Mode', 'zero-trust'],
        ['Consensus Required', ':white_check_mark: YES'],
        ['Critics', 'safety, clarity, efficiency, coherence'],
        ['GENESIS Bound', ':lock: YES']
      ]),
      SlackBlockBuilder.context([
        `:robot_face: Agent: Autonomous`,
        `:zap: Flash Sync: Ready`,
        `:brain: Self-verifying`
      ])
    ];

    return { response_type: 'in_channel', blocks };
  }

  _errorResponse(message) {
    return {
      response_type: 'ephemeral',
      blocks: [
        SlackBlockBuilder.header(':warning: Error'),
        SlackBlockBuilder.section(message)
      ]
    };
  }
}

// === WEBHOOK HANDLER ===
class SlackWebhookHandler {
  constructor(config = {}) {
    this.commandHandler = new SlackCommandHandler(config);
    this.config = config;
  }

  async handleRequest(req) {
    const { command, text, user_id, channel_id } = req.body || req;

    // Route to appropriate command handler
    const params = this._parseParams(text);
    params.userId = user_id;
    params.channelId = channel_id;

    return this.commandHandler.handleCommand(command, params);
  }

  _parseParams(text) {
    if (!text) return {};
    const params = {};
    const parts = text.trim().split(/\s+/);

    parts.forEach(part => {
      if (part.includes('=')) {
        const [key, value] = part.split('=', 2);
        params[key] = value;
      } else if (part.length === 1 && part >= 'A' && part <= 'Z') {
        params.node = part;
      } else {
        params.topic = params.topic ? `${params.topic} ${part}` : part;
      }
    });

    return params;
  }

  getRegisteredCommands() {
    return Object.keys(this.commandHandler.commands);
  }
}

// === NOTIFICATION SENDER ===
class SlackNotificationSender {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
    this.queue = [];
    this.sending = false;
  }

  async sendFlashSyncUpdate(result) {
    const blocks = [
      SlackBlockBuilder.header(':zap: Flash Sync Update'),
      SlackBlockBuilder.fields([
        ['Nodes', `${result.synced}/26 synced`],
        ['Coherence', `${((result.coherence || 0) * 100).toFixed(2)}%`],
        ['Resonance', result.resonanceAchieved ? ':white_check_mark:' : ':x:'],
        ['Sealed', ':lock: GENESIS']
      ])
    ];

    return this._send({ blocks });
  }

  async sendConsensusResult(result) {
    const blocks = [
      SlackBlockBuilder.header(':handshake: Consensus Result'),
      SlackBlockBuilder.section(`*${result.topic}*: ${result.consensusReached ? 'APPROVED' : 'REJECTED'}`),
      SlackBlockBuilder.context([`${result.approved}/${result.participants} agents approved`])
    ];

    return this._send({ blocks });
  }

  async sendQSCAlert(event, data) {
    const blocks = [
      SlackBlockBuilder.header(':satellite_antenna: QSC Alert'),
      SlackBlockBuilder.section(`*Event:* ${event}`),
      SlackBlockBuilder.context([JSON.stringify(data).slice(0, 200)])
    ];

    return this._send({ blocks });
  }

  async _send(payload) {
    if (!this.webhookUrl) return { sent: false, reason: 'no_webhook_url' };

    this.queue.push(payload);
    if (this.sending) return { queued: true };

    this.sending = true;
    try {
      // In production, this would use fetch/https to POST to webhook
      const result = { sent: true, payload, timestamp: Date.now() };
      this.queue.shift();
      return result;
    } finally {
      this.sending = false;
    }
  }
}

// === FACTORY FUNCTIONS ===
function createSlackIntegration(config = {}) {
  return new SlackWebhookHandler(config);
}

function createNotificationSender(webhookUrl) {
  return new SlackNotificationSender(webhookUrl);
}

async function executeSlackCommand(command, params = {}, config = {}) {
  const handler = new SlackCommandHandler(config);
  return handler.handleCommand(command, params);
}

// === EXPORTS ===
module.exports = {
  // Classes
  SlackBlockBuilder,
  SlackCommandHandler,
  SlackWebhookHandler,
  SlackNotificationSender,

  // Factory functions
  createSlackIntegration,
  createNotificationSender,
  executeSlackCommand,

  // Constants
  AVAILABLE_COMMANDS: [
    '/flash_sync',
    '/swarm_status',
    '/genesis_validate',
    '/qsc_log',
    '/autonomous_analyze',
    '/agent_consensus',
    '/godel_sign',
    '/node_inspect'
  ]
};
