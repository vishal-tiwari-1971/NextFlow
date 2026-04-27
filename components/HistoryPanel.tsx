'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorkflowStore, type WorkflowNodeData } from '../store/useWorkflowStore';

type WorkflowRunNode = {
  nodeId: string;
  type: string;
  inputs: unknown;
  outputs: unknown;
  status: 'success' | 'error';
};

type WorkflowRun = {
  runId: string;
  timestamp: number;
  nodes: WorkflowRunNode[];
};

type LegacyRun = {
  id?: string;
  createdAt?: string;
  result?: {
    nodes?: Array<{
      id?: string;
      type?: string;
      data?: {
        inputs?: unknown;
        outputs?: unknown;
        status?: string;
      };
    }>;
  };
};

const HISTORY_STORAGE_KEY = 'workflowHistory';

const formatTimeAgo = (timestamp: number) => {
  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return 'just now';
  }

  if (diffMs < hour) {
    return `${Math.floor(diffMs / minute)} mins ago`;
  }

  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)} hrs ago`;
  }

  return `${Math.floor(diffMs / day)} days ago`;
};

const shortenRunId = (runId: string) => {
  if (runId.length <= 12) {
    return runId;
  }

  return `${runId.slice(0, 6)}...${runId.slice(-4)}`;
};

const isWorkflowRun = (value: unknown): value is WorkflowRun => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<WorkflowRun>;

  return (
    typeof candidate.runId === 'string'
    && typeof candidate.timestamp === 'number'
    && Array.isArray(candidate.nodes)
  );
};

const normalizeLegacyRun = (legacy: LegacyRun): WorkflowRun | null => {
  if (!legacy.id || !legacy.createdAt) {
    return null;
  }

  const timestamp = Date.parse(legacy.createdAt);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  const nodes = ((legacy.result?.nodes ?? []) as Array<{
    id?: string;
    type?: string;
    data?: { inputs?: unknown; outputs?: unknown; status?: string };
  }>).map((node) => {
    const status = node.data?.status === 'error' ? 'error' : 'success';

    return {
      nodeId: node.id || 'unknown-node',
      type: node.type || 'unknown',
      inputs: node.data?.inputs ?? {},
      outputs: node.data?.outputs ?? {},
      status: status as 'success' | 'error',
    } as WorkflowRunNode;
  });

  return {
    runId: legacy.id,
    timestamp,
    nodes,
  };
};

const parseHistory = (raw: string): WorkflowRun[] => {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    const normalized: WorkflowRun[] = [];

    for (const item of parsed) {
      if (isWorkflowRun(item)) {
        normalized.push(item);
        continue;
      }

      if (item && typeof item === 'object') {
        const legacyRun = normalizeLegacyRun(item as LegacyRun);

        if (legacyRun) {
          normalized.push(legacyRun);
        }
      }
    }

    return normalized.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
};

export default function HistoryPanel() {
  const [history, setHistory] = useState<WorkflowRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const setWorkflow = useWorkflowStore((state) => state.setWorkflow);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const historyRecords = parseHistory(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
    setHistory(historyRecords);
    setSelectedRun((current) => current ?? historyRecords[0] ?? null);
  }, []);

  const highlightNodes = useCallback(
    (runNodes: WorkflowRunNode[]) => {
      const byId = new Map(runNodes.map((node) => [node.nodeId, node]));

      const updatedNodes = nodes.map((node) => {
        const runNode = byId.get(node.id);

        if (!runNode) {
          return node;
        }

        return {
          ...node,
          data: {
            ...(node.data as WorkflowNodeData),
            inputs: runNode.inputs as Record<string, unknown>,
            outputs: runNode.outputs as Record<string, unknown>,
            status: runNode.status,
            error: runNode.status === 'error' ? 'Error in selected run' : null,
          },
        };
      });

      setWorkflow({
        nodes: updatedNodes,
        edges,
      });
    },
    [edges, nodes, setWorkflow],
  );

  const handleSelectRun = useCallback(
    (run: WorkflowRun) => {
      setSelectedRun(run);
      highlightNodes(run.nodes);
    },
    [highlightNodes],
  );

  const selectedRunNodes = useMemo(() => selectedRun?.nodes ?? [], [selectedRun]);

  return (
    <aside className="flex h-screen w-[300px] shrink-0 flex-col border-l border-gray-700 bg-gray-900 text-white">
      <div className="border-b border-gray-700 px-4 py-4">
        <h2 className="text-lg font-semibold">History Panel</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-gray-700 px-3 py-3">
          <p className="mb-2 text-xs uppercase tracking-[0.22em] text-gray-400">Runs</p>

          <div className="space-y-2">
            {history.length === 0 && (
              <div className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-400">
                No runs yet in local history.
              </div>
            )}

            {history.map((run) => (
              <button
                key={run.runId}
                type="button"
                onClick={() => handleSelectRun(run)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition hover:bg-gray-800 ${
                  selectedRun?.runId === run.runId
                    ? 'border-green-600 bg-gray-800'
                    : 'border-gray-700 bg-gray-900'
                }`}
              >
                <div className="text-sm font-medium text-white">{shortenRunId(run.runId)}</div>
                <div className="text-xs text-gray-400">{formatTimeAgo(run.timestamp)}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 py-3">
          <p className="mb-2 text-xs uppercase tracking-[0.22em] text-gray-400">
            Selected Run Details
          </p>

          {!selectedRun && (
            <div className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-400">
              Select a run to inspect node execution.
            </div>
          )}

          {selectedRun && (
            <div className="space-y-3">
              {selectedRunNodes.map((node) => (
                <div key={node.nodeId} className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{node.type}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                        node.status === 'success'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>

                  <p className="mb-1 text-[11px] text-gray-400">Node ID: {node.nodeId}</p>

                  <div className="space-y-2">
                    <div>
                      <p className="mb-1 text-[11px] uppercase tracking-[0.1em] text-gray-400">Inputs</p>
                      <pre className="max-h-24 overflow-auto rounded-md border border-gray-700 bg-black/40 p-2 text-[10px] text-gray-200">
                        {JSON.stringify(node.inputs ?? {}, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <p className="mb-1 text-[11px] uppercase tracking-[0.1em] text-gray-400">Outputs</p>
                      <pre className="max-h-24 overflow-auto rounded-md border border-gray-700 bg-black/40 p-2 text-[10px] text-gray-200">
                        {JSON.stringify(node.outputs ?? {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
