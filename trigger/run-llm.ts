import { task } from '@trigger.dev/sdk';
import { generateGeminiText } from '../lib/gemini';

export type RunLLMTaskPayload = {
  prompt: string;
};

export type RunLLMTaskOutput = {
  response: string;
};

export const runLLMTask = task({
  id: 'run-llm',
  retry: {
    maxAttempts: 2,
  },
  run: async (payload: RunLLMTaskPayload): Promise<RunLLMTaskOutput> => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY environment variable.');
    }

    const response = await generateGeminiText({
      apiKey,
      prompt: payload.prompt,
    });

    return {
      response,
    };
  },
});