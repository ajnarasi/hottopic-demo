'use client';

import { create } from 'zustand';
import { useEffect, useState } from 'react';
import { DebugEntry } from '@/lib/types';

interface DebugStore {
  entries: DebugEntry[];
  visible: boolean;
  addEntry: (entry: Omit<DebugEntry, 'timestamp'>) => void;
  toggle: () => void;
  clear: () => void;
}

export const useDebug = create<DebugStore>((set) => ({
  entries: [],
  visible: false,
  addEntry: (entry) =>
    set((state) => ({
      entries: [{ ...entry, timestamp: Date.now() }, ...state.entries].slice(
        0,
        100
      ),
    })),
  toggle: () => set((state) => ({ visible: !state.visible })),
  clear: () => set({ entries: [] }),
}));

export function DebugPanelWrapper() {
  const { entries, visible, toggle, clear } = useDebug();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  if (!mounted || !visible) return null;

  return (
    <div className="debug-panel">
      <div className="sticky top-0 bg-surface p-2 border-b border-border flex items-center justify-between">
        <span className="font-bold text-accent text-xs">
          Debug Panel (Ctrl+Shift+D)
        </span>
        <div className="flex gap-2">
          <button
            onClick={clear}
            className="text-xs text-muted hover:text-foreground"
          >
            Clear
          </button>
          <button
            onClick={toggle}
            className="text-xs text-muted hover:text-foreground"
          >
            Close
          </button>
        </div>
      </div>
      <div className="p-2 space-y-2">
        {entries.length === 0 && (
          <p className="text-muted text-xs text-center py-4">
            No debug entries yet. Complete an Apple Pay flow to see data.
          </p>
        )}
        {entries.map((entry, i) => (
          <div key={i} className="bg-background rounded p-2 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  entry.type === 'request'
                    ? 'bg-blue-900 text-blue-300'
                    : entry.type === 'response'
                    ? 'bg-green-900 text-green-300'
                    : 'bg-yellow-900 text-yellow-300'
                }`}
              >
                {entry.type.toUpperCase()}
              </span>
              <span className="text-foreground font-medium">{entry.label}</span>
              {entry.duration && (
                <span className="text-muted ml-auto">{entry.duration}ms</span>
              )}
            </div>
            <pre className="text-muted overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(entry.data, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
