import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useSetPageContext } from "@/hooks/useSetPageContext";
import { useSetScreenContext } from "@/hooks/useSetScreenContext";
import { Plus, Trash2, LayoutGrid, Pencil, Check, X, GripVertical, Cloud, CloudOff } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ChartSlot {
  id: string;
  symbol: string;
}

interface MultiChartsView {
  id: string;
  name: string;
  columns: 1 | 2 | 3 | 4;
  charts: ChartSlot[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "caelyn_multicharts_views_v1";
const MAX_CHARTS = 25;
const COLS_OPTIONS: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];
const SAVE_DEBOUNCE_MS = 1200;

// ── Utilities ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function emptySlot(): ChartSlot {
  return { id: uid(), symbol: "" };
}

function defaultViews(): MultiChartsView[] {
  return [
    { id: uid(), name: "Main Tab", columns: 2, charts: [emptySlot()] },
  ];
}

function loadLocalViews(): MultiChartsView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultViews();
    const parsed = JSON.parse(raw) as MultiChartsView[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultViews();
    return parsed;
  } catch {
    return defaultViews();
  }
}

function saveLocalViews(views: MultiChartsView[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch {}
}

function getToken(): string {
  return localStorage.getItem("caelyn_jwt") || sessionStorage.getItem("caelyn_jwt") || "";
}

async function fetchServerViews(): Promise<MultiChartsView[] | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const r = await fetch("/api/user/multicharts", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (Array.isArray(data.views) && data.views.length > 0) return data.views as MultiChartsView[];
    return null;
  } catch {
    return null;
  }
}

async function saveServerViews(views: MultiChartsView[]): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const r = await fetch("/api/user/multicharts", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ views }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

function buildTvUrl(symbol: string, _chartId: string): string {
  const enc = encodeURIComponent(symbol.trim().toUpperCase());
  return (
    `https://s.tradingview.com/embed-widget/advanced-chart/` +
    `?locale=en` +
    `&symbol=${enc}` +
    `&interval=D` +
    `&range=3M` +
    `&style=1` +
    `&toolbar_bg=080808` +
    `&theme=dark` +
    `&timezone=exchange` +
    `&withdateranges=true` +
    `&hide_side_toolbar=false` +
    `&hide_top_toolbar=false` +
    `&allow_symbol_change=true` +
    `&enable_publishing=false` +
    `&calendar=false` +
    `&studies=%5B%5D` +
    `&disabled_features=%5B%22volume_force_overlay%22%2C%22create_volume_indicator_by_default%22%5D` +
    `&enabled_features=%5B%22use_localstorage_for_settings%22%2C%22header_indicators%22%2C%22header_compare%22%2C%22header_chart_type%22%2C%22header_settings%22%2C%22header_resolutions%22%2C%22header_fullscreen_button%22%2C%22left_toolbar%22%5D`
  );
}

const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

// ── ChartCard ──────────────────────────────────────────────────────────────────

interface ChartCardProps {
  slot: ChartSlot;
  autoFocus?: boolean;
  isDraggingAny: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onSymbolChange: (id: string, symbol: string) => void;
  onDelete: (id: string) => void;
}

function ChartCard({ slot, autoFocus, isDraggingAny, dragHandleProps, onSymbolChange, onDelete }: ChartCardProps) {
  const [inputValue, setInputValue] = useState(slot.symbol);
  const [loaded, setLoaded] = useState(!!slot.symbol);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(slot.symbol);
    setLoaded(!!slot.symbol);
  }, [slot.id, slot.symbol]);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const handleLoad = useCallback(() => {
    const sym = inputValue.trim().toUpperCase();
    if (!sym) return;
    onSymbolChange(slot.id, sym);
    setLoaded(true);
  }, [inputValue, slot.id, onSymbolChange]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleLoad();
  };

  const handleClear = () => {
    setInputValue("");
    setLoaded(false);
    onSymbolChange(slot.id, "");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div
      className="flex flex-col rounded-xl border border-white/10 overflow-hidden"
      style={{ background: "#080808", minHeight: 380 }}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-white/8" style={{ background: "#060606" }}>
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="flex-shrink-0 p-1 rounded text-white/20 hover:text-white/50 transition-colors cursor-grab active:cursor-grabbing touch-none select-none"
          title="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder="NASDAQ:NVDA, AMEX:SPY, BINANCE:BTCUSDT…"
          className="flex-1 bg-transparent text-xs text-white/80 placeholder-white/25 outline-none font-mono"
          spellCheck={false}
        />
        <button
          onClick={handleLoad}
          className="px-2 py-0.5 rounded text-xs font-semibold transition-colors"
          style={{ background: "#6d28d9", color: "#e9d5ff" }}
          title="Load chart"
        >
          Load
        </button>
        {loaded && (
          <button
            onClick={handleClear}
            className="p-1 rounded text-white/30 hover:text-white/70 transition-colors"
            title="Change symbol"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={() => onDelete(slot.id)}
          className="p-1 rounded text-white/25 hover:text-rose-400 transition-colors"
          title="Remove chart"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Chart body */}
      <div className="flex-1 relative" style={{ minHeight: 340 }}>
        {loaded && slot.symbol ? (
          <>
            <iframe
              key={`${slot.id}-${slot.symbol}`}
              src={buildTvUrl(slot.symbol, slot.id)}
              title={slot.symbol}
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
              style={{ background: "#080808" }}
            />
            {/* Transparent overlay while dragging */}
            {isDraggingAny && (
              <div className="absolute inset-0 z-20" style={{ cursor: "grabbing" }} />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <LayoutGrid className="w-8 h-8 text-white/10" />
            <p className="text-xs text-white/25 text-center px-4">
              Enter a ticker above and press <span className="text-white/40 font-mono">Enter</span> or click <span className="text-white/40">Load</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SortableChartCard ──────────────────────────────────────────────────────────

interface SortableChartCardProps extends ChartCardProps {}

function SortableChartCard(props: SortableChartCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.slot.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ChartCard
        {...props}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLDivElement>}
      />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function MultiChartsPage({ isActive = true, onCurated }: { isActive?: boolean; onCurated?: () => void }) {
  const [, navigate] = useLocation();
  const [views, setViews] = useState<MultiChartsView[]>(() => loadLocalViews());
  const [activeId, setActiveId] = useState<string>(() => loadLocalViews()[0]?.id ?? "");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [focusChartId, setFocusChartId] = useState<string | null>(null);
  const [draggingChartId, setDraggingChartId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "offline">("idle");
  const renameRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // On mount: try to load from server; server wins over localStorage
  useEffect(() => {
    fetchServerViews().then((serverViews) => {
      if (serverViews) {
        setViews(serverViews);
        setActiveId((prev) => {
          const exists = serverViews.find((v) => v.id === prev);
          return exists ? prev : serverViews[0]?.id ?? prev;
        });
        saveLocalViews(serverViews);
        setSyncStatus("saved");
      }
      initialLoadDone.current = true;
    });
  }, []);

  // Keep active tab in bounds
  useEffect(() => {
    if (!views.find((v) => v.id === activeId) && views.length > 0) {
      setActiveId(views[0].id);
    }
  }, [views, activeId]);

  // Save to localStorage immediately + debounce server save
  useEffect(() => {
    if (!initialLoadDone.current) return;
    saveLocalViews(views);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSyncStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      const ok = await saveServerViews(views);
      setSyncStatus(ok ? "saved" : "offline");
      if (ok) {
        setTimeout(() => setSyncStatus("idle"), 2000);
      }
    }, SAVE_DEBOUNCE_MS);
  }, [views]);

  const activeView = views.find((v) => v.id === activeId) ?? views[0];

  useSetPageContext(isActive ? (() => {
    const lines: string[] = ['[Page: MultiCharts — TradingView Chart Workspace]'];
    let anyTickers = false;
    for (const view of views) {
      const tickers = view.charts.map((c: any) => c.symbol).filter(Boolean);
      if (!tickers.length) continue;
      anyTickers = true;
      lines.push(`Tab "${view.name}": ${tickers.join(', ')}`);
    }
    if (!anyTickers) lines.push('No charts loaded yet.');
    lines.push('When the user asks about "my charts", "these tickers", or comparisons, use the tickers above as the subject of analysis.');
    return lines.join('\n');
  })() : null, [views, isActive]);

  useSetScreenContext(isActive ? (() => {
    const activeSymbols = (activeView?.charts ?? []).map((c: any) => c.symbol).filter(Boolean) as string[];
    return {
      route: '/app/multicharts',
      page: 'multicharts',
      tab: activeView?.name ?? null,
      tradingview_context: {
        active_tab: activeView?.name ?? null,
        active_widget_symbols: activeSymbols,
        widgets: (activeView?.charts ?? []).filter((c: any) => c.symbol).map((c: any) => ({
          raw_symbol: c.symbol,
          tradingview_symbol: c.symbol,
          timeframe: '1D',
          layout: 'advanced_chart',
          source: 'tradingview',
        })),
        all_tabs: views.map(v => ({
          name: v.name,
          symbols: v.charts.map((c: any) => c.symbol).filter(Boolean),
        })),
      },
      visible_symbols: activeSymbols,
    };
  })() : null, [views, activeView, isActive]);

  // ── Tab operations ──────────────────────────────────────────────────────────

  const addTab = () => {
    const tab: MultiChartsView = { id: uid(), name: "New Tab", columns: 2, charts: [emptySlot()] };
    setViews((prev) => [...prev, tab]);
    setActiveId(tab.id);
  };

  const deleteTab = (tabId: string) => {
    if (views.length <= 1) return;
    const newViews = views.filter((v) => v.id !== tabId);
    setViews(newViews);
    if (activeId === tabId) setActiveId(newViews[0].id);
  };

  const startRename = (tabId: string, currentName: string) => {
    setRenamingId(tabId);
    setRenameValue(currentName);
    setTimeout(() => renameRef.current?.focus(), 50);
  };

  const commitRename = () => {
    if (!renamingId) return;
    const name = renameValue.trim() || "Tab";
    setViews((prev) => prev.map((v) => v.id === renamingId ? { ...v, name } : v));
    setRenamingId(null);
  };

  const cancelRename = () => setRenamingId(null);

  // ── Chart operations ────────────────────────────────────────────────────────

  const updateView = useCallback((updater: (v: MultiChartsView) => MultiChartsView) => {
    setViews((prev) => prev.map((v) => v.id === activeId ? updater(v) : v));
  }, [activeId]);

  const addChart = () => {
    if (!activeView || activeView.charts.length >= MAX_CHARTS) return;
    const slot = emptySlot();
    setFocusChartId(slot.id);
    updateView((v) => ({ ...v, charts: [...v.charts, slot] }));
  };

  const deleteChart = (chartId: string) => {
    updateView((v) => {
      const charts = v.charts.filter((c) => c.id !== chartId);
      return { ...v, charts: charts.length === 0 ? [emptySlot()] : charts };
    });
  };

  const clearTab = () => {
    updateView((v) => ({ ...v, charts: [emptySlot()] }));
  };

  const setColumns = (cols: 1 | 2 | 3 | 4) => {
    updateView((v) => ({ ...v, columns: cols }));
  };

  const setSymbol = useCallback((chartId: string, symbol: string) => {
    updateView((v) => ({
      ...v,
      charts: v.charts.map((c) => c.id === chartId ? { ...c, symbol } : c),
    }));
  }, [updateView]);

  // ── Drag-and-drop handlers ──────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingChartId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingChartId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    updateView((v) => {
      const oldIndex = v.charts.findIndex((c) => c.id === active.id);
      const newIndex = v.charts.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return v;
      return { ...v, charts: arrayMove(v.charts, oldIndex, newIndex) };
    });
  };

  const handleDragCancel = () => {
    setDraggingChartId(null);
  };

  if (!activeView) return null;

  const atMax = activeView.charts.length >= MAX_CHARTS;
  const isDraggingAny = draggingChartId !== null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="min-h-screen text-white" style={{ background: "#020202" }}>
        <div className="max-w-[98vw] mx-auto px-2 sm:px-4 py-4 space-y-4">

          {/* ── Control Bar ── */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Tab pills */}
            <div className="flex items-center gap-1 flex-wrap">
              {views.map((v) => (
                <div key={v.id} className="flex items-center">
                  {renamingId === v.id ? (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-purple-500/60" style={{ background: "#1a0f3a" }}>
                      <input
                        ref={renameRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") cancelRename(); }}
                        className="bg-transparent text-xs text-white outline-none w-24"
                      />
                      <button onClick={commitRename} className="text-emerald-400 hover:text-emerald-300"><Check className="w-3 h-3" /></button>
                      <button onClick={cancelRename} className="text-white/30 hover:text-white/60"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveId(v.id)}
                      onDoubleClick={() => startRename(v.id, v.name)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveId(v.id); }}
                      className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer select-none ${
                        activeId === v.id
                          ? "border-purple-500/50 text-purple-200"
                          : "border-white/10 text-white/50 hover:text-white/80 hover:border-white/20"
                      }`}
                      style={activeId === v.id ? { background: "#1a0f3a" } : { background: "transparent" }}
                      title="Double-click to rename"
                    >
                      {v.name}
                      <button
                        onClick={(e) => { e.stopPropagation(); startRename(v.id, v.name); }}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                        title="Rename tab"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                      {views.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTab(v.id); }}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-rose-400 transition-opacity"
                          title="Delete tab"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Add tab */}
              <button
                onClick={addTab}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/80 border border-white/10 hover:border-white/25 transition-all"
                title="Add tab"
              >
                <Plus className="w-3 h-3" />
                Tab
              </button>
            </div>

            <div className="flex-1" />

            {/* Sync status indicator */}
            <div className="flex items-center gap-1 text-xs">
              {syncStatus === "saving" && (
                <span className="text-white/30 flex items-center gap-1">
                  <Cloud className="w-3 h-3 animate-pulse" /> saving…
                </span>
              )}
              {syncStatus === "saved" && (
                <span className="text-emerald-500/70 flex items-center gap-1">
                  <Cloud className="w-3 h-3" /> saved
                </span>
              )}
              {syncStatus === "offline" && (
                <span className="text-amber-500/70 flex items-center gap-1" title="Server unreachable — saved locally only">
                  <CloudOff className="w-3 h-3" /> local only
                </span>
              )}
            </div>

            {/* Columns selector */}
            <div className="flex items-center gap-1 rounded-lg border border-white/10 p-0.5" style={{ background: "#060606" }}>
              {COLS_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setColumns(n)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-all ${
                    activeView.columns === n
                      ? "text-white"
                      : "text-white/35 hover:text-white/65"
                  }`}
                  style={activeView.columns === n ? { background: "#4c1d95" } : {}}
                  title={`${n} column${n > 1 ? "s" : ""}`}
                >
                  {n}
                </button>
              ))}
              <span className="text-white/20 text-xs ml-1 mr-1">col</span>
            </div>

            {/* Add chart */}
            <button
              onClick={addChart}
              disabled={atMax}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                atMax
                  ? "opacity-40 cursor-not-allowed border-white/5 text-white/30"
                  : "border-purple-500/50 text-purple-300 hover:bg-purple-900/30"
              }`}
              title={atMax ? `Maximum ${MAX_CHARTS} charts per tab` : "Add chart"}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Chart
              {atMax && <span className="text-white/30">(max)</span>}
            </button>

            {/* Clear tab */}
            <button
              onClick={clearTab}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-white/40 hover:text-rose-400 hover:border-rose-500/30 transition-all"
              title="Remove all charts from this tab"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>

            {/* Toggle → Curated (only shown when accessed directly at /app/multicharts) */}
            {!onCurated && (
              <button
                onClick={() => navigate('/app/chart-radar')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-sky-500/30 text-sky-400 hover:bg-sky-900/25 transition-all"
                title="Switch to Curated Chart Radar"
              >
                Curated
              </button>
            )}
          </div>

          {/* ── Chart count badge ── */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/25">
              {activeView.charts.length} / {MAX_CHARTS} charts · <span className="text-white/20">double-click tab to rename · drag <GripVertical className="inline w-3 h-3 -mt-0.5" /> to reorder</span>
            </span>
          </div>

          {/* ── Grids — all tabs always rendered so iframes survive tab/page navigation ── */}
          {views.map((view) => {
            const isThisActive = view.id === activeId;
            const viewAtMax = view.charts.length >= MAX_CHARTS;
            return (
              <div key={view.id} style={isThisActive ? undefined : { display: "none" }}>
                <SortableContext items={view.charts.map((c) => c.id)} strategy={rectSortingStrategy}>
                  <div className={`grid gap-3 ${GRID_COLS[view.columns]}`}>
                    {view.charts.map((slot) => (
                      <SortableChartCard
                        key={slot.id}
                        slot={slot}
                        autoFocus={slot.id === focusChartId}
                        isDraggingAny={isDraggingAny}
                        onSymbolChange={setSymbol}
                        onDelete={deleteChart}
                      />
                    ))}

                    {/* Ghost "add" cell — only in active tab */}
                    {isThisActive && !viewAtMax && (
                      <button
                        onClick={addChart}
                        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 hover:border-purple-500/40 transition-colors text-white/20 hover:text-purple-400/60"
                        style={{ minHeight: 380, background: "transparent" }}
                      >
                        <Plus className="w-6 h-6" />
                        <span className="text-xs">Add Chart</span>
                      </button>
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}
