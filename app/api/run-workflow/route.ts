import { NextResponse } from 'next/server';
import type { Node, Edge } from '@xyflow/react';
import { collectNodeInputData } from '../../../lib/workflow-execution';
import { generateGeminiText } from '../../../lib/gemini';
import type { WorkflowNodeData, WorkflowNodeType } from '../../../store/useWorkflowStore';

export const dynamic = 'force-dynamic';

type WorkflowExecutionRequest = {
  workflow: {
    nodes: Node<WorkflowNodeData>[];
    edges: Edge[];
  };
  nodeId: string;
};

type WorkflowExecutionResponse = {
  runId: string;
  response: string;
};


const getNodeInputText = (inputs: Record<string, unknown>, prompt: string) => {
  const candidate = inputs.response ?? inputs.text ?? inputs.prompt;

  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate;
  }

  return prompt;
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: 'Missing GEMINI_API_KEY environment variable.' },
        { status: 500 },
      );
    }

    const body = (await request.json()) as WorkflowExecutionRequest;
    const { nodes, edges } = body.workflow;
    const workingNodes = nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        inputs: collectNodeInputData(nodes, edges, node.id),
      },
    }));

    const requestedNode = workingNodes.find((entry) => entry.id === body.nodeId);

    if (!requestedNode || requestedNode.type !== 'llmNode') {
      return NextResponse.json(
        { message: 'The requested node is not an LLM node.' },
        { status: 400 },
      );
    }

    const llmNode = requestedNode as Node<WorkflowNodeData, WorkflowNodeType> & {
      type: 'llmNode';
    };

    const prompt = getNodeInputText(llmNode.data.inputs, String(llmNode.data.prompt || ''));
    const responseText = await generateGeminiText({ apiKey, prompt });

    const response: WorkflowExecutionResponse = {
      runId: 'local-' + Date.now(),
      response: responseText,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Failed to run workflow.',
      },
      { status: 500 },
    );
  }
}