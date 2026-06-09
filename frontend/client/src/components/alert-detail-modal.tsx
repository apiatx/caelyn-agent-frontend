import React, { useEffect, useRef, useState, memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { AlertItem, useAlerts } from '@/contexts/AlertContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  AlertTriangle,
  Zap,
  Shield,
  Activity,
  ExternalLink,
  X,
  TrendingUp,
  BookOpen,
  Tag,
  Plus,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertDetail extends AlertItem {
  chart?: {
    data?: { date: string; price?: number; value?: number }[];
    labels?: string[];
    values?: number[];
  };
  news?: {
    title?: string;
    headline?: string;
    source?: string;
    date?: string;
    summary?: string;
    url?: string;
  }[];
}

interface Props {
  alert: AlertItem | null;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, { border: string; badge: string; icon: React.ReactNode; label: string }> = {
  extreme: {
    border: 'border-rose-500/50',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    label: 'EXTREME',
  },
  high: {
    border: 'border-orange-500/40',
    badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    icon: <Zap className="w-3.5 h-3.5" />,
    label: 'HIGH',
  },
  medium: {
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    icon: <Activity className="w-3.5 h-3.5" />,
    label: 'MEDIUM',
  },
  low: {
    border: 'border-white/10',
    badge: 'bg-white/5 text-white/40 border-white/10',
    icon: <Shield className="w-3.5 h-3.5" />,
    label: 'LOW',
  },
};

const COVERAGE_COPY: Record<string, string> = {
  'Options-only signal':
    'This alert is based on options activity from the Options Flow/Home scan. Full VolX and Vol/MC tracking is only available for Watchlist/Portfolio tickers.',
};

function normaliseChartData(
  chart: AlertDetail['chart'],
): { date: string; value: number }[] | null {
  if (!chart) return null;
  if (Array.isArray(chart.data) && chart.data.length > 0) {
    return chart.data.map(d => ({
      date: d.date,
      value: d.value ?? d.price ?? 0,
    }));
  }
  if (Array.isArray(chart.labels) && Array.isArray(chart.values) && chart.labels.length > 0) {
    return chart.labels.map((d, i) => ({ date: d, value: chart.values![i] ?? 0 }));
  }
  return null;
}

// ─── TradingView mini chart (compact, modal-safe) ─────────────────────────────
const TVMiniChart = memo(function TVMiniChart({ ticker }: { ticker: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: ticker,
      width: '100%',
      height: 220,
      locale: 'en',
      dateRange: '1M',
      colorTheme: 'dark',
      trendLineColor: 'rgba(41, 98, 255, 1)',
      underLineColor: 'rgba(41, 98, 255, 0.15)',
      isTransparent: true,
      autosize: true,
      largeChartUrl: '',
      noTimeScale: false,
    });
    ref.current.appendChild(script);
    return () => { if (ref.current) ref.current.innerHTML = ''; };
  }, [ticker]);
  return (
    <div ref={ref} className="tradingview-widget-container w-full rounded-lg overflow-hidden" style={{ height: 220 }}>
      <div className="tradingview-widget-container__widget" style={{ height: 220, width: '100%' }} />
    </div>
  );
});

// ─── Component ────────────────────────────────────────────────────────────────

export function AlertDetailModal({ alert, onClose }: Props) {
  const { dismissAlert, ackAlert } = useAlerts();
  const [detail, setDetail] = useState<AlertDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [addWlStatus, setAddWlStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const sev = alert?.severity ?? 'low';
  const cfg = SEVERITY_CONFIG[sev] ?? SEVERITY_CONFIG.low;

  // Fetch detail + ack when opened
  useEffect(() => {
    if (!alert) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    setAddWlStatus('idle');

    // Ack
    ackAlert(alert.id);

    // Fetch detail
    fetch(`/api/alerts/${alert.id}/detail`)
      .then(r => {
        if (!r.ok) throw new Error(`Status ${r.status}`);
        return r.json();
      })
      .then((d: AlertDetail) => setDetail(d))
      .catch(e => setDetailError(e.message ?? 'Failed to load detail'))
      .finally(() => setDetailLoading(false));
  }, [alert?.id]);

  async function handleDismiss() {
    if (!alert) return;
    await dismissAlert(alert.id);
    onClose();
  }

  async function handleAddToWatchlist() {
    if (!alert || addWlStatus !== 'idle') return;
    setAddWlStatus('loading');
    try {
      const listRes = await fetch('/api/watchlist/list');
      if (!listRes.ok) throw new Error('No watchlist');
      const lists = await listRes.json();
      const wid = Array.isArray(lists) ? lists[0]?.id : lists?.watchlists?.[0]?.id;
      if (!wid) throw new Error('No watchlist found');
      const patchRes = await fetch(`/api/watchlist/${wid}/tickers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: [alert.ticker] }),
      });
      if (!patchRes.ok) throw new Error('Failed to add');
      setAddWlStatus('done');
    } catch {
      setAddWlStatus('error');
      setTimeout(() => setAddWlStatus('idle'), 3000);
    }
  }

  const src = detail ?? alert;
  const chartData = normaliseChartData(detail?.chart ?? null);
  const news = detail?.news ?? [];
  const reasons = src?.reasons ?? [];
  const sourceTags = src?.source_tags ?? [];
  const coverageLabel = src?.coverage_label ?? '';
  const coverageCopy = COVERAGE_COPY[coverageLabel];
  const showWlCta = src && !src.in_watchlist && !src.in_portfolio;

  return (
    <Dialog open={!!alert} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg w-[95vw] bg-[#0d0e12] border border-white/10 p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <VisuallyHidden.Root>
          <DialogTitle>Alert Detail</DialogTitle>
        </VisuallyHidden.Root>

        {/* Header */}
        <div className={`px-5 pt-4 pb-3 border-b ${cfg.border} bg-white/[0.02] shrink-0`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${cfg.badge}`}>
                {cfg.icon}
                {cfg.label}
              </span>
              <span className="text-white font-bold text-base tracking-tight truncate">
                {src?.ticker}
              </span>
              {src?.short_label && (
                <span className="text-white/50 text-sm truncate">{src.short_label}</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white/70 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {src?.title && src.title !== src?.short_label && (
            <div className="text-[11px] text-white/60 mt-1.5 leading-relaxed">{src.title}</div>
          )}

          {src?.score != null && (
            <div className="text-[10px] text-white/35 mt-1">
              Signal score: <span className="text-white/55 font-medium">{src.score.toFixed?.(1) ?? src.score}</span>
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* TradingView price chart */}
          {src?.ticker && (
            <div className="rounded-lg overflow-hidden border border-white/[0.06] bg-white/[0.01]">
              <TVMiniChart key={src.ticker} ticker={src.ticker} />
            </div>
          )}

          {/* Loading / error state */}
          {detailLoading && (
            <div className="text-[11px] text-white/30 text-center py-4 animate-pulse">
              Loading detail…
            </div>
          )}
          {detailError && !src && (
            <div className="text-[11px] text-rose-400/70 text-center py-4">
              Could not load detail. {detailError}
            </div>
          )}

          {/* Coverage label */}
          {coverageLabel && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-white/25">
                <Tag className="w-3 h-3" /> Coverage
              </div>
              <div className="text-[10.5px] text-white/55 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2">
                <span className="text-white/70 font-medium">{coverageLabel}</span>
                {coverageCopy && (
                  <p className="mt-1 text-white/35 leading-relaxed">{coverageCopy}</p>
                )}
              </div>
              {showWlCta && (
                <button
                  onClick={handleAddToWatchlist}
                  disabled={addWlStatus === 'loading' || addWlStatus === 'done'}
                  className="flex items-center gap-1.5 text-[10px] text-sky-400/70 hover:text-sky-400 transition-colors mt-1 disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" />
                  {addWlStatus === 'done'
                    ? 'Added to Watchlist'
                    : addWlStatus === 'error'
                    ? 'Failed — try again'
                    : addWlStatus === 'loading'
                    ? 'Adding…'
                    : 'Add to Watchlist for full tracking'}
                </button>
              )}
            </div>
          )}

          {/* Summary */}
          {src?.summary && (
            <div className="text-[11px] text-white/60 leading-relaxed">
              {src.summary}
            </div>
          )}

          {/* Reasons */}
          {reasons.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[9px] uppercase tracking-widest text-white/25 flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> Why this alert
              </div>
              <ul className="space-y-1">
                {reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] leading-snug">
                    <span className="text-white/20 shrink-0 mt-0.5">·</span>
                    <span>
                      {r.label && (
                        <span className="text-white/65 font-medium">{r.label}</span>
                      )}
                      {r.value && (
                        <span className="text-white/50">: {r.value}</span>
                      )}
                      {r.detail && !r.value && (
                        <span className="text-white/45"> — {r.detail}</span>
                      )}
                      {r.detail && r.value && (
                        <span className="text-white/35"> — {r.detail}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Source tags */}
          {sourceTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sourceTags.map((t, i) => (
                <span
                  key={i}
                  className="text-[8.5px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 bg-white/[0.04] text-white/40"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Chart */}
          <div className="space-y-1.5">
            <div className="text-[9px] uppercase tracking-widest text-white/25 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" /> Chart
            </div>
            {!detailLoading && chartData && chartData.length > 1 ? (
              <div className="h-[120px] w-full bg-white/[0.02] rounded-lg border border-white/[0.05] p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.2)' }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.2)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#111218',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.7)',
                      }}
                      itemStyle={{ color: 'rgba(255,255,255,0.7)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#60a5fa"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : detailLoading ? (
              <div className="text-[11px] text-white/25 py-2">Loading chart…</div>
            ) : (
              <div className="text-[11px] text-white/25 py-2">Chart unavailable for this alert.</div>
            )}
          </div>

          {/* News */}
          <div className="space-y-1.5">
            <div className="text-[9px] uppercase tracking-widest text-white/25 flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" /> Related News
            </div>
            {!detailLoading && news.length > 0 ? (
              <ul className="space-y-2">
                {news.slice(0, 5).map((n, i) => {
                  const title = n.title ?? n.headline ?? '';
                  return (
                    <li key={i} className="group">
                      {n.url ? (
                        <a
                          href={n.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-1.5 text-[11px] text-white/55 hover:text-white/80 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="leading-snug">{title}</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-white/50 leading-snug block">{title}</span>
                      )}
                      {n.source && (
                        <span className="text-[9px] text-white/25 ml-4">{n.source}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : detailLoading ? (
              <div className="text-[11px] text-white/25 py-1">Loading news…</div>
            ) : (
              <div className="text-[11px] text-white/25 py-1">No related news found yet.</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <button
            onClick={handleDismiss}
            className="text-[11px] text-white/35 hover:text-rose-400/70 transition-colors"
          >
            Dismiss alert
          </button>
          <button
            onClick={onClose}
            className="text-[11px] px-4 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white/80 transition-colors"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
