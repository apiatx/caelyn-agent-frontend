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
  dismissed: Set<string>;
}

type AlertAction =
  | { type: 'ADD_ALERT'; alert: AlertItem }
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

// ─── Severity helpers ─────────────────────────────────────────────────────────

const AUTO_DISMISS_MS: Record<AlertSeverity, number> = {
  low: 8_000,
  medium: 10_000,
  high: 15_000,
  extreme: 0,
};

function severityRank(s: string): number {
  return ({ low: 0, medium: 1, high: 2, extreme: 3 } as Record<string, number>)[s] ?? 0;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AlertState, action: AlertAction): AlertState {
  switch (action.type) {
    case 'ADD_ALERT': {
      const a = action.alert;
      if (state.dismissed.has(a.id)) return state;
      if (a.dismissed) {
        return { ...state, dismissed: new Set([...state.dismissed, a.id]) };
      }
      // Update in-place if same id already visible
      const vIdx = state.visible.findIndex(v => v.id === a.id);
      if (vIdx !== -1) {
        const next = [...state.visible];
        next[vIdx] = a;
        return { ...state, visible: next };
      }
      // Update in-place if same ticker+alert_type visible
      const vKindIdx = state.visible.findIndex(
        v => v.ticker === a.ticker && v.alert_type === a.alert_type,
      );
      if (vKindIdx !== -1) {
        const next = [...state.visible];
        next[vKindIdx] = a;
        return { ...state, visible: next };
      }
      // Update queue if same ticker+alert_type queued
      const qKindIdx = state.queue.findIndex(
        v => v.ticker === a.ticker && v.alert_type === a.alert_type,
      );
      if (qKindIdx !== -1) {
        const next = [...state.queue];
        next[qKindIdx] = a;
        return { ...state, queue: next };
      }
      // Room in visible
      if (state.visible.length < 3) {
        return { ...state, visible: [...state.visible, a] };
      }
      // Bump lowest severity out if new is higher priority
      const sorted = [...state.visible].sort(
        (x, y) => severityRank(x.severity) - severityRank(y.severity),
      );
      const lowest = sorted[0];
      if (severityRank(a.severity) > severityRank(lowest.severity)) {
        return {
          ...state,
          visible: [...state.visible.filter(v => v.id !== lowest.id), a],
          queue: [lowest, ...state.queue],
        };
      }
      return { ...state, queue: [...state.queue, a] };
    }

    case 'DISMISS': {
      const dismissed = new Set([...state.dismissed, action.id]);
      const visible = state.visible.filter(v => v.id !== action.id);
      const queue = state.queue.filter(v => v.id !== action.id);
      const promote = queue.slice(0, 3 - visible.length);
      return { dismissed, visible: [...visible, ...promote], queue: queue.slice(promote.length) };
    }

    case 'REMOVE_BUBBLE': {
      const visible = state.visible.filter(v => v.id !== action.id);
      const promote = state.queue.slice(0, 3 - visible.length);
      return { ...state, visible: [...visible, ...promote], queue: state.queue.slice(promote.length) };
    }

    case 'LOAD_RECENT': {
      const candidates = action.alerts.filter(
        a => !a.dismissed && !state.dismissed.has(a.id) && severityRank(a.severity) >= 1,
      );
      return {
        ...state,
        visible: candidates.slice(0, 3),
        queue: candidates.slice(3),
      };
    }

    default:
      return state;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    visible: [],
    queue: [],
    dismissed: new Set<string>(),
  });

  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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

  const handleIncoming = useCallback((alert: AlertItem) => {
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
            alerts.forEach(a => handleIncoming(a));
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
    await fetch(`/api/alerts/${id}/dismiss`, { method: 'POST' }).catch(() => {});
  }, []);

  const ackAlert = useCallback(async (id: string) => {
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
