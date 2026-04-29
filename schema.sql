-- NextFlow Database Schema for Neon PostgreSQL
-- Execute this SQL in your Neon console to set up the database

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Workflows table - stores user-created custom workflows
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow runs table - stores execution history
CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  run_id VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'completed',
  result JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_user_id ON workflow_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_created_at ON workflow_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);

-- Comment on tables for documentation
COMMENT ON TABLE workflows IS 'Stores custom workflows created by users. Sample workflow is stored separately in code.';
COMMENT ON TABLE workflow_runs IS 'Stores execution history for all workflows. Each run is associated with a user_id.';
