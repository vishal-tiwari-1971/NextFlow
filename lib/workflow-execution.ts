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

    const lowerKey = key.toLowerCase();

    if (typeof value === 'string') {
      // Check if key indicates this should be a video
      if (lowerKey.includes('video')) {
        videos.push(value);
        return;
      }

      // Check if this is an image or frame - but only if it looks like an image URL
      if (lowerKey.includes('image') || lowerKey.includes('frame')) {
        // Verify it's actually an image URL (has image extension or is from a CDN)
        const hasImageExt = /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(value);
        const isCdnUrl = value.includes('transloadit.net') || value.includes('cloudinary') || value.includes('imgix');
        
        if (hasImageExt || (value.startsWith('http') && isCdnUrl)) {
          images.push(value);
          return;
        }
        
        // If key says 'image'/'frame' but URL doesn't look like an image, don't add it
        // This prevents video URLs from being treated as images
        return;
      }

      // For other HTTP URLs, don't auto-classify as images
      if (value.startsWith('http')) {
        // Only treat as image if it has an image extension
        const hasImageExt = /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(value);
        if (hasImageExt) {
          images.push(value);
          return;
        }
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

export const groupNodesByExecutionLevel = (
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
): string[][] => {
  // Build dependency graph: nodeId -> set of nodes that depend on it
  const dependents: Map<string, Set<string>> = new Map();
  const incomingCount: Map<string, number> = new Map();

  for (const node of nodes) {
    dependents.set(node.id, new Set());
    incomingCount.set(node.id, 0);
  }

  for (const edge of edges) {
    const deps = dependents.get(edge.source) ?? new Set();
    deps.add(edge.target);
    dependents.set(edge.source, deps);

    const count = incomingCount.get(edge.target) ?? 0;
    incomingCount.set(edge.target, count + 1);
  }

  // Use Kahn's algorithm to group nodes into execution levels
  const levels: string[][] = [];
  const processed = new Set<string>();
  const queue: string[] = [];

  // Start with nodes that have no dependencies
  for (const [nodeId, count] of incomingCount.entries()) {
    if (count === 0) {
      queue.push(nodeId);
    }
  }

  while (queue.length > 0) {
    const currentLevel = [...queue];
    levels.push(currentLevel);
    queue.length = 0;

    for (const nodeId of currentLevel) {
      processed.add(nodeId);

      // Reduce in-degree for all dependent nodes
      const deps = dependents.get(nodeId) ?? new Set();
      for (const dependentId of deps) {
        const count = incomingCount.get(dependentId) ?? 0;
        incomingCount.set(dependentId, count - 1);

        if (count - 1 === 0 && !processed.has(dependentId)) {
          queue.push(dependentId);
        }
      }
    }
  }

  return levels;
};