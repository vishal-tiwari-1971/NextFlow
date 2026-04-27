import { create } from 'zustand';

export type AppMode = 'demo' | 'user';

type AppState = {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
};

export const useAppStore = create<AppState>((set) => ({
  mode: 'demo',
  setMode: (mode) => set({ mode }),
}));
