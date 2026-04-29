import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type { WorkflowRunRecord } from '../../../lib/run-history';
import { query } from '../../../lib/db';

type RunsMemoryStore = {
  workflowRuns: WorkflowRunRecord[];
};

const globalStore = globalThis as typeof globalThis & {
  __nextflowRunsStore__?: RunsMemoryStore;
};

const runsStore = globalStore.__nextflowRunsStore__ ?? { workflowRuns: [] };
globalStore.__nextflowRunsStore__ = runsStore;

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();

    // If authenticated, return from PostgreSQL
    if (userId) {
      const result = await query(
        'SELECT * FROM workflow_runs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
        [userId],
      );

      const runs = (result.rows || []).map((row: any) => {
        // Ensure Postgres timestamp is treated as UTC
        const createdAtDate = row.created_at instanceof Date 
          ? row.created_at
          : new Date(typeof row.created_at === 'string' 
              ? row.created_at.endsWith('Z') ? row.created_at : row.created_at + 'Z'
              : row.created_at);
        
        const isoString = createdAtDate.toISOString();
        console.log('Postgres timestamp debug:', {
          raw: row.created_at,
          type: row.created_at instanceof Date ? 'Date' : typeof row.created_at,
          asDate: createdAtDate,
          asISO: isoString,
        });
        
        return {
          id: row.run_id,
          createdAt: isoString,
          result: row.result,
          workflowName: row.workflow_name,
        };
      });

      return NextResponse.json(runs);
    }

    // Demo mode: return in-memory store
    return NextResponse.json(runsStore.workflowRuns);
  } catch (error) {
    console.error('Error fetching runs:', error);
    // Fallback to in-memory store on error
    return NextResponse.json(runsStore.workflowRuns);
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const body = (await request.json()) as Partial<WorkflowRunRecord>;

    const savedRun: WorkflowRunRecord = {
      id: body.id || `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: body.createdAt || new Date().toISOString(),
      ...body,
    };

    // If authenticated, save to PostgreSQL
    if (userId) {
      try {
        await query(
          'INSERT INTO workflow_runs (user_id, run_id, status, result, created_at) VALUES ($1, $2, $3, $4, $5)',
          [userId, savedRun.id, 'completed', JSON.stringify(body.result), savedRun.createdAt],
        );
      } catch (dbError) {
        console.error('Error saving to database:', dbError);
        // Fall back to in-memory for demo
      }
    }

    // Always update in-memory store for demo mode
    runsStore.workflowRuns.unshift(savedRun);
    runsStore.workflowRuns = runsStore.workflowRuns.slice(0, 100);

    return NextResponse.json(savedRun, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Invalid run payload.' }, { status: 400 });
  }
}
