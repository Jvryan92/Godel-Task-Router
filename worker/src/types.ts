export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  GITHUB_APP_ID: string;
  GITHUB_PRIVATE_KEY: string;
  GITHUB_WEBHOOK_SECRET: string;
  STRIPE_SECRET_KEY: string;
  ENVIRONMENT: string;
}

export interface Installation {
  id: number;
  github_installation_id: number;
  account_login: string;
  account_type: 'User' | 'Organization';
  stripe_customer_id: string | null;
  plan: 'free' | 'starter' | 'pro' | 'vanguard';
  settings: string;
  created_at: string;
  updated_at: string;
}

export interface InstallationSettings {
  mode: 'quick' | 'standard' | 'deep';
  signatureVerify: boolean;
  merkleValidate: boolean;
  failOnWarning: boolean;
  excludePatterns: string[];
}

export interface RepoFile {
  path: string;
  sha: string;
  size: number;
  content?: string;
  hash?: string;
}

export interface IntegrityResult {
  integrityScore: number;
  signatureStatus: 'verified' | 'no_signatures' | 'not_checked';
  merkleRoot: string | null;
  policyViolations: number;
  warnings: string[];
  errors: string[];
  filesAnalyzed: number;
}

export interface WebhookPayload {
  action?: string;
  installation?: {
    id: number;
    account: {
      login: string;
      type: string;
    };
  };
  repository?: {
    full_name: string;
    owner: {
      login: string;
    };
    name: string;
    default_branch: string;
  };
  sender?: {
    login: string;
  };
  // Push event
  ref?: string;
  after?: string;
  before?: string;
  commits?: Array<{
    id: string;
    message: string;
  }>;
  // Pull request event
  pull_request?: {
    number: number;
    head: {
      sha: string;
      ref: string;
    };
    base: {
      ref: string;
    };
  };
}

export interface CheckRunOutput {
  title: string;
  summary: string;
  text?: string;
}
