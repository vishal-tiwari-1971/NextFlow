import type { Edge, Node } from '@xyflow/react';
import type { WorkflowNodeData } from '../store/useWorkflowStore';

export const getIncomingEdges = (edges: Edge[], nodeId: string): Edge[] =>
  edges.filter((edge) => edge.target === nodeId);

export const collectNodeInputData = (
  nodes: Node<WorkflowNodeData>[],
  edges: Edge[],
  nodeId: string,
): Record<string, unknown> => {
  const incomingEdges = getIncomingEdges(edges, nodeId);
  const inputData: Record<string, unknown> = {};

  for (const edge of incomingEdges) {
    const sourceNode = nodes.find((node) => node.id === edge.source);

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