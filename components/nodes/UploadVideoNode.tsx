'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useCallback, type ChangeEvent } from 'react';
import { useWorkflowStore, type UploadVideoNodeData } from '../../store/useWorkflowStore';

type UploadVideoNodeShape = Node<UploadVideoNodeData, 'uploadVideoNode'>;

export default function UploadVideoNode({ data, id }: NodeProps<UploadVideoNodeShape>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  const handleUrlChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      updateNodeData(id, { videoUrl: e.target.value });
    },
    [id, updateNodeData],
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }

      const mockUrl = URL.createObjectURL(file);
      updateNodeData(id, { videoUrl: mockUrl });
    },
    [id, updateNodeData],
  );

  return (
    <div className="min-w-72 max-w-sm rounded-2xl border border-amber-400/25 bg-slate-900/95 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.55)] ring-1 ring-white/5 backdrop-blur-sm">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-slate-950 !bg-amber-400"
      />

      <div className="space-y-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-300/80">
            Video
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-50">{data.title}</h3>
        </div>

        <p className="text-xs leading-5 text-slate-400">{data.description}</p>

        <label className="block text-[10px] uppercase tracking-[0.24em] text-slate-500">Video URL</label>
        <input
          type="url"
          value={data.videoUrl}
          onChange={handleUrlChange}
          className="w-full rounded border border-slate-600 bg-slate-950 p-2 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
          placeholder="https://example.com/video.mp4"
        />

        <label className="block text-[10px] uppercase tracking-[0.24em] text-slate-500">Mock Upload</label>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-300"
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
        className="!h-3 !w-3 !border-2 !border-slate-950 !bg-amber-400"
      />
    </div>
  );
}
