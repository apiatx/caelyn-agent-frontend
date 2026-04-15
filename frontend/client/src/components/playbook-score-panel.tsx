import { Sparkles, CheckCircle, XCircle, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { PlaybookScoreResult, WatchlistPlaybookResponse, PortfolioPlaybookResponse } from "@/types/playbook";
import { STRATEGY_FIT_LABEL } from "@/types/playbook";

/* ── Shared sub-component: per-ticker score row ─────────────────────── */
function ScoreRow({ result }: { result: PlaybookScoreResult }) {
  const [expanded, setExpanded] = useState(false);
  const { label, color } = STRATEGY_FIT_LABEL(result.final_score);

  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        padding: "8px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {result.hard_filter_pass ? (
          <CheckCircle size={12} style={{ color: "#10b981", flexShrink: 0 }} />
        ) : (
          <XCircle size={12} style={{ color: "#ef4444", flexShrink: 0 }} />
        )}
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#e5e7eb",
            fontFamily: "'JetBrains Mono', monospace",
            flex: 1,
            minWidth: 0,
          }}
        >
          {result.ticker}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {result.final_score.toFixed(1)}
          </div>
          <div
            style={{
              fontSize: 9,
              padding: "1px 6px",
              borderRadius: 4,
              background: `${color}20`,
              color,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
            }}
          >
            {label}
          </div>
          {expanded ? (
            <ChevronUp size={10} style={{ color: "#6b7280" }} />
          ) : (
            <ChevronDown size={10} style={{ color: "#6b7280" }} />
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 8, paddingLeft: 20 }}>
          {result.summary_label && (
            <div
              style={{
                fontSize: 9,
                color: "#9ca3af",
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 6,
              }}
            >
              {result.summary_label}
            </div>
          )}
          {result.matched_rules.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <div
                style={{
                  fontSize: 9,
                  color: "#10b981",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  marginBottom: 3,
                }}
              >
                Matched rules
              </div>
              {result.matched_rules.map((r) => (
                <div
                  key={r}
                  style={{
                    fontSize: 9,
                    color: "#6b7280",
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: "1px 0",
                  }}
                >
                  • {r}
                </div>
              ))}
            </div>
          )}
          {result.hard_filter_failures.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <div
                style={{
                  fontSize: 9,
                  color: "#ef4444",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  marginBottom: 3,
                }}
              >
                Hard filter failures
              </div>
              {result.hard_filter_failures.map((f) => (
                <div
                  key={f}
                  style={{
                    fontSize: 9,
                    color: "#6b7280",
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: "1px 0",
                  }}
                >
                  • {f}
                </div>
              ))}
            </div>
          )}
          {result.risks.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: "#f59e0b",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  marginBottom: 3,
                }}
              >
                Risks
              </div>
              {result.risks.map((r) => (
                <div
                  key={r}
                  style={{
                    fontSize: 9,
                    color: "#6b7280",
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: "1px 0",
                  }}
                >
                  • {r}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Watchlist score panel ───────────────────────────────────────────── */
interface WatchlistScorePanelProps {
  data: WatchlistPlaybookResponse;
  playbookName: string;
  playbookColor?: string;
  loading?: boolean;
  onRescore?: () => void;
}

export function WatchlistScorePanel({
  data,
  playbookName,
  playbookColor,
  loading,
  onRescore,
}: WatchlistScorePanelProps) {
  const sorted = [...data.results].sort((a, b) => b.final_score - a.final_score);
  const avgScore = sorted.length
    ? sorted.reduce((s, r) => s + r.final_score, 0) / sorted.length
    : 0;
  const { label: avgLabel, color: avgColor } = STRATEGY_FIT_LABEL(avgScore);

  return (
    <div
      style={{
        background: "rgba(10,11,18,0.9)",
        border: `1px solid ${playbookColor ? playbookColor + "30" : "rgba(99,102,241,0.2)"}`,
        borderRadius: 10,
        overflow: "hidden",
        marginTop: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          background: playbookColor
            ? `${playbookColor}10`
            : "rgba(99,102,241,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Sparkles size={12} style={{ color: playbookColor || "#6366f1", flexShrink: 0 }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#e5e7eb",
            fontFamily: "'JetBrains Mono', monospace",
            flex: 1,
          }}
        >
          {playbookName} Alignment
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: avgColor,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {avgScore.toFixed(1)} avg
          </div>
          <div
            style={{
              fontSize: 9,
              padding: "1px 6px",
              borderRadius: 4,
              background: `${avgColor}20`,
              color: avgColor,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
            }}
          >
            {avgLabel}
          </div>
          {onRescore && (
            <button
              onClick={onRescore}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                padding: "2px 6px",
                borderRadius: 4,
                fontSize: 9,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                background: "rgba(255,255,255,0.04)",
                color: "#6b7280",
                border: "1px solid rgba(255,255,255,0.07)",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
              }}
            >
              <RefreshCw size={8} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
              Rescore
            </button>
          )}
        </div>
      </div>
      {loading && (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            fontSize: 10,
            color: "#6b7280",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Scoring {data.count || "…"} tickers…
        </div>
      )}
      {!loading &&
        sorted.map((r) => <ScoreRow key={r.ticker} result={r} />)}
    </div>
  );
}

/* ── Portfolio score panel ───────────────────────────────────────────── */
interface PortfolioScorePanelProps {
  data: PortfolioPlaybookResponse;
  playbookName: string;
  playbookColor?: string;
  loading?: boolean;
  onRescore?: () => void;
}

export function PortfolioScorePanel({
  data,
  playbookName,
  playbookColor,
  loading,
  onRescore,
}: PortfolioScorePanelProps) {
  const sorted = [...(data.holdings || [])].sort(
    (a, b) => b.final_score - a.final_score
  );
  const { label: aggLabel, color: aggColor } = STRATEGY_FIT_LABEL(
    data.aggregate_score
  );

  return (
    <div
      style={{
        background: "rgba(10,11,18,0.9)",
        border: `1px solid ${playbookColor ? playbookColor + "30" : "rgba(99,102,241,0.2)"}`,
        borderRadius: 10,
        overflow: "hidden",
        marginTop: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          background: playbookColor
            ? `${playbookColor}10`
            : "rgba(99,102,241,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Sparkles size={12} style={{ color: playbookColor || "#6366f1", flexShrink: 0 }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#e5e7eb",
            fontFamily: "'JetBrains Mono', monospace",
            flex: 1,
          }}
        >
          {playbookName} Portfolio Fit
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: aggColor,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {data.aggregate_score.toFixed(1)}
          </div>
          <div
            style={{
              fontSize: 9,
              padding: "1px 6px",
              borderRadius: 4,
              background: `${aggColor}20`,
              color: aggColor,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
            }}
          >
            {aggLabel}
          </div>
          {onRescore && (
            <button
              onClick={onRescore}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                padding: "2px 6px",
                borderRadius: 4,
                fontSize: 9,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                background: "rgba(255,255,255,0.04)",
                color: "#6b7280",
                border: "1px solid rgba(255,255,255,0.07)",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
              }}
            >
              <RefreshCw size={8} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
              Rescore
            </button>
          )}
        </div>
      </div>
      {loading && (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            fontSize: 10,
            color: "#6b7280",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Scoring holdings…
        </div>
      )}
      {!loading &&
        sorted.map((r) => <ScoreRow key={r.ticker} result={r} />)}
    </div>
  );
}
