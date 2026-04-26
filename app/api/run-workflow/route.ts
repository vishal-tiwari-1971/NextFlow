import { NextResponse } from 'next/server';
import type { Node, Edge } from '@xyflow/react';
import { collectNodeInputData, normalizeInputs } from '../../../lib/workflow-execution';
import { generateGeminiText } from '../../../lib/gemini';
import type { LLMNodeData, WorkflowNodeData, WorkflowNodeType } from '../../../store/useWorkflowStore';

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


const buildFinalPrompt = (textList: string[], llmData: LLMNodeData) => {
  const numberedInputs =
    textList.length > 0
      ? textList.map((text, index) => `Input ${index + 1}: ${text}`).join('\n')
      : 'No text provided';
  const systemPrompt = llmData.systemPrompt || 'You are an AI assistant.';
  const userPrompt = llmData.userPrompt || llmData.prompt || '';

  return `
${systemPrompt}

You are given multiple user queries:

${numberedInputs}

Instructions:
- Answer each query separately
- Number each answer clearly as 1., 2., 3., etc.
- Do NOT ignore any query
- Keep the answer for each input tied only to that input
- Do not merge unrelated inputs into a single response

Additional instruction:
${userPrompt}

If images are provided, use them only if relevant.
`.trim();
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

    const { texts, images, videos } = normalizeInputs(llmNode.data.inputs);
    const textList = Array.isArray(texts) ? texts : [texts].filter(Boolean);
    console.log('Normalized Inputs:', {
      texts,
      images,
      videos,
    });
    console.log('Text Inputs:', textList);
    const finalPrompt = buildFinalPrompt(textList, llmNode.data as LLMNodeData);
    const responseText = await generateGeminiText({
      apiKey,
      prompt: finalPrompt,
      imageUrls: images,
    });

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