import { useState, useCallback, useRef } from "react";
import { CheckCircle, XCircle, Loader2, Play, RotateCcw, Copy, Check, ChevronDown, ChevronRight, FlaskConical, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// ─── Constants ────────────────────────────────────────────────────────────────
const AGENT_URL = "https://fast-api-server-aidanpilon.replit.app";
const AGENT_KEY = "hippo_ak_7f3x9k2m4p8q1w5t";

// ─── Types ────────────────────────────────────────────────────────────────────
type TestStatus = "idle" | "running" | "pass" | "fail";

interface TestResult {
  status: TestStatus;
  latencyMs?: number;
  topKeys?: string[];
  displayType?: string;
  error?: string;
  rawJson?: any;
  validationNotes?: string[];
}

interface TestDef {
  id: string;
  name: string;
  route: string;
  payloadSummary: string;
  expectedKeys?: string[];
  run: (authHeaders: Record<string, string>) => Promise<TestResult>;
}

// ─── Mock Fixtures ────────────────────────────────────────────────────────────

const FIXTURE_BEST_TRADES = {
  display_type: "best_trades",
  analysis: "Top momentum plays identified across crypto and equities based on current technicals and volume anomalies.",
  structured: {
    trades: [
      { symbol: "BTC", direction: "LONG", entry: 68200, target: 72000, stop: 65800, confidence: 87, rationale: "Break above 200DMA with volume confirmation" },
      { symbol: "SOL", direction: "LONG", entry: 142, target: 165, stop: 131, confidence: 74, rationale: "Accumulation phase ending, RSI reset from oversold" },
      { symbol: "NVDA", direction: "LONG", entry: 875, target: 940, stop: 848, confidence: 81, rationale: "Earnings catalyst + AI infrastructure demand" },
    ],
    timeframe: "7-14 days",
    market_bias: "Risk-on",
    updated_at: new Date().toISOString(),
  },
};

const FIXTURE_THEMATIC = {
  display_type: "thematic",
  analysis: "AI infrastructure supercycle continues to be the dominant investable theme heading into Q2.",
  structured: {
    theme: "AI Infrastructure",
    conviction: "HIGH",
    drivers: ["Hyperscaler capex acceleration", "Edge AI device proliferation", "Sovereign AI buildout"],
    plays: [
      { ticker: "NVDA", category: "Semiconductors", stance: "Core long" },
      { ticker: "AMD",  category: "Semiconductors", stance: "Secondary long" },
      { ticker: "TSM",  category: "Foundry", stance: "Core long" },
    ],
    risks: ["Valuation compression if growth disappoints", "China export controls escalation"],
    time_horizon: "6-12 months",
  },
};

const FIXTURE_CRYPTO = {
  display_type: "crypto_overview",
  analysis: "Bitcoin dominance at 54% signals risk aversion. Altseason indicators remain neutral to bearish.",
  structured: {
    btc_dominance: 54.2,
    fear_greed: 62,
    fear_greed_label: "Greed",
    market_phase: "Late accumulation",
    top_gainers: [
      { symbol: "SUI", change_24h: 8.4 },
      { symbol: "TAO", change_24h: 6.1 },
    ],
    top_losers: [
      { symbol: "PEPE", change_24h: -5.2 },
      { symbol: "WIF",  change_24h: -4.1 },
    ],
    signals: { altseason_imminent: false, btc_breakout: true },
  },
};

const FIXTURE_POPUP_CHAT = {
  display_type: "freeform",
  analysis: "Based on current on-chain metrics, Bitcoin shows accumulation behavior consistent with prior cycle bottoms. Realized price support at $58,400 and MVRV ratio below 2.0 suggest limited downside from current levels. Probability weighted expectation remains constructive for 3-6 month horizon.",
  structured: {
    message: "Analysis complete.",
    confidence: "MEDIUM-HIGH",
    cited_data: ["Glassnode MVRV", "Realized price bands", "Exchange net flows"],
  },
};

const FIXTURE_NOTIFAI = {
  title: "CaelynAI Daily Brief",
  generated_at: new Date().toISOString(),
  summary: "Macro risk-on: Fed pivot expectations re-priced after CPI beat. Equities rallied, crypto followed with BTC tagging $70k. Options market implies elevated volatility into FOMC next week.",
  sections: [
    {
      heading: "Macro",
      content: "CPI came in at 3.1% vs 3.3% expected. Fed funds futures now pricing 2.5 cuts in 2025. Dollar softened 0.6%, gold hit ATH.",
    },
    {
      heading: "Crypto",
      content: "BTC +4.2% on the day. ETH outperformed at +5.8%. Stablecoin supply growing — signal of fresh capital entering.",
    },
    {
      heading: "Stocks",
      content: "SPX +1.4%. NVDA led semis +3.1%. Earnings season begins next week with major banks reporting.",
    },
  ],
  market_snapshot: { btc: 70100, eth: 3820, spx: 5280, dxy: 103.2 },
};

// ─── Validation helpers ───────────────────────────────────────────────────────
function validateKeys(data: any, required: string[]): { pass: boolean; notes: string[] } {
  const notes: string[] = [];
  let pass = true;
  for (const k of required) {
    if (!(k in data)) {
      notes.push(`Missing expected key: "${k}"`);
      pass = false;
    }
  }
  return { pass, notes };
}

function topLevelKeys(data: any): string[] {
  if (!data || typeof data !== "object") return [];
  return Object.keys(data).slice(0, 12);
}

function extractDisplayType(data: any): string | undefined {
  return data?.display_type || data?.type || undefined;
}

function isContentMeaningful(data: any): boolean {
  const text = data?.analysis || data?.structured?.message || data?.message || data?.summary || data?.content || "";
  return typeof text === "string" && text.trim().length > 10;
}

// ─── Mock test definitions ────────────────────────────────────────────────────
function buildMockTests(): TestDef[] {
  function makeMockTest(id: string, name: string, fixture: any, expectedKeys: string[]): TestDef {
    return {
      id,
      name,
      route: "(local fixture — no network call)",
      payloadSummary: "n/a",
      expectedKeys,
      run: async () => {
        const start = performance.now();
        await new Promise(r => setTimeout(r, 40 + Math.random() * 60));
        const latencyMs = Math.round(performance.now() - start);
        const { pass, notes } = validateKeys(fixture, expectedKeys);
        const hasContent = isContentMeaningful(fixture);
        if (!hasContent) notes.push("Content appears empty or too short");
        return {
          status: pass && hasContent ? "pass" : "fail",
          latencyMs,
          topKeys: topLevelKeys(fixture),
          displayType: extractDisplayType(fixture),
          error: pass && hasContent ? undefined : notes.join("; "),
          rawJson: fixture,
          validationNotes: notes,
        };
      },
    };
  }

  return [
    makeMockTest("mock-best-trades", "Best Trades renderer", FIXTURE_BEST_TRADES, ["display_type", "analysis", "structured"]),
    makeMockTest("mock-thematic", "Thematic renderer", FIXTURE_THEMATIC, ["display_type", "analysis", "structured"]),
    makeMockTest("mock-crypto", "Crypto Overview renderer", FIXTURE_CRYPTO, ["display_type", "analysis", "structured"]),
    makeMockTest("mock-popup-chat", "Popup / Freeform renderer", FIXTURE_POPUP_CHAT, ["analysis"]),
    makeMockTest("mock-notifai", "NotifAI Brief renderer", FIXTURE_NOTIFAI, ["title", "sections", "summary"]),
  ];
}

// ─── Live test definitions ────────────────────────────────────────────────────
function buildLiveTests(authHeaders: Record<string, string>): TestDef[] {
  async function runQuery(
    id: string,
    queryText: string,
    presetIntent: string | null,
    expectedKeys: string[],
  ): Promise<TestResult> {
    const start = performance.now();
    try {
      const res = await fetch(`${AGENT_URL}/api/query`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText, preset_intent: presetIntent }),
        signal: AbortSignal.timeout(30_000),
      });
      const latencyMs = Math.round(performance.now() - start);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { status: "fail", latencyMs, topKeys: topLevelKeys(data), error: `HTTP ${res.status}: ${data?.detail || data?.message || "Unknown error"}`, rawJson: data };
      }
      const { pass, notes } = validateKeys(data, expectedKeys);
      const hasContent = isContentMeaningful(data);
      if (!hasContent) notes.push("Response content appears empty");
      return {
        status: pass && hasContent ? "pass" : "fail",
        latencyMs,
        topKeys: topLevelKeys(data),
        displayType: extractDisplayType(data),
        error: pass && hasContent ? undefined : notes.join("; "),
        rawJson: data,
        validationNotes: notes,
      };
    } catch (err: any) {
      return { status: "fail", latencyMs: Math.round(performance.now() - start), error: err?.message || String(err) };
    }
  }

  return [
    {
      id: "live-freeform",
      name: "Free-form chat",
      route: "POST /api/query",
      payloadSummary: '{ query: "What is Bitcoin?", preset_intent: null }',
      expectedKeys: ["analysis"],
      run: () => runQuery("live-freeform", "What is Bitcoin and why does it matter in 2025?", null, ["analysis"]),
    },
    {
      id: "live-briefing",
      name: "Preset: daily briefing",
      route: "POST /api/query",
      payloadSummary: '{ preset_intent: "daily_briefing" }',
      expectedKeys: ["analysis"],
      run: () => runQuery("live-briefing", "", "daily_briefing", ["analysis"]),
    },
    {
      id: "live-earnings",
      name: "Preset: earnings catalyst",
      route: "POST /api/query",
      payloadSummary: '{ query: "AAPL", preset_intent: "earnings_catalyst" }',
      expectedKeys: ["analysis"],
      run: () => runQuery("live-earnings", "AAPL", "earnings_catalyst", ["analysis"]),
    },
    {
      id: "live-predict",
      name: "Preset: prediction markets",
      route: "POST /api/query",
      payloadSummary: '{ preset_intent: "prediction_markets" }',
      expectedKeys: ["analysis"],
      run: () => runQuery("live-predict", "", "prediction_markets", ["analysis"]),
    },
    {
      id: "live-notifai",
      name: "NotifAI the-brief",
      route: "GET /api/notifai/the-brief",
      payloadSummary: "(no body)",
      expectedKeys: ["title", "sections"],
      run: async () => {
        const start = performance.now();
        try {
          const res = await fetch("/api/notifai/the-brief", {
            headers: { "X-API-Key": AGENT_KEY, ...(authHeaders["Authorization"] ? { Authorization: authHeaders["Authorization"] } : {}) },
            signal: AbortSignal.timeout(20_000),
          });
          const latencyMs = Math.round(performance.now() - start);
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return { status: "fail", latencyMs, topKeys: topLevelKeys(data), error: `HTTP ${res.status}: ${data?.detail || "Error"}`, rawJson: data };
          const { pass, notes } = validateKeys(data, ["title", "sections"]);
          const hasSections = Array.isArray(data?.sections) && data.sections.length > 0;
          if (!hasSections) notes.push("sections array is missing or empty");
          return {
            status: pass && hasSections ? "pass" : "fail",
            latencyMs,
            topKeys: topLevelKeys(data),
            displayType: extractDisplayType(data),
            error: pass && hasSections ? undefined : notes.join("; "),
            rawJson: data,
            validationNotes: notes,
          };
        } catch (err: any) {
          return { status: "fail", latencyMs: Math.round(performance.now() - start), error: err?.message || String(err) };
        }
      },
    },
  ];
}

// ─── TestRow component ────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: TestStatus }) {
  if (status === "running") return <Loader2 className="w-4 h-4 animate-spin text-orange-400" />;
  if (status === "pass") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  if (status === "fail") return <XCircle className="w-4 h-4 text-red-400" />;
  return <div className="w-4 h-4 rounded-full border border-white/15" />;
}

function CopyButton({ data }: { data: any }) {
  const [copied, setCopied] = useState(false);
  const onClick = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={onClick} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors border border-white/10">
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy JSON"}
    </button>
  );
}

function TestRow({ def, result, onRun }: { def: TestDef; result: TestResult; onRun: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const rowBg =
    result.status === "pass" ? "bg-emerald-500/5 border-emerald-500/20" :
    result.status === "fail" ? "bg-red-500/5 border-red-500/20" :
    result.status === "running" ? "bg-orange-500/5 border-orange-500/20" :
    "bg-white/[0.02] border-white/10";

  return (
    <div className={`rounded-lg border ${rowBg} transition-colors`}>
      <div className="flex items-start gap-3 p-3">
        <div className="mt-0.5">
          <StatusIcon status={result.status} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-medium text-white/90">{def.name}</span>
            <div className="flex items-center gap-2">
              {result.latencyMs !== undefined && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${result.latencyMs > 8000 ? "text-red-400 bg-red-500/10" : result.latencyMs > 3000 ? "text-amber-400 bg-amber-500/10" : "text-emerald-400 bg-emerald-500/10"}`}>
                  {result.latencyMs < 1000 ? `${result.latencyMs}ms` : `${(result.latencyMs / 1000).toFixed(1)}s`}
                </span>
              )}
              {result.rawJson && <CopyButton data={result.rawJson} />}
              <button
                onClick={onRun}
                disabled={result.status === "running"}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-white/5 hover:bg-orange-500/20 text-white/40 hover:text-orange-300 transition-colors border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3 h-3" />
                Rerun
              </button>
              {(result.status !== "idle") && (
                <button onClick={() => setExpanded(e => !e)} className="text-white/30 hover:text-white/60 transition-colors">
                  {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            <span className="text-[10px] text-white/30 font-mono">{def.route}</span>
            {result.displayType && (
              <span className="text-[10px] text-orange-400/70 font-mono">display_type: {result.displayType}</span>
            )}
          </div>
          <div className="mt-0.5">
            <span className="text-[10px] text-white/20 font-mono truncate block">{def.payloadSummary}</span>
          </div>

          {result.topKeys && result.topKeys.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {result.topKeys.map(k => (
                <span key={k} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-white/50 border border-white/10">{k}</span>
              ))}
            </div>
          )}

          {result.status === "fail" && result.error && (
            <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-red-400/80">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <span className="font-mono break-all">{result.error}</span>
            </div>
          )}
        </div>
      </div>

      {expanded && result.rawJson && (
        <div className="border-t border-white/10 p-3">
          <pre className="text-[10px] font-mono text-white/50 bg-black/40 rounded p-3 overflow-x-auto max-h-64 leading-relaxed">
            {JSON.stringify(result.rawJson, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Main QA Page ─────────────────────────────────────────────────────────────
export default function DevQAPage() {
  const { getAuthHeaders } = useAuth();
  const [mode, setMode] = useState<"mock" | "live">("mock");
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [globalRunning, setGlobalRunning] = useState(false);
  const abortRef = useRef(false);

  const authHeaders = getAuthHeaders();
  const mockTests = buildMockTests();
  const liveTests = buildLiveTests(authHeaders);
  const activeTests = mode === "mock" ? mockTests : liveTests;

  const runTest = useCallback(async (def: TestDef) => {
    setResults(prev => ({ ...prev, [def.id]: { status: "running" } }));
    const result = await def.run(authHeaders);
    setResults(prev => ({ ...prev, [def.id]: result }));
  }, [authHeaders]);

  const runAll = useCallback(async () => {
    setGlobalRunning(true);
    abortRef.current = false;
    for (const def of activeTests) {
      if (abortRef.current) break;
      await runTest(def);
    }
    setGlobalRunning(false);
  }, [activeTests, runTest]);

  const stopAll = () => { abortRef.current = true; setGlobalRunning(false); };

  const passCount = activeTests.filter(d => results[d.id]?.status === "pass").length;
  const failCount = activeTests.filter(d => results[d.id]?.status === "fail").length;
  const ranCount = passCount + failCount;

  return (
    <div className="min-h-screen bg-[#050608] text-white p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <FlaskConical className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">QA Panel</h1>
            <p className="text-xs text-white/30">Dev-only · Integration smoke tests · Not visible in production</p>
          </div>
        </div>

        {/* Controls bar */}
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          {/* Mode toggle */}
          <div className="flex rounded-lg bg-white/[0.04] p-0.5 border border-white/10">
            <button
              onClick={() => { setMode("mock"); setResults({}); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === "mock" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"}`}
            >
              <WifiOff className="w-3.5 h-3.5" />
              Mock mode
            </button>
            <button
              onClick={() => { setMode("live"); setResults({}); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === "live" ? "bg-orange-500/20 text-orange-300" : "text-white/40 hover:text-white/70"}`}
            >
              <Wifi className="w-3.5 h-3.5" />
              Live mode
            </button>
          </div>

          {/* Summary badges + Run All */}
          <div className="flex items-center gap-2">
            {ranCount > 0 && (
              <>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{passCount} pass</span>
                {failCount > 0 && <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">{failCount} fail</span>}
                <span className="text-[10px] text-white/25">{ranCount}/{activeTests.length}</span>
              </>
            )}
            {globalRunning ? (
              <button onClick={stopAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors">
                <XCircle className="w-3.5 h-3.5" />
                Stop
              </button>
            ) : (
              <button onClick={runAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/20 transition-colors">
                <Play className="w-3.5 h-3.5" />
                Run all
              </button>
            )}
          </div>
        </div>

        {/* Mode description */}
        {mode === "live" && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-400/80">
              Live mode makes real calls to the FastAPI backend. The suite is intentionally tiny to minimize token/API cost. Each test is independent — use Rerun for individual retries.
            </p>
          </div>
        )}

        {/* Test list */}
        <div className="flex flex-col gap-2">
          {activeTests.map(def => (
            <TestRow
              key={def.id}
              def={def}
              result={results[def.id] ?? { status: "idle" }}
              onRun={() => runTest(def)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/5 text-center text-[10px] text-white/15 font-mono">
          dev-qa · build {new Date().toISOString().slice(0, 10)} · owner-gated
        </div>
      </div>
    </div>
  );
}
