'use client';

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type NodeTypes,
  type XYPosition,
} from '@xyflow/react';
import ImageNode from '../../components/nodes/ImageNode';
import LLMNode from '../../components/nodes/LLMNode';
import TextNode from '../../components/nodes/TextNode';
import { type WorkflowNodeType, useWorkflowStore } from '../../store/useWorkflowStore';

const nodeTypes: NodeTypes = {
  textNode: TextNode,
  imageNode: ImageNode,
  llmNode: LLMNode,
};

const nodeButtons: Array<{
  label: string;
  type: WorkflowNodeType;
  accent: string;
}> = [
  {
    label: 'Add Text Node',
    type: 'textNode',
    accent: 'from-sky-400/90 to-cyan-300/90',
  },
  {
    label: 'Add Image Node',
    type: 'imageNode',
    accent: 'from-fuchsia-400/90 to-pink-300/90',
  },
  {
    label: 'Add LLM Node',
    type: 'llmNode',
    accent: 'from-emerald-400/90 to-lime-300/90',
  },
];

const randomPosition = (): XYPosition => {
  const width = typeof window === 'undefined' ? 1200 : window.innerWidth;
  const height = typeof window === 'undefined' ? 900 : window.innerHeight;
  const canvasWidth = Math.max(width - 320, 640);
  const canvasHeight = Math.max(height - 160, 480);

  return {
    x: 120 + Math.random() * Math.max(canvasWidth - 360, 120),
    y: 100 + Math.random() * Math.max(canvasHeight - 260, 100),
  };
};

function WorkflowCanvas() {
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const addNode = useWorkflowStore((state) => state.addNode);
  const onConnect = useWorkflowStore((state) => state.onConnect);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);
  const runWorkflow = useWorkflowStore((state) => state.runWorkflow);

  const handleAddNode = (type: WorkflowNodeType) => {
    addNode(type, randomPosition());
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <aside className="flex w-[320px] shrink-0 flex-col border-r border-white/10 bg-slate-950/95 px-5 py-6 shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)] backdrop-blur-xl">
        <div className="space-y-2 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
            Nextflow
          </p>
          <h1 className="text-2xl font-semibold text-white">Workflow Builder</h1>
          <p className="max-w-sm text-sm leading-6 text-slate-400">
            Add nodes to the canvas and connect them to prototype flows quickly.
          </p>
        </div>

        <div className="space-y-3">
          {nodeButtons.map((button) => (
            <button
              key={button.type}
              type="button"
              onClick={() => handleAddNode(button.type)}
              className="group flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/10"
            >
              <span>{button.label}</span>
              <span
                className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${button.accent} shadow-[0_0_24px_rgba(255,255,255,0.35)]`}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => runWorkflow()}
          className="flex w-full items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-400/20"
        >
          ▶ Run Workflow
        </button>

        <div className="mt-auto rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-4 text-sm text-slate-300 shadow-[0_18px_60px_rgba(2,6,23,0.45)]">
          <p className="font-medium text-slate-100">Canvas controls</p>
          <p className="mt-2 leading-6 text-slate-400">
            Pan, zoom, and connect handles to create a visual workflow.
          </p>
        </div>
      </aside>

      <main className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_25%)]" />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          snapToGrid
          snapGrid={[20, 20]}
          panOnDrag
          panOnScroll
          zoomOnScroll
          zoomOnPinch
          className="h-full w-full"
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: {
              stroke: '#64748b',
              strokeWidth: 2,
            },
          }}
          minZoom={0.2}
          maxZoom={1.8}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#1e293b" />
          <MiniMap
            className="!bottom-4 !right-4 !rounded-2xl !border !border-white/10 !bg-slate-900/95 !shadow-2xl"
            nodeColor={(node) => {
              if (node.type === 'textNode') return '#38bdf8';
              if (node.type === 'imageNode') return '#e879f9';
              if (node.type === 'llmNode') return '#34d399';
              return '#64748b';
            }}
            maskColor="rgba(2, 6, 23, 0.55)"
          />
          <Controls
            className="!bottom-4 !left-4 !rounded-2xl !border !border-white/10 !bg-slate-900/95 !text-slate-100 !shadow-2xl"
            showInteractive={false}
          />
        </ReactFlow>
      </main>
    </div>
  );
}

export default function WorkflowPage() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas />
    </ReactFlowProvider>
  );
}