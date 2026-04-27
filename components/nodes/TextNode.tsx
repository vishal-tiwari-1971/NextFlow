'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useCallback, type ChangeEvent } from 'react';
import { useWorkflowStore, type TextNodeData } from '../../store/useWorkflowStore';

type TextNodeShape = Node<TextNodeData, 'textNode'>;

export default function TextNode({ data, id }: NodeProps<TextNodeShape>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const isRunning = data.status === 'running';

  const handleTextChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { text: e.target.value });
    },
    [id, updateNodeData],
  );

  return (
    <div
      className={`min-w-72 max-w-sm rounded-2xl border border-sky-400/25 bg-slate-900/95 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.55)] ring-1 ring-white/5 backdrop-blur-sm transition-[box-shadow,border-color] duration-300 ${
        isRunning
          ? 'animate-[pulse_0.95s_ease-in-out_infinite] brightness-110 saturate-150 border-sky-100 ring-4 ring-sky-200/90 ring-offset-2 ring-offset-slate-950 shadow-[0_0_0_2px_rgba(186,230,253,0.9),0_0_60px_rgba(56,189,248,1),0_0_140px_rgba(14,165,233,0.7)]'
          : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-slate-950 !bg-sky-400"
      />

      <div className="space-y-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300/80">
            Text
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-50">{data.title}</h3>
        </div>

        <p className="text-xs leading-5 text-slate-400">{data.description}</p>

        <textarea
          value={data.text}
          onChange={handleTextChange}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200 placeholder-slate-500 focus:border-sky-400 focus:outline-none"
          rows={3}
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
        className="!h-3 !w-3 !border-2 !border-slate-950 !bg-sky-400"
      />
    </div>
  );
}
