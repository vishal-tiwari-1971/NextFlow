import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type XYPosition } from '@xyflow/react';
import { create } from 'zustand';
import { collectNodeInputData, getIncomingEdges, topologicalSort, groupNodesByExecutionLevel } from '../lib/workflow-execution';
import { saveRun } from '../lib/run-history';

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
  timestampMode: 'seconds' | 'percentage';
}

export type WorkflowNodeData =
  | TextNodeData
  | ImageNodeData
  | LLMNodeData
  | UploadVideoNodeData
  | CropImageNodeData
  | ExtractFrameNodeData;

export type WorkflowGraph = {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
};

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
  timestampMode: 'seconds' | 'percentage';
}>;

type WorkflowRunResponse = {
  runId: string;
  response: string;
};

const RUNNING_PREVIEW_MS_BY_NODE_TYPE: Record<WorkflowNodeType, number> = {
  textNode: 220,
  cropImageNode: 260,
  extractFrameNode: 260,
  imageNode: 700,
  uploadVideoNode: 900,
  llmNode: 650,
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const getRunningPreviewMs = (type: WorkflowNodeType) =>
  RUNNING_PREVIEW_MS_BY_NODE_TYPE[type] ?? 300;

interface WorkflowStore {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  isRunning: boolean;
  runError: string | null;
  setWorkflow: (workflow: WorkflowGraph) => void;
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
  runNode: (nodeId: string) => Promise<void>;
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
        description: 'Extract a frame from video using FFmpeg at a timestamp.',
        timestamp: 1,
        timestampMode: 'seconds',
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
  setWorkflow: ({ nodes, edges }) => {
    set({
      nodes,
      edges,
      isRunning: false,
      runError: null,
    });
  },
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
  runNode: async (nodeId) => {
    if (get().isRunning) {
      return;
    }

    const state = get();
    const nodeIndex = state.nodes.findIndex((node) => node.id === nodeId);

    if (nodeIndex === -1) {
      return;
    }

    const node = state.nodes[nodeIndex];
    const inputs = collectNodeInputData(state.nodes, state.edges, nodeId);

    set((currentState) => ({
      nodes: currentState.nodes.map((currentNode) =>
        currentNode.id === nodeId
          ? {
              ...currentNode,
              data: {
                ...currentNode.data,
                inputs,
                error: null,
                runId: null,
                status: 'running',
              },
            }
          : currentNode,
      ),
      runError: null,
    }));

    await wait(getRunningPreviewMs(node.type as WorkflowNodeType));

    try {
      let outputs: Record<string, unknown> = {};
      let runId: string | null = null;

      if (node.type === 'llmNode') {
        const response = await fetch('/api/run-workflow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nodeId,
            workflow: {
              nodes: state.nodes,
              edges: state.edges,
            },
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message || 'Failed to run node.');
        }

        const result = (await response.json()) as WorkflowRunResponse;
        outputs = {
          response: result.response,
        };
        runId = result.runId;
      } else if (node.type === 'extractFrameNode') {
        const frameData = node.data as ExtractFrameNodeData;
        const sourceVideoUrl =
          typeof inputs.video_url === 'string'
            ? inputs.video_url
            : typeof frameData.inputs?.video_url === 'string'
              ? (frameData.inputs.video_url as string)
              : '';

        if (!sourceVideoUrl) {
          throw new Error('Extract Frame Node is missing an input video URL.');
        }

        const extractResponse = await fetch('/api/extract-frame', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoUrl: sourceVideoUrl,
            timestamp: frameData.timestamp,
            timestampMode: frameData.timestampMode,
          }),
        });

        if (!extractResponse.ok) {
          const payload = (await extractResponse.json().catch(() => null)) as
            | { message?: string }
            | null;
          throw new Error(payload?.message || 'Failed to extract frame from video.');
        }

        const extractResult = (await extractResponse.json()) as {
          frameImageUrl: string;
          timestampSeconds: number;
        };

        outputs = {
          frame_image_url: extractResult.frameImageUrl,
          frame_timestamp_seconds: extractResult.timestampSeconds,
          source_video_url: sourceVideoUrl,
        };
      } else {
        outputs = executeNode(node.type as WorkflowNodeType, node.data, inputs);
      }

      set((currentState) => ({
        nodes: currentState.nodes.map((currentNode) =>
          currentNode.id === nodeId
            ? {
                ...currentNode,
                data: {
                  ...currentNode.data,
                  outputs,
                  status: 'success',
                  error: null,
                  runId,
                },
              }
            : currentNode,
        ),
      }));

      await saveRun({
        workflowName: 'Node Run',
        status: 'success',
        result: {
          nodes: get().nodes,
          edges: get().edges,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Node execution failed.';

      await saveRun({
        workflowName: 'Node Run',
        status: 'error',
        error: message,
      });

      set((currentState) => ({
        nodes: currentState.nodes.map((currentNode) =>
          currentNode.id === nodeId
            ? {
                ...currentNode,
                data: {
                  ...currentNode.data,
                  status: 'error',
                  error: message,
                },
              }
            : currentNode,
        ),
        runError: message,
      }));
    }
  },
  runWorkflow: async () => {
    if (get().isRunning) {
      return;
    }

    set({ isRunning: true, runError: null });

    try {
      const state = get();
      // Group nodes by execution level to enable parallel execution
      const executionLevels = groupNodesByExecutionLevel(state.nodes, state.edges);
      let workingNodes = [...state.nodes];
      const outputsByNodeId: Record<string, Record<string, unknown>> = {};

      // Execute each level in sequence, but nodes within a level run in parallel
      for (const level of executionLevels) {
        // Mark all nodes in this level as running
        const levelNodeIndices = level
          .map((nodeId) => workingNodes.findIndex((node) => node.id === nodeId))
          .filter((idx) => idx !== -1);

        for (const nodeIndex of levelNodeIndices) {
          const node = workingNodes[nodeIndex];
          const inputs = collectNodeInputData(workingNodes, state.edges, node.id);

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
        }

        set({ nodes: [...workingNodes] });

        // Execute all nodes in this level in parallel
        const levelPromises = level.map(async (nodeId) => {
          const nodeIndex = workingNodes.findIndex((node) => node.id === nodeId);
          if (nodeIndex === -1) {
            return null;
          }

          const node = workingNodes[nodeIndex];
          const inputs = collectNodeInputData(workingNodes, state.edges, nodeId);

          try {
            // Add simulation delay for visual feedback
            await wait(getRunningPreviewMs(node.type as WorkflowNodeType));

            if (node.type !== 'llmNode') {
              if (node.type === 'extractFrameNode') {
                const frameData = workingNodes[nodeIndex].data as ExtractFrameNodeData;
                const sourceVideoUrl =
                  typeof inputs.video_url === 'string'
                    ? inputs.video_url
                    : typeof frameData.inputs?.video_url === 'string'
                      ? (frameData.inputs.video_url as string)
                      : '';

                if (!sourceVideoUrl) {
                  throw new Error('Extract Frame Node is missing an input video URL.');
                }

                const extractResponse = await fetch('/api/extract-frame', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    videoUrl: sourceVideoUrl,
                    timestamp: frameData.timestamp,
                    timestampMode: frameData.timestampMode,
                  }),
                });

                if (!extractResponse.ok) {
                  const payload = (await extractResponse.json().catch(() => null)) as
                    | { message?: string }
                    | null;
                  throw new Error(payload?.message || 'Failed to extract frame from video.');
                }

                const extractResult = (await extractResponse.json()) as {
                  frameImageUrl: string;
                  timestampSeconds: number;
                };

                const outputs = {
                  frame_image_url: extractResult.frameImageUrl,
                  frame_timestamp_seconds: extractResult.timestampSeconds,
                  source_video_url: sourceVideoUrl,
                };

                outputsByNodeId[nodeId] = outputs;
                return { nodeId, outputs, status: 'success' as const };
              }

              const outputs = executeNode(
                node.type as WorkflowNodeType,
                workingNodes[nodeIndex].data,
                inputs,
              );

              outputsByNodeId[nodeId] = outputs;
              return { nodeId, outputs, status: 'success' as const };
            }

            // Handle LLM nodes
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
              throw new Error(payload?.message || 'Failed to run LLM node.');
            }

            const result = (await response.json()) as WorkflowRunResponse;
            const llmOutputs = {
              response: result.response,
            };

            outputsByNodeId[nodeId] = llmOutputs;
            return { nodeId, outputs: llmOutputs, status: 'success' as const, runId: result.runId };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Node execution failed';
            return { nodeId, outputs: {}, status: 'error' as const, error: errorMessage };
          }
        });

        const levelResults = await Promise.all(levelPromises);

        // Update working nodes with results from this level
        for (const result of levelResults) {
          if (result) {
            const nodeIndex = workingNodes.findIndex((node) => node.id === result.nodeId);
            if (nodeIndex !== -1) {
              if (result.status === 'error') {
                workingNodes[nodeIndex] = {
                  ...workingNodes[nodeIndex],
                  data: {
                    ...workingNodes[nodeIndex].data,
                    outputs: result.outputs,
                    status: 'error',
                    error: result.error || 'Unknown error',
                  },
                };
              } else {
                workingNodes[nodeIndex] = {
                  ...workingNodes[nodeIndex],
                  data: {
                    ...workingNodes[nodeIndex].data,
                    outputs: result.outputs,
                    status: 'success',
                    error: null,
                    runId: result.runId || null,
                  },
                };
              }
            }
          }
        }

        set({ nodes: [...workingNodes] });

        // Check if any node in this level failed
        const hasError = levelResults.some((r) => r && r.status === 'error');
        if (hasError) {
          const firstError = levelResults.find((r) => r && r.status === 'error');
          throw new Error(firstError?.error || 'A node in the current level failed');
        }
      }

      await saveRun({
        workflowName: 'Workflow Run',
        status: 'success',
        result: {
          nodes: workingNodes,
          edges: state.edges,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Workflow execution failed.';

      await saveRun({
        workflowName: 'Workflow Run',
        status: 'error',
        error: message,
      });

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
