'use client';

import { create } from 'zustand';
import { TraceEntry, TraceCategory } from '@/lib/types';

let stepCounter = 0;

interface TraceStore {
  entries: TraceEntry[];
  activeFilter: TraceCategory | 'all';
  addEntry: (entry: Omit<TraceEntry, 'id' | 'timestamp' | 'step'>) => void;
  setFilter: (filter: TraceCategory | 'all') => void;
  clear: () => void;
  resetSteps: () => void;
}

export const useDebug = create<TraceStore>((set) => ({
  entries: [],
  activeFilter: 'all',
  addEntry: (entry) =>
    set((state) => ({
      entries: [
        {
          ...entry,
          id: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          step: ++stepCounter,
        },
        ...state.entries,
      ].slice(0, 200),
    })),
  setFilter: (filter) => set({ activeFilter: filter }),
  clear: () => {
    stepCounter = 0;
    set({ entries: [] });
  },
  resetSteps: () => {
    stepCounter = 0;
  },
}));
