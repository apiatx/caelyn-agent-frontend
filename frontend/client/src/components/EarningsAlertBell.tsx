import React, { useState, useMemo } from 'react';
import { Bell, TrendingUp, X } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useLocation } from 'wouter';
import { useEarningsLive } from '@/contexts/EarningsLiveContext';
import type { LiveEarningsEvent } from '@/types/live-earnings';

// ─── Style constants ──────────────────────────────────────────────────────────

const _f = "'JetBrains Mono','Fira Code',monospace";
const _s = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function stateHeadline(e: LiveEarningsEvent): string {
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

function stateColor(e: LiveEarningsEvent): string {
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

function classLabel(e: LiveEarningsEvent): string | null {
  if (!e.classification) return null;
  switch (e.classification) {
    case 'double_beat': return 'Double Beat';
    case 'double_miss': return 'Double Miss';
    case 'mixed':       return 'Mixed';
    case 'partial':     return 'Partial';
    case 'unclassified':return null;
    default:            return null;
  }
}

function epsStr(e: LiveEarningsEvent): string | null {
  const rs = (e.results_payload ?? e.results_summary) as { eps_actual?: number | null; eps_surprise_pct?: number | null } | null;
  if (!rs || rs.eps_actual == null) return null;
  const v = rs.eps_actual;
  const s = `EPS ${v >= 0 ? '+' : ''}$${v.toFixed(2)}`;
  if (rs.eps_surprise_pct != null && Math.abs(rs.eps_surprise_pct) < 600) {
    return `${s} (${rs.eps_surprise_pct >= 0 ? '+' : ''}${rs.eps_surprise_pct.toFixed(1)}%)`;
  }
  return s;
}

function moveStr(e: LiveEarningsEvent): string | null {
  const mr = e.initial_market_reaction;
  if (!mr || mr.move_pct == null) return null;
  return `${mr.move_pct >= 0 ? '+' : ''}${mr.move_pct.toFixed(1)}%`;
}

// ─── Alert row ────────────────────────────────────────────────────────────────

function AlertRow({
  event,
  onClick,
}: {
  event: LiveEarningsEvent;
  onClick: () => void;
}) {
  const isUnread = event.is_read !== true;
  const color = stateColor(event);
  const cl = classLabel(event);
  const eps = epsStr(event);
  const move = moveStr(event);
  const ts = relTime(event.updated_at);
  const moveCol = event.initial_market_reaction?.move_pct != null
    ? (event.initial_market_reaction.move_pct >= 0 ? '#22c55e' : '#ef4444')
    : color;

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
            <span style={{ fontSize: 12, fontWeight: 800, fontFamily: _f, color: '#fff' }}>{event.symbol}</span>
            <span style={{ fontSize: 9, fontWeight: 700, fontFamily: _f, color, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>{
              event.state === 'scheduled' ? 'SCHEDULED' :
              event.state === 'monitoring' ? 'MONITORING' :
              event.state === 'filing_detected' ? 'FILING' :
              event.state === 'results_partial' ? 'PARTIAL' :
              event.state === 'results_available' ? (cl ?? 'RESULTS') :
              event.state === 'results_updated' ? 'UPDATED' :
              'COMPLETE'
            }</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: _s, marginTop: 2, lineHeight: 1.4 }}>
            {stateHeadline(event)}
          </div>
          {(eps || move) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' as const }}>
              {eps && <span style={{ fontSize: 9, fontWeight: 700, fontFamily: _f, color: 'rgba(255,255,255,0.7)' }}>{eps}</span>}
              {move && <span style={{ fontSize: 10, fontWeight: 800, fontFamily: _f, color: moveCol }}>{move}</span>}
            </div>
          )}
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: _s, marginTop: 4 }}>{ts}</div>
        </div>
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EarningsAlertBell() {
  const { events, unreadCount, markRead, isError } = useEarningsLive();
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  const sorted = useMemo(
    () => [...events].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [events],
  );

  if (!events.length && !isError) return null;

  const count = Math.min(unreadCount, 99);
  const showBadge = unreadCount > 0;

  function handleRowClick(e: LiveEarningsEvent) {
    setOpen(false);
    markRead(e.event_id); // fire and forget — don't block navigation
    if (window.location.pathname.includes('watchlist')) {
      window.dispatchEvent(new CustomEvent('caelyn:earnings:open', {
        detail: { ticker: e.symbol, primaryTab: 'earnings', earningsTab: 'overview' },
      }));
    } else {
      setLocation(`/app/watchlist?openTicker=${e.symbol}&primaryTab=earnings&earningsTab=overview`);
    }
  }

  return (
    <>
      {/* Bell button — always visible when events exist */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 62,
          zIndex: 9990,
        }}
      >
        <button
          onClick={() => setOpen(true)}
          aria-label={`Earnings alerts${showBadge ? `, ${unreadCount} unread` : ''}`}
          className="
            w-9 h-9 rounded-full flex items-center justify-center relative
            bg-[#111318]/90 backdrop-blur-md border border-amber-500/30
            hover:border-amber-400/55 hover:bg-white/[0.07]
            transition-all duration-200 shadow-lg shadow-amber-900/20
            active:scale-95
          "
        >
          <TrendingUp className="w-4 h-4 text-amber-400/80" />
          {showBadge && (
            <span
              className="
                absolute -top-1 -right-1
                min-w-[16px] h-4 px-1 rounded-full
                bg-amber-500 text-black text-[9px] font-extrabold
                flex items-center justify-center leading-none
                shadow-sm shadow-amber-900/30
              "
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </div>

      {/* Earnings alert tray */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="p-0 border-l border-white/[0.08] bg-[#0d0f13] w-full sm:max-w-sm"
        >
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <TrendingUp style={{ width: 14, height: 14, color: '#f59e0b' }} />
            <span style={{ fontSize: 11, fontWeight: 800, fontFamily: _f, color: '#fff', letterSpacing: '0.06em' }}>
              EARNINGS ALERTS
            </span>
            {showBadge && (
              <span style={{
                fontSize: 9, fontWeight: 800, fontFamily: _f,
                color: '#000', background: '#f59e0b',
                padding: '1px 6px', borderRadius: 10,
              }}>
                {unreadCount} unread
              </span>
            )}
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}
              aria-label="Close"
            >
              <X style={{ width: 15, height: 15 }} />
            </button>
          </div>

          {/* Body */}
          <div style={{ overflowY: 'auto', height: 'calc(100vh - 54px)' }}>
            {isError && (
              <div style={{ padding: 20, textAlign: 'center' as const, fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: _s }}>
                Earnings alerts are temporarily unavailable.
              </div>
            )}
            {!isError && sorted.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center' as const, fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: _s }}>
                No recent earnings alerts.
              </div>
            )}
            {sorted.map(ev => (
              <AlertRow
                key={ev.event_id}
                event={ev}
                onClick={() => handleRowClick(ev)}
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
