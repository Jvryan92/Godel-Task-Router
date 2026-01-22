# Gödel Task Router - Quick Start Guide

## Overview

Gödel Task Router is a quantum-classical code analysis platform featuring:
- **52-Agent OpusSwarm** - Distributed AI code review
- **EPOCH1 AST Analyzer** - Deep code quality analysis
- **Flash Sync Protocol** - 7777.77Hz resonance synchronization
- **26-Node Swarm Matrix** - PHI-weighted consensus

## Installation

### GitHub Actions (Recommended)

Add to your `.github/workflows/godel-review.yml`:

```yaml
name: Gödel Code Review
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Gödel Task Router
        uses: Jvryan92/Godel-Task-Router@v3.3
        with:
          mode: 'standard'
          auto-fix: 'true'
          swarm-review: 'true'
          pr-comments: 'true'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Configuration Tiers

| Tier | Agents | Price | Features |
|------|--------|-------|----------|
| **Community** | 8 | Free | Auto-fix, Security Scan, Swarm Review, QCM |
| **Pro** | 26 | $29/mo | + Optimize, Compress, Watermark, PR Comments |
| **Enterprise** | 52 | $199/mo | + AWS Bedrock, Security Hub, SARIF |

## Quick Examples

### 1. Basic Security Scan (Community)

```yaml
- uses: Jvryan92/Godel-Task-Router@v3.3
  with:
    auto-fix: 'true'
    swarm-agents: '8'
```

### 2. Full Analysis with PR Comments (Pro)

```yaml
- uses: Jvryan92/Godel-Task-Router@v3.3
  with:
    mode: 'deep'
    auto-fix: 'true'
    optimize: 'true'
    compress: 'true'
    watermark: 'true'
    audit-deps: 'true'
    swarm-agents: '26'
    pr-comments: 'true'
    license-key: ${{ secrets.GODEL_LICENSE }}
```

### 3. Enterprise with AWS Integration

```yaml
- uses: Jvryan92/Godel-Task-Router@v3.3
  with:
    mode: 'deep'
    auto-fix: 'true'
    swarm-agents: '52'
    aws-bedrock: 'true'
    aws-security-hub: 'true'
    license-key: ${{ secrets.GODEL_ENTERPRISE_KEY }}
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Configuration File

Create `.godelrc.json` in your repository root:

```json
{
  "version": "3.3",
  "mode": "standard",
  "features": {
    "autoFix": true,
    "securityScan": true,
    "prComments": true
  },
  "thresholds": {
    "passScore": 70,
    "warningScore": 85
  }
}
```

## Outputs

Access these outputs in subsequent workflow steps:

```yaml
- uses: Jvryan92/Godel-Task-Router@v3.3
  id: godel

- run: |
    echo "Score: ${{ steps.godel.outputs.integrity-score }}"
    echo "QCM: ${{ steps.godel.outputs.qcm-score }}"
    echo "Coherence: ${{ steps.godel.outputs.quantum-coherence }}"
    echo "Flash Sync: ${{ steps.godel.outputs.flash-sync-status }}"
```

## Swarm Architecture

The 26-node A-Z matrix operates in 5 layers:

| Layer | Nodes | Focus |
|-------|-------|-------|
| Infrastructure | A-F | Security patterns |
| Application | G-M | Maintainability |
| Intelligence | N-S | Complexity |
| Orchestration | T-W | Coherence |
| Quantum | X-Z | PHI amplification |

## Consensus Algorithms

- `quantum_vote` - Superposition collapse voting
- `phi_weighted` - Golden ratio (1.618) weighted
- `byzantine` - 2/3 majority fault tolerant
- `raft_like` - Leader election based
- `harmonic` - Harmonic mean consensus

## Support

- Documentation: https://godel-task-router.com/docs
- Issues: https://github.com/Jvryan92/Godel-Task-Router/issues
- Email: quantum@epochcore.io

---

**Powered by EpochCore Quantum - AWS Partner (S-0084812)**

Quantum Seal: `40668c787c463ca5` | Flash Sync: 7777.77Hz
