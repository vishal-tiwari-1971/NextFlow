import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type XYPosition } from '@xyflow/react';
import { create } from 'zustand';
import { collectNodeInputData, getIncomingEdges, topologicalSort } from '../lib/workflow-execution';

export type WorkflowNodeType = 'textNode' | 'imageNode' | 'llmNode';
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
  model: string;
}

export type WorkflowNodeData = TextNodeData | ImageNodeData | LLMNodeData;

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
  model: string;
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
        model: 'Model: gemini-1.5-flash',
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
      return {
        text: data.text,
      };
    }
    case 'imageNode': {
      const data = nodeData as ImageNodeData;
      return {
        image_url: data.imageUrl,
        alt_text: data.altText,
      };
    }
    case 'llmNode': {
      throw new Error('LLM nodes are executed through Trigger.dev.');
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
            status: node.type === 'llmNode' ? 'running' : 'success',
          },
        };

        if (node.type !== 'llmNode') {
          const outputs = executeNode(node.type as WorkflowNodeType, node.data, inputs);

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

        workingNodes[nodeIndex] = {
          ...workingNodes[nodeIndex],
          data: {
            ...workingNodes[nodeIndex].data,
            outputs: {
              response: result.response,
            },
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
          node.type === 'llmNode'
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
