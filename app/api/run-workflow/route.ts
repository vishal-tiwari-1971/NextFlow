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
  const cleanedInputs = textList.map((text) => text.trim()).filter(Boolean);
  const numberedInputs =
    cleanedInputs.length > 0
      ? cleanedInputs.map((text, index) => `${index + 1}. ${text}`).join('\n')
      : 'No text provided';
  const systemPrompt = llmData.systemPrompt || 'You are an AI assistant.';
  const userPrompt = llmData.userPrompt || llmData.prompt || '';
  const isFinalNode =
    userPrompt.toLowerCase().includes('marketing') || userPrompt.toLowerCase().includes('taglines');

  if (isFinalNode) {
    return `
You are a professional marketing strategist.

You are given:
- A product description
- A cropped product image
- A video frame image

Your task:

1. Generate THREE catchy taglines
2. Write ONE 80-word advertisement script
3. Create ONE engaging social media caption with hashtags

Inputs:
${numberedInputs}

Instructions:
- Use BOTH images for context (product image + video frame)
- Use ALL provided text inputs
- Align messaging with product features
- Keep tone energetic and modern
- Clearly separate outputs into sections:
  Taglines:
  Ad Script:
  Social Caption:

Do NOT skip any section.
Do NOT produce incomplete output.
`.trim();
  }

  return `
System:
${systemPrompt}

User requests:
${numberedInputs}

Output requirements:
${userPrompt || 'Provide a direct, useful answer.'}

Rules:
- Return the final answer directly.
- Do not explain what you are going to do.
- Do not ask for more input unless the user request is empty.
- If there is one request, return only one answer paragraph.
- If there are multiple requests, answer each as 1., 2., 3., etc.
- If images are provided, use them only when relevant.
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
    console.log('Images sent to LLM:', images);
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