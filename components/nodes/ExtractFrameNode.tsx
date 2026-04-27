'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useCallback, type ChangeEvent } from 'react';
import { useWorkflowStore, type ExtractFrameNodeData } from '../../store/useWorkflowStore';

type ExtractFrameNodeShape = Node<ExtractFrameNodeData, 'extractFrameNode'>;

export default function ExtractFrameNode({ data, id }: NodeProps<ExtractFrameNodeShape>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const isRunning = data.status === 'running';
  const timestampMode = data.timestampMode ?? 'seconds';

  const handleTimestampChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(e.target.value);
      updateNodeData(id, { timestamp: Number.isFinite(parsed) ? parsed : 0 });
    },
    [id, updateNodeData],
  );

  const handleModeChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const nextMode = e.target.value === 'percentage' ? 'percentage' : 'seconds';
      updateNodeData(id, { timestampMode: nextMode });
    },
    [id, updateNodeData],
  );

  return (
    <div
      className={`min-w-72 max-w-sm rounded-2xl border border-violet-400/25 bg-slate-900/95 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.55)] ring-1 ring-white/5 backdrop-blur-sm transition-[box-shadow,border-color] duration-300 ${
        isRunning
          ? 'animate-pulse border-violet-100 ring-4 ring-violet-200/80 ring-offset-2 ring-offset-slate-950 shadow-[0_0_0_2px_rgba(196,181,253,0.8),0_0_48px_rgba(139,92,246,0.95),0_0_124px_rgba(99,102,241,0.55)]'
          : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-slate-950 !bg-violet-400"
      />

      <div className="space-y-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-300/80">
            Frame
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-50">{data.title}</h3>
        </div>

        <p className="text-xs leading-5 text-slate-400">{data.description}</p>

        <label className="block text-[10px] uppercase tracking-[0.24em] text-slate-500">
          Timestamp Type
        </label>
        <select
          value={timestampMode}
          onChange={handleModeChange}
          className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200"
        >
          <option value="seconds">Seconds</option>
          <option value="percentage">Percentage</option>
        </select>

        <label className="block text-[10px] uppercase tracking-[0.24em] text-slate-500">
          {timestampMode === 'percentage' ? 'Timestamp (%)' : 'Timestamp (s)'}
        </label>
        <input
          type="number"
          min={0}
          max={timestampMode === 'percentage' ? 100 : undefined}
          step={timestampMode === 'percentage' ? 0.1 : 0.1}
          value={data.timestamp}
          onChange={handleTimestampChange}
          className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200"
        />

        <div className="text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">Inputs:</span>
          <pre className="mt-1 overflow-auto rounded bg-slate-950 p-2 text-[10px] text-slate-300">
            {JSON.stringify(data.inputs ?? {}, null, 2)}
          </pre>
        </div>

        <div className="text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">Outputs:</span>
          <pre className="mt-1 overflow-auto rounded bg-slate-950 p-2 text-[10px] text-emerald-300">
            {JSON.stringify(data.outputs ?? {}, null, 2)}
          </pre>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-slate-950 !bg-violet-400"
      />
    </div>
  );
}
