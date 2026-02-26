# CLAUDE.md - Gödel Task Router

## Project Overview

Gödel Task Router is a **GitHub Action** for AI-powered code review, auto-fix, watermarking, and optimization. It runs a multi-agent "swarm" of up to 52 analysis agents that independently analyze code and vote on findings via consensus. The action is published on the GitHub Marketplace under `Jvryan92/Godel-Task-Router@v3`.

- **Version**: 3.5.0
- **License**: Proprietary (Patent Pending)
- **Runtime**: Node.js 20 (GitHub Actions `node20` runner)
- **Author**: EpochCore Quantum / John Vincent Ryan

## Repository Structure

```
Godel-Task-Router/
├── action.yml                  # GitHub Action definition (inputs, outputs, branding)
├── package.json                # npm config — build, test, lint scripts
├── dist/
│   └── index.js                # Compiled bundle (output of `ncc build`)
├── src/
│   ├── index.js                # Main entry point — orchestrates the full review pipeline
│   ├── epoch1-ast-analyzer.js  # EPOCH1 AST analysis engine (complexity, quality scoring)
│   ├── qcm-integration-hub.js  # Quantum-Classical Mesh integration hub
│   ├── quantum-classical-sdk.js# Unified SDK re-exporting AST, QCM, swarm modules
│   ├── swarm-flash-sync.js     # 26-node swarm matrix, flash sync, consensus protocol
│   ├── flash-sync-all-nodes.js # Orchestrator for syncing all swarm nodes
│   ├── autonomous-agent-controller.js  # Autonomous agent controller (GENESIS capsule)
│   ├── slack-autonomous-integration.js # Slack bot integration for notifications
│   ├── integrations/
│   │   ├── index.js              # IntegrationHub — unified integration facade
│   │   ├── integration-config.js # Pricing tiers, feature matrix, license validation
│   │   ├── aws-bedrock-integration.js  # AWS Bedrock Claude 3 AI review
│   │   ├── sarif-exporter.js     # SARIF format export for GitHub Code Scanning
│   │   ├── slack-integration.js  # Slack webhook/bot notifications
│   │   └── webhook-server.js     # Enterprise webhook server (GitHub/GitLab/Bitbucket)
│   └── __tests__/
│       ├── swarm-agents.test.js          # Tests for 52-agent swarm checks
│       └── epoch1-ast-analyzer.test.js   # Tests for AST analyzer
├── .github/workflows/
│   ├── godel-review.yml                    # Self-review workflow (PR trigger)
│   ├── epochcore-master-flash-sync.yml     # Daily flash sync across repos
│   └── quantum-flash-sync-cascade.yml      # Cascade sync workflow
├── pack.json / pack.csv / pack.txt   # Marketplace pack metadata
├── LICENSE                            # Proprietary license
└── README.md                          # User-facing documentation
```

## Tech Stack

- **Language**: JavaScript (CommonJS modules, no TypeScript)
- **Runtime**: Node.js 20+
- **Build**: `@vercel/ncc` — bundles `src/index.js` into `dist/index.js`
- **Testing**: Jest 29
- **GitHub Actions SDK**: `@actions/core`, `@actions/github`
- **Optional**: `@aws-sdk/client-bedrock-runtime` (Enterprise tier)

## Build & Development Commands

```bash
# Install dependencies
npm install

# Build the action (compile src/index.js → dist/index.js via ncc)
npm run build

# Run tests
npm test          # runs: jest --passWithNoTests

# Lint source code
npm run lint      # runs: eslint src/
```

**Important**: The `dist/index.js` bundle is what the GitHub Action actually executes (`action.yml` → `runs.main: 'dist/index.js'`). After any change to source files, you must run `npm run build` to regenerate it. The `prepare` script runs build automatically on `npm install`.

## Architecture

### Main Pipeline (`src/index.js`)

The `run()` function orchestrates the full review pipeline in order:

1. **Repository Scan** — walks the filesystem to find files
2. **EPOCH1 AST Analysis** — complexity, maintainability, quality scoring
3. **Security Scan + Auto-Fix** — detects and fixes hardcoded secrets, XSS, eval, SQL injection
4. **Dependency Audit** — runs `npm audit fix` for vulnerable packages
5. **Code Optimization** — var→const, console.log removal, arrow functions
6. **Code Compression** — minifies JS/CSS files
7. **Quantum Watermarking** — adds provenance signatures to code files
8. **OpusSwarm AI Review** — multi-agent consensus analysis (2-52 agents)
9. **QCM Analysis** — Quantum-Classical Mesh integration scoring
10. **Integration Exports** — SARIF, Slack, AWS Security Hub, Bedrock AI review
11. **Summary Report** — generates GitHub Actions job summary

### Module Exports (package.json `exports`)

The package exposes multiple entry points:
- `.` → `dist/index.js` (main action)
- `./sdk` → `src/quantum-classical-sdk.js`
- `./ast` → `src/epoch1-ast-analyzer.js`
- `./qcm` → `src/qcm-integration-hub.js`
- `./swarm` → `src/swarm-flash-sync.js`
- `./autonomous` → `src/autonomous-agent-controller.js`
- `./slack` → `src/slack-autonomous-integration.js`
- `./orchestrator` → `src/flash-sync-all-nodes.js`
- `./integrations` → `src/integrations/index.js`

### Tiered Feature Model

Features are gated by license tier:
- **Community (Free)**: 8 agents, basic security scan, auto-fix, Merkle validation
- **Pro ($29/mo)**: 26 agents, optimization, watermarking, compression, SARIF, Slack
- **Enterprise ($199/mo)**: 52 agents, AWS Bedrock, Security Hub, webhooks, custom endpoints

License validation is in `src/integrations/integration-config.js`.

### Swarm Agent Architecture

Agents are regex-based checkers organized by category:
- **Security** (agents 1-10): XSS, SQL injection, eval, secrets, command injection
- **Performance** (agents 11-15): loop optimization, async patterns
- **Quality** (agents 21-25): complexity analysis, var→const
- **Maintainability**: documentation, naming, module structure
- **Consensus** (Y-Z): Gödel number encoding, majority voting

Each agent independently returns findings; the consensus engine aggregates via majority voting.

## Key Constants

- `QUANTUM_SEAL`: `40668c787c463ca5` — provenance identifier used in watermarks
- `PHI`: `1.618033988749895` — golden ratio used in amplification
- `RESONANCE_FREQ`: `7777.77` — flash sync frequency constant
- API endpoints: AWS Lambda (`qs7jn0pfqj.execute-api.us-east-2.amazonaws.com`), Cloudflare Workers

## Testing

Tests live in `src/__tests__/` and use Jest:
- `swarm-agents.test.js` — validates individual swarm agent detection (XSS, SQL injection, eval, secrets, complexity)
- `epoch1-ast-analyzer.test.js` — validates AST analysis engine

Run with: `npm test`

No ESLint or Prettier config files exist in the repo. The `npm run lint` script calls `eslint src/` but depends on a global or default ESLint config.

## CI/CD Workflows

All in `.github/workflows/`:

1. **godel-review.yml** — triggers on PRs, runs the action itself for self-review
2. **epochcore-master-flash-sync.yml** — daily scheduled + manual dispatch, syncs across repositories
3. **quantum-flash-sync-cascade.yml** — triggers on push/PR to main + every 6 hours, runs cascade sync

## Conventions for AI Assistants

- **CommonJS only** — all modules use `require()` / `module.exports`. Do not introduce ESM (`import`/`export`).
- **No TypeScript** — the project is pure JavaScript; do not add `.ts` files.
- **Rebuild after changes** — always run `npm run build` after editing `src/` files so `dist/index.js` stays in sync.
- **Preserve watermark comments** — many files contain `QUANTUM_WATERMARK` comments. Do not remove them.
- **Test patterns** — tests mirror agent definitions inline. New agents should have corresponding test cases in `src/__tests__/swarm-agents.test.js`.
- **GitHub Action inputs/outputs** — when adding new features, update `action.yml` with proper input/output definitions and tier labels.
- **Keep agents as regex-based checkers** — swarm agents follow a pattern of `{ id, name, category, check: (content) => findings[] }`.
- **Sensitive data** — license keys, AWS credentials, and Slack tokens are read from GitHub Action inputs or environment variables. Never hardcode secrets.
- **Branch conventions** — the default branch is `master`. CI workflows reference `main` in some places.
