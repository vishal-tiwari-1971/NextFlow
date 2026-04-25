import { create } from 'zustand';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react';

export type WorkflowNodeType = 'textNode' | 'imageNode' | 'llmNode';

export interface WorkflowNodeBaseData extends Record<string, unknown> {
  title: string;
  description: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
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
  text: string;
  imageUrl: string;
  altText: string;
  prompt: string;
  model: string;
}>;

interface WorkflowStore {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  addNode: (type: WorkflowNodeType, position: XYPosition) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  updateNodeData: (nodeId: string, data: WorkflowNodeDataPatch) => void;
  getIncomingEdges: (nodeId: string) => Edge[];
  getNodeInputData: (nodeId: string) => Record<string, unknown>;
  updateNodeOutputs: (nodeId: string, outputs: Record<string, unknown>) => void;
  runWorkflow: () => void;
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
      };
    case 'imageNode':
      return {
        title: 'Image Node',
        description: 'Manage images, references, or generated assets.',
        imageUrl: 'https://placehold.co/600x400/0f172a/94a3b8?text=Image',
        altText: 'Preview placeholder',
        inputs: {},
        outputs: {},
      };
    case 'llmNode':
      return {
        title: 'LLM Node',
        description: 'Send a prompt to a language model and shape the output.',
        prompt: 'Summarize the workflow in one paragraph.',
        model: 'gpt-5',
        inputs: {},
        outputs: {},
      };
    default: {
      const exhaustiveCheck: never = type;
      return exhaustiveCheck;
    }
  }
};

const topologicalSort = (
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
): string[] => {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: string[] = [];

  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    if (visiting.has(nodeId)) return;

    visiting.add(nodeId);

    const incomingEdges = edges.filter((e) => e.target === nodeId);
    for (const edge of incomingEdges) {
      visit(edge.source);
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    result.push(nodeId);
  };

  for (const node of nodes) {
    visit(node.id);
  }

  return result;
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
      const data = nodeData as LLMNodeData;
      const inputText = (inputs.text as string) || data.prompt;
      return {
        response: `Processed: ${inputText}`,
      };
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
  getIncomingEdges: (nodeId) => {
    return get().edges.filter((edge) => edge.target === nodeId);
  },
  getNodeInputData: (nodeId) => {
    const state = get();
    const incomingEdges = state.edges.filter((edge) => edge.target === nodeId);
    const inputData: Record<string, unknown> = {};

    for (const edge of incomingEdges) {
      const sourceNode = state.nodes.find((n) => n.id === edge.source);
      if (sourceNode && sourceNode.data.outputs) {
        const outputs = sourceNode.data.outputs;
        const sourceHandle = edge.sourceHandle || 'default';
        const targetHandle = edge.targetHandle || 'default';

        if (targetHandle === 'default') {
          Object.assign(inputData, outputs);
        } else {
          inputData[targetHandle] = outputs[sourceHandle] || outputs;
        }
      }
    }

    return inputData;
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
  runWorkflow: () => {
    set((state) => {
      let updatedNodes = [...state.nodes];
      const executionOrder = topologicalSort(updatedNodes, state.edges);

      for (const nodeId of executionOrder) {
        const nodeIndex = updatedNodes.findIndex((n) => n.id === nodeId);
        if (nodeIndex === -1) continue;

        const node = updatedNodes[nodeIndex];

        const incomingEdges = state.edges.filter((e) => e.target === nodeId);
        const inputs: Record<string, unknown> = {};

        for (const edge of incomingEdges) {
          const sourceNode = updatedNodes.find((n) => n.id === edge.source);
          if (sourceNode && sourceNode.data.outputs) {
            const outputs = sourceNode.data.outputs;
            const sourceHandle = edge.sourceHandle || 'default';
            const targetHandle = edge.targetHandle || 'default';

            if (targetHandle === 'default') {
              Object.assign(inputs, outputs);
            } else {
              inputs[targetHandle] = outputs[sourceHandle] || outputs;
            }
          }
        }

        updatedNodes[nodeIndex] = {
          ...node,
          data: {
            ...node.data,
            inputs,
          },
        };

        const outputs = executeNode(node.type as WorkflowNodeType, node.data, inputs);

        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          data: {
            ...updatedNodes[nodeIndex].data,
            outputs,
          },
        };
      }

      return { nodes: updatedNodes };
    });
  },
}));
