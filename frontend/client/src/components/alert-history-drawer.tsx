import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AlertDetailModal } from './alert-detail-modal';
import { AlertItem, useAlerts } from '@/contexts/AlertContext';
import { useEarningsLive } from '@/contexts/EarningsLiveContext';
import type { LiveEarningsEvent } from '@/types/live-earnings';
import {
  Bell, RefreshCw, Search, X, CheckCircle, EyeOff,
  AlertTriangle, Zap, Activity, Shield, ChevronDown, TrendingUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryItem {
  id: number;
  ticker: string;
  alert_type?: string;
  alert_lane?: string;
  short_label?: string;
  title?: string;
  severity: 'low' | 'medium' | 'high' | 'extreme';
  coverage_label?: string;
  score?: number;
  summary?: string;
  source_tags?: string[];
  created_at: string;
  acknowledged_at?: string | null;
  dismissed_at?: string | null;
  is_acknowledged: boolean;
  is_dismissed: boolean;
}

interface HistoryResponse {
  items: HistoryItem[];
  limit: number;
  offset: number;
  days: number;
  has_more: boolean;
}

type Filter = 'all' | 'unread' | 'earnings' | 'high' | 'options' | 'cross' | 'full' | 'hl' | 'dismissed';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function historyTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

function applyFilter(item: HistoryItem, filter: Filter, search: string): boolean {
  if (search && !item.ticker.toLowerCase().includes(search.toLowerCase())) return false;
  const tags = (item.source_tags ?? []).join(' ').toLowerCase();
  const lane = (item.alert_lane ?? '').toLowerCase();
  const cov  = (item.coverage_label ?? '').toLowerCase();
  switch (filter) {
    case 'unread':   return !item.is_acknowledged && !item.is_dismissed;
    case 'high':     return item.severity === 'high' || item.severity === 'extreme';
    case 'options':  return /option/.test(tags) || /option/.test(lane) || /option/.test(cov);
    case 'cross':    return /cross/.test(tags) || /cross/.test(lane) || /cross/.test(cov);
    case 'full':     return /full/.test(tags) || /full/.test(lane) || /full/.test(cov);
    case 'hl':       return /hyper|hyperliquid|\bhl\b/.test(tags) || /hyper|hyperliquid|\bhl\b/.test(lane);
    case 'dismissed': return item.is_dismissed;
    default:         return true;
  }
}

function toAlertItem(h: HistoryItem): AlertItem {
  return {
    id: String(h.id),
    ticker: h.ticker,
    short_label: h.short_label ?? h.alert_type ?? '',
    severity: h.severity,
    alert_type: h.alert_type,
    title: h.title,
    summary: h.summary,
    coverage_label: h.coverage_label,
    score: h.score,
    source_tags: h.source_tags,
    dismissed: h.is_dismissed,
    acknowledged: h.is_acknowledged,
    created_at: h.created_at,
  };
}

// ─── Severity config ──────────────────────────────────────────────────────────

const SEV_DOT: Record<string, string> = {
  extreme: 'bg-rose-400',
  high:    'bg-orange-400',
  medium:  'bg-amber-400',
  low:     'bg-white/25',
};

const SEV_ICON: Record<string, React.ReactNode> = {
  extreme: <AlertTriangle className="w-3 h-3 text-rose-400"   />,
  high:    <Zap           className="w-3 h-3 text-orange-400" />,
  medium:  <Activity      className="w-3 h-3 text-amber-400"  />,
  low:     <Shield        className="w-3 h-3 text-white/30"   />,
};

const SEV_BORDER: Record<string, string> = {
  extreme: 'border-rose-500/20',
  high:    'border-orange-500/15',
  medium:  'border-amber-500/10',
  low:     'border-white/[0.06]',
};

// ─── Filter tab config ────────────────────────────────────────────────────────

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',       label: 'All'          },
  { key: 'unread',    label: 'Unread'       },
  { key: 'earnings',  label: 'Earnings'     },
  { key: 'high',      label: 'High'         },
  { key: 'options',   label: 'Options'      },
  { key: 'cross',     label: 'Cross'        },
  { key: 'full',      label: 'Full'         },
  { key: 'hl',        label: 'Hyperliquid'  },
  { key: 'dismissed', label: 'Dismissed'    },
];

// ─── Alert row (market alerts) ────────────────────────────────────────────────

function HistoryRow({
  item,
  onClick,
  onDismiss,
}: {
  item: HistoryItem;
  onClick: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}) {
  const dot    = SEV_DOT[item.severity]    ?? SEV_DOT.low;
  const border = SEV_BORDER[item.severity] ?? SEV_BORDER.low;
  // Guard: some earnings-type alerts have {key,value} objects in source_tags — filter to strings only
  const tags   = (item.source_tags ?? []).filter((t): t is string => typeof t === 'string');

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-lg border px-3 py-2.5
        bg-white/[0.02] hover:bg-white/[0.05] transition-colors
        ${border}
        ${item.is_dismissed ? 'opacity-40' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${dot}`} />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-[12px] font-bold text-white/90 tracking-tight">{item.ticker}</span>
              {item.short_label && (
                <span className="text-[10.5px] text-white/45 truncate">{item.short_label}</span>
              )}
              {item.is_acknowledged && (
                <CheckCircle className="w-3 h-3 text-teal-400/60 shrink-0" />
              )}
              {item.is_dismissed && (
                <EyeOff className="w-3 h-3 text-white/20 shrink-0" />
              )}
            </div>
            <div className="text-[10px] text-white/25 mt-0.5">
              {historyTimestamp(item.created_at)}
              {item.coverage_label && (
                <span className="ml-2 text-white/20">{item.coverage_label}</span>
              )}
            </div>
          </div>
        </div>

        {/* Dismiss button — only if not already dismissed */}
        {!item.is_dismissed && (
          <button
            onClick={onDismiss}
            className="shrink-0 text-white/15 hover:text-white/50 transition-colors p-0.5 rounded"
            aria-label="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Source tag pills */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5 ml-3.5">
          {tags.slice(0, 4).map((t, i) => (
            <span
              key={i}
              className="text-[8.5px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/[0.08] bg-white/[0.03] text-white/30 font-medium"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Summary — one line only */}
      {item.summary && (
        <p className="text-[10.5px] text-white/35 mt-1.5 ml-3.5 line-clamp-1 leading-relaxed">
          {item.summary}
        </p>
      )}
    </button>
  );
}

// ─── Earnings helpers ─────────────────────────────────────────────────────────

const _fMono = "'JetBrains Mono','Fira Code',monospace";
const _fSans = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function earnRelTime(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function earnStateHeadline(e: LiveEarningsEvent): string {
  switch (e.state) {
    case 'scheduled':         return 'Earnings scheduled';
    case 'monitoring':        return 'Monitoring for earnings';
    case 'filing_detected':   return 'Earnings materials detected';
    case 'results_partial':   return 'Partial earnings results available';
    case 'results_available':
      switch (e.classification) {
        case 'double_beat': return 'Double beat reported';
        case 'double_miss': return 'Double miss reported';
        case 'mixed':       return 'Mixed earnings results';
        default:            return 'Earnings results reported';
      }
    case 'results_updated':   return 'Earnings results updated';
    case 'complete':          return 'Earnings event complete';
    default:                  return 'Earnings update';
  }
}

function earnStateColor(e: LiveEarningsEvent): string {
  switch (e.state) {
    case 'filing_detected':
    case 'results_partial':
    case 'monitoring':        return '#f59e0b';
    case 'results_available':
      if (e.classification === 'double_beat') return '#22c55e';
      if (e.classification === 'double_miss') return '#ef4444';
      return '#f59e0b';
    case 'results_updated':   return '#0ea5e9';
    case 'complete':          return 'rgba(255,255,255,0.35)';
    default:                  return 'rgba(255,255,255,0.35)';
  }
}

function earnClassLabel(e: LiveEarningsEvent): string | null {
  switch (e.classification) {
    case 'double_beat': return 'Double Beat';
    case 'double_miss': return 'Double Miss';
    case 'mixed':       return 'Mixed';
    case 'partial':     return 'Partial';
    default:            return null;
  }
}

function earnEpsStr(e: LiveEarningsEvent): string | null {
  const rs = (e.results_payload ?? e.results_summary) as { eps_actual?: number | null; eps_surprise_pct?: number | null } | null;
  if (!rs || rs.eps_actual == null) return null;
  const v = rs.eps_actual;
  const s = `EPS ${v >= 0 ? '+' : ''}$${v.toFixed(2)}`;
  if (rs.eps_surprise_pct != null && Math.abs(rs.eps_surprise_pct) < 600) {
    return `${s} (${rs.eps_surprise_pct >= 0 ? '+' : ''}${rs.eps_surprise_pct.toFixed(1)}%)`;
  }
  return s;
}

function earnMoveStr(e: LiveEarningsEvent): string | null {
  const mr = e.initial_market_reaction;
  if (!mr || mr.move_pct == null) return null;
  return `${mr.move_pct >= 0 ? '+' : ''}${mr.move_pct.toFixed(1)}%`;
}

// ─── Earnings alert row ───────────────────────────────────────────────────────

function EarningsRow({
  event,
  onClick,
}: {
  event: LiveEarningsEvent;
  onClick: () => void;
}) {
  const isUnread = event.is_read !== true;
  const color    = earnStateColor(event);
  const cl       = earnClassLabel(event);
  const eps      = earnEpsStr(event);
  const move     = earnMoveStr(event);
  const ts       = earnRelTime(event.updated_at);
  const moveCol  = event.initial_market_reaction?.move_pct != null
    ? (event.initial_market_reaction.move_pct >= 0 ? '#22c55e' : '#ef4444')
    : color;

  const stateBadge =
    event.state === 'scheduled'         ? 'SCHEDULED' :
    event.state === 'monitoring'        ? 'MONITORING' :
    event.state === 'filing_detected'   ? 'FILING' :
    event.state === 'results_partial'   ? 'PARTIAL' :
    event.state === 'results_available' ? (cl ?? 'RESULTS') :
    event.state === 'results_updated'   ? 'UPDATED' :
    'COMPLETE';

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left' as const,
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: isUnread ? 'rgba(255,255,255,0.025)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'block',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isUnread ? 'rgba(255,255,255,0.025)' : 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {isUnread && (
          <span style={{ marginTop: 5, flexShrink: 0, width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: 12, fontWeight: 800, fontFamily: _fMono, color: '#fff' }}>{event.symbol}</span>
            <span style={{ fontSize: 9, fontWeight: 700, fontFamily: _fMono, color, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
              {stateBadge}
            </span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: _fSans, marginTop: 2, lineHeight: 1.4 }}>
            {earnStateHeadline(event)}
          </div>
          {(eps || move) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' as const }}>
              {eps  && <span style={{ fontSize: 9,  fontWeight: 700, fontFamily: _fMono, color: 'rgba(255,255,255,0.7)' }}>{eps}</span>}
              {move && <span style={{ fontSize: 10, fontWeight: 800, fontFamily: _fMono, color: moveCol }}>{move}</span>}
            </div>
          )}
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: _fSans, marginTop: 4 }}>{ts}</div>
        </div>
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AlertHistoryButton() {
  const [, setLocation]         = useLocation();
  const [open, setOpen]         = useState(false);
  const [items, setItems]       = useState<HistoryItem[]>([]);
  const [loading, setLoading]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [hasMore, setHasMore]   = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [filter, setFilter]     = useState<Filter>('all');
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<AlertItem | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
  const fetchedOnce = useRef(false);

  // Earnings live events
  const { events: earnEvents, unreadCount: earnUnread, markRead: markEarnRead, isError: earnError } = useEarningsLive();
  const earnSorted = useMemo(
    () => [...earnEvents].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [earnEvents],
  );
  const earnFiltered = useMemo(
    () => search ? earnSorted.filter(e => e.symbol.toLowerCase().includes(search.toLowerCase())) : earnSorted,
    [earnSorted, search],
  );

  // Right-edge proximity — reveal bell only when cursor is near the right edge
  const [nearRightEdge, setNearRightEdge] = useState(false);
  const edgeHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (e.clientX >= window.innerWidth - 72) {
        if (edgeHideTimer.current) { clearTimeout(edgeHideTimer.current); edgeHideTimer.current = null; }
        setNearRightEdge(true);
      } else {
        if (!edgeHideTimer.current) {
          edgeHideTimer.current = setTimeout(() => { setNearRightEdge(false); edgeHideTimer.current = null; }, 900);
        }
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => { window.removeEventListener('mousemove', onMove); if (edgeHideTimer.current) clearTimeout(edgeHideTimer.current); };
  }, []);

  const { ackAlert, dismissAlert, removeFromView } = useAlerts();

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchHistory = useCallback(async (reset = false) => {
    const off = reset ? 0 : nextOffset;
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    try {
      const r = await fetch(`/api/alerts/history?days=7&limit=100&offset=${off}`);
      if (!r.ok) throw new Error(`Status ${r.status}`);
      const data: HistoryResponse = await r.json();
      if (reset) {
        setItems(data.items);
        setNextOffset(data.items.length);
      } else {
        setItems(prev => {
          const seen = new Set(prev.map(i => i.id));
          return [...prev, ...data.items.filter(i => !seen.has(i.id))];
        });
        setNextOffset(off + data.items.length);
      }
      setHasMore(data.has_more);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load history');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [nextOffset]);

  // Fetch when drawer first opens
  useEffect(() => {
    if (open && !fetchedOnce.current) {
      fetchedOnce.current = true;
      fetchHistory(true);
    }
  }, [open]);

  // ── Badge count ────────────────────────────────────────────────────────────

  const marketUnread = useMemo(
    () => items.filter(i => !i.is_acknowledged && !i.is_dismissed).length,
    [items],
  );
  const badgeCount = marketUnread + earnUnread;

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(
    () => items.filter(i => applyFilter(i, filter, search)),
    [items, filter, search],
  );

  // ── Interactions ───────────────────────────────────────────────────────────

  function handleRowClick(h: HistoryItem) {
    setSelectedHistoryId(h.id);
    setSelected(toAlertItem(h));
    setItems(prev =>
      prev.map(i =>
        i.id === h.id ? { ...i, is_acknowledged: true, acknowledged_at: new Date().toISOString() } : i,
      ),
    );
  }

  function handleEarningsRowClick(e: LiveEarningsEvent) {
    markEarnRead(e.event_id);
    setOpen(false);
    if (window.location.pathname.includes('watchlist')) {
      window.dispatchEvent(new CustomEvent('caelyn:earnings:open', {
        detail: { ticker: e.symbol, primaryTab: 'earnings', earningsTab: 'overview' },
      }));
    } else {
      setLocation(`/app/watchlist?openTicker=${e.symbol}&primaryTab=earnings&earningsTab=overview`);
    }
  }

  function handleModalClose() {
    if (selected) removeFromView(selected.id);
    setSelected(null);
    setSelectedHistoryId(null);
  }

  async function handleDismiss(h: HistoryItem, e: React.MouseEvent) {
    e.stopPropagation();
    setItems(prev =>
      prev.map(i =>
        i.id === h.id ? { ...i, is_dismissed: true, dismissed_at: new Date().toISOString() } : i,
      ),
    );
    await dismissAlert(String(h.id));
  }

  function handleRefresh() {
    fetchedOnce.current = true;
    setItems([]);
    setNextOffset(0);
    setHasMore(false);
    fetchHistory(true);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const bellVisible = nearRightEdge || open;
  const isEarningsTab = filter === 'earnings';

  return (
    <>
      {/* ── Bell trigger button — slides in from right edge on proximity ── */}
      <div
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9990,
          opacity: bellVisible ? 1 : 0,
          transform: bellVisible ? 'translateX(0)' : 'translateX(64px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          pointerEvents: bellVisible ? 'auto' : 'none',
        }}
      >
        <button
          onClick={() => setOpen(true)}
          className="
            w-9 h-9 rounded-full flex items-center justify-center relative
            bg-[#111318]/90 backdrop-blur-md border border-white/10
            hover:border-white/25 hover:bg-white/[0.08]
            transition-all duration-200 shadow-lg
            active:scale-95
          "
          aria-label="Alert history"
        >
          <Bell className="w-4 h-4 text-white/55" />
          {badgeCount > 0 && (
            <span className="
              absolute -top-1 -right-1 min-w-[16px] h-4
              flex items-center justify-center
              rounded-full bg-orange-500 text-[8.5px] font-bold text-white
              px-1 leading-none pointer-events-none
            ">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </button>
      </div>

      {/* ── History drawer ── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="
            w-full sm:max-w-[420px] p-0 flex flex-col
            bg-[#0d0e12] border-l border-white/[0.08]
            overflow-hidden
          "
        >
          {/* Header */}
          <div className="shrink-0 px-4 pt-5 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-3 pr-6">
              <div className="flex items-center gap-2">
                {isEarningsTab
                  ? <TrendingUp className="w-3.5 h-3.5 text-amber-400/70" />
                  : <Bell className="w-3.5 h-3.5 text-white/40" />
                }
                <span className="text-[11px] font-semibold text-white/70 uppercase tracking-widest">
                  {isEarningsTab ? 'Earnings Alerts' : 'Alert Radar'}
                </span>
                {badgeCount > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/25">
                    {badgeCount} unread
                  </span>
                )}
              </div>
              {!isEarningsTab && (
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="text-white/25 hover:text-white/60 transition-colors disabled:opacity-30"
                  aria-label="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-2.5">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isEarningsTab ? 'Filter by ticker…' : 'Filter by ticker…'}
                className="
                  w-full pl-7 pr-3 py-1.5 text-[11px] rounded-md
                  bg-white/[0.04] border border-white/[0.07]
                  text-white/70 placeholder:text-white/20
                  focus:outline-none focus:border-white/20
                  transition-colors
                "
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter tabs — horizontally scrollable */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`
                    shrink-0 text-[9.5px] font-medium uppercase tracking-wider
                    px-2.5 py-1 rounded-md border transition-colors
                    ${filter === f.key
                      ? f.key === 'earnings'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-white/[0.08] border-white/20 text-white/80'
                      : 'bg-transparent border-white/[0.06] text-white/30 hover:text-white/55 hover:border-white/15'
                    }
                  `}
                >
                  {f.label}
                  {f.key === 'earnings' && earnUnread > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[14px] h-3.5 px-0.5 rounded-full bg-amber-500 text-black text-[7px] font-extrabold leading-none">
                      {earnUnread > 99 ? '99+' : earnUnread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Body — scrollable alert list */}
          <div className={`flex-1 overflow-y-auto ${isEarningsTab ? '' : 'px-3 py-3 space-y-1.5'}`}>

            {/* ── Earnings tab ─────────────────────────────────────── */}
            {isEarningsTab && (
              <>
                {earnError && (
                  <div style={{ padding: 20, textAlign: 'center' as const, fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: _fSans }}>
                    Earnings alerts are temporarily unavailable.
                  </div>
                )}
                {!earnError && earnFiltered.length === 0 && (
                  <div style={{ padding: '48px 20px', textAlign: 'center' as const, fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: _fSans }}>
                    {earnEvents.length === 0 ? 'No recent earnings alerts.' : 'No earnings alerts match this filter.'}
                  </div>
                )}
                {earnFiltered.map(ev => (
                  <EarningsRow
                    key={ev.event_id}
                    event={ev}
                    onClick={() => handleEarningsRowClick(ev)}
                  />
                ))}
              </>
            )}

            {/* ── Market alerts tab ─────────────────────────────────── */}
            {!isEarningsTab && (
              <>
                {/* Loading */}
                {loading && (
                  <div className="flex items-center justify-center py-12 text-white/25 text-[11px]">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Loading history…
                  </div>
                )}

                {/* Error */}
                {!loading && error && (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <span className="text-[11px] text-rose-400/60">{error}</span>
                    <button
                      onClick={handleRefresh}
                      className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Empty */}
                {!loading && !error && filtered.length === 0 && (
                  <div className="flex flex-col items-center gap-1.5 py-12 text-center">
                    <Bell className="w-5 h-5 text-white/10 mb-1" />
                    <span className="text-[11px] text-white/25">
                      {items.length === 0
                        ? 'No alerts in the past 7 days.'
                        : 'No alerts match this filter.'}
                    </span>
                  </div>
                )}

                {/* Alert rows */}
                {!loading && filtered.map(item => (
                  <HistoryRow
                    key={item.id}
                    item={item}
                    onClick={() => handleRowClick(item)}
                    onDismiss={(e) => handleDismiss(item, e)}
                  />
                ))}

                {/* Load more */}
                {!loading && hasMore && filtered.length > 0 && (
                  <button
                    onClick={() => fetchHistory(false)}
                    disabled={loadingMore}
                    className="
                      w-full mt-2 py-2 flex items-center justify-center gap-1.5
                      text-[10px] text-white/30 hover:text-white/60
                      border border-white/[0.06] rounded-lg
                      hover:border-white/15 transition-colors disabled:opacity-40
                    "
                  >
                    {loadingMore
                      ? <><RefreshCw className="w-3 h-3 animate-spin" /> Loading…</>
                      : <><ChevronDown className="w-3 h-3" /> Load more</>
                    }
                  </button>
                )}

                {/* Bottom padding */}
                <div className="h-4" />
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail modal — re-uses existing component, does NOT touch popup queue */}
      <AlertDetailModal
        alert={selected}
        onClose={handleModalClose}
      />
    </>
  );
}
