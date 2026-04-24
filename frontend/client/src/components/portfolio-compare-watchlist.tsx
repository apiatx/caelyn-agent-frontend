import { useState, useEffect, useCallback } from "react";
import {
  X, GitCompare, RefreshCw, AlertTriangle, ChevronDown,
  Loader2, CheckCircle2, Clock, Zap, ArrowUpDown,
} from "lucide-react";

// ─── Theme ───────────────────────────────────────────────────────────────────
const C = {
  bg:     "#08090c",
  surface:"#0d1117",
  card:   "#111827",
  border: "#1e2535",
  text:   "#c9d1d9",
  dim:    "#4a5568",
  bright: "#e2e8f0",
  blue:   "#38bdf8",
  green:  "#22c55e",
  red:    "#ef4444",
  orange: "#f97316",
  gold:   "#f59e0b",
  purple: "#a78bfa",
};
const font = "'JetBrains Mono','Fira Code',monospace";

// ─── API helpers ─────────────────────────────────────────────────────────────
const API_KEY = "hippo_ak_7f3x9k2m4p8q1w5t";
function apiHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  };
  const token =
    localStorage.getItem("caelyn_token") ||
    sessionStorage.getItem("caelyn_token");
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface WatchlistOption {
  id: string;
  name: string;
  ticker_count: number;
  updated_at?: string;
}

interface TickerRank {
  ticker: string;
  total_score: number;
  verdict?: string;
  thesis?: string;
  key_risk?: string;
  key_catalyst?: string;
}

interface ReplacementRec {
  current_holding: string;
  suggested_replacement: string;
  confidence: string;
  score_delta?: number | string | null;
  why?: string;
  timing?: string;
}

interface CompareReport {
  ok?: boolean;
  exists?: boolean;
  report_id?: string;
  watchlist_id?: string;
  watchlist_name?: string;
  generated_at?: string;
  stale?: boolean;
  stale_reasons?: string[];
  cache_status?: string;
  summary?: {
    executive_verdict?: string;
    portfolio_ticker_count?: number;
    watchlist_ticker_count?: number;
    partial_failure?: boolean;
    partial_failure_message?: string;
  };
  rankings?: {
    portfolio?: TickerRank[];
    watchlist?: TickerRank[];
  };
  replacement_recommendations?: ReplacementRec[];
  action_buckets?: {
    keep?: string[];
    add?: string[];
    trim?: string[];
    avoid?: string[];
  };
  report_markdown?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", timeZoneName: "short",
    });
  } catch { return iso; }
}

function confColor(conf: string): string {
  const u = conf?.toUpperCase();
  if (u === "HIGH")   return C.green;
  if (u === "MEDIUM") return C.gold;
  if (u === "LOW")    return C.red;
  return C.dim;
}

function verdictColor(v?: string): string {
  if (!v) return C.dim;
  const u = v.toUpperCase();
  if (u.includes("BUY") || u.includes("STRONG") || u.includes("HOLD_UP")) return C.green;
  if (u.includes("SELL") || u.includes("AVOID") || u.includes("REPLACE"))  return C.red;
  if (u.includes("TRIM") || u.includes("CAUTION") || u.includes("WATCH"))  return C.orange;
  return C.text;
}

// ─── Simple Markdown Renderer ─────────────────────────────────────────────────
function MdRenderer({ markdown }: { markdown: string }) {
  if (!markdown) return null;
  const lines = markdown.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  function inlineRender(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i} style={{ color: C.bright }}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("`") && part.endsWith("`"))
        return <code key={i} style={{ color: C.blue, fontFamily: font, fontSize: 10, background: "#0a1628", padding: "0 4px", borderRadius: 3 }}>{part.slice(1, -1)}</code>;
      return part;
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      elements.push(
        <div key={key++} style={{ color: C.blue, fontSize: 11, fontWeight: 700, fontFamily: font, letterSpacing: "0.06em", textTransform: "uppercase", margin: "16px 0 6px", borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>
          {line.slice(4)}
        </div>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <div key={key++} style={{ color: C.bright, fontSize: 13, fontWeight: 700, fontFamily: font, margin: "20px 0 8px", letterSpacing: "0.03em" }}>
          {line.slice(3)}
        </div>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <div key={key++} style={{ color: C.blue, fontSize: 15, fontWeight: 700, fontFamily: font, margin: "24px 0 8px", borderBottom: `1px solid ${C.blue}40`, paddingBottom: 6 }}>
          {line.slice(2)}
        </div>
      );
    } else if (line.startsWith("---")) {
      elements.push(<hr key={key++} style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "12px 0" }} />);
    } else if (line.match(/^\s*[-*•]\s/)) {
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 8, marginBottom: 3, paddingLeft: 8 }}>
          <span style={{ color: C.blue, flexShrink: 0, marginTop: 1 }}>›</span>
          <span style={{ color: C.text, fontSize: 12, fontFamily: font, lineHeight: 1.6 }}>{inlineRender(line.replace(/^\s*[-*•]\s/, ""))}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: 6 }} />);
    } else {
      elements.push(
        <p key={key++} style={{ color: C.text, fontSize: 12, fontFamily: font, lineHeight: 1.7, marginBottom: 4 }}>
          {inlineRender(line)}
        </p>
      );
    }
  }
  return <div style={{ padding: "0 2px" }}>{elements}</div>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, fontFamily: font, letterSpacing: "0.1em", textTransform: "uppercase", color: C.dim, marginBottom: 8 }}>
      {children}
    </div>
  );
}

function CardBox({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px", ...style }}>
      {children}
    </div>
  );
}

function FreshBadge({ stale }: { stale?: boolean }) {
  if (stale) {
    return (
      <span style={{ fontSize: 9, fontFamily: font, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.orange, background: `${C.orange}18`, border: `1px solid ${C.orange}35`, borderRadius: 999, padding: "2px 8px" }}>
        STALE
      </span>
    );
  }
  return (
    <span style={{ fontSize: 9, fontFamily: font, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.green, background: `${C.green}18`, border: `1px solid ${C.green}35`, borderRadius: 999, padding: "2px 8px" }}>
      FRESH
    </span>
  );
}

function ConfBadge({ conf }: { conf: string }) {
  const color = confColor(conf);
  return (
    <span style={{ fontSize: 9, fontFamily: font, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color, background: `${color}18`, border: `1px solid ${color}35`, borderRadius: 999, padding: "2px 8px" }}>
      {conf}
    </span>
  );
}

function ActionBucket({ label, tickers, color }: { label: string; tickers?: string[]; color: string }) {
  if (!tickers || tickers.length === 0) return null;
  return (
    <div style={{ flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 9, fontFamily: font, letterSpacing: "0.08em", textTransform: "uppercase", color, marginBottom: 8, fontWeight: 700 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {tickers.map(t => (
          <span key={t} style={{ fontSize: 10, fontFamily: font, color: C.bright, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 4, padding: "2px 7px", fontWeight: 700 }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function TickerRankRow({ rank, item }: { rank: number; item: TickerRank }) {
  const vc = verdictColor(item.verdict);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", borderBottom: `1px solid ${C.border}`, background: rank % 2 === 0 ? `${C.border}30` : "transparent" }}>
      <span style={{ fontSize: 10, fontFamily: font, color: C.dim, width: 20, textAlign: "right", flexShrink: 0, paddingTop: 1 }}>#{rank}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: item.thesis ? 3 : 0 }}>
          <span style={{ fontSize: 12, fontFamily: font, fontWeight: 700, color: C.bright }}>{item.ticker}</span>
          {item.verdict && (
            <span style={{ fontSize: 9, fontFamily: font, color: vc, background: `${vc}18`, border: `1px solid ${vc}30`, borderRadius: 999, padding: "1px 6px", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {item.verdict}
            </span>
          )}
          <span style={{ fontSize: 10, fontFamily: font, color: C.blue, marginLeft: "auto" }}>{typeof item.total_score === "number" ? item.total_score.toFixed(1) : item.total_score}</span>
        </div>
        {item.thesis && <div style={{ fontSize: 11, fontFamily: font, color: C.text, lineHeight: 1.5 }}>{item.thesis}</div>}
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          {item.key_catalyst && <span style={{ fontSize: 9, fontFamily: font, color: C.green, background: `${C.green}10`, border: `1px solid ${C.green}25`, borderRadius: 3, padding: "1px 5px" }}>↑ {item.key_catalyst}</span>}
          {item.key_risk    && <span style={{ fontSize: 9, fontFamily: font, color: C.red,   background: `${C.red}10`,   border: `1px solid ${C.red}25`,   borderRadius: 3, padding: "1px 5px" }}>⚠ {item.key_risk}</span>}
        </div>
      </div>
    </div>
  );
}

function ReplacementTable({ recs }: { recs: ReplacementRec[] }) {
  const cols = [
    { label: "Holding",     key: "current_holding",      flex: 80 },
    { label: "Replace With", key: "suggested_replacement", flex: 80 },
    { label: "Conf.",        key: "confidence",             flex: 56 },
    { label: "Score Δ",     key: "score_delta",             flex: 56 },
    { label: "Why",          key: "why",                   flex: 200 },
    { label: "Timing",       key: "timing",                 flex: 100 },
  ];
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 600 }}>
        <div style={{ display: "flex", background: C.surface, borderRadius: "6px 6px 0 0", borderBottom: `1px solid ${C.border}`, padding: "6px 0" }}>
          {cols.map(c => (
            <div key={c.key} style={{ flex: c.flex, minWidth: 0, padding: "0 8px", fontSize: 9, fontFamily: font, color: C.dim, letterSpacing: "0.07em", textTransform: "uppercase" }}>
              {c.label}
            </div>
          ))}
        </div>
        {recs.map((r, i) => {
          const cc = confColor(r.confidence);
          const delta = r.score_delta;
          const deltaNum = typeof delta === "number" ? delta : parseFloat(String(delta));
          const deltaColor = isNaN(deltaNum) ? C.dim : deltaNum > 0 ? C.green : deltaNum < 0 ? C.red : C.dim;
          const deltaStr  = isNaN(deltaNum) ? (delta ? String(delta) : "—") : (deltaNum > 0 ? `+${deltaNum.toFixed(1)}` : deltaNum.toFixed(1));
          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", borderBottom: `1px solid ${C.border}40`, background: i % 2 === 0 ? `${C.border}20` : "transparent", padding: "8px 0" }}>
              <div style={{ flex: 80, minWidth: 0, padding: "0 8px" }}>
                <span style={{ fontSize: 11, fontFamily: font, fontWeight: 700, color: C.bright }}>{r.current_holding || "—"}</span>
              </div>
              <div style={{ flex: 80, minWidth: 0, padding: "0 8px" }}>
                <span style={{ fontSize: 11, fontFamily: font, fontWeight: 700, color: C.blue }}>{r.suggested_replacement || "—"}</span>
              </div>
              <div style={{ flex: 56, minWidth: 0, padding: "0 8px" }}>
                {r.confidence ? <ConfBadge conf={r.confidence} /> : <span style={{ color: C.dim, fontSize: 10, fontFamily: font }}>—</span>}
              </div>
              <div style={{ flex: 56, minWidth: 0, padding: "0 8px" }}>
                <span style={{ fontSize: 11, fontFamily: font, fontWeight: 700, color: deltaColor }}>{deltaStr}</span>
              </div>
              <div style={{ flex: 200, minWidth: 0, padding: "0 8px" }}>
                <span style={{ fontSize: 11, fontFamily: font, color: C.text, lineHeight: 1.5 }}>{r.why || "—"}</span>
              </div>
              <div style={{ flex: 100, minWidth: 0, padding: "0 8px" }}>
                <span style={{ fontSize: 11, fontFamily: font, color: C.text }}>{r.timing || "—"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Modal Component ─────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PortfolioCompareWatchlistModal({ open, onClose }: Props) {
  const [watchlists,   setWatchlists]   = useState<WatchlistOption[]>([]);
  const [loadingWL,    setLoadingWL]    = useState(false);
  const [wlError,      setWlError]      = useState<string | null>(null);
  const [selectedId,   setSelectedId]   = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [report,       setReport]       = useState<CompareReport | null>(null);
  const [loadingReport,setLoadingReport]= useState(false);
  const [reportError,  setReportError]  = useState<string | null>(null);

  const [running,      setRunning]      = useState(false);
  const [runError,     setRunError]     = useState<string | null>(null);

  // ── Load watchlist options when modal opens ─────────────────────────────
  useEffect(() => {
    if (!open) return;
    setLoadingWL(true);
    setWlError(null);
    fetch("/api/portfolio/compare-watchlist/options", { headers: apiHeaders() })
      .then(r => r.json())
      .then((data) => {
        const list: WatchlistOption[] = data?.watchlists || [];
        setWatchlists(list);
        const def = data?.default_watchlist_id || (list[0]?.id ?? "");
        setSelectedId(def);
      })
      .catch(() => setWlError("Failed to load watchlists. Please try again."))
      .finally(() => setLoadingWL(false));
  }, [open]);

  // ── Fetch latest saved report when a watchlist is chosen ─────────────────
  const fetchLatest = useCallback((wid: string) => {
    if (!wid) return;
    setLoadingReport(true);
    setReportError(null);
    setReport(null);
    fetch(`/api/portfolio/compare-watchlist/latest?watchlist_id=${encodeURIComponent(wid)}`, {
      headers: apiHeaders(),
    })
      .then(r => r.json())
      .then((data) => {
        if (data?.ok === false && !data?.exists) {
          setReport({ exists: false });
        } else {
          setReport(data);
        }
      })
      .catch(() => setReportError("Failed to fetch saved report."))
      .finally(() => setLoadingReport(false));
  }, []);

  useEffect(() => {
    if (selectedId) fetchLatest(selectedId);
  }, [selectedId, fetchLatest]);

  // ── Run a new comparison ──────────────────────────────────────────────────
  const runComparison = async (forceRefresh: boolean) => {
    if (!selectedId || running) return;
    setRunning(true);
    setRunError(null);
    try {
      const r = await fetch("/api/portfolio/compare-watchlist/run", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ watchlist_id: selectedId, force_refresh: forceRefresh }),
      });
      const data = await r.json();
      if (!r.ok || data?.ok === false) {
        setRunError(data?.error || data?.detail || "Comparison failed. Please try again.");
      } else {
        setReport(data);
      }
    } catch {
      setRunError("Network error. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  if (!open) return null;

  const selectedWL = watchlists.find(w => w.id === selectedId);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 12, width: "100%", maxWidth: 980,
          maxHeight: "90vh", display: "flex", flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          fontFamily: font,
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: `${C.blue}20`, border: `1px solid ${C.blue}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GitCompare size={14} color={C.blue} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.bright, letterSpacing: "0.03em" }}>Portfolio vs Watchlist</div>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.07em", textTransform: "uppercase" }}>Intelligence Comparison</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 6px", cursor: "pointer", color: C.dim, display: "flex", alignItems: "center" }}>
            <X size={14} />
          </button>
        </div>

        {/* ── Body (scrollable) ────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* ── Watchlist Selector ─────────────────────────────────────────── */}
          <CardBox style={{ marginBottom: 16 }}>
            <SectionLabel>Select Watchlist to Compare</SectionLabel>

            {loadingWL && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.dim, fontSize: 11 }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading watchlists…
              </div>
            )}

            {wlError && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.orange, fontSize: 11 }}>
                <AlertTriangle size={14} /> {wlError}
              </div>
            )}

            {!loadingWL && !wlError && watchlists.length === 0 && (
              <div style={{ color: C.dim, fontSize: 12, lineHeight: 1.6 }}>
                No saved watchlists found. Save a watchlist first, then compare it against your portfolio.
              </div>
            )}

            {!loadingWL && watchlists.length > 0 && (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
                    padding: "8px 12px", cursor: "pointer", color: C.bright, fontSize: 12,
                    fontFamily: font,
                  }}
                >
                  <span>
                    {selectedWL ? `${selectedWL.name} — ${selectedWL.ticker_count} tickers` : "Select a watchlist…"}
                  </span>
                  <ChevronDown size={14} color={C.dim} style={{ transform: dropdownOpen ? "rotate(180deg)" : undefined, transition: "0.15s" }} />
                </button>
                {dropdownOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, zIndex: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", overflow: "hidden" }}>
                    {watchlists.map(wl => (
                      <button
                        key={wl.id}
                        onClick={() => { setSelectedId(wl.id); setDropdownOpen(false); }}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: wl.id === selectedId ? `${C.blue}15` : "transparent",
                          border: "none", borderBottom: `1px solid ${C.border}40`,
                          padding: "9px 12px", cursor: "pointer", textAlign: "left",
                          color: wl.id === selectedId ? C.blue : C.text, fontSize: 12, fontFamily: font,
                        }}
                      >
                        <span style={{ fontWeight: wl.id === selectedId ? 700 : 400 }}>{wl.name}</span>
                        <span style={{ fontSize: 10, color: C.dim }}>{wl.ticker_count} tickers</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardBox>

          {/* ── Report Area ───────────────────────────────────────────────── */}
          {selectedId && (
            <>
              {/* Loading latest report */}
              {loadingReport && (
                <CardBox style={{ marginBottom: 16, textAlign: "center" }}>
                  <Loader2 size={16} color={C.blue} style={{ animation: "spin 1s linear infinite", marginBottom: 8 }} />
                  <div style={{ color: C.dim, fontSize: 12 }}>Fetching saved report…</div>
                </CardBox>
              )}

              {/* Error fetching report */}
              {reportError && !loadingReport && (
                <CardBox style={{ marginBottom: 16 }}>
                  <div style={{ color: C.orange, fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertTriangle size={14} /> {reportError}
                  </div>
                </CardBox>
              )}

              {/* Running state */}
              {running && (
                <CardBox style={{ marginBottom: 16, background: `${C.blue}08`, border: `1px solid ${C.blue}30` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Loader2 size={16} color={C.blue} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>Running Comparison…</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.7 }}>
                    Analyzing portfolio, watchlist, fundamentals, technicals, filings, news, catalysts, and regime fit…
                    <br />This may take up to 90 seconds. Please wait.
                  </div>
                </CardBox>
              )}

              {/* Run error */}
              {runError && !running && (
                <CardBox style={{ marginBottom: 16, border: `1px solid ${C.red}40` }}>
                  <div style={{ color: C.red, fontSize: 12, display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <AlertTriangle size={14} /> Comparison failed
                  </div>
                  <div style={{ fontSize: 11, color: C.dim }}>{runError}</div>
                </CardBox>
              )}

              {/* No saved report */}
              {!loadingReport && !running && report?.exists === false && (
                <CardBox style={{ marginBottom: 16, textAlign: "center", padding: "24px 20px" }}>
                  <div style={{ color: C.dim, fontSize: 12, marginBottom: 16 }}>
                    No saved comparison yet for this portfolio / watchlist combination.
                  </div>
                  <button
                    onClick={() => runComparison(false)}
                    disabled={running}
                    style={{
                      background: `linear-gradient(135deg, ${C.blue}20, ${C.purple}20)`,
                      border: `1px solid ${C.blue}50`,
                      borderRadius: 6, padding: "9px 20px", cursor: "pointer",
                      color: C.blue, fontSize: 12, fontWeight: 700, fontFamily: font,
                      display: "inline-flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <Zap size={13} /> Run Comparison
                  </button>
                </CardBox>
              )}

              {/* ── Report exists ────────────────────────────────────────── */}
              {!loadingReport && report?.exists !== false && report?.generated_at && (
                <>
                  {/* ── Report Header ─────────────────────────────────────── */}
                  <CardBox style={{ marginBottom: 16, background: `${C.blue}06`, border: `1px solid ${C.blue}25` }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        {report.summary?.executive_verdict && (
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.bright, lineHeight: 1.5, marginBottom: 10 }}>
                            {report.summary.executive_verdict}
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <Clock size={11} color={C.dim} />
                          <span style={{ fontSize: 11, color: C.dim }}>Generated {fmtDate(report.generated_at)}</span>
                          <FreshBadge stale={report.stale} />
                        </div>
                        {report.stale && report.stale_reasons && report.stale_reasons.length > 0 && (
                          <div style={{ marginTop: 6, fontSize: 11, color: C.orange, display: "flex", alignItems: "flex-start", gap: 6 }}>
                            <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>This report may be stale: {report.stale_reasons.join("; ")}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {report.summary?.portfolio_ticker_count != null && (
                            <span style={{ fontSize: 10, color: C.dim, fontFamily: font }}>Portfolio: <strong style={{ color: C.bright }}>{report.summary.portfolio_ticker_count}</strong> tickers</span>
                          )}
                          {report.summary?.watchlist_ticker_count != null && (
                            <span style={{ fontSize: 10, color: C.dim, fontFamily: font }}>Watchlist: <strong style={{ color: C.bright }}>{report.summary.watchlist_ticker_count}</strong> tickers</span>
                          )}
                        </div>
                        <button
                          onClick={() => runComparison(true)}
                          disabled={running}
                          style={{
                            background: "none", border: `1px solid ${C.border}`,
                            borderRadius: 6, padding: "6px 12px", cursor: running ? "not-allowed" : "pointer",
                            color: C.dim, fontSize: 11, fontFamily: font,
                            display: "flex", alignItems: "center", gap: 6,
                            opacity: running ? 0.5 : 1,
                          }}
                        >
                          <RefreshCw size={12} style={running ? { animation: "spin 1s linear infinite" } : undefined} />
                          Refresh Analysis
                        </button>
                      </div>
                    </div>
                    {report.summary?.partial_failure && report.summary.partial_failure_message && (
                      <div style={{ marginTop: 10, padding: "8px 12px", background: `${C.orange}10`, border: `1px solid ${C.orange}30`, borderRadius: 6, fontSize: 11, color: C.orange, display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                        Some data providers were unavailable. {report.summary.partial_failure_message}
                      </div>
                    )}
                  </CardBox>

                  {/* ── Replacement Recommendations ────────────────────────── */}
                  {report.replacement_recommendations && report.replacement_recommendations.length > 0 && (
                    <CardBox style={{ marginBottom: 16 }}>
                      <SectionLabel>Replacement Recommendations</SectionLabel>
                      <ReplacementTable recs={report.replacement_recommendations} />
                    </CardBox>
                  )}

                  {/* ── Rankings (side by side) ────────────────────────────── */}
                  {(report.rankings?.portfolio?.length || report.rankings?.watchlist?.length) ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                      {report.rankings?.portfolio && report.rankings.portfolio.length > 0 && (
                        <CardBox>
                          <SectionLabel>Portfolio Stack Rank</SectionLabel>
                          <div style={{ borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}` }}>
                            {report.rankings.portfolio.map((item, i) => (
                              <TickerRankRow key={item.ticker} rank={i + 1} item={item} />
                            ))}
                          </div>
                        </CardBox>
                      )}
                      {report.rankings?.watchlist && report.rankings.watchlist.length > 0 && (
                        <CardBox>
                          <SectionLabel>Watchlist Stack Rank</SectionLabel>
                          <div style={{ borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}` }}>
                            {report.rankings.watchlist.map((item, i) => (
                              <TickerRankRow key={item.ticker} rank={i + 1} item={item} />
                            ))}
                          </div>
                        </CardBox>
                      )}
                    </div>
                  ) : null}

                  {/* ── Action Buckets ─────────────────────────────────────── */}
                  {report.action_buckets && (
                    Object.values(report.action_buckets).some(arr => arr && arr.length > 0)
                  ) && (
                    <CardBox style={{ marginBottom: 16 }}>
                      <SectionLabel>Action Buckets</SectionLabel>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        <ActionBucket label="Keep"            tickers={report.action_buckets?.keep}  color={C.green}  />
                        <ActionBucket label="Add / Upgrade"   tickers={report.action_buckets?.add}   color={C.blue}   />
                        <ActionBucket label="Trim / Replace"  tickers={report.action_buckets?.trim}  color={C.orange} />
                        <ActionBucket label="Avoid / Not Yet" tickers={report.action_buckets?.avoid} color={C.red}    />
                      </div>
                    </CardBox>
                  )}

                  {/* ── Full Markdown Report ───────────────────────────────── */}
                  {report.report_markdown && (
                    <CardBox>
                      <SectionLabel>Full Analysis</SectionLabel>
                      <MdRenderer markdown={report.report_markdown} />
                    </CardBox>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── Trigger Button ───────────────────────────────────────────────────────────
export function PortfolioCompareWatchlistButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        background: "linear-gradient(135deg, rgba(56,189,248,0.12), rgba(167,139,250,0.12))",
        border: "1px solid rgba(56,189,248,0.35)",
        borderRadius: 8, padding: "8px 16px", cursor: "pointer",
        fontFamily: "'JetBrains Mono','Fira Code',monospace",
        fontSize: 12, fontWeight: 700, color: "#38bdf8",
        letterSpacing: "0.04em",
        transition: "all 0.15s ease",
        boxShadow: "0 0 12px rgba(56,189,248,0.08)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(167,139,250,0.18))";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56,189,248,0.6)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(56,189,248,0.15)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, rgba(56,189,248,0.12), rgba(167,139,250,0.12))";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56,189,248,0.35)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 12px rgba(56,189,248,0.08)";
      }}
    >
      <GitCompare size={13} />
      Compare to Watchlist
    </button>
  );
}
