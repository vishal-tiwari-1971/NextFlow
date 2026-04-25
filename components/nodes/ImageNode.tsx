'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { ImageNodeData } from '../../store/useWorkflowStore';

type ImageNodeShape = Node<ImageNodeData, 'imageNode'>;

export default function ImageNode({ data }: NodeProps<ImageNodeShape>) {
  return (
    <div className="min-w-72 max-w-sm rounded-2xl border border-fuchsia-400/20 bg-slate-900/95 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.55)] ring-1 ring-white/5 backdrop-blur-sm">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-slate-950 !bg-fuchsia-400"
      />

      <div className="space-y-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-fuchsia-300/80">
            Image
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-50">{data.title}</h3>
        </div>

        <p className="text-xs leading-5 text-slate-400">{data.description}</p>

        <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/90">
          <img src={data.imageUrl} alt={data.altText} className="h-32 w-full object-cover" />
          <div className="border-t border-slate-700/80 p-2 text-xs text-slate-400">
            {data.altText}
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
        className="!h-3 !w-3 !border-2 !border-slate-950 !bg-fuchsia-400"
      />
    </div>
  );
}
