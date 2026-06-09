import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useReducer,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertSeverity = 'low' | 'medium' | 'high' | 'extreme';

export interface AlertItem {
  id: string;
  ticker: string;
  short_label: string;
  severity: AlertSeverity;
  alert_type?: string;
  title?: string;
  summary?: string;
  coverage_label?: string;
  score?: number;
  reasons?: { label?: string; detail?: string; value?: string }[];
  source_tags?: string[];
  dismissed?: boolean;
  acknowledged?: boolean;
  created_at?: string;
  in_watchlist?: boolean;
  in_portfolio?: boolean;
}

interface AlertState {
  visible: AlertItem[];
  queue: AlertItem[];
  seenIds: Set<string>;
  ackIds: Set<string>;
  dismissedIds: Set<string>;
  lastSeenCreatedAt: string | null;
}

type AlertAction =
  | { type: 'ADD_ALERT'; alert: AlertItem }
  | { type: 'ACK'; id: string }
  | { type: 'DISMISS'; id: string }
  | { type: 'REMOVE_BUBBLE'; id: string }
  | { type: 'LOAD_RECENT'; alerts: AlertItem[] };

interface AlertContextValue {
  visible: AlertItem[];
  dismissAlert: (id: string) => Promise<void>;
  ackAlert: (id: string) => Promise<void>;
  removeFromView: (id: string) => void;
}

const AlertContext = createContext<AlertContextValue>({
  visible: [],
  dismissAlert: async () => {},
  ackAlert: async () => {},
  removeFromView: () => {},
});

export const useAlerts = () => useContext(AlertContext);

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_SEEN      = 'caelyn_alert_seen_ids';
const LS_ACK       = 'caelyn_alert_ack_ids';
const LS_DISMISSED = 'caelyn_alert_dismissed_ids';
const LS_LAST_AT   = 'caelyn_alert_last_seen_created_at';
const MAX_LS_IDS   = 500;

function loadIdSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch { return new Set(); }
}

function saveIdSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set].slice(-MAX_LS_IDS)));
  } catch {}
}

function loadLastAt(): string | null {
  try { return localStorage.getItem(LS_LAST_AT); } catch { return null; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AUTO_DISMISS_MS: Record<AlertSeverity, number> = {
  low: 8_000,
  medium: 10_000,
  high: 15_000,
  extreme: 0,
};

// Max age to surface on initial load / poll, by severity
const SURFACE_MAX_AGE_MS: Record<AlertSeverity, number> = {
  low:     15 * 60_000,
  medium:  30 * 60_000,
  high:    2  * 60 * 60_000,
  extreme: 2  * 60 * 60_000,
};

function severityRank(s: string): number {
  return ({ low: 0, medium: 1, high: 2, extreme: 3 } as Record<string, number>)[s] ?? 0;
}

function stableKey(a: AlertItem): string {
  if (a.id) return a.id;
  return `${a.ticker}__${a.alert_type ?? 'unknown'}__${a.created_at ?? ''}`;
}

function isKnown(
  key: string,
  state: Pick<AlertState, 'seenIds' | 'ackIds' | 'dismissedIds'>,
): boolean {
  return state.seenIds.has(key) || state.ackIds.has(key) || state.dismissedIds.has(key);
}

function promoteFromQueue(
  visible: AlertItem[],
  queue: AlertItem[],
): Pick<AlertState, 'visible' | 'queue'> {
  const slots = Math.max(0, 3 - visible.length);
  return {
    visible: [...visible, ...queue.slice(0, slots)],
    queue: queue.slice(slots),
  };
}

function advanceLastAt(
  current: string | null,
  candidate?: string | null,
): string | null {
  if (!candidate) return current;
  if (!current || candidate > current) return candidate;
  return current;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AlertState, action: AlertAction): AlertState {
  switch (action.type) {

    case 'ADD_ALERT': {
      const a = action.alert;
      const key = stableKey(a);
      if (isKnown(key, state)) return state;
      if (a.dismissed) {
        const dismissedIds = new Set(state.dismissedIds);
        dismissedIds.add(key);
        return { ...state, dismissedIds };
      }

      // Mark seen immediately — prevents re-dispatch from any future poll
      const seenIds = new Set(state.seenIds);
      seenIds.add(key);
      const lastSeenCreatedAt = advanceLastAt(state.lastSeenCreatedAt, a.created_at);

      // Update in-place if same key already visible
      const vIdx = state.visible.findIndex(v => stableKey(v) === key);
      if (vIdx !== -1) {
        const next = [...state.visible];
        next[vIdx] = a;
        return { ...state, visible: next, seenIds, lastSeenCreatedAt };
      }
      // Update in-place if same ticker+alert_type visible (different id = new event → replace)
      const vKindIdx = state.visible.findIndex(
        v => v.ticker === a.ticker && v.alert_type === a.alert_type,
      );
      if (vKindIdx !== -1) {
        const next = [...state.visible];
        next[vKindIdx] = a;
        return { ...state, visible: next, seenIds, lastSeenCreatedAt };
      }
      // Update queue if same ticker+alert_type queued
      const qKindIdx = state.queue.findIndex(
        v => v.ticker === a.ticker && v.alert_type === a.alert_type,
      );
      if (qKindIdx !== -1) {
        const next = [...state.queue];
        next[qKindIdx] = a;
        return { ...state, queue: next, seenIds, lastSeenCreatedAt };
      }
      // Room in visible
      if (state.visible.length < 3) {
        return { ...state, visible: [...state.visible, a], seenIds, lastSeenCreatedAt };
      }
      // Bump lowest severity out if new is higher priority
      const sorted = [...state.visible].sort(
        (x, y) => severityRank(x.severity) - severityRank(y.severity),
      );
      const lowest = sorted[0];
      if (severityRank(a.severity) > severityRank(lowest.severity)) {
        const lowestKey = stableKey(lowest);
        return {
          ...state,
          seenIds,
          lastSeenCreatedAt,
          visible: [...state.visible.filter(v => stableKey(v) !== lowestKey), a],
          queue: [lowest, ...state.queue],
        };
      }
      return { ...state, queue: [...state.queue, a], seenIds, lastSeenCreatedAt };
    }

    case 'ACK': {
      const ackIds = new Set(state.ackIds);
      const seenIds = new Set(state.seenIds);
      ackIds.add(action.id);
      seenIds.add(action.id);
      const visible = state.visible.filter(v => stableKey(v) !== action.id);
      const queue = state.queue.filter(v => stableKey(v) !== action.id);
      return { ...state, ...promoteFromQueue(visible, queue), ackIds, seenIds };
    }

    case 'DISMISS': {
      const dismissedIds = new Set(state.dismissedIds);
      const seenIds = new Set(state.seenIds);
      dismissedIds.add(action.id);
      seenIds.add(action.id);
      const visible = state.visible.filter(v => stableKey(v) !== action.id);
      const queue = state.queue.filter(v => stableKey(v) !== action.id);
      return { ...state, ...promoteFromQueue(visible, queue), dismissedIds, seenIds };
    }

    case 'REMOVE_BUBBLE': {
      const seenIds = new Set(state.seenIds);
      seenIds.add(action.id);
      const visible = state.visible.filter(v => stableKey(v) !== action.id);
      return { ...state, ...promoteFromQueue(visible, state.queue), seenIds };
    }

    case 'LOAD_RECENT': {
      const now = Date.now();
      const candidates = action.alerts.filter(a => {
        const key = stableKey(a);
        if (isKnown(key, state)) return false;
        if (a.dismissed || a.acknowledged) return false;
        if (a.created_at) {
          const age = now - new Date(a.created_at).getTime();
          const maxAge = SURFACE_MAX_AGE_MS[a.severity as AlertSeverity] ?? 30 * 60_000;
          if (age > maxAge) return false;
        }
        return true;
      });
      // Sort: severity desc, then newest first
      candidates.sort((a, b) => {
        const sr = severityRank(b.severity) - severityRank(a.severity);
        if (sr !== 0) return sr;
        return (b.created_at ?? '').localeCompare(a.created_at ?? '');
      });
      // Mark all candidates seen
      const seenIds = new Set(state.seenIds);
      candidates.forEach(a => seenIds.add(stableKey(a)));
      const newest = candidates.find(c => c.created_at);
      const lastSeenCreatedAt = advanceLastAt(state.lastSeenCreatedAt, newest?.created_at);
      return {
        ...state,
        visible: candidates.slice(0, 3),
        queue: candidates.slice(3),
        seenIds,
        lastSeenCreatedAt,
      };
    }

    default:
      return state;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AlertProvider({ children }: { children: React.ReactNode }) {
  // Load localStorage synchronously so LOAD_RECENT / ADD_ALERT on first render
  // already have the full seen/ack/dismissed sets.
  const [state, dispatch] = useReducer(reducer, undefined, (): AlertState => ({
    visible: [],
    queue: [],
    seenIds: loadIdSet(LS_SEEN),
    ackIds: loadIdSet(LS_ACK),
    dismissedIds: loadIdSet(LS_DISMISSED),
    lastSeenCreatedAt: loadLastAt(),
  }));

  const sseRef   = useRef<EventSource | null>(null);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Keep a stable ref to state so callbacks don't stale-close over old Sets
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist sets whenever they change
  useEffect(() => { saveIdSet(LS_SEEN,      state.seenIds);      }, [state.seenIds]);
  useEffect(() => { saveIdSet(LS_ACK,       state.ackIds);       }, [state.ackIds]);
  useEffect(() => { saveIdSet(LS_DISMISSED, state.dismissedIds); }, [state.dismissedIds]);
  useEffect(() => {
    if (state.lastSeenCreatedAt) {
      try { localStorage.setItem(LS_LAST_AT, state.lastSeenCreatedAt); } catch {}
    }
  }, [state.lastSeenCreatedAt]);

  // Auto-dismiss timers
  const scheduleAutoDismiss = useCallback((alert: AlertItem) => {
    if (timersRef.current.has(alert.id)) return;
    const ms = AUTO_DISMISS_MS[alert.severity] ?? 10_000;
    if (ms === 0) return;
    const t = setTimeout(() => {
      dispatch({ type: 'REMOVE_BUBBLE', id: alert.id });
      timersRef.current.delete(alert.id);
    }, ms);
    timersRef.current.set(alert.id, t);
  }, []);

  useEffect(() => {
    state.visible.forEach(a => scheduleAutoDismiss(a));
  }, [state.visible, scheduleAutoDismiss]);

  // Gate before dispatching — checked again in reducer, but short-circuits
  // the dispatch call entirely for already-seen alerts (cheaper).
  const handleIncoming = useCallback((alert: AlertItem) => {
    const s = stateRef.current;
    const key = stableKey(alert);
    if (s.seenIds.has(key) || s.ackIds.has(key) || s.dismissedIds.has(key)) return;
    dispatch({ type: 'ADD_ALERT', alert });
  }, []);

  // Initial recent fetch
  useEffect(() => {
    fetch('/api/alerts/recent?limit=25')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const alerts: AlertItem[] = data?.alerts ?? (Array.isArray(data) ? data : []);
        if (alerts.length) dispatch({ type: 'LOAD_RECENT', alerts });
      })
      .catch(() => {});
  }, []);

  // SSE + polling fallback
  useEffect(() => {
    let usePolling = false;

    function startPolling() {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => {
        fetch('/api/alerts/recent?limit=25')
          .then(r => (r.ok ? r.json() : null))
          .then(data => {
            const alerts: AlertItem[] = data?.alerts ?? (Array.isArray(data) ? data : []);
            // Only process alerts strictly newer than last seen timestamp
            const lastAt = stateRef.current.lastSeenCreatedAt;
            const fresh = lastAt
              ? alerts.filter(a => a.created_at && a.created_at > lastAt)
              : alerts;
            fresh.forEach(a => handleIncoming(a));
          })
          .catch(() => {});
      }, 45_000);
    }

    function connectSSE() {
      const es = new EventSource('/api/alerts/stream');
      sseRef.current = es;

      const processData = (raw: string) => {
        if (!raw || !raw.trim()) return;
        try {
          const alert: AlertItem = JSON.parse(raw);
          if (alert?.id && alert?.ticker) handleIncoming(alert);
        } catch {}
      };

      es.onmessage = (e) => processData(e.data);
      es.addEventListener('alert', (e: MessageEvent) => processData(e.data));

      es.onerror = () => {
        es.close();
        sseRef.current = null;
        if (!usePolling) {
          usePolling = true;
          startPolling();
        }
      };
    }

    connectSSE();

    return () => {
      sseRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, [handleIncoming]);

  // Dev diagnostics
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      fetch('/api/alerts/diagnostics')
        .then(r => (r.ok ? r.json() : null))
        .then(data => { if (data) console.log('[AlertBus diagnostics]', data); })
        .catch(() => {});
    }
  }, []);

  const dismissAlert = useCallback(async (id: string) => {
    dispatch({ type: 'DISMISS', id });
    // Persist immediately without waiting for the useEffect
    saveIdSet(LS_DISMISSED, new Set([...stateRef.current.dismissedIds, id]));
    await fetch(`/api/alerts/${id}/dismiss`, { method: 'POST' }).catch(() => {});
  }, []);

  const ackAlert = useCallback(async (id: string) => {
    dispatch({ type: 'ACK', id });
    // Persist immediately
    saveIdSet(LS_ACK, new Set([...stateRef.current.ackIds, id]));
    await fetch(`/api/alerts/${id}/ack`, { method: 'POST' }).catch(() => {});
  }, []);

  const removeFromView = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_BUBBLE', id });
  }, []);

  return (
    <AlertContext.Provider value={{ visible: state.visible, dismissAlert, ackAlert, removeFromView }}>
      {children}
    </AlertContext.Provider>
  );
}
