'use client';

import { useState, useEffect, useRef } from 'react';
import { useDebug } from './DebugPanel';
import { TraceCategory, TraceEntry } from '@/lib/types';

const CATEGORY_CONFIG: Record<TraceCategory, { label: string; badge: string; dot: string }> = {
  'apple-pay-callback': { label: 'Apple Pay', badge: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  'commerce-hub-api': { label: 'Commerce Hub', badge: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  'shipping-api': { label: 'Shipping', badge: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  'internal-event': { label: 'Internal', badge: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
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
  const [expanded, setExpanded] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'transcript' | 'source'>('transcript');
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (entries.length > 0 && !expanded) setExpanded(true);
  }, [entries.length, expanded]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
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

  if (!mounted) return <div className="h-10 bg-white border-t border-border shrink-0" />;

  return (
    <div
      className={`shrink-0 bg-white border-t border-border transition-all duration-300 ${
        expanded ? 'trace-panel-expanded' : 'trace-panel-collapsed'
      }`}
    >
      {/* Header Bar — always visible */}
      <div
        className="h-10 px-4 flex items-center justify-between cursor-pointer hover:bg-surface transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="currentColor"
            className={`text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-bold text-foreground">API Trace</span>
          <span className="text-[10px] text-muted">
            ({filtered.length} event{filtered.length !== 1 ? 's' : ''})
          </span>
          {entries.some((e: TraceEntry) => e.isSimulated) && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 border border-yellow-200">
              SANDBOX
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex bg-surface rounded overflow-hidden">
            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab('transcript'); }}
              className={`text-[10px] font-medium px-2.5 py-1 transition-colors ${
                activeTab === 'transcript' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground'
              }`}
            >
              Transcript
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab('source'); }}
              className={`text-[10px] font-medium px-2.5 py-1 transition-colors ${
                activeTab === 'source' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground'
              }`}
            >
              Source
            </button>
          </div>
          <select
            value={activeFilter}
            onChange={(e) => { e.stopPropagation(); setFilter(e.target.value as TraceCategory | 'all'); }}
            className="text-[10px] bg-surface border border-border rounded px-1.5 py-0.5 text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={(e) => { e.stopPropagation(); clear(); }}
            className="text-[10px] text-muted hover:text-foreground px-1.5"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div ref={scrollRef} className="h-[300px] overflow-y-auto border-t border-border">
          {activeTab === 'transcript' ? (
            filtered.length === 0 ? (
              <div className="p-6 text-center text-muted text-xs">
                No trace entries yet. Click an Apple Pay button to start.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((entry: TraceEntry) => {
                  const config = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG['internal-event'];
                  const isOpen = expandedIds.has(entry.id);
                  const label = String(entry.label);
                  const desc = entry.description ? String(entry.description) : null;
                  const dur = entry.duration ? Number(entry.duration) : null;
                  const hasData = !!entry.data;
                  const dataJson = hasData ? JSON.stringify(entry.data, null, 2) : '';

                  return (
                    <div
                      key={entry.id}
                      className="px-4 py-2.5 hover:bg-surface/50 cursor-pointer transition-colors"
                      onClick={() => toggleExpand(entry.id)}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] text-muted font-mono w-5 shrink-0 text-right">
                          {String(entry.step ?? '')}
                        </span>
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${config.badge}`}>
                          {config.label}
                        </span>
                        {entry.isSimulated ? (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded border border-yellow-200 bg-yellow-50 text-yellow-700">
                            SANDBOX
                          </span>
                        ) : null}
                        {entry.type === 'request' ? (
                          <span className="text-[9px] font-semibold text-blue-600">REQ</span>
                        ) : null}
                        {entry.type === 'response' ? (
                          <span className="text-[9px] font-semibold text-green-600">RES</span>
                        ) : null}
                        {dur ? (
                          <span className="text-[10px] text-muted">{dur}ms</span>
                        ) : null}
                        <span className="ml-auto text-[10px] text-muted font-mono">
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground pl-[26px]">{label}</p>
                      {desc ? (
                        <p className="text-[10px] text-muted pl-[26px] mt-0.5">{desc}</p>
                      ) : null}
                      {isOpen && hasData ? (
                        <div className="mt-2 ml-[26px] p-2 bg-gray-50 rounded border border-border overflow-x-auto">
                          <pre className="text-[10px] text-gray-600 font-mono whitespace-pre-wrap break-all leading-relaxed">
                            {dataJson}
                          </pre>
                        </div>
                      ) : null}
                      {!isOpen && hasData ? (
                        <p className="text-[9px] text-muted/40 pl-[26px] mt-0.5">Click to expand</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Source Tab — show generated Apple Pay JS code */
            <div className="p-4">
              <pre className="text-[11px] text-gray-700 font-mono whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg border border-border p-4 overflow-x-auto">
{`// Apple Pay on the Web — Generated Configuration
const request = {
  countryCode: 'US',
  currencyCode: 'USD',
  supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
  merchantCapabilities: ['supports3DS', 'supportsCredit', 'supportsDebit'],
  total: {
    label: 'Hot Topic',
    amount: '49.90',
    type: 'pending',
  },
  requiredShippingContactFields: [
    'postalAddress', 'name', 'phone', 'email'
  ],
  requiredBillingContactFields: ['postalAddress'],
};

const session = new ApplePaySession(14, request);

session.onvalidatemerchant = async (event) => {
  const response = await fetch('/api/apple-pay/validate-merchant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      validationURL: event.validationURL,
      merchantIdentifier: 'merchant.app.vercel.hottopic',
      displayName: 'Hot Topic',
      initiative: 'web',
      initiativeContext: window.location.hostname,
    }),
  });
  const merchantSession = await response.json();
  session.completeMerchantValidation(merchantSession);
};

session.onpaymentmethodselected = (event) => {
  session.completePaymentMethodSelection({
    newTotal: request.total,
  });
};

session.onshippingcontactselected = async (event) => {
  const { countryCode, administrativeArea, postalCode } =
    event.shippingContact;
  // Calculate shipping and tax...
  session.completeShippingContactSelection({
    newShippingMethods: [...],
    newLineItems: [...],
    newTotal: { label: 'Hot Topic', amount: '...', type: 'final' },
  });
};

session.onpaymentauthorized = async (event) => {
  // Send token to Commerce Hub via merchant server
  const result = await fetch('/api/process-payment', {
    method: 'POST',
    body: JSON.stringify({ token: event.payment.token }),
  });
  session.completePayment({
    status: result.ok
      ? ApplePaySession.STATUS_SUCCESS
      : ApplePaySession.STATUS_FAILURE,
  });
};

session.begin();`}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
