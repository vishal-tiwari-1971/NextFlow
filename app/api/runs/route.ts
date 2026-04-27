import { NextResponse } from 'next/server';
import type { WorkflowRunRecord } from '../../../lib/run-history';

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
  return NextResponse.json(runsStore.workflowRuns);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<WorkflowRunRecord>;

    const savedRun: WorkflowRunRecord = {
      id: body.id || `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: body.createdAt || new Date().toISOString(),
      ...body,
    };

    runsStore.workflowRuns.unshift(savedRun);
    runsStore.workflowRuns = runsStore.workflowRuns.slice(0, 100);

    return NextResponse.json(savedRun, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Invalid run payload.' }, { status: 400 });
  }
}
