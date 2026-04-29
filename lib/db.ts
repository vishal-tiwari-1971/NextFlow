import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      // Set timezone to UTC for all operations
      application_name: 'nextflow_app',
    })
  : null;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Ensure all connections use UTC
if (pool) {
  pool.on('connect', (client) => {
    client.query('SET TIME ZONE UTC').catch((err) => {
      console.error('Failed to set UTC timezone:', err);
    });
  });
}

let initPromise: Promise<void> | null = null;

async function run(text: string, params?: unknown[]) {
  if (!pool) {
    throw new Error('Database pool is not initialized');
  }

  return pool.query(text, params);
}

async function ensureDatabaseInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      await run('CREATE EXTENSION IF NOT EXISTS pgcrypto');

      await run(`
        CREATE TABLE IF NOT EXISTS workflows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
          edges JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS workflow_runs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255) NOT NULL,
          workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
          run_id VARCHAR(255) UNIQUE NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'completed',
          result JSONB,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
        )
      `);

      await run(`
        CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id)
      `);

      await run(`
        CREATE INDEX IF NOT EXISTS idx_workflow_runs_user_id ON workflow_runs(user_id)
      `);

      await run(`
        CREATE INDEX IF NOT EXISTS idx_workflow_runs_created_at ON workflow_runs(created_at DESC)
      `);

      await run(`
        CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON workflow_runs(workflow_id)
      `);
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}

export async function query(text: string, params?: unknown[]) {
  try {
    await ensureDatabaseInitialized();
    const result = await run(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function initializeDatabase() {
  try {
    await ensureDatabaseInitialized();

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}
