'use client';

import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { loadSampleWorkflow } from '../lib/sample-workflow';
import { useAppStore } from '../store/useAppStore';
import { useWorkflowStore } from '../store/useWorkflowStore';

type LoadSampleWorkflowButtonProps = {
  isCollapsed?: boolean;
};

export default function LoadSampleWorkflowButton({
  isCollapsed = false,
}: LoadSampleWorkflowButtonProps) {
  const reactFlow = useReactFlow();
  const setMode = useAppStore((state) => state.setMode);
  const setWorkflow = useWorkflowStore((state) => state.setWorkflow);

  const handleLoadSample = useCallback(() => {
    setMode('demo');
    loadSampleWorkflow(setWorkflow);

    requestAnimationFrame(() => {
      reactFlow.fitView({
        padding: 0.2,
        duration: 450,
      });
    });
  }, [reactFlow, setMode, setWorkflow]);

  return (
    <button
      type="button"
      onClick={handleLoadSample}
      title="Load Sample Workflow"
      className={`flex w-full items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-400/10 text-sm font-medium text-sky-100 transition hover:border-sky-400/50 hover:bg-sky-400/20 ${
        isCollapsed ? 'mt-3 px-0 py-3' : 'mt-3 px-4 py-3'
      }`}
    >
      {isCollapsed ? 'Sample' : 'Load Sample Workflow'}
    </button>
  );
}
