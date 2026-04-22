import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Newspaper,
  Sparkles,
  Activity,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  Star,
  BarChart3,
} from "lucide-react";
import TickerTapeWidget from "@/components/TickerTapeWidget";
import { GlassCard } from "@/components/glass-card";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type {
  HomeDashboardPayload,
  HomeFearGreedSide,
  HomeMacroCard,
  HomeMoverRow,
  HomeThemePerformanceItem,
} from "@/types/home";

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────
function fmtNum(v: number | string | null | undefined, digits = 2): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n as number)) return "—";
  return (n as number).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtPct(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}%`;
}

function pctColor(v: number | null | undefined): string {
  if (v === null || v === undefined) return "text-white/60";
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-rose-400";
  return "text-white/70";
}

function fgBucket(score: number | null | undefined): {
  label: string;
  color: string;
  ringColor: string;
} {
  if (score === null || score === undefined)
    return { label: "—", color: "text-white/60", ringColor: "stroke-white/20" };
  if (score <= 25)
    return { label: "Extreme Fear", color: "text-rose-400", ringColor: "stroke-rose-500" };
  if (score < 45)
    return { label: "Fear", color: "text-amber-300", ringColor: "stroke-amber-400" };
  if (score <= 55)
    return { label: "Neutral", color: "text-white/80", ringColor: "stroke-white/40" };
  if (score <= 75)
    return { label: "Greed", color: "text-lime-300", ringColor: "stroke-lime-400" };
  return { label: "Extreme Greed", color: "text-emerald-400", ringColor: "stroke-emerald-400" };
}

// ───────────────────────────────────────────────────────────────────────────
// Small components
// ───────────────────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  accent,
  action,
}: {
  icon: React.ElementType;
  title: string;
  accent?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center"
             style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(56,189,248,0.14))" }}>
          <Icon className="w-3.5 h-3.5 text-white/80" />
        </div>
        <h2 className="text-sm font-semibold text-white/90 tracking-wide uppercase">
          {title}
        </h2>
        {accent && (
          <span className="text-[11px] text-white/40 ml-1">{accent}</span>
        )}
      </div>
      {action}
    </div>
  );
}

function MacroCard({ card }: { card: HomeMacroCard }) {
  const up = (card.change_pct ?? 0) >= 0;
  return (
    <GlassCard className="p-3 min-h-[92px] flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-white/50">
          {card.label}
        </div>
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-white/10 text-white/60">
          {card.symbol}
        </Badge>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-xl font-semibold text-white/95">
          {fmtNum(card.price, card.kind === "rate" ? 2 : 2)}
        </div>
        <div className={`text-sm flex items-center gap-0.5 font-medium ${pctColor(card.change_pct)}`}>
          {card.change_pct !== null && (up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />)}
          {fmtPct(card.change_pct)}
        </div>
      </div>
    </GlassCard>
  );
}

function MoverRow({ row }: { row: HomeMoverRow }) {
  const up = row.direction === "up";
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/[0.03] transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
          up ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
        }`}>
          {up ? "▲" : "▼"}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white/90 truncate">{row.ticker}</div>
          <div className="text-[11px] text-white/45 truncate">{row.company || "—"}</div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm text-white/85">{fmtNum(row.price as any)}</div>
        <div className={`text-xs font-medium ${pctColor(row.change_pct)}`}>
          {row.change_label || fmtPct(row.change_pct)}
        </div>
      </div>
    </div>
  );
}

function ThemeRow({ theme }: { theme: HomeThemePerformanceItem }) {
  // Use the 30D change for the bar (most meaningful signal from sector rotation)
  const chg30 = theme.change_30d ?? theme.change_7d ?? theme.change_1d ?? 0;
  // Scale: 30D changes are typically -10% to +10%, so 5x gives a readable bar
  const bar = Math.max(-100, Math.min(100, (chg30 || 0) * 5));
  const tagColor =
    theme.regime_tag === "Leading"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
      : theme.regime_tag === "Lagging"
      ? "bg-rose-500/15 text-rose-300 border-rose-500/20"
      : "bg-white/5 text-white/60 border-white/10";
  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 px-2 rounded-md hover:bg-white/[0.03]">
      <div className="col-span-4 flex items-center gap-2 min-w-0">
        <div className="text-sm font-medium text-white/90 truncate">{theme.name || theme.ticker}</div>
        <Badge variant="outline" className={`h-5 px-1.5 text-[10px] border ${tagColor}`}>
          {theme.ticker}
        </Badge>
      </div>
      <div className="col-span-5 flex items-center">
        <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full relative overflow-hidden">
          <div
            className={`absolute top-0 h-full rounded-full ${bar >= 0 ? "bg-emerald-400/60" : "bg-rose-400/60"}`}
            style={{
              left: bar >= 0 ? "50%" : `${50 + bar / 2}%`,
              width: `${Math.abs(bar) / 2}%`,
            }}
          />
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
        </div>
      </div>
      <div className={`col-span-1 text-right text-xs font-medium ${pctColor(theme.change_1d)}`}>
        {fmtPct(theme.change_1d, 2)}
      </div>
      <div className={`col-span-1 text-right text-xs ${pctColor(theme.change_7d)}`}>
        {fmtPct(theme.change_7d, 1)}
      </div>
      <div className={`col-span-1 text-right text-xs ${pctColor(theme.change_30d)}`}>
        {fmtPct(theme.change_30d, 1)}
      </div>
      <div className="col-span-12 h-px bg-white/[0.04] mt-1" />
    </div>
  );
}

function FearGreedGauge({
  title,
  side,
  tint,
}: {
  title: string;
  side: HomeFearGreedSide | null | undefined;
  tint: string;
}) {
  const score = side?.score ?? null;
  const { label, color, ringColor } = fgBucket(score);
  const pct = score !== null && score !== undefined ? Math.max(0, Math.min(100, score)) : 0;
  const C = 2 * Math.PI * 42;
  const offset = C - (pct / 100) * C;

  return (
    <GlassCard className="p-4">
      <SectionHeader icon={Gauge} title={title} accent={side?.rating || ""} />
      <div className="flex items-center gap-4">
        <div className="relative w-[110px] h-[110px] shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" className="stroke-white/[0.06]" strokeWidth="7" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              className={ringColor}
              strokeWidth="7"
              strokeDasharray={C}
              strokeDashoffset={score === null ? C : offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 600ms ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-2xl font-semibold ${color}`}>{score !== null && score !== undefined ? Math.round(score) : "—"}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/40">index</div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${color}`}>{label}</div>
          <div className="text-xs text-white/50 mt-0.5">{side?.signal || "—"}</div>
          <div className="mt-3 grid grid-cols-5 gap-0.5 h-1.5 rounded-full overflow-hidden"
               style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="bg-rose-500/60" />
            <div className="bg-amber-400/50" />
            <div className="bg-white/20" />
            <div className="bg-lime-400/50" />
            <div className="bg-emerald-500/60" />
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-wider" style={{ color: tint }}>
            {title.includes("Crypto") ? "Crypto market" : "US equities"}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Main page
// ───────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [, setLocation] = useLocation();

  // Home aggregator — the page makes exactly ONE network request. The
  // Express proxy composes: backend /api/home/dashboard + news articles
  // (already in NEWS_CACHE) + crypto fear/greed (already in CMC cache).
  const { data, isLoading, isError } = useQuery<HomeDashboardPayload>({
    queryKey: ["/api/home/dashboard"],
    staleTime: 60_000,
  });

  const newsArticles = data?.news?.articles || [];
  const cryptoFG = data?.fear_greed?.crypto || null;

  const greeting = data?.greeting?.text || "Welcome back";
  const marketLabel = data?.greeting?.market?.label || "Markets";
  const nowET = data?.greeting?.market?.now_et;

  return (
    <div className="relative min-h-screen text-white" style={{ background: "#050608" }}>
      {/* ambient background, matches app aesthetic */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 20%, rgba(30,120,200,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 85% 10%, rgba(120,60,220,0.08) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 60% 90%, rgba(50,160,230,0.05) 0%, transparent 50%),
            linear-gradient(180deg, #050608 0%, #060810 30%, #070910 60%, #050608 100%)
          `,
        }}
      />
      <div
        className="fixed inset-0 z-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(100,180,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100,180,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* A. Top live ticker strip */}
      <div
        className="relative z-10 w-full border-b border-white/5 backdrop-blur-lg"
        style={{ height: 60, background: "rgba(5,6,8,0.92)" }}
      >
        <div style={{ height: 110 }}>
          <TickerTapeWidget />
        </div>
      </div>

      <div className="relative z-10 max-w-[1540px] mx-auto px-5 lg:px-8 py-6">
        {/* B. Centered search bar (visual — hooks into existing global nav) */}
        <div className="flex justify-center mb-6">
          <div className="w-full max-w-[680px]">
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl hover:border-white/20 transition-colors cursor-pointer"
              onClick={() => setLocation("/app/caelyn-ai")}
              title="Open AI Terminal"
            >
              <Search className="w-4 h-4 text-white/40" />
              <div className="flex-1 text-sm text-white/50">
                Ask Caelyn about a ticker, a theme, or a market regime…
              </div>
              <div className="hidden md:flex items-center gap-1 text-[10px] text-white/40">
                <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.04]">⌘</kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.04]">K</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* C. Greeting & market status */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-1">
              Caelyn Home
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold text-white">
              {greeting}.
            </h1>
            <div className="text-sm text-white/55 mt-1 flex items-center gap-2">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  data?.greeting?.market?.status === "open"
                    ? "bg-emerald-400"
                    : data?.greeting?.market?.status === "pre_market" ||
                      data?.greeting?.market?.status === "after_hours"
                    ? "bg-amber-400"
                    : "bg-white/30"
                }`}
              />
              {marketLabel}{nowET ? ` · ${nowET}` : ""}
              {data?.from_cache && (
                <span className="ml-1 text-[10px] text-white/30">cached</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data?.section_status && Object.entries(data.section_status).map(([k, v]) => (
              <span
                key={k}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  v === "ok"
                    ? "border-emerald-500/20 text-emerald-300/80"
                    : "border-white/10 text-white/40"
                }`}
              >
                {k}
              </span>
            ))}
          </div>
        </div>

        {/* D. Top macro cards */}
        <SectionHeader icon={Activity} title="Market Snapshot" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[92px] rounded-xl bg-white/[0.04]" />
            ))}
          {!isLoading &&
            (data?.macro_cards || []).map((c, i) => <MacroCard key={i} card={c} />)}
          {!isLoading && (!data?.macro_cards || data.macro_cards.length === 0) && (
            <div className="col-span-full text-sm text-white/40">
              Macro data temporarily unavailable.
            </div>
          )}
        </div>

        {/* E. Highlighted companies row */}
        {data?.highlighted_companies && data.highlighted_companies.length > 0 && (
          <>
            <SectionHeader
              icon={Star}
              title="Highlighted Companies"
              accent="From your watchlist"
            />
            <div className="flex gap-2 flex-wrap mb-6">
              {data.highlighted_companies.map((c) => (
                <div
                  key={c.ticker}
                  className="px-3 py-1.5 rounded-md border border-white/10 bg-white/[0.03] text-xs font-medium text-white/85 hover:border-white/20 transition-colors cursor-default"
                >
                  {c.ticker}
                </div>
              ))}
            </div>
          </>
        )}

        {/* F + G. Two-column main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Theme performance — main panel (cols 1-2) */}
          <div className="lg:col-span-2">
            <GlassCard className="p-4">
              <SectionHeader
                icon={BarChart3}
                title="Theme Performance"
                accent={data?.theme_performance?.updated_at ? "sector rotation" : undefined}
              />
              <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-white/40 px-2 mb-1">
                <div className="col-span-4">Sector</div>
                <div className="col-span-5 text-center">30D relative</div>
                <div className="col-span-1 text-right">1D</div>
                <div className="col-span-1 text-right">7D</div>
                <div className="col-span-1 text-right">30D</div>
              </div>
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 my-1 rounded bg-white/[0.04]" />
                ))}
              {!isLoading &&
                (data?.theme_performance?.themes || []).map((t, i) => (
                  <ThemeRow key={i} theme={t} />
                ))}
              {!isLoading &&
                (!data?.theme_performance?.themes ||
                  data.theme_performance.themes.length === 0) && (
                  <div className="text-sm text-white/40 py-8 text-center">
                    Sector rotation data temporarily unavailable.
                  </div>
                )}
            </GlassCard>
          </div>

          {/* Right rail: Trending Ideas (Stocktwits) */}
          <div className="lg:col-span-1">
            <GlassCard className="p-4 h-full">
              <SectionHeader
                icon={Sparkles}
                title="Trending Ideas"
                accent="Stocktwits"
              />
              <div className="space-y-2">
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded bg-white/[0.04]" />
                  ))}
                {!isLoading &&
                  (data?.trending_ideas || []).slice(0, 8).map((d, i) => (
                    <div
                      key={d.ticker || i}
                      className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:border-white/15 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/app/caelyn-ai?q=${encodeURIComponent(d.ticker)}`)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-white/90 truncate">
                          ${d.ticker}
                        </div>
                        {typeof d.watchlist_count === "number" && d.watchlist_count > 0 && (
                          <Badge
                            variant="outline"
                            className="h-5 text-[10px] border-white/10 text-white/60 shrink-0"
                          >
                            {d.watchlist_count.toLocaleString()} watching
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-white/50 mt-1 line-clamp-1">
                        {d.title}
                      </div>
                    </div>
                  ))}
                {!isLoading && (!data?.trending_ideas || data.trending_ideas.length === 0) && (
                  <div className="text-xs text-white/40 py-4 text-center">
                    No trending ideas right now.
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* H. Top movers / losers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <GlassCard className="p-4">
            <SectionHeader icon={TrendingUp} title="Top Movers" accent="Equities · today" />
            <div className="divide-y divide-white/[0.04]">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 my-1 rounded bg-white/[0.04]" />
                ))}
              {!isLoading &&
                (data?.movers?.gainers || []).slice(0, 8).map((row, i) => (
                  <MoverRow key={i} row={row} />
                ))}
              {!isLoading && (!data?.movers?.gainers || data.movers.gainers.length === 0) && (
                <div className="text-sm text-white/40 py-6 text-center">No data</div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <SectionHeader icon={TrendingDown} title="Top Losers" accent="Equities · today" />
            <div className="divide-y divide-white/[0.04]">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 my-1 rounded bg-white/[0.04]" />
                ))}
              {!isLoading &&
                (data?.movers?.losers || []).slice(0, 8).map((row, i) => (
                  <MoverRow key={i} row={row} />
                ))}
              {!isLoading && (!data?.movers?.losers || data.movers.losers.length === 0) && (
                <div className="text-sm text-white/40 py-6 text-center">No data</div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* I + J. News + Trending research */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="lg:col-span-2">
            <GlassCard className="p-4">
              <SectionHeader icon={Newspaper} title="Latest News" accent="Cross-market" />
              <div className="divide-y divide-white/[0.04]">
                {newsArticles.slice(0, 8).map((a: any, i: number) => (
                  <a
                    key={i}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-start gap-3 p-3 hover:bg-white/[0.03] rounded-md transition-colors"
                  >
                    {a.image && (
                      <img
                        src={a.image}
                        alt=""
                        className="w-14 h-14 rounded-md object-cover border border-white/5 shrink-0"
                        onError={(e) => ((e.currentTarget.style.display = "none"))}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white/90 line-clamp-2">{a.title}</div>
                      <div className="text-[11px] text-white/40 mt-1 flex items-center gap-2">
                        <span className="truncate">{a.source}</span>
                        {a.published && (
                          <span className="text-white/25">
                            · {new Date(a.published).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
                {newsArticles.length === 0 && (
                  <div className="text-sm text-white/40 py-6 text-center">
                    News feed loading…
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-1">
            <GlassCard className="p-4 h-full">
              {(() => {
                const tx = data?.trending_on_x;
                const generatedAt = tx?.generated_at ? new Date(tx.generated_at) : null;
                // Explicit "Updated <time>" using relative formatting (e.g., "2 days ago", "5h ago").
                // Backend snapshot is weekly-cached so we show both absolute + relative.
                const relativeUpdated = (() => {
                  if (!generatedAt) return "Weekly";
                  const ageMs = Date.now() - generatedAt.getTime();
                  const ageSec = Math.max(0, Math.floor(ageMs / 1000));
                  if (ageSec < 60) return `Updated ${ageSec}s ago`;
                  const ageMin = Math.floor(ageSec / 60);
                  if (ageMin < 60) return `Updated ${ageMin}m ago`;
                  const ageHr = Math.floor(ageMin / 60);
                  if (ageHr < 24) return `Updated ${ageHr}h ago`;
                  const ageDay = Math.floor(ageHr / 24);
                  return `Updated ${ageDay}d ago`;
                })();
                // Stale if backend marked stale OR age_seconds > 7 days
                const ageSeconds = typeof tx?.age_seconds === "number" ? tx.age_seconds : null;
                const isStale = tx?.is_stale === true || (ageSeconds !== null && ageSeconds > 7 * 86400);
                const isRefreshing = tx?.refresh_in_progress === true;
                return (
                  <SectionHeader
                    icon={LineChart}
                    title="Trending on X"
                    accent={relativeUpdated}
                    action={
                      <div className="flex items-center gap-1.5">
                        {isStale && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-300 bg-amber-500/10"
                            title="Snapshot is older than 7 days"
                          >
                            stale
                          </span>
                        )}
                        {isRefreshing && (
                          <span
                            className="text-[10px] text-amber-300 flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-500/25 bg-amber-500/10"
                            title="A weekly refresh is in progress server-side"
                          >
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
                            refreshing
                          </span>
                        )}
                      </div>
                    }
                  />
                );
              })()}
              <div className="space-y-2">
                {(data?.trending_on_x?.top_tickers || []).slice(0, 8).map((t, i) => (
                  <div
                    key={t.symbol || i}
                    className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:border-white/15 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/app/caelyn-ai?q=${encodeURIComponent(t.symbol)}`)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-white/90 truncate">
                        ${t.symbol}
                      </div>
                      {t.sentiment && (
                        <Badge
                          variant="outline"
                          className={`h-5 text-[10px] shrink-0 ${
                            /bull/i.test(t.sentiment)
                              ? "border-emerald-500/25 text-emerald-300"
                              : /bear/i.test(t.sentiment)
                              ? "border-rose-500/25 text-rose-300"
                              : "border-white/10 text-white/60"
                          }`}
                        >
                          {t.sentiment}
                        </Badge>
                      )}
                    </div>
                    {t.rationale && (
                      <div className="text-[11px] text-white/50 mt-1 line-clamp-2">
                        {t.rationale}
                      </div>
                    )}
                    {typeof t.mentions === "number" && t.mentions > 0 && (
                      <div className="text-[10px] text-white/35 mt-1">
                        {t.mentions} mention{t.mentions === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                ))}
                {(!data?.trending_on_x?.top_tickers ||
                  data.trending_on_x.top_tickers.length === 0) && (
                  <div className="text-xs text-white/40 py-4 text-center">
                    No weekly X consensus snapshot available yet.
                    {data?.trending_on_x?.refresh_in_progress && (
                      <div className="mt-1 text-white/30">Generating now — check back shortly.</div>
                    )}
                  </div>
                )}
                {data?.trending_on_x?.key_themes && data.trending_on_x.key_themes.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.05]">
                    <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                      Key themes
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {data.trending_on_x.key_themes.slice(0, 6).map((theme, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="h-5 text-[10px] border-white/10 text-white/65"
                        >
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* K. Fear & Greed — equities + crypto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <FearGreedGauge
            title="Equities Fear & Greed"
            side={data?.fear_greed?.equities}
            tint="#93c5fd"
          />
          <FearGreedGauge
            title="Crypto Fear & Greed"
            side={cryptoFG}
            tint="#f0abfc"
          />
        </div>

        {isError && (
          <Card className="p-4 border border-rose-500/20 bg-rose-500/5 text-rose-200 text-sm mb-6">
            Home dashboard unavailable right now. Individual sections that can
            load from other cached endpoints will still render.
          </Card>
        )}

        <div className="text-center text-[10px] text-white/25 py-4">
          Caelyn Home · composed from cached services · generated
          {data?.generated_at ? ` ${new Date(data.generated_at).toLocaleTimeString()}` : ""}
        </div>
      </div>
    </div>
  );
}
