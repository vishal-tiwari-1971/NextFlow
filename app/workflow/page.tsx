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
import { useState } from 'react';
import HistoryPanel from '../../components/HistoryPanel';
import LoadSampleWorkflowButton from '../../components/LoadSampleWorkflowButton';
import NewWorkflowButton from '../../components/NewWorkflowButton';
import ImageNode from '../../components/nodes/ImageNode';
import LLMNode from '../../components/nodes/LLMNode';
import CropImageNode from '../../components/nodes/CropImageNode';
import ExtractFrameNode from '../../components/nodes/ExtractFrameNode';
import TextNode from '../../components/nodes/TextNode';
import UploadVideoNode from '../../components/nodes/UploadVideoNode';
import { type WorkflowNodeType, useWorkflowStore } from '../../store/useWorkflowStore';

const nodeTypes: NodeTypes = {
  textNode: TextNode,
  imageNode: ImageNode,
  llmNode: LLMNode,
  uploadVideoNode: UploadVideoNode,
  cropImageNode: CropImageNode,
  extractFrameNode: ExtractFrameNode,
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
  {
    label: 'Add Video Node',
    type: 'uploadVideoNode',
    accent: 'from-amber-400/90 to-yellow-300/90',
  },
  {
    label: 'Add Crop Node',
    type: 'cropImageNode',
    accent: 'from-orange-400/90 to-amber-300/90',
  },
  {
    label: 'Add Extract Frame Node',
    type: 'extractFrameNode',
    accent: 'from-violet-400/90 to-indigo-300/90',
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
  const deleteNode = useWorkflowStore((state) => state.deleteNode);
  const onConnect = useWorkflowStore((state) => state.onConnect);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);
  const runWorkflow = useWorkflowStore((state) => state.runWorkflow);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const runError = useWorkflowStore((state) => state.runError);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleAddNode = (type: WorkflowNodeType) => {
    addNode(type, randomPosition());
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <aside
        className={`flex shrink-0 flex-col border-r border-white/10 bg-slate-950/95 shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)] backdrop-blur-xl transition-[width,padding] duration-300 ${
          isSidebarCollapsed ? 'w-[84px] px-3 py-5' : 'w-[320px] px-5 py-6'
        }`}
      >
        <div className={`pb-5 ${isSidebarCollapsed ? 'space-y-3' : 'space-y-2'}`}>
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isSidebarCollapsed && (
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Nextflow</p>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? '>>' : '<<'}
            </button>
          </div>

          {!isSidebarCollapsed && (
            <>
              <h1 className="text-2xl font-semibold text-white">Workflow Builder</h1>
              <p className="max-w-sm text-sm leading-6 text-slate-400">
                Add nodes to the canvas and connect them to prototype flows quickly.
              </p>
            </>
          )}
        </div>

        <div className={isSidebarCollapsed ? 'space-y-2' : 'space-y-3'}>
          {nodeButtons.map((button) => (
            <button
              key={button.type}
              type="button"
              onClick={() => handleAddNode(button.type)}
              title={button.label}
              className={`group flex w-full rounded-2xl border border-white/10 bg-white/5 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/10 ${
                isSidebarCollapsed ? 'items-center justify-center px-0 py-3' : 'items-center justify-between px-4 py-3 text-left'
              }`}
            >
              {isSidebarCollapsed ? (
                <span
                  className={`h-3 w-3 rounded-full bg-gradient-to-r ${button.accent} shadow-[0_0_24px_rgba(255,255,255,0.45)]`}
                />
              ) : (
                <>
                  <span>{button.label}</span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${button.accent} shadow-[0_0_24px_rgba(255,255,255,0.35)]`}
                  />
                </>
              )}
            </button>
          ))}
        </div>

        <LoadSampleWorkflowButton isCollapsed={isSidebarCollapsed} />
        <NewWorkflowButton isCollapsed={isSidebarCollapsed} />

        <button
          type="button"
          onClick={() => runWorkflow()}
          disabled={isRunning}
          title="Run Workflow"
          className={`flex w-full items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-sm font-medium text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-400 ${
            isSidebarCollapsed ? 'mt-3 px-0 py-3' : 'px-4 py-3'
          }`}
        >
          {isSidebarCollapsed ? (isRunning ? '...' : '▶') : isRunning ? 'Running...' : '▶ Run Workflow'}
        </button>

        {runError &&
          (isSidebarCollapsed ? (
            <div className="mt-3 flex justify-center">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" title={runError} />
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-200">
              {runError}
            </p>
          ))}

        {!isSidebarCollapsed && (
          <div className="mt-auto rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-4 text-sm text-slate-300 shadow-[0_18px_60px_rgba(2,6,23,0.45)]">
            <p className="font-medium text-slate-100">Canvas controls</p>
            <p className="mt-2 leading-6 text-slate-400">
              Pan, zoom, and connect handles to create a visual workflow.
            </p>
          </div>
        )}
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
          onNodeContextMenu={(event, node) => {
            event.preventDefault();
            deleteNode(node.id);
          }}
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
              if (node.type === 'uploadVideoNode') return '#f59e0b';
              if (node.type === 'cropImageNode') return '#fb923c';
              if (node.type === 'extractFrameNode') return '#a78bfa';
              return '#64748b';
            }}
            maskColor="rgba(2, 6, 23, 0.55)"
          />
          <Controls
            className="workflow-controls !bottom-4 !left-4 !rounded-2xl !border !border-white/10 !bg-slate-900/95 !shadow-2xl"
            showInteractive={false}
          />
        </ReactFlow>
      </main>

      <HistoryPanel />
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