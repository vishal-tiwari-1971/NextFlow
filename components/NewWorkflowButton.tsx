'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReactFlow } from '@xyflow/react';
import { useAppStore } from '../store/useAppStore';
import { useWorkflowStore } from '../store/useWorkflowStore';

type DemoUser = {
  id: string;
  email?: string;
};

type NewWorkflowButtonProps = {
  isCollapsed?: boolean;
};

const getClientUser = (): DemoUser | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawUser = localStorage.getItem('nextflow_user');

  if (!rawUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawUser) as DemoUser;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
};

export default function NewWorkflowButton({ isCollapsed = false }: NewWorkflowButtonProps) {
  const router = useRouter();
  const reactFlow = useReactFlow();
  const setMode = useAppStore((state) => state.setMode);
  const setWorkflow = useWorkflowStore((state) => state.setWorkflow);
  const [user, setUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    setUser(getClientUser());
  }, []);

  const handleNewWorkflow = useCallback(() => {
    const currentUser = getClientUser();

    if (!currentUser) {
      router.push('/login');
      return;
    }

    setUser(currentUser);
    setMode('user');
    setWorkflow({ nodes: [], edges: [] });

    requestAnimationFrame(() => {
      reactFlow.fitView({
        padding: 0.3,
        duration: 300,
      });
    });
  }, [reactFlow, router, setMode, setWorkflow]);

  return (
    <button
      type="button"
      onClick={handleNewWorkflow}
      title={user ? 'Create a new blank workflow' : 'Login required for new workflow'}
      className={`flex w-full items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-400/10 text-sm font-medium text-indigo-100 transition hover:border-indigo-400/50 hover:bg-indigo-400/20 ${
        isCollapsed ? 'mt-2 px-0 py-3' : 'mt-3 px-4 py-3'
      }`}
    >
      {isCollapsed ? 'New' : 'New Workflow'}
    </button>
  );
}
