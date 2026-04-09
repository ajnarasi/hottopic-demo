'use client';

import { useState, useEffect, useRef } from 'react';
import { useDebug } from './DebugPanel';
import { TraceCategory, TraceEntry } from '@/lib/types';

const CATEGORY_CONFIG: Record<TraceCategory, { label: string; badge: string; dot: string }> = {
  'apple-pay-callback': {
    label: 'Apple Pay',
    badge: 'bg-blue-900/80 text-blue-300 border-blue-700',
    dot: 'bg-blue-400',
  },
  'commerce-hub-api': {
    label: 'Commerce Hub',
    badge: 'bg-orange-900/80 text-orange-300 border-orange-700',
    dot: 'bg-orange-400',
  },
  'shipping-api': {
    label: 'Shipping',
    badge: 'bg-purple-900/80 text-purple-300 border-purple-700',
    dot: 'bg-purple-400',
  },
  'internal-event': {
    label: 'Internal',
    badge: 'bg-zinc-800/80 text-zinc-400 border-zinc-600',
    dot: 'bg-zinc-500',
  },
};

const FILTER_OPTIONS: { value: TraceCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Events' },
  { value: 'apple-pay-callback', label: 'Apple Pay' },
  { value: 'commerce-hub-api', label: 'Commerce Hub' },
  { value: 'shipping-api', label: 'Shipping' },
  { value: 'internal-event', label: 'Internal' },
];

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
}

export default function ApiTracePanel() {
  const { entries, activeFilter, setFilter, clear } = useDebug();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll to top (newest) when new entries arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [entries.length]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered: TraceEntry[] = activeFilter === 'all'
    ? entries
    : entries.filter((e: TraceEntry) => e.category === activeFilter);

  if (!mounted) {
    return (
      <aside className="w-[400px] shrink-0 border-l border-border bg-[#0a0a0a]" />
    );
  }

  return (
    <aside className="w-[400px] shrink-0 border-l border-border bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold text-foreground tracking-wide">API TRACE</span>
        </div>

        <select
          value={activeFilter}
          onChange={(e) => setFilter(e.target.value as TraceCategory | 'all')}
          className="ml-auto text-[10px] bg-[#1a1a1a] border border-border rounded px-1.5 py-0.5 text-muted"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={clear}
          className="text-[10px] text-muted hover:text-foreground px-1.5 py-0.5 rounded hover:bg-surface transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Entries */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted text-xs">No trace entries yet.</p>
            <p className="text-muted text-[10px] mt-1">
              Click an Apple Pay button to start a payment flow.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((entry: TraceEntry) => {
              const config = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG['internal-event'];
              const isExpanded = expandedIds.has(entry.id);
              const label = String(entry.label);
              const desc = entry.description ? String(entry.description) : null;
              const dur = entry.duration ? Number(entry.duration) : null;
              const hasData = !!entry.data;
              const dataJson = hasData ? JSON.stringify(entry.data, null, 2) : '';

              return (
                <div
                  key={entry.id}
                  className="px-3 py-2 hover:bg-[#111] transition-colors cursor-pointer"
                  onClick={() => toggleExpand(entry.id)}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] text-muted font-mono w-4 shrink-0">
                      {String(entry.step ?? '')}
                    </span>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
                    <span
                      className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${config.badge}`}
                    >
                      {config.label}
                    </span>
                    {entry.isSimulated ? (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded border border-yellow-700 bg-yellow-900/60 text-yellow-300">
                        SANDBOX
                      </span>
                    ) : null}
                    {entry.type === 'request' ? (
                      <span className="text-[9px] text-blue-400">REQ</span>
                    ) : null}
                    {entry.type === 'response' ? (
                      <span className="text-[9px] text-green-400">RES</span>
                    ) : null}
                    <span className="ml-auto text-[10px] text-muted font-mono">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-foreground font-medium pl-[22px]">
                    {label}
                  </p>

                  {desc ? (
                    <p className="text-[10px] text-muted pl-[22px] mt-0.5 leading-relaxed">
                      {desc}
                    </p>
                  ) : null}

                  {dur ? (
                    <span className="text-[10px] text-muted pl-[22px]">
                      {dur}ms
                    </span>
                  ) : null}

                  {isExpanded && hasData ? (
                    <div className="mt-2 ml-[22px] p-2 bg-[#0d0d0d] rounded border border-border/50 overflow-x-auto">
                      <pre className="text-[10px] text-zinc-400 font-mono whitespace-pre-wrap break-all leading-relaxed">
                        {dataJson}
                      </pre>
                    </div>
                  ) : null}

                  {!isExpanded && hasData ? (
                    <p className="text-[9px] text-muted/50 pl-[22px] mt-0.5">
                      Click to expand payload
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-1.5 border-t border-border shrink-0 flex items-center gap-3 text-[10px] text-muted">
        <span>{filtered.length} events</span>
        {activeFilter !== 'all' && (
          <span>({entries.length} total)</span>
        )}
      </div>
    </aside>
  );
}
