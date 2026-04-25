'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useCallback } from 'react';
import { useWorkflowStore, type LLMNodeData } from '../../store/useWorkflowStore';

type LLMNodeShape = Node<LLMNodeData, 'llmNode'>;

export default function LLMNode({ data, id }: NodeProps<LLMNodeShape>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { prompt: e.target.value });
    },
    [id, updateNodeData],
  );

  return (
    <div className="min-w-72 max-w-sm rounded-2xl border border-emerald-400/20 bg-slate-900/95 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.55)] ring-1 ring-white/5 backdrop-blur-sm">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-slate-950 !bg-emerald-400"
      />

      <div className="space-y-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
            LLM
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-50">{data.title}</h3>
        </div>

        <p className="text-xs leading-5 text-slate-400">{data.description}</p>

        <div className="space-y-2 rounded-xl border border-slate-700/80 bg-slate-950/90 p-2 text-xs text-slate-200">
          <div>
            <span className="block text-[10px] uppercase tracking-[0.24em] text-slate-500">
              Model
            </span>
            <span className="text-slate-300">{data.model}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-[0.24em] text-slate-500">
              Prompt
            </span>
            <textarea
              value={data.prompt}
              onChange={handlePromptChange}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-950 p-2 text-xs text-slate-200 focus:border-emerald-400 focus:outline-none"
              rows={2}
            />
          </div>
        </div>

        {Object.keys(data.inputs || {}).length > 0 && (
          <div className="text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Inputs:</span>
            <pre className="mt-1 overflow-auto rounded bg-slate-950 p-2 text-[10px] text-slate-300">
              {JSON.stringify(data.inputs, null, 2)}
            </pre>
          </div>
        )}

        {Object.keys(data.outputs || {}).length > 0 && (
          <div className="text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Outputs:</span>
            <pre className="mt-1 overflow-auto rounded bg-slate-950 p-2 text-[10px] text-emerald-300">
              {JSON.stringify(data.outputs, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-slate-950 !bg-emerald-400"
      />
    </div>
  );
}
