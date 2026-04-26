import type { Edge, Node } from '@xyflow/react';
import type { WorkflowNodeData } from '../store/useWorkflowStore';

type NormalizedInputs = {
  texts: string[];
  images: string[];
  videos: string[];
};

export const getIncomingEdges = (edges: Edge[], nodeId: string): Edge[] =>
  edges.filter((edge) => edge.target === nodeId);

export const collectNodeInputData = (
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
  nodeId: string,
): Record<string, unknown> => {
  const incomingEdges = getIncomingEdges(edges, nodeId);
  const inputData: Record<string, unknown> = {};

  const mergeValues = (existing: unknown, incoming: unknown): unknown => {
    if (Array.isArray(existing) && Array.isArray(incoming)) {
      return [...existing, ...incoming];
    }

    if (Array.isArray(existing)) {
      return [...existing, incoming];
    }

    if (Array.isArray(incoming)) {
      return [existing, ...incoming];
    }

    return incoming;
  };

  const mergeValue = (key: string, value: unknown) => {
    if (value === undefined || value === null) {
      return;
    }

    const existing = inputData[key];

    if (existing === undefined) {
      inputData[key] = value;
      return;
    }

    inputData[key] = mergeValues(existing, value);
  };

  for (const edge of incomingEdges) {
    const sourceNode = nodes.find((node) => node.id === edge.source);

    if (sourceNode && sourceNode.data.outputs) {
      const outputs = sourceNode.data.outputs;
      const sourceHandle = edge.sourceHandle || 'default';
      const targetHandle = edge.targetHandle || 'default';

      if (targetHandle === 'default') {
        for (const [outputKey, outputValue] of Object.entries(outputs)) {
          mergeValue(outputKey, outputValue);
        }
      } else {
        mergeValue(targetHandle, outputs[sourceHandle] || outputs);
      }
    }
  }

  return inputData;
};

export const normalizeInputs = (inputs: Record<string, unknown>): NormalizedInputs => {
  const texts: string[] = [];
  const images: string[] = [];
  const videos: string[] = [];

  const visit = (key: string, value: unknown) => {
    if (!value) {
      return;
    }

    if (typeof value === 'string') {
      const lowerKey = key.toLowerCase();

      if (lowerKey.includes('image')) {
        images.push(value);
        return;
      }

      if (lowerKey.includes('video')) {
        videos.push(value);
        return;
      }

      if (value.startsWith('http')) {
        images.push(value);
        return;
      }

      texts.push(value);
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(key, item);
      }
      return;
    }

    if (typeof value === 'object') {
      for (const [nestedKey, item] of Object.entries(value as Record<string, unknown>)) {
        visit(nestedKey, item);
      }
    }
  };

  for (const [key, value] of Object.entries(inputs)) {
    visit(key, value);
  }

  return {
    texts: [...new Set(texts)],
    images: [...new Set(images)],
    videos: [...new Set(videos)],
  };
};

export const topologicalSort = (
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
): string[] => {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: string[] = [];

  const visit = (nodeId: string) => {
    if (visited.has(nodeId) || visiting.has(nodeId)) {
      return;
    }

    visiting.add(nodeId);

    for (const edge of getIncomingEdges(edges, nodeId)) {
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