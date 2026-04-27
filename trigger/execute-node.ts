import { task } from '@trigger.dev/sdk';
import type { Node } from '@xyflow/react';
import type { WorkflowNodeData, WorkflowNodeType } from '../store/useWorkflowStore';
import { collectNodeInputData } from '../lib/workflow-execution';

export type ExecuteNodePayload = {
  nodeId: string;
  nodeType: WorkflowNodeType;
  nodeData: WorkflowNodeData;
  allNodes: Node<WorkflowNodeData>[];
  edges: Array<{ source: string; target: string; sourceHandle?: string; targetHandle?: string }>;
};

export type ExecuteNodeOutput = {
  nodeId: string;
  status: 'success' | 'error';
  outputs: Record<string, unknown>;
  error?: string;
};

export const executeNodeTask = task({
  id: 'execute-node',
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: ExecuteNodePayload): Promise<ExecuteNodeOutput> => {
    const { nodeId, nodeType, nodeData, allNodes, edges } = payload;

    try {
      // Collect inputs from upstream nodes
      const inputs = collectNodeInputData(allNodes, edges as any, nodeId);

      let outputs: Record<string, unknown> = {};

      // Execute based on node type
      switch (nodeType) {
        case 'textNode': {
          const prevTexts: string[] = [];
          if (Array.isArray(inputs.texts)) {
            prevTexts.push(...inputs.texts);
          } else if (typeof inputs.text === 'string') {
            prevTexts.push(inputs.text);
          }

          if (typeof nodeData.text === 'string' && nodeData.text.trim().length > 0) {
            prevTexts.push(nodeData.text);
          }

          outputs = { texts: prevTexts };
          break;
        }

        case 'imageNode': {
          const data = nodeData as any;
          outputs = { image_url: data.imageUrl };
          break;
        }

        case 'uploadVideoNode': {
          const data = nodeData as any;
          outputs = { video_url: data.videoUrl };
          break;
        }

        case 'cropImageNode': {
          const sourceImage = typeof inputs.image_url === 'string' ? inputs.image_url : '';
          outputs = { cropped_image_url: sourceImage };
          break;
        }

        case 'extractFrameNode': {
          const sourceVideo = typeof inputs.video_url === 'string' ? inputs.video_url : '';
          const data = nodeData as any;

          if (!sourceVideo) {
            throw new Error('Extract Frame Node is missing an input video URL.');
          }

          const extractResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/extract-frame`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              videoUrl: sourceVideo,
              timestamp: data.timestamp,
              timestampMode: data.timestampMode,
            }),
          });

          if (!extractResponse.ok) {
            const payload = (await extractResponse.json().catch(() => null)) as { message?: string } | null;
            throw new Error(payload?.message || 'Failed to extract frame from video.');
          }

          const extractResult = (await extractResponse.json()) as {
            frameImageUrl: string;
            timestampSeconds: number;
          };

          outputs = {
            frame_image_url: extractResult.frameImageUrl,
            frame_timestamp_seconds: extractResult.timestampSeconds,
            source_video_url: sourceVideo,
          };
          break;
        }

        case 'llmNode': {
          // LLM nodes are handled separately via run-llm task
          throw new Error('LLM nodes should be executed via run-llm task');
        }

        default: {
          const exhaustiveCheck: never = nodeType;
          return exhaustiveCheck;
        }
      }

      return {
        nodeId,
        status: 'success',
        outputs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Node execution failed';
      return {
        nodeId,
        status: 'error',
        outputs: {},
        error: message,
      };
    }
  },
});
