import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type XYPosition } from '@xyflow/react';
import { create } from 'zustand';
import { collectNodeInputData, getIncomingEdges, topologicalSort } from '../lib/workflow-execution';

export type WorkflowNodeType =
  | 'textNode'
  | 'imageNode'
  | 'llmNode'
  | 'uploadVideoNode'
  | 'cropImageNode'
  | 'extractFrameNode';
export type WorkflowNodeExecutionStatus = 'idle' | 'running' | 'success' | 'error';

export interface WorkflowNodeBaseData extends Record<string, unknown> {
  title: string;
  description: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  status: WorkflowNodeExecutionStatus;
  error: string | null;
  runId: string | null;
}

export interface TextNodeData extends WorkflowNodeBaseData {
  text: string;
}

export interface ImageNodeData extends WorkflowNodeBaseData {
  imageUrl: string;
  altText: string;
}

export interface LLMNodeData extends WorkflowNodeBaseData {
  prompt: string;
  systemPrompt: string;
  userPrompt: string;
  model: string;
}

export interface UploadVideoNodeData extends WorkflowNodeBaseData {
  videoUrl: string;
}

export interface CropImageNodeData extends WorkflowNodeBaseData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractFrameNodeData extends WorkflowNodeBaseData {
  timestamp: number;
}

export type WorkflowNodeData =
  | TextNodeData
  | ImageNodeData
  | LLMNodeData
  | UploadVideoNodeData
  | CropImageNodeData
  | ExtractFrameNodeData;

export type WorkflowNodeDataPatch = Partial<{
  title: string;
  description: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  status: WorkflowNodeExecutionStatus;
  error: string | null;
  runId: string | null;
  text: string;
  imageUrl: string;
  altText: string;
  prompt: string;
  systemPrompt: string;
  userPrompt: string;
  model: string;
  videoUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  timestamp: number;
}>;

type WorkflowRunResponse = {
  runId: string;
  response: string;
};

interface WorkflowStore {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  isRunning: boolean;
  runError: string | null;
  addNode: (type: WorkflowNodeType, position: XYPosition) => void;
  deleteNode: (nodeId: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  updateNodeData: (nodeId: string, data: WorkflowNodeDataPatch) => void;
  updateNodeInputs: (nodeId: string, inputs: Record<string, unknown>) => void;
  getIncomingEdges: (nodeId: string) => Edge[];
  getNodeInputData: (nodeId: string) => Record<string, unknown>;
  updateNodeOutputs: (nodeId: string, outputs: Record<string, unknown>) => void;
  setWorkflowRunState: (state: { isRunning: boolean; runError?: string | null }) => void;
  runWorkflow: () => Promise<void>;
}

const createNodeId = (type: WorkflowNodeType) =>
  `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createNodeData = (type: WorkflowNodeType): WorkflowNodeData => {
  switch (type) {
    case 'textNode':
      return {
        title: 'Text Node',
        description: 'Draft prompts, captions, or long-form copy.',
        text: 'Start writing here.',
        inputs: {},
        outputs: {},
        status: 'idle',
        error: null,
        runId: null,
      };
    case 'imageNode':
      return {
        title: 'Image Node',
        description: 'Manage images, references, or generated assets.',
        imageUrl: 'https://placehold.co/600x400/0f172a/94a3b8?text=Image',
        altText: 'Preview placeholder',
        inputs: {},
        outputs: {},
        status: 'idle',
        error: null,
        runId: null,
      };
    case 'llmNode':
      return {
        title: 'LLM Node',
        description: 'Send a prompt to a language model and shape the output.',
        prompt: 'Summarize the workflow in one paragraph.',
        systemPrompt: 'You are an AI assistant.',
        userPrompt: 'Summarize the workflow in one paragraph.',
        model: 'Model: gemini-2.0-flash',
        inputs: {},
        outputs: {},
        status: 'idle',
        error: null,
        runId: null,
      };
    case 'uploadVideoNode':
      return {
        title: 'Upload Video Node',
        description: 'Upload or reference a video source for downstream nodes.',
        videoUrl: 'https://example.com/video.mp4',
        inputs: {},
        outputs: {},
        status: 'idle',
        error: null,
        runId: null,
      };
    case 'cropImageNode':
      return {
        title: 'Crop Image Node',
        description: 'Mock crop operation for an input image URL.',
        x: 0,
        y: 0,
        width: 256,
        height: 256,
        inputs: {},
        outputs: {},
        status: 'idle',
        error: null,
        runId: null,
      };
    case 'extractFrameNode':
      return {
        title: 'Extract Frame Node',
        description: 'Mock frame extraction from a video URL and timestamp.',
        timestamp: 1,
        inputs: {},
        outputs: {},
        status: 'idle',
        error: null,
        runId: null,
      };
    default: {
      const exhaustiveCheck: never = type;
      return exhaustiveCheck;
    }
  }
};

const executeNode = (
  type: WorkflowNodeType,
  nodeData: WorkflowNodeData,
  inputs: Record<string, unknown>,
): Record<string, unknown> => {
  switch (type) {
    case 'textNode': {
      const data = nodeData as TextNodeData;
      const prevTexts: string[] = [];

      if (Array.isArray(inputs.texts)) {
        for (const value of inputs.texts) {
          if (typeof value === 'string') {
            prevTexts.push(value);
          }
        }
      } else if (typeof inputs.text === 'string') {
        prevTexts.push(inputs.text);
      }

      if (typeof data.text === 'string' && data.text.trim().length > 0) {
        prevTexts.push(data.text);
      }

      return {
        texts: prevTexts,
      };
    }
    case 'imageNode': {
      const data = nodeData as ImageNodeData;
      return {
        image_url: data.imageUrl,
      };
    }
    case 'uploadVideoNode': {
      const data = nodeData as UploadVideoNodeData;
      return {
        video_url: data.videoUrl,
      };
    }
    case 'cropImageNode': {
      const sourceImage = typeof inputs.image_url === 'string' ? inputs.image_url : '';

      return {
        cropped_image_url: sourceImage,
      };
    }
    case 'extractFrameNode': {
      const sourceVideo = typeof inputs.video_url === 'string' ? inputs.video_url : '';
      return {
        frame_image_url: sourceVideo,
      };
    }
    case 'llmNode': {
      throw new Error('LLM nodes are executed through the workflow route.');
    }
    default: {
      const exhaustiveCheck: never = type;
      return exhaustiveCheck;
    }
  }
};

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],
  isRunning: false,
  runError: null,
  addNode: (type, position) => {
    const nodeId = createNodeId(type);

    set((state) => ({
      nodes: [
        ...state.nodes,
        {
          id: nodeId,
          type,
          position,
          data: createNodeData(type),
        },
      ],
    }));
  },
  deleteNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    }));
  },
  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as Node<WorkflowNodeData>[],
    }));
  },
  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },
  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge(connection, state.edges),
    }));
  },
  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            }
          : node,
      ),
    }));
  },
  updateNodeInputs: (nodeId, inputs) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                inputs,
              },
            }
          : node,
      ),
    }));
  },
  getIncomingEdges: (nodeId) => {
    return getIncomingEdges(get().edges, nodeId);
  },
  getNodeInputData: (nodeId) => {
    const state = get();
    return collectNodeInputData(state.nodes, state.edges, nodeId);
  },
  updateNodeOutputs: (nodeId, outputs) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                outputs,
              },
            }
          : node,
      ),
    }));
  },
  setWorkflowRunState: ({ isRunning, runError }) => {
    set({ isRunning, runError: runError ?? null });
  },
  runWorkflow: async () => {
    if (get().isRunning) {
      return;
    }

    set({ isRunning: true, runError: null });

    try {
      const state = get();
      const executionOrder = topologicalSort(state.nodes, state.edges);
      let workingNodes = [...state.nodes];
      const outputsByNodeId: Record<string, Record<string, unknown>> = {};

      for (const nodeId of executionOrder) {
        const nodeIndex = workingNodes.findIndex((node) => node.id === nodeId);

        if (nodeIndex === -1) {
          continue;
        }

        const node = workingNodes[nodeIndex];
        const inputs = collectNodeInputData(workingNodes, state.edges, nodeId);

        workingNodes[nodeIndex] = {
          ...node,
          data: {
            ...node.data,
            inputs,
            error: null,
            runId: null,
            status: 'running',
          },
        };

        if (node.type !== 'llmNode') {
          const outputs = executeNode(
            node.type as WorkflowNodeType,
            workingNodes[nodeIndex].data,
            inputs,
          );

          outputsByNodeId[nodeId] = outputs;

          workingNodes[nodeIndex] = {
            ...workingNodes[nodeIndex],
            data: {
              ...workingNodes[nodeIndex].data,
              outputs,
              status: 'success',
            },
          };

          set({ nodes: workingNodes });
          continue;
        }

        set({ nodes: workingNodes });

        const response = await fetch('/api/run-workflow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nodeId,
            workflow: {
              nodes: workingNodes,
              edges: state.edges,
            },
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || 'Failed to run workflow.');
        }

        const result = (await response.json()) as WorkflowRunResponse;
        const llmOutputs = {
          response: result.response,
        };
        outputsByNodeId[nodeId] = llmOutputs;

        workingNodes[nodeIndex] = {
          ...workingNodes[nodeIndex],
          data: {
            ...workingNodes[nodeIndex].data,
            outputs: llmOutputs,
            status: 'success',
            error: null,
            runId: result.runId,
          },
        };

        set({ nodes: workingNodes });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Workflow execution failed.';

      set((currentState) => ({
        nodes: currentState.nodes.map((node) =>
          node.data.status === 'running'
            ? {
                ...node,
                data: {
                  ...node.data,
                  status: 'error',
                  error: message,
                },
              }
            : node,
        ),
        runError: message,
      }));
    } finally {
      set({ isRunning: false });
    }
  },
}));
