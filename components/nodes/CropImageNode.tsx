'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useCallback, type ChangeEvent } from 'react';
import { useWorkflowStore, type CropImageNodeData } from '../../store/useWorkflowStore';

type CropImageNodeShape = Node<CropImageNodeData, 'cropImageNode'>;

export default function CropImageNode({ data, id }: NodeProps<CropImageNodeShape>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const isRunning = data.status === 'running';

  const updateNumberField = useCallback(
    (field: 'x' | 'y' | 'width' | 'height', value: string) => {
      const parsed = Number(value);
      updateNodeData(id, { [field]: Number.isFinite(parsed) ? parsed : 0 });
    },
    [id, updateNodeData],
  );

  return (
    <div
      className={`min-w-72 max-w-sm rounded-2xl border border-orange-400/25 bg-slate-900/95 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.55)] ring-1 ring-white/5 backdrop-blur-sm transition-[box-shadow,border-color] duration-300 ${
        isRunning
          ? 'animate-pulse border-orange-100 ring-4 ring-orange-200/80 ring-offset-2 ring-offset-slate-950 shadow-[0_0_0_2px_rgba(253,186,116,0.8),0_0_48px_rgba(249,115,22,0.95),0_0_122px_rgba(234,88,12,0.55)]'
          : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-slate-950 !bg-orange-400"
      />

      <div className="space-y-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-300/80">
            Crop
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-50">{data.title}</h3>
        </div>

        <p className="text-xs leading-5 text-slate-400">{data.description}</p>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={data.x}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateNumberField('x', e.target.value)}
            className="rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200"
            placeholder="x"
          />
          <input
            type="number"
            value={data.y}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateNumberField('y', e.target.value)}
            className="rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200"
            placeholder="y"
          />
          <input
            type="number"
            value={data.width}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateNumberField('width', e.target.value)}
            className="rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200"
            placeholder="width"
          />
          <input
            type="number"
            value={data.height}
            onChange={(e: ChangeEvent<HTMLInputElement>) => updateNumberField('height', e.target.value)}
            className="rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-200"
            placeholder="height"
          />
        </div>

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
        className="!h-3 !w-3 !border-2 !border-slate-950 !bg-orange-400"
      />
    </div>
  );
}
