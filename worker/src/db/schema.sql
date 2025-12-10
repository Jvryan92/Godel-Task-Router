-- IntegrityGate D1 Schema

-- GitHub App installations
CREATE TABLE IF NOT EXISTS installations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_installation_id INTEGER UNIQUE NOT NULL,
  account_login TEXT NOT NULL,
  account_type TEXT NOT NULL,  -- 'User' or 'Organization'
  stripe_customer_id TEXT,
  plan TEXT DEFAULT 'free',
  settings TEXT DEFAULT '{}',  -- JSON config per installation
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Usage tracking for billing
CREATE TABLE IF NOT EXISTS usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  installation_id INTEGER NOT NULL,
  month TEXT NOT NULL,  -- '2025-01'
  check_runs INTEGER DEFAULT 0,
  deep_analyses INTEGER DEFAULT 0,
  UNIQUE(installation_id, month),
  FOREIGN KEY (installation_id) REFERENCES installations(github_installation_id)
);

-- Check run history (optional, for dashboard)
CREATE TABLE IF NOT EXISTS check_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  installation_id INTEGER NOT NULL,
  repo_full_name TEXT NOT NULL,
  sha TEXT NOT NULL,
  integrity_score INTEGER,
  merkle_root TEXT,
  policy_violations INTEGER,
  signature_status TEXT,
  conclusion TEXT,  -- 'success', 'failure', 'neutral'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (installation_id) REFERENCES installations(github_installation_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_installations_account ON installations(account_login);
CREATE INDEX IF NOT EXISTS idx_usage_month ON usage(month);
CREATE INDEX IF NOT EXISTS idx_check_runs_repo ON check_runs(repo_full_name);
