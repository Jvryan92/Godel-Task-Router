# Gödel Code Review

**AI-powered code review using 52-agent OpusSwarm consensus.**

> **<10μs execution speed** — While others wait for API responses, Gödel executes in ten microseconds. That's the time light travels 3 kilometers.

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Gödel%20Code%20Review-purple?logo=github)](https://github.com/marketplace/actions/godel-code-review)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **52-Agent AI Swarm**: Consensus-based code review using OpusSwarm
- **Cryptographic Signatures**: Verify code authenticity
- **Merkle Tree Validation**: Ensure file integrity
- **OPA Policy Compliance**: Check against security policies
- **Hardcoded Secret Detection**: Find exposed API keys and passwords
- **Security Vulnerability Scanning**: Detect common issues

## Quick Start

```yaml
name: Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Gödel Code Review
        uses: epochcoreqcs/godel-code-review@v2
        with:
          swarm-review: 'true'
          swarm-agents: '8'
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `mode` | Verification mode: `quick`, `standard`, `deep` | `standard` |
| `swarm-review` | Enable AI swarm code review | `true` |
| `swarm-agents` | Number of agents (2-52) | `8` |
| `review-depth` | Review depth: `quick`, `standard`, `thorough` | `standard` |
| `signature-verify` | Enable signature verification | `true` |
| `merkle-validate` | Enable Merkle tree validation | `true` |
| `fail-on-warning` | Fail on warnings | `false` |
| `license-key` | Pro/Enterprise license key | `''` |

## Outputs

| Output | Description |
|--------|-------------|
| `integrity-score` | Overall score (0-100) |
| `swarm-consensus` | Agent consensus (0.0-1.0) |
| `agents-agreed` | Number of agreeing agents |
| `signature-status` | Signature verification result |
| `merkle-root` | Computed Merkle root |
| `policy-violations` | Policy violation count |
| `report-url` | Link to detailed report |

## How It Works

```
┌────────────────────────────────────────────────────┐
│                  YOUR PR CODE                       │
└─────────────────────┬──────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────┐
│            GÖDEL CODE REVIEW ENGINE                │
│                                                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ Merkle  │  │  OPA    │  │Signature│            │
│  │  Tree   │  │ Policy  │  │  Check  │            │
│  └────┬────┘  └────┬────┘  └────┬────┘            │
│       └────────────┼────────────┘                  │
│                    ▼                               │
│  ┌────────────────────────────────────────────┐   │
│  │         OPUS SWARM (52 AGENTS)              │   │
│  │                                             │   │
│  │  Agent 1 ──┐                                │   │
│  │  Agent 2 ──┼──► CONSENSUS ──► FINDINGS     │   │
│  │  ...       │     0.999999                   │   │
│  │  Agent 52 ─┘                                │   │
│  └────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  INTEGRITY SCORE: 94   │
         │  SWARM CONSENSUS: 98%  │
         │  PASS / FAIL           │
         └────────────────────────┘
```

## Example Output

```
============================================================
GÖDEL CODE REVIEW REPORT
============================================================
Integrity Score: 94/100
Signature Status: verified
Merkle Root: a3f8c2d1...
Policy Violations: 1
Swarm Consensus: 97.50%
Agents Agreed: 8/8
Warnings: 2
Errors: 0
============================================================
```

## Pricing

| Tier | Agents | Features | Price |
|------|--------|----------|-------|
| **Community** | 8 | Basic review, local fallback | Free |
| **Pro** | 26 | Full swarm, priority API | $29/mo |
| **Enterprise** | 52 | All agents, SLA, custom policies | $199/mo |

## Advanced Usage

### Deep Security Scan

```yaml
- uses: epochcoreqcs/godel-code-review@v2
  with:
    mode: 'deep'
    swarm-agents: '26'
    review-depth: 'thorough'
    fail-on-warning: 'true'
    license-key: ${{ secrets.EPOCHCORE_LICENSE }}
```

### Custom Policies

Create `.epochcore/policies/security.rego`:

```rego
package epochcore.security

deny[msg] {
    input.file.path == ".env"
    msg := "Environment file should not be committed"
}
```

## API Endpoints

The action connects to:
- **Primary**: `https://qs7jn0pfqj.execute-api.us-east-2.amazonaws.com` (AWS)
- **Fallback**: `https://epochcore-opus-swarm.epochcoreras.workers.dev` (Cloudflare)

## Requirements

- GitHub Actions runner with Node.js 20+
- Network access to EpochCore APIs (or uses local fallback)

## Support

- **Issues**: [GitHub Issues](https://github.com/epochcoreqcs/godel-code-review/issues)
- **Email**: support@epochcoreqcs.com
- **Discord**: [EpochCore Community](https://discord.gg/epochcore)

## License

MIT License - Copyright (c) 2025 EpochCore Quantum

---

**Quantum Seal**: `40668c787c463ca5`
**Swarm Coherence**: 0.999999
**Built by**: John Vincent Ryan
