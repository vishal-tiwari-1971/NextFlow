import { useAppStore } from '../store/useAppStore';

export type WorkflowRunRecord = {
  id: string;
  createdAt: string;
  workflowName?: string;
  result?: unknown;
  [key: string]: unknown;
};

const DEMO_HISTORY_KEY = 'workflowHistory';
const MAX_DEMO_HISTORY_ITEMS = 10;
const HISTORY_UPDATED_EVENT = 'nextflow:history-updated';

const canUseBrowserStorage = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const notifyHistoryUpdated = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(HISTORY_UPDATED_EVENT));
};

export async function saveRun(run: Omit<WorkflowRunRecord, 'id' | 'createdAt'> & Partial<WorkflowRunRecord>) {
  const mode = useAppStore.getState().mode;

  const normalizedRun: WorkflowRunRecord = {
    id: run.id || `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: run.createdAt || new Date().toISOString(),
    ...run,
  };

  if (mode === 'demo') {
    if (!canUseBrowserStorage()) {
      return;
    }

    const existing = JSON.parse(localStorage.getItem(DEMO_HISTORY_KEY) || '[]') as WorkflowRunRecord[];
    existing.unshift(normalizedRun);
    localStorage.setItem(DEMO_HISTORY_KEY, JSON.stringify(existing.slice(0, MAX_DEMO_HISTORY_ITEMS)));
    notifyHistoryUpdated();
    return;
  }

  await fetch('/api/runs', {
    method: 'POST',
    body: JSON.stringify(normalizedRun),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  notifyHistoryUpdated();
}

export async function loadHistory(): Promise<WorkflowRunRecord[]> {
  const mode = useAppStore.getState().mode;

  if (mode === 'demo') {
    if (!canUseBrowserStorage()) {
      return [];
    }

    return JSON.parse(localStorage.getItem(DEMO_HISTORY_KEY) || '[]') as WorkflowRunRecord[];
  }

  const res = await fetch('/api/runs');

  if (!res.ok) {
    return [];
  }

  return (await res.json()) as WorkflowRunRecord[];
}
