'use client';

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useCallback, useState, type ChangeEvent } from 'react';
import { useWorkflowStore, type UploadVideoNodeData } from '../../store/useWorkflowStore';
import { uploadMediaFile } from '../../lib/upload-media';

type UploadVideoNodeShape = Node<UploadVideoNodeData, 'uploadVideoNode'>;

export default function UploadVideoNode({ data, id }: NodeProps<UploadVideoNodeShape>) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      return;
    }

    setIsUploading(true);

    try {
      const url = await uploadMediaFile(selectedFile);
      updateNodeData(id, {
        videoUrl: url,
        outputs: { video_url: url },
        error: null,
      });
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  }, [id, selectedFile, updateNodeData]);

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

        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-300"
        />

        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="w-full rounded border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-100 transition hover:border-amber-400/50 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500"
        >
          {isUploading ? 'Uploading...' : 'Upload Video'}
        </button>

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

        <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/90">
          <video src={data.videoUrl} controls className="h-40 w-full object-cover" />
          <div className="border-t border-slate-700/80 p-2 text-xs text-slate-400">
            {data.videoUrl}
          </div>
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
