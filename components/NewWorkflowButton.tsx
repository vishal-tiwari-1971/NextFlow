'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReactFlow } from '@xyflow/react';
import { useAuth } from '@clerk/nextjs';
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
  const { isLoaded, userId } = useAuth();
  const setMode = useAppStore((state) => state.setMode);
  const setWorkflow = useWorkflowStore((state) => state.setWorkflow);
  const setUserId = useWorkflowStore((state) => state.setUserId);
  const [user, setUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    setUserId(userId ?? null);
    setUser(userId ? { id: userId } : getClientUser());
  }, [isLoaded, setUserId, userId]);

  const handleNewWorkflow = useCallback(() => {
    if (!isLoaded) {
      return;
    }

    if (!userId) {
      router.push('/sign-in');
      return;
    }

    setUser({ id: userId });
    setMode('user');
    setWorkflow({ nodes: [], edges: [] });

    requestAnimationFrame(() => {
      reactFlow.fitView({
        padding: 0.3,
        duration: 300,
      });
    });
  }, [isLoaded, reactFlow, router, setMode, setWorkflow, userId]);

  if (!isLoaded) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleNewWorkflow}
      title={user ? 'Create a new blank workflow' : 'Sign in required for new workflow'}
      className={`flex w-full items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-400/10 text-sm font-medium text-indigo-100 transition hover:border-indigo-400/50 hover:bg-indigo-400/20 ${
        isCollapsed ? 'mt-2 px-0 py-3' : 'mt-3 px-4 py-3'
      }`}
    >
      {isCollapsed ? 'New' : 'New Workflow'}
    </button>
  );
}
