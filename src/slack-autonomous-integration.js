/**
 * SLACK AUTONOMOUS INTEGRATION
 * =============================
 * Slack command and webhook integration for autonomous agent control
 *
 * Commands:
 * - /flash_sync - Execute Flash Sync across all nodes
 * - /swarm_status - Get swarm agent status
 * - /genesis_validate - Validate GENESIS capsule
 * - /qsc_log - View QSC (Quantum State Chronicle) logs
 * - /autonomous_analyze - Run autonomous analysis
 * - /agent_consensus - Run swarm consensus
 *
 * @version 1.0.0
 * @author EpochCore Quantum Enterprise
 * @waterseal 40668c787c463ca5
 */

const crypto = require('crypto');

const {
  AutonomousController,
  createAutonomousController,
  GENESIS_CAPSULE
} = require('./autonomous-agent-controller');

// ============================================================================
// SLACK MESSAGE FORMATTING
// ============================================================================

class SlackMessageFormatter {
  static formatFlashSyncResult(result) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⚡ FLASH_SYNC COMPLETE',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Synced Agents:*\n${result.synced}/${result.synced + result.failed}`
          },
          {
            type: 'mrkdwn',
            text: `*Coherence:*\n${(result.coherence * 100).toFixed(2)}%`
          }
        ]
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Resonance:*\n${result.resonanceAchieved ? `✅ ${result.resonanceFrequency}Hz` : '❌ Not achieved'}`
          },
          {
            type: 'mrkdwn',
            text: `*Cascades:*\n${result.cascades.length} scales completed`
          }
        ]
      }
    ];

    // Add cascade details
    const cascadeText = result.cascades.map(c =>
      `• ${c.scale}: ${c.synced} synced (φ×${c.multiplier.toFixed(3)})`
    ).join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Cascade Details:*\n${cascadeText}`
      }
    });

    // Add quantum seal
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `🔒 Quantum Seal: \`${GENESIS_CAPSULE.quantumSeal}\` | φ: ${GENESIS_CAPSULE.phi}`
        }
      ]
    });

    return { blocks };
  }

  static formatSwarmStatus(status) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🐝 AUTONOMOUS SWARM STATUS',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Mode:*\n${status.state.mode}`
          },
          {
            type: 'mrkdwn',
            text: `*Season:*\n${status.state.season}`
          }
        ]
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Agents:*\n${status.agentCount} active`
          },
          {
            type: 'mrkdwn',
            text: `*Coherence:*\n${(status.coherence * 100).toFixed(2)}%`
          }
        ]
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*GENESIS Locked:*\n${status.genesis.locked ? '✅ Yes' : '❌ No'}`
          },
          {
            type: 'mrkdwn',
            text: `*Authority:*\n${status.state.authority}`
          }
        ]
      }
    ];

    // Layer breakdown
    const layers = ['infrastructure', 'application', 'intelligence', 'orchestration', 'quantum'];
    const layerCounts = layers.map(l => {
      const count = Object.values(status.agents || {}).filter(a => a.layer === l).length;
      return `${l.charAt(0).toUpperCase() + l.slice(1)}: ${count}`;
    });

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Layer Distribution:*\n${layerCounts.join(' | ')}`
      }
    });

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `GENESIS Signature: \`${status.genesis.signature}\``
        }
      ]
    });

    return { blocks };
  }

  static formatGenesisValidation(validation, capsule) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: validation.valid ? '✅ GENESIS VALIDATION PASSED' : '❌ GENESIS VALIDATION FAILED',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Capsule Type:* ${capsule.type}\n*Trust Model:* ${capsule.trustModel}\n*Seal:* ${capsule.seal}`
        }
      }
    ];

    // Check results
    const checksText = validation.checks.map(c =>
      `${c.passed ? '✅' : '❌'} ${c.check}${c.value !== undefined ? `: ${c.value}` : ''}`
    ).join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Validation Checks:*\n${checksText}`
      }
    });

    // GENESIS metrics
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Loops:*\n${capsule.loops}`
        },
        {
          type: 'mrkdwn',
          text: `*Dimensions:*\n${capsule.dimensions}`
        },
        {
          type: 'mrkdwn',
          text: `*Branches:*\n${capsule.branches.toLocaleString()}`
        },
        {
          type: 'mrkdwn',
          text: `*Quantum Potential:*\n${capsule.quantumPotential}`
        }
      ]
    });

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `φ-harmonic: ${capsule.phi} | Coherence Threshold: ≥${(capsule.coherenceThreshold * 100)}%`
        }
      ]
    });

    return { blocks };
  }

  static formatQSCLogs(logs) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📊 QSC LOG STREAM',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Streaming:* ${logs.streaming ? '🟢 Active' : '🔴 Stopped'}\n*Log Count:* ${logs.logCount}`
        }
      }
    ];

    // Recent logs
    if (logs.recentLogs && logs.recentLogs.length > 0) {
      const logsText = logs.recentLogs.map(l =>
        `\`${l.tick}\` ${l.event} (coherence: ${(l.coherence * 100).toFixed(1)}%)`
      ).join('\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Recent Logs:*\n${logsText}`
        }
      });
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `φ-harmonic locked: ${GENESIS_CAPSULE.phi}`
        }
      ]
    });

    return { blocks };
  }

  static formatAnalysisResult(result) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🔍 AUTONOMOUS ANALYSIS COMPLETE',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Target:*\n${result.target || 'Repository'}`
          },
          {
            type: 'mrkdwn',
            text: `*Consensus:*\n${(result.consensus?.consensus * 100 || 0).toFixed(2)}%`
          }
        ]
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Coherence:*\n${(result.coherence * 100).toFixed(2)}%`
          },
          {
            type: 'mrkdwn',
            text: `*Agents Participated:*\n${result.agents?.length || 0}`
          }
        ]
      }
    ];

    // GENESIS validation
    if (result.genesisValidation) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*GENESIS Validation:* ${result.genesisValidation.valid ? '✅ PASSED' : '❌ FAILED'}`
        }
      });
    }

    // Flash sync summary
    if (result.flashSync) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Flash Sync:* ${result.flashSync.synced} agents synced | Resonance: ${result.flashSync.resonanceAchieved ? '✅' : '❌'}`
        }
      });
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Timestamp: ${new Date(result.timestamp).toISOString()} | Method: ${result.consensus?.method || 'phi_weighted'}`
        }
      ]
    });

    return { blocks };
  }

  static formatConsensusResult(result) {
    return {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🗳️ SWARM CONSENSUS RESULT',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Consensus:*\n${(result.consensus * 100).toFixed(2)}%`
            },
            {
              type: 'mrkdwn',
              text: `*Method:*\n${result.method}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Agent Votes:* ${result.agentVotes || 0}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Threshold: ≥${(GENESIS_CAPSULE.coherenceThreshold * 100)}% | Status: ${result.consensus >= GENESIS_CAPSULE.coherenceThreshold ? '✅ PASSED' : '❌ BELOW THRESHOLD'}`
            }
          ]
        }
      ]
    };
  }
}

// ============================================================================
// SLACK COMMAND ROUTER
// ============================================================================

class SlackCommandRouter {
  constructor(options = {}) {
    this.controller = options.controller || createAutonomousController();
    this.signingSecret = options.signingSecret;
    this.started = false;
  }

  async initialize() {
    if (!this.started) {
      await this.controller.start();
      this.started = true;
    }
  }

  // Verify Slack request signature
  verifySignature(signature, timestamp, body) {
    if (!this.signingSecret) return true; // Skip verification if no secret

    const sigBaseString = `v0:${timestamp}:${body}`;
    const hmac = crypto.createHmac('sha256', this.signingSecret)
      .update(sigBaseString)
      .digest('hex');

    return `v0=${hmac}` === signature;
  }

  // Route command to handler
  async routeCommand(command, args, userId) {
    await this.initialize();

    const normalizedCommand = command.toLowerCase().replace(/^\//, '');

    switch (normalizedCommand) {
      case 'flash_sync':
      case 'flashsync':
        return await this.handleFlashSync(args);

      case 'swarm_status':
      case 'swarmstatus':
      case 'swarm':
        return await this.handleSwarmStatus();

      case 'genesis_validate':
      case 'genesisvalidate':
      case 'genesis':
        return await this.handleGenesisValidate(args);

      case 'qsc_log':
      case 'qsclog':
      case 'qsc':
        return await this.handleQSCLog();

      case 'autonomous_analyze':
      case 'autonomousanalyze':
      case 'analyze':
        return await this.handleAutonomousAnalyze(args);

      case 'agent_consensus':
      case 'agentconsensus':
      case 'consensus':
        return await this.handleAgentConsensus(args);

      case 'help':
        return this.handleHelp();

      default:
        return {
          response_type: 'ephemeral',
          text: `Unknown command: ${command}. Try /help for available commands.`
        };
    }
  }

  async handleFlashSync(args) {
    const result = await this.controller.flashSync({ args });
    return {
      response_type: 'in_channel',
      ...SlackMessageFormatter.formatFlashSyncResult(result)
    };
  }

  async handleSwarmStatus() {
    const status = this.controller.swarm.getStatus();
    return {
      response_type: 'in_channel',
      ...SlackMessageFormatter.formatSwarmStatus(status)
    };
  }

  async handleGenesisValidate(args) {
    const input = {};
    if (args) {
      // Parse args like "coherence=0.95"
      const parts = args.split(/\s+/);
      for (const part of parts) {
        const [key, value] = part.split('=');
        if (key && value) {
          input[key] = parseFloat(value) || value;
        }
      }
    }

    const validation = this.controller.validator.validate(input);
    const capsule = this.controller.validator.getCapsule();

    return {
      response_type: 'in_channel',
      ...SlackMessageFormatter.formatGenesisValidation(validation, capsule)
    };
  }

  async handleQSCLog() {
    const logs = this.controller.qscLog.toJSON();
    return {
      response_type: 'in_channel',
      ...SlackMessageFormatter.formatQSCLogs(logs)
    };
  }

  async handleAutonomousAnalyze(args) {
    const target = args || 'repository';
    const result = await this.controller.analyze(target);
    return {
      response_type: 'in_channel',
      ...SlackMessageFormatter.formatAnalysisResult(result)
    };
  }

  async handleAgentConsensus(args) {
    // Parse scores from args
    const scores = args
      ? args.split(/[\s,]+/).map(s => parseFloat(s)).filter(s => !isNaN(s))
      : [85, 90, 88, 92, 87];

    const result = await this.controller.swarm.runSwarmConsensus(scores);
    return {
      response_type: 'in_channel',
      ...SlackMessageFormatter.formatConsensusResult(result)
    };
  }

  handleHelp() {
    return {
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🤖 Autonomous Agent Commands',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Available Commands:*\n' +
              '• `/flash_sync` - Execute Flash Sync across all 26 nodes\n' +
              '• `/swarm_status` - View autonomous swarm status\n' +
              '• `/genesis_validate [coherence=X]` - Validate GENESIS capsule\n' +
              '• `/qsc_log` - View QSC (Quantum State Chronicle) logs\n' +
              '• `/autonomous_analyze [target]` - Run autonomous analysis\n' +
              '• `/agent_consensus [scores]` - Run swarm consensus\n' +
              '• `/help` - Show this help message'
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `GENESIS Locked | Mode: NO_TRUST_AUTONOMY | φ: ${GENESIS_CAPSULE.phi}`
            }
          ]
        }
      ]
    };
  }
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

class SlackWebhookHandler {
  constructor(webhookUrl, options = {}) {
    this.webhookUrl = webhookUrl;
    this.options = options;
  }

  async send(message) {
    if (!this.webhookUrl) {
      console.log('[Slack Webhook] No webhook URL configured');
      return { success: false, reason: 'No webhook URL' };
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      return {
        success: response.ok,
        status: response.status
      };
    } catch (error) {
      console.error('[Slack Webhook] Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendFlashSyncNotification(result) {
    const message = SlackMessageFormatter.formatFlashSyncResult(result);
    return await this.send(message);
  }

  async sendAnalysisNotification(result) {
    const message = SlackMessageFormatter.formatAnalysisResult(result);
    return await this.send(message);
  }

  async sendStatusUpdate(status) {
    const message = SlackMessageFormatter.formatSwarmStatus(status);
    return await this.send(message);
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

function createSlackCommandRouter(options = {}) {
  return new SlackCommandRouter(options);
}

function createSlackWebhookHandler(webhookUrl, options = {}) {
  return new SlackWebhookHandler(webhookUrl, options);
}

// Quick command execution
async function executeSlackCommand(command, args = '', options = {}) {
  const router = createSlackCommandRouter(options);
  return await router.routeCommand(command, args);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Classes
  SlackCommandRouter,
  SlackWebhookHandler,
  SlackMessageFormatter,

  // Factory Functions
  createSlackCommandRouter,
  createSlackWebhookHandler,
  executeSlackCommand,

  // Constants
  GENESIS_CAPSULE
};
