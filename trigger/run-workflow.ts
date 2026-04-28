import { task } from '@trigger.dev/sdk';
import type { Node, Edge } from '@xyflow/react';
import type { WorkflowNodeData } from '../store/useWorkflowStore';
import { groupNodesByExecutionLevel } from '../lib/workflow-execution';
import { executeNodeTask, type ExecuteNodeOutput } from './execute-node';
import { runLLMTask } from './run-llm';

export type RunWorkflowPayload = {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
};

export type RunWorkflowOutput = {
  status: 'success' | 'error';
  nodeResults: Record<string, ExecuteNodeOutput>;
  error?: string;
};

export const runWorkflowTask = task({
  id: 'run-workflow',
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: RunWorkflowPayload): Promise<RunWorkflowOutput> => {
    const { nodes: initialNodes, edges } = payload;

    try {
      const levels = groupNodesByExecutionLevel(initialNodes, edges);
      let workingNodes = [...initialNodes];
      const nodeResults: Record<string, ExecuteNodeOutput> = {};

      for (const level of levels) {
        // Execute all nodes in the current level in parallel
        const levelPromises = level.map(async (nodeId) => {
          const nodeIndex = workingNodes.findIndex((node) => node.id === nodeId);
          if (nodeIndex === -1) {
            return null;
          }

          const node = workingNodes[nodeIndex];
          const nodeType = node.type as any;

          // Handle LLM nodes separately
          if (nodeType === 'llmNode') {
            const prompt = (node.data as any).userPrompt || (node.data as any).prompt || '';

            try {
              const result = await (runLLMTask as any).run({
                prompt,
              });

              const output: ExecuteNodeOutput = {
                nodeId,
                status: 'success',
                outputs: { response: result.response || '' },
              };

              return { nodeId, output };
            } catch (error) {
              const output: ExecuteNodeOutput = {
                nodeId,
                status: 'error',
                outputs: {},
                error: error instanceof Error ? error.message : 'LLM task failed',
              };
              return { nodeId, output };
            }
          }

          // Handle other node types
          try {
            const result = await (executeNodeTask as any).run({
              nodeId,
              nodeType,
              nodeData: node.data,
              allNodes: workingNodes,
              edges: edges as any,
            });

            return { nodeId, output: result };
          } catch (error) {
            const output: ExecuteNodeOutput = {
              nodeId,
              status: 'error',
              outputs: {},
              error: error instanceof Error ? error.message : 'Node execution failed',
            };
            return { nodeId, output };
          }
        });

        const levelResults = await Promise.all(levelPromises);

        // Update working nodes with results from this level
        for (const result of levelResults) {
          if (result) {
            const { nodeId, output } = result;
            nodeResults[nodeId] = output;

            const nodeIndex = workingNodes.findIndex((node) => node.id === nodeId);
            if (nodeIndex !== -1) {
              workingNodes[nodeIndex] = {
                ...workingNodes[nodeIndex],
                data: {
                  ...workingNodes[nodeIndex].data,
                  outputs: output.outputs,
                  status: output.status === 'success' ? 'success' : 'error',
                  error: output.error || null,
                },
              };
            }
          }
        }

        // Check if any node failed
        for (const result of levelResults) {
          if (result && result.output.status === 'error') {
            throw new Error(`Node ${result.nodeId} failed: ${result.output.error}`);
          }
        }
      }

      return {
        status: 'success',
        nodeResults,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Workflow execution failed';
      return {
        status: 'error',
        nodeResults: {},
        error: message,
      };
    }
  },
});
