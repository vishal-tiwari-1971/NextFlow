import type { Edge, Node } from '@xyflow/react';
import type {
  CropImageNodeData,
  ExtractFrameNodeData,
  ImageNodeData,
  LLMNodeData,
  TextNodeData,
  UploadVideoNodeData,
  WorkflowGraph,
} from '../store/useWorkflowStore';

const baseNodeData = {
  inputs: {},
  outputs: {},
  status: 'idle' as const,
  error: null,
  runId: null,
};

const createTextData = (text: string, title: string, description: string): TextNodeData => ({
  ...baseNodeData,
  title,
  description,
  text,
});

const createImageData = (): ImageNodeData => ({
  ...baseNodeData,
  title: 'Image Source',
  description: 'Upload a product image for visual analysis.',
  imageUrl:
    'https://tmp-ap-southeast-1.transloadit.net/ab5b5248db5141558d6b58377d6b6f52/cc2a8f11d6f0486fbcae9130a770b826/74081c29126a425f9f9f868fd451335a.jpg',
  altText: 'Preset sample product image',
});

const createCropData = (): CropImageNodeData => ({
  ...baseNodeData,
  title: 'Crop Focus Area',
  description: 'Crop the most relevant product region.',
  x: 120,
  y: 80,
  width: 360,
  height: 260,
});

const createVideoData = (): UploadVideoNodeData => ({
  ...baseNodeData,
  title: 'Video Source',
  description: 'Upload a demo video to extract key frame context.',
  videoUrl:
    'https://tmp-ap-southeast-1.transloadit.net/ab5b5248db5141558d6b58377d6b6f52/db7ee502e84244e8913e48619e84964a/b3a953c2da09409baa457f7bec8ca5ff.mp4',
});

const createExtractFrameData = (): ExtractFrameNodeData => ({
  ...baseNodeData,
  title: 'Extract Hero Frame',
  description: 'Extract a representative frame from the demo video.',
  timestamp: 4,
  timestampMode: 'seconds',
});

const createLlmData = (title: string, description: string, userPrompt: string): LLMNodeData => ({
  ...baseNodeData,
  title,
  description,
  model: 'Model: gemini-2.0-flash',
  prompt: userPrompt,
  systemPrompt: 'You are a professional marketing strategist and product storyteller.',
  userPrompt,
});

export function createSampleWorkflow(): WorkflowGraph {
  const nodes: Array<
    Node<
      | TextNodeData
      | ImageNodeData
      | CropImageNodeData
      | UploadVideoNodeData
      | ExtractFrameNodeData
      | LLMNodeData
    >
  > = [
    // ===== BRANCH 1: IMAGE PROCESSING =====
    {
      id: 'image-1',
      type: 'imageNode',
      position: { x: 40, y: 90 },
      data: createImageData(),
    },
    {
      id: 'crop-1',
      type: 'cropImageNode',
      position: { x: 360, y: 90 },
      data: createCropData(),
    },
    {
      id: 'text-1',
      type: 'textNode',
      position: { x: 680, y: 20 },
      data: createTextData(
        'You are a professional marketing copywriter. Generate a compelling one-paragraph product description.',
        'System Prompt Context',
        'Provides base writing behavior for the first LLM step.',
      ),
    },
    {
      id: 'text-2',
      type: 'textNode',
      position: { x: 680, y: 170 },
      data: createTextData(
        'Product details: Wireless Bluetooth headphones. Features: noise cancellation, 30-hour battery,foldable design.',
        'Product Details',
        'Structured product facts for branch A.',
      ),
    },
    {
      id: 'llm-1',
      type: 'llmNode',
      position: { x: 1000, y: 120 },
      data: createLlmData(
        'Branch 1: Product Description',
        'Generates product narrative from image crop and text context.',
        'Write a polished 60-word product description with one headline and one CTA.',
      ),
    },

    // ===== BRANCH 2: VIDEO PROCESSING =====
    {
      id: 'video-1',
      type: 'uploadVideoNode',
      position: { x: 40, y: 470 },
      data: createVideoData(),
    },
    {
      id: 'frame-1',
      type: 'extractFrameNode',
      position: { x: 360, y: 470 },
      data: createExtractFrameData(),
    },
    {
      id: 'text-3',
      type: 'textNode',
      position: { x: 680, y: 470 },
      data: createTextData(
        'Create final ad copy by combining product description, cropped image cues, and extracted video frame context.',
        'Branch 2: Final Prompt',
        'Instruction prompt for convergence LLM node.',
      ),
    },

    // ===== CONVERGENCE: FINAL LLM =====
    {
      id: 'llm-final',
      type: 'llmNode',
      position: { x: 1360, y: 260 },
      data: createLlmData(
        'Final Campaign LLM',
        'Combines both branches into final campaign-ready output.',
        'Produce: 1) 3 taglines, 2) one 50-word ad script incorporating both visual and video insights.',
      ),
    },
  ];

  const edges: Edge[] = [
    // Branch 1 edges: Image → Crop → Text → Text → LLM-1
    { id: 'edge-image-crop', source: 'image-1', target: 'crop-1' },
    { id: 'edge-crop-text1', source: 'crop-1', target: 'text-1' },
    { id: 'edge-text1-text2', source: 'text-1', target: 'text-2' },
    { id: 'edge-text2-llm1', source: 'text-2', target: 'llm-1' },

    // Branch 2 edges: Video → Frame → Text
    { id: 'edge-video-frame', source: 'video-1', target: 'frame-1' },
    { id: 'edge-frame-text3', source: 'frame-1', target: 'text-3' },

    // Convergence edges: Both branches feed into final LLM
    { id: 'edge-llm1-final', source: 'llm-1', target: 'llm-final' },
    { id: 'edge-text3-final', source: 'text-3', target: 'llm-final' },
  ];

  return { nodes, edges };
}

export function loadSampleWorkflow(setWorkflow: (workflow: WorkflowGraph) => void) {
  const { nodes, edges } = createSampleWorkflow();
  setWorkflow({ nodes, edges });
}
