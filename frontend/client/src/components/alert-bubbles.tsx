import React, { useState } from 'react';
import { AlertItem, useAlerts } from '@/contexts/AlertContext';
import { AlertDetailModal } from './alert-detail-modal';
import { AlertTriangle, Zap, Activity, X } from 'lucide-react';

// ─── Severity styling ─────────────────────────────────────────────────────────

const SEV: Record<string, { border: string; dot: string; icon: React.ReactNode }> = {
  extreme: {
    border: 'border-rose-500/60 shadow-rose-500/20 shadow-lg',
    dot: 'bg-rose-400',
    icon: <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />,
  },
  high: {
    border: 'border-orange-500/50 shadow-orange-500/15 shadow-md',
    dot: 'bg-orange-400',
    icon: <Zap className="w-2.5 h-2.5 text-orange-400" />,
  },
  medium: {
    border: 'border-amber-500/35',
    dot: 'bg-amber-400',
    icon: <Activity className="w-2.5 h-2.5 text-amber-400" />,
  },
  low: {
    border: 'border-white/15',
    dot: 'bg-white/30',
    icon: <Activity className="w-2.5 h-2.5 text-white/30" />,
  },
};

// ─── Relative time ────────────────────────────────────────────────────────────

export function relativeTime(iso?: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Single bubble ────────────────────────────────────────────────────────────

function AlertBubble({
  alert,
  onClick,
  onDismiss,
}: {
  alert: AlertItem;
  onClick: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}) {
  const cfg = SEV[alert.severity] ?? SEV.low;
  const ts = relativeTime(alert.created_at);

  return (
    <div
      className={`
        relative flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl
        bg-[#111318]/95 backdrop-blur-md border cursor-pointer select-none
        transition-all duration-200 hover:brightness-110 active:scale-[0.98]
        ${cfg.border}
      `}
      style={{ animation: 'alertSlideIn 0.25s ease-out' }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      aria-label={`Alert: ${alert.ticker} ${alert.short_label}`}
    >
      {/* Severity dot */}
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />

      {/* Content */}
      <span className="text-[11px] leading-none min-w-0">
        <span className="font-bold text-white/90 tracking-tight">{alert.ticker}</span>
        {alert.short_label && (
          <span className="text-white/45 ml-1.5">{alert.short_label}</span>
        )}
        {ts && (
          <span className="text-white/25 ml-1.5 font-normal">{ts}</span>
        )}
      </span>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="ml-1 text-white/20 hover:text-white/60 transition-colors shrink-0 rounded p-0.5 hover:bg-white/5"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

export function AlertBubbles() {
  const { visible, dismissAlert, removeFromView } = useAlerts();
  const [selected, setSelected] = useState<AlertItem | null>(null);

  if (visible.length === 0 && !selected) return null;

  return (
    <>
      <style>{`
        @keyframes alertSlideIn {
          from { opacity: 0; transform: translateX(12px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)  scale(1);    }
        }
      `}</style>

      {/* Stack — fixed top-right, below any top navbar */}
      <div
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: 280 }}
        aria-live="polite"
        aria-label="Activity alerts"
      >
        {visible.map(alert => (
          <div key={alert.id} className="pointer-events-auto">
            <AlertBubble
              alert={alert}
              onClick={() => setSelected(alert)}
              onDismiss={(e) => {
                e.stopPropagation();
                dismissAlert(alert.id);
              }}
            />
          </div>
        ))}
      </div>

      {/* Detail modal */}
      <AlertDetailModal
        alert={selected}
        onClose={() => {
          if (selected) removeFromView(selected.id);
          setSelected(null);
        }}
      />
    </>
  );
}
