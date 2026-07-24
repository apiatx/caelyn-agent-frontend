import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import type {
  LiveEarningsEvent,
  LiveEventsFeedResponse,
  LiveEarningsState,
} from '@/types/live-earnings';

// ─── Constants ───────────────────────────────────────────────────────────────

export const LIVE_EVENTS_KEY = ['earnings-live-events'] as const;
const POLL_MS = 25_000;
const SS_TOASTED = 'caelyn_earn_toasted';
const TOAST_STATES = new Set<LiveEarningsState>([
  'filing_detected',
  'results_partial',
  'results_available',
  'results_updated',
]);

// ─── sessionStorage helpers ───────────────────────────────────────────────────

function getToastedKeys(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SS_TOASTED);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function addToastedKey(key: string) {
  try {
    const keys = getToastedKeys();
    keys.add(key);
    sessionStorage.setItem(SS_TOASTED, JSON.stringify(Array.from(keys).slice(-300)));
  } catch {}
}

function toastKey(e: LiveEarningsEvent): string {
  return `${e.event_id}__${e.state}__${e.revision}`;
}

// ─── Formatters (for toast description) ──────────────────────────────────────

function fmtEpsShort(v: number | null): string {
  if (v == null || !isFinite(v)) return '—';
  return `${v >= 0 ? '+' : ''}$${v.toFixed(2)}`;
}
function fmtRevShort(v: number | null): string {
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (a >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (a >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toFixed(0)}`;
}

function toastHeadline(e: LiveEarningsEvent): string {
  const s = e.results_summary;
  switch (e.state) {
    case 'filing_detected':
      return 'Earnings materials detected';
    case 'results_partial': {
      const parts: string[] = [];
      if (s?.eps_actual != null) parts.push(`EPS ${fmtEpsShort(s.eps_actual)}`);
      if (s?.revenue_actual != null) parts.push(`Rev ${fmtRevShort(s.revenue_actual)}`);
      return parts.length ? parts.join(' · ') : 'Partial results available';
    }
    case 'results_available': {
      const cl = e.classification;
      const label =
        cl === 'double_beat' ? 'Double Beat' :
        cl === 'double_miss' ? 'Double Miss' :
        cl === 'mixed' ? 'Mixed Results' :
        cl === 'partial' ? 'Partial Results' : 'Results Reported';
      const parts: string[] = [label];
      if (s?.eps_actual != null) parts.push(`EPS ${fmtEpsShort(s.eps_actual)}`);
      if (s?.revenue_actual != null) parts.push(`Rev ${fmtRevShort(s.revenue_actual)}`);
      return parts.join(' · ');
    }
    case 'results_updated': {
      const parts: string[] = [`Rev ${e.revision}`];
      if (s?.eps_actual != null) parts.push(`EPS ${fmtEpsShort(s.eps_actual)}`);
      return `Results updated · ${parts.join(' · ')}`;
    }
    default: return '';
  }
}

// ─── Context value ────────────────────────────────────────────────────────────

interface EarningsLiveContextValue {
  events: LiveEarningsEvent[];
  eventBySymbol: (symbol: string) => LiveEarningsEvent | null;
  unreadCount: number;
  markRead: (eventId: string) => Promise<void>;
  isLoading: boolean;
  isError: boolean;
}

const EarningsLiveContext = createContext<EarningsLiveContextValue>({
  events: [],
  eventBySymbol: () => null,
  unreadCount: 0,
  markRead: async () => {},
  isLoading: false,
  isError: false,
});

export const useEarningsLive = () => useContext(EarningsLiveContext);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function EarningsLiveProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const baselineSetRef = useRef(false);

  // ── Query ──────────────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery<LiveEventsFeedResponse>({
    queryKey: LIVE_EVENTS_KEY,
    queryFn: async () => {
      const r = await fetch('/api/earnings/live-events', { credentials: 'include' });
      if (!r.ok) throw new Error(`Status ${r.status}`);
      return r.json();
    },
    enabled: isAuthenticated,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 20_000,
    retry: 1,
    retryDelay: 5_000,
  });

  const events: LiveEarningsEvent[] = useMemo(
    () => (data?.events ?? []).filter(e => !e.is_dry_run),
    [data],
  );

  // ── Baseline + toast logic ─────────────────────────────────────────────────

  useEffect(() => {
    if (!events.length) return;

    if (!baselineSetRef.current) {
      // First load — mark ALL event keys in sessionStorage to suppress initial toasts
      baselineSetRef.current = true;
      const toasted = getToastedKeys();
      events.forEach(e => {
        const k = toastKey(e);
        if (!toasted.has(k)) addToastedKey(k);
      });
      return;
    }

    // Subsequent polls — toast anything new that isn't in sessionStorage
    const toasted = getToastedKeys();
    events.forEach(e => {
      const k = toastKey(e);
      if (!TOAST_STATES.has(e.state)) return;
      if (toasted.has(k)) return;
      addToastedKey(k);

      const headline = toastHeadline(e);
      if (!headline) return;

      const sym = e.symbol;
      toast({
        title: `${sym} — ${e.state === 'filing_detected' ? 'Filing Detected' : e.state === 'results_partial' ? 'Partial Results' : e.state === 'results_available' ? 'Earnings Results' : 'Results Updated'}`,
        description: headline,
        action: (
          <button
            onClick={() => {
              setLocation(`/app/watchlist?openTicker=${sym}&primaryTab=earnings&earningsTab=overview`);
            }}
            className="text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors"
          >
            View
          </button>
        ) as any,
      });
    });
  }, [events, toast, setLocation]);

  // ── eventBySymbol ──────────────────────────────────────────────────────────

  const symbolMap = useMemo(() => {
    const m = new Map<string, LiveEarningsEvent>();
    for (const e of events) m.set(e.symbol.toUpperCase(), e);
    return m;
  }, [events]);

  const eventBySymbol = useCallback(
    (symbol: string): LiveEarningsEvent | null =>
      symbolMap.get(symbol.toUpperCase()) ?? null,
    [symbolMap],
  );

  // ── unreadCount ────────────────────────────────────────────────────────────

  const unreadCount = useMemo(
    () => events.filter(e => e.read_at === null).length,
    [events],
  );

  // ── markRead ───────────────────────────────────────────────────────────────

  const markRead = useCallback(async (eventId: string) => {
    queryClient.setQueryData<LiveEventsFeedResponse>(LIVE_EVENTS_KEY, old => {
      if (!old?.events) return old;
      return {
        ...old,
        events: old.events.map(e =>
          e.event_id === eventId
            ? { ...e, read_at: new Date().toISOString() }
            : e,
        ),
      };
    });
    try {
      await fetch(`/api/earnings/live-events/${encodeURIComponent(eventId)}/read`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // don't revert — failed ack should not block navigation
    }
  }, [queryClient]);

  // ── Context value ──────────────────────────────────────────────────────────

  const value = useMemo<EarningsLiveContextValue>(
    () => ({ events, eventBySymbol, unreadCount, markRead, isLoading, isError }),
    [events, eventBySymbol, unreadCount, markRead, isLoading, isError],
  );

  return (
    <EarningsLiveContext.Provider value={value}>
      {children}
    </EarningsLiveContext.Provider>
  );
}
