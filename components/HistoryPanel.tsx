'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadHistory } from '../lib/run-history';
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

const formatIndiaTime = (timestamp: number) => {
  const formatted = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(timestamp));
  
  console.log('formatIndiaTime:', { timestamp, formatted });
  return formatted;
};

const shortenRunId = (runId: string) => {
  if (runId.length <= 12) {
    return runId;
  }

  return `${runId.slice(0, 6)}...${runId.slice(-4)}`;
};

const toWorkflowRun = (record: {
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
}): WorkflowRun | null => {
  if (!record.id || !record.createdAt) {
    return null;
  }

  const parsedCreatedAt = new Date(record.createdAt);
  const timestamp = parsedCreatedAt.getTime();

  console.log('Timestamp conversion debug:', {
    createdAtString: record.createdAt,
    parsedDate: parsedCreatedAt.toISOString(),
    timestampMs: timestamp,
    formattedIST: new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(parsedCreatedAt),
  });

  if (Number.isNaN(timestamp)) {
    return null;
  }

  const nodes: WorkflowRunNode[] = ((record.result?.nodes ?? []) as Array<{
    id?: string;
    type?: string;
    data?: { inputs?: unknown; outputs?: unknown; status?: string };
  }>).map((node) => ({
    nodeId: node.id || 'unknown-node',
    type: node.type || 'unknown',
    inputs: node.data?.inputs ?? {},
    outputs: node.data?.outputs ?? {},
    status: node.data?.status === 'error' ? 'error' : 'success',
  }));

  return {
    runId: record.id,
    timestamp,
    nodes,
  };
};

const HISTORY_UPDATED_EVENT = 'nextflow:history-updated';


export default function HistoryPanel() {
  const [history, setHistory] = useState<WorkflowRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { isLoaded, userId } = useAuth();
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const setWorkflow = useWorkflowStore((state) => state.setWorkflow);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);

      try {
        const records = userId
          ? await fetch('/api/runs').then(async (response) => {
              if (!response.ok) {
                return [] as LegacyRun[];
              }

              return (await response.json()) as LegacyRun[];
            })
          : await loadHistory();

        const normalized = records
          .map((record) => toWorkflowRun(record as LegacyRun))
          .filter((record): record is WorkflowRun => record !== null)
          .sort((a, b) => b.timestamp - a.timestamp);

        if (!cancelled) {
          setHistory(normalized);
          setSelectedRun((current) => current ?? normalized[0] ?? null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const handleHistoryUpdated = () => {
      void (async () => {
        const records = userId
          ? await fetch('/api/runs').then(async (response) => {
              if (!response.ok) {
                return [] as LegacyRun[];
              }

              return (await response.json()) as LegacyRun[];
            })
          : await loadHistory();

        const normalized = records
          .map((record) => toWorkflowRun(record as LegacyRun))
          .filter((record): record is WorkflowRun => record !== null)
          .sort((a, b) => b.timestamp - a.timestamp);

        setHistory(normalized);
        setSelectedRun(normalized[0] ?? null);
      })();
    };

    window.addEventListener(HISTORY_UPDATED_EVENT, handleHistoryUpdated);

    return () => {
      window.removeEventListener(HISTORY_UPDATED_EVENT, handleHistoryUpdated);
    };
  }, [isLoaded, userId]);

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
    <aside
      className={`flex h-screen shrink-0 flex-col border-l border-gray-700 bg-gray-900 text-white transition-[width,padding] duration-300 ${
        isCollapsed ? 'w-[84px]' : 'w-[300px]'
      }`}
    >
      <div className={`border-b border-gray-700 py-4 ${isCollapsed ? 'px-3' : 'px-4'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && <h2 className="text-lg font-semibold">History Panel</h2>}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
            aria-label={isCollapsed ? 'Expand history panel' : 'Collapse history panel'}
          >
            {isCollapsed ? '<<' : '>>'}
          </button>
        </div>
      </div>

      {!isCollapsed && <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-gray-700 px-3 py-3">
          <p className="mb-2 text-xs uppercase tracking-[0.22em] text-gray-400">Runs</p>

          <div className="space-y-2">
            {isLoading && (
              <div className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-400">
                Loading history...
              </div>
            )}

            {!isLoading && history.length === 0 && (
              <div className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-400">
                No runs yet.
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
                <div className="text-xs text-gray-400">
                  {formatIndiaTime(run.timestamp)} IST
                </div>
                <div className="text-[11px] text-gray-500">{formatTimeAgo(run.timestamp)}</div>
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
      </div>}

      {isCollapsed && (
        <div className="flex min-h-0 flex-1 items-start justify-center px-2 py-4">
          <p className="rotate-180 text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-400 [writing-mode:vertical-rl]">
            History
          </p>
        </div>
      )}
    </aside>
  );
}
