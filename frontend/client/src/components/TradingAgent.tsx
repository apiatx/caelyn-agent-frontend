import { useState, useEffect, useRef } from 'react';
import caelynLogo from "@assets/image_1771528728963.png";
import { useAuth } from '@/contexts/AuthContext';
import { normalizeHistory, normalizeNewHistoryFlat, normalizeSidebarResponse, type NormalizedHistoryEntry } from '@/lib/history';
import {
  applyPresetState,
  buildCollabPayload,
  DEFAULT_COLLAB_STATE,
  shouldKeepCollaboratorsOnReasoningChange,
} from './tradingAgentCollabState';
import WatchlistAnalysis, { tryParseWatchlistAnalysis } from './WatchlistAnalysis';
import { StockDetailModal } from './StockDetailModal';
import { analyzePlaybook, discoverPlaybook, supplyChainMap, fetchDiscoveryCapabilities, comparePlaybook, fetchSerenityRegime } from '@/lib/playbooks';
import type { SerenityRegimeResponse } from '@/types/playbook';
import type { PlaybookDiscoveryCapabilities } from '@/types/playbook';

const AGENT_BACKEND_URL = 'https://fast-api-server-trading-agent-aidanpilon.replit.app';
const AGENT_API_KEY = 'hippo_ak_7f3x9k2m4p8q1w5t';

function getToken(): string | null {
  return localStorage.getItem('caelyn_token') || sessionStorage.getItem('caelyn_token');
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'X-API-Key': AGENT_API_KEY, ...extra };
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

// Map preset_intent → history category for automatic saving
const INTENT_TO_HISTORY_CATEGORY: Record<string, string> = {
  daily_briefing: 'overview', macro_overview: 'overview', headlines: 'overview',
  upcoming_catalysts: 'overview', trending_now: 'overview', social_momentum: 'overview',
  sector_rotation: 'overview',
  best_trades: 'trades', best_investments: 'trades', asymmetric_rr: 'trades',
  small_cap_spec: 'trades', short_squeeze: 'trades',
  fundamental_leaders: 'fundamental', rapidly_improving: 'fundamental',
  earnings_watch: 'fundamental', insider_buying: 'fundamental',
  revenue_reaccelerating: 'fundamental', margin_expansion: 'fundamental',
  undervalued_growth: 'fundamental', institutional_accumulation: 'fundamental',
  free_cash_flow_leaders: 'fundamental',
  crypto: 'sectors', commodities: 'sectors', energy: 'sectors',
  materials: 'sectors', aerospace_defense: 'sectors', tech: 'sectors',
  ai_compute: 'sectors', quantum: 'sectors', fintech: 'sectors',
  biotech: 'sectors', real_estate: 'sectors',
  oversold_growing: 'ta_screener', value_momentum: 'ta_screener',
  insider_breakout: 'ta_screener', high_growth_sc: 'ta_screener',
  dividend_value: 'ta_screener', technical_stage2: 'ta_screener',
  technical_bullish_breakouts: 'ta_screener', technical_breakdowns: 'ta_screener',
  technical_bearish_setups: 'ta_screener', technical_oversold: 'ta_screener',
  technical_overbought: 'ta_screener', technical_crossovers: 'ta_screener',
  momentum_shift_scan: 'ta_screener', volume_movers_scan: 'ta_screener',
};

function saveToPromptHistory(intent: string, rawResponse: string, displayType?: string, modelUsed?: string, query?: string) {
  const category = INTENT_TO_HISTORY_CATEGORY[intent];
  if (!category) return;
  // Parse raw response to extract structured_response for new history entries
  let structured_response: any = undefined;
  try {
    const parsed = JSON.parse(rawResponse);
    if (parsed && typeof parsed === 'object') {
      structured_response = { analysis: parsed.analysis, structured: parsed.structured, type: parsed.type };
    }
  } catch { /* not JSON — leave undefined */ }
  fetch(`${AGENT_BACKEND_URL}/api/history`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ category, intent, content: rawResponse, display_type: displayType, model_used: modelUsed, query, structured_response }),
  }).catch(e => console.error('[HISTORY_SAVE]', e));
}

interface AgentResult {
  type: string;
  analysis: string;
  structured: any;
}

interface PanelMessage {
  role: 'user' | 'assistant';
  content: string;
  parsed?: any;
  timestamp: number;
}

interface Panel {
  id: number;
  title: string;
  userQuery: string;
  data: any;
  timestamp: number;
  pinned?: boolean;
  conversationId?: string | null;
  thread?: PanelMessage[];
  reasoningModel?: string;
}

const slashCommands: Record<string, string> = {
  '/briefing': 'daily_briefing',
  '/trades': 'best_trades',
  '/macro': 'macro_overview',
  '/crypto': 'crypto',
  '/scan': 'trending_now',
  '/sentiment': 'social_momentum',
  '/news': 'headlines',
};

const FOLLOWUP_STAGES = [
  'Reading context...',
  'Scanning social data...',
  'Pulling latest signals...',
  'Cross-referencing watchlist...',
  'Analyzing sentiment...',
  'Building response...',
  'Finalizing analysis...',
];

function FollowUpInput({ panelId, onSubmit, C, font, sansFont, suggestions }: { panelId: number, onSubmit: (id: number, text: string) => void, C: any, font: string, sansFont: string, suggestions?: string[] }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [stage, setStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const prevSuggestionsRef = useRef<string[] | undefined>(undefined);
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset showSuggestions when new suggestions arrive
  useEffect(() => {
    if (suggestions && suggestions.length > 0 && suggestions !== prevSuggestionsRef.current) {
      setShowSuggestions(true);
    }
    prevSuggestionsRef.current = suggestions;
  }, [suggestions]);

  useEffect(() => {
    if (sending) {
      setStage(0);
      setElapsed(0);
      stageRef.current = setInterval(() => {
        setStage(prev => (prev + 1) % FOLLOWUP_STAGES.length);
      }, 2400);
      elapsedRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (stageRef.current) { clearInterval(stageRef.current); stageRef.current = null; }
      if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
    }
    return () => {
      if (stageRef.current) clearInterval(stageRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [sending]);

  const handleSubmit = async () => {
    if (!text.trim() || sending) return;
    setShowSuggestions(false);
    setSending(true);
    await onSubmit(panelId, text.trim());
    setText('');
    setSending(false);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (sending) return;
    setShowSuggestions(false);
    setSending(true);
    await onSubmit(panelId, suggestion);
    setText('');
    setSending(false);
  };

  const visibleSuggestions = showSuggestions && suggestions && suggestions.length > 0 && !sending ? suggestions : null;

  return (
    <div style={{ borderTop:`1px solid ${C.border}`, background:C.bg }}>
      {/* Follow-up suggestion chips */}
      {visibleSuggestions && (
        <div style={{
          display:'flex', gap:6, padding:'8px 12px 0', overflowX:'auto',
          scrollbarWidth:'none', msOverflowStyle:'none',
        }}>
          {visibleSuggestions.map((s, i) => (
            <button
              key={i}
              className="suggestion-chip"
              onClick={() => handleSuggestionClick(s)}
              style={{
                padding:'4px 10px', background:'transparent',
                border:`1px solid ${C.border}`, borderRadius:12,
                color:C.dim, fontSize:11, fontFamily:font,
                cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
                transition:'all 0.15s',
              }}
            >{s}</button>
          ))}
        </div>
      )}
      {/* Loading indicator — appears above input when generating */}
      {sending && (
        <div className="followup-loading-container" style={{
          padding: '12px 14px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {/* Top row: icon + stage text + timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Pulsing orbital rings */}
            <div className="followup-orb" style={{
              width: 28, height: 28, position: 'relative', flexShrink: 0,
            }}>
              <div className="followup-ring followup-ring-1" />
              <div className="followup-ring followup-ring-2" />
              <div className="followup-core" />
            </div>

            {/* Stage text with fade transition */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="followup-stage-text" key={stage} style={{
                color: C.blue,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: font,
                letterSpacing: '0.04em',
              }}>
                {FOLLOWUP_STAGES[stage]}
              </span>
            </div>

            {/* Elapsed timer */}
            <span style={{
              color: C.dim,
              fontSize: 9,
              fontFamily: font,
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}>
              {elapsed}s
            </span>
          </div>

          {/* Shimmer progress bar */}
          <div style={{
            height: 2,
            background: `${C.border}`,
            borderRadius: 1,
            overflow: 'hidden',
          }}>
            <div className="followup-shimmer" style={{
              height: '100%',
              borderRadius: 1,
            }} />
          </div>
        </div>
      )}

      {/* Input row */}
      <div style={{ display:'flex', gap:6, padding:'8px 12px' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          placeholder="Follow up on this analysis..."
          disabled={sending}
          style={{
            flex:1, padding:'6px 10px', background:'transparent',
            border:`1px solid ${sending ? C.blue + '40' : C.border}`,
            borderRadius:3, color:C.bright, fontSize:11, fontFamily:sansFont, outline:'none',
            transition: 'border-color 0.3s',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={sending || !text.trim()}
          className="panel-btn"
          style={{
            padding:'6px 12px',
            background: sending ? 'transparent' : (!text.trim() ? 'transparent' : C.blue),
            color: sending ? C.blue : (!text.trim() ? C.dim : '#fff'),
            border:`1px solid ${sending ? C.blue + '60' : (!text.trim() ? C.border : C.blue)}`,
            borderRadius:3, fontSize:10, fontWeight:700, fontFamily:font,
            cursor: sending || !text.trim() ? 'not-allowed' : 'pointer',
            minWidth: 58,
          }}
        >
          {sending ? 'THINKING' : 'SEND'}
        </button>
      </div>
    </div>
  );
}

export default function TradingAgent() {
  const { logout } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [csvData, setCsvData] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [collabOptions, setCollabOptions] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState('claude');
  const [collabConfig, setCollabConfig] = useState<typeof DEFAULT_COLLAB_STATE | null>(DEFAULT_COLLAB_STATE);
  const hasHydratedDefaultPresetRef = useRef(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(() => {
    try { return sessionStorage.getItem('caelyn_loading') === 'true'; } catch { return false; }
  });
  const [panels, setPanels] = useState<Panel[]>(() => {
    try { const s = sessionStorage.getItem('caelyn_panels'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(() => {
    try { return sessionStorage.getItem('caelyn_convId') || null; } catch { return null; }
  });
  const [loadingStage, setLoadingStage] = useState('');
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [csvChartInterval, setCsvChartInterval] = useState<string>('D');
  const [screenerInput, setScreenerInput] = useState('');
  const [screenerSortCol, setScreenerSortCol] = useState('');
  const [screenerSortAsc, setScreenerSortAsc] = useState(true);
  const [groupExpanded, setGroupExpanded] = useState<Record<string, boolean>>({ g1: true, g2: true, g3: true, g4: true, g5: true });
  const [recentHistory, setRecentHistory] = useState<NormalizedHistoryEntry[]>([]);
  const [leftRailSearch, setLeftRailSearch] = useState('');
  const [expandedRiskIds, setExpandedRiskIds] = useState<Set<string>>(new Set());
  const [leftRailOpen, setLeftRailOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [signalPopup, setSignalPopup] = useState<{ ticker: string; signal: string; scannerName: string; color: string; icon: string } | null>(null);
  const [signalChartInterval, setSignalChartInterval] = useState('D');
  const [modalTicker, setModalTicker] = useState<string | null>(null);
  const [modalWatchlistData, setModalWatchlistData] = useState<any>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('default');
  const [strategyPlaybooks, setStrategyPlaybooks] = useState<Array<{id:string;name:string;short_label:string;ui_color?:string}>>([]);
  const [strategyDropdownOpen, setStrategyDropdownOpen] = useState(false);
  const strategyDropdownRef = useRef<HTMLDivElement>(null);
  // Serenity discovery controls — only affect explicit user-triggered discovery actions, never auto-fire
  // All default to Auto / no preselection so Serenity starts in Guided Brain mode
  const [discoveryAnchor, setDiscoveryAnchor] = useState<string>('');      // '' = Auto
  const [discoveryTheme, setDiscoveryTheme] = useState<string>('');
  const [discoveryRegion, setDiscoveryRegion] = useState<string>('Global');
  const [discoveryHiddenOnly, setDiscoveryHiddenOnly] = useState<boolean>(false);
  const [discoveryDepth, setDiscoveryDepth] = useState<number>(0);          // 0 = Auto
  const [discoveryIncludeForeign, setDiscoveryIncludeForeign] = useState<boolean>(true);
  const [discoveryIncludeProxies, setDiscoveryIncludeProxies] = useState<boolean>(true);
  const [serenityRefineOpen, setSerenityRefineOpen] = useState<boolean>(false);
  const [discoveryCapabilities, setDiscoveryCapabilities] = useState<PlaybookDiscoveryCapabilities | null>(null);
  const [serenityRegime, setSerenityRegime] = useState<SerenityRegimeResponse | null>(null);
  const capabilitiesFetchedRef = useRef(false);
  // Serenity advanced override — when false, Customize/model-selector controls are hidden in non-default modes
  const [serenityAdvancedOverride, setSerenityAdvancedOverride] = useState(false);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [panels, loading]);

  // Load discovery capabilities once when Serenity is first selected; cache for session
  useEffect(() => {
    setSerenityAdvancedOverride(false); // always reset advanced override on mode switch
    setSerenityRefineOpen(false);       // always collapse refine panel on mode switch
    if (selectedStrategy !== 'serenity' || capabilitiesFetchedRef.current) return;
    capabilitiesFetchedRef.current = true;
    fetchDiscoveryCapabilities()
      .then(caps => setDiscoveryCapabilities(caps))
      .catch(() => { /* graceful — controls fall back to hardcoded lists */ });
    // Fetch regime context once — non-blocking, graceful on failure
    fetchSerenityRegime()
      .then(regime => setSerenityRegime(regime))
      .catch(() => { /* graceful — status bar falls back to generic auto label */ });
  }, [selectedStrategy]);

  useEffect(() => {
    try { sessionStorage.setItem('caelyn_panels', JSON.stringify(panels)); } catch {}
  }, [panels]);
  useEffect(() => {
    try { sessionStorage.setItem('caelyn_loading', String(loading)); } catch {}
  }, [loading]);

  useEffect(() => {
    try { if (conversationId) sessionStorage.setItem('caelyn_convId', conversationId); else sessionStorage.removeItem('caelyn_convId'); } catch {}
  }, [conversationId]);

  useEffect(() => {
    fetchRecentHistory();
  }, []);

  useEffect(() => {
    fetch(`${AGENT_BACKEND_URL}/api/collab-options`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCollabOptions(data); })
      .catch(e => console.error('[COLLAB_OPTIONS]', e));
  }, []);

  useEffect(() => {
    fetch('/api/playbooks')
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => { if (Array.isArray(data)) setStrategyPlaybooks(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (strategyDropdownRef.current && !strategyDropdownRef.current.contains(e.target as Node)) {
        setStrategyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (hasHydratedDefaultPresetRef.current || !collabOptions?.collab_presets?.length) return;
    const defaultPreset = collabOptions.collab_presets.find((p: any) => p.id === 'default');
    if (!defaultPreset) return;
    setCollabConfig(applyPresetState(defaultPreset));
    hasHydratedDefaultPresetRef.current = true;
  }, [collabOptions]);

  useEffect(() => {
    if (!collabConfig) return;
    if (shouldKeepCollaboratorsOnReasoningChange(collabConfig)) return;
    if (!Array.isArray(collabConfig.collabAgents)) {
      setCollabConfig(prev => prev ? { ...prev, collabAgents: [] } : prev);
    }
  }, [collabConfig?.reasoningModelRequest]);

  function fetchRecentHistory() {
    // Use /api/history/sidebar for the right-side panel — returns 5 most recent conversations.
    // Falls back to the legacy /api/history/recent endpoint if sidebar is unavailable.
    fetch(`${AGENT_BACKEND_URL}/api/history/sidebar`, { headers: authHeaders() })
      .then(r => {
        console.log('[SIDEBAR] GET /api/history/sidebar status:', r.status);
        if (!r.ok) throw new Error('sidebar unavailable');
        return r.json();
      })
      .then(data => {
        console.log('[SIDEBAR] raw response:', JSON.stringify(data).slice(0, 300));
        if (!data) return;
        const entries = normalizeSidebarResponse(data);
        console.log('[SIDEBAR] normalized entries:', entries.length, entries.map(e => ({ id: e.id, query: e.query, ts: e.timestamp })));
        if (entries.length > 0) { setRecentHistory(entries); return; }
        // Sidebar returned empty — fall back
        throw new Error('sidebar empty');
      })
      .catch((err) => {
        console.log('[SIDEBAR] falling back to /api/history/recent, reason:', err?.message);
        // Fallback: use legacy recent endpoint
        fetch(`${AGENT_BACKEND_URL}/api/history/recent?limit=5`, { headers: authHeaders() })
          .then(r => { console.log('[RECENT] GET status:', r.status); return r.ok ? r.json() : null; })
          .then(data => {
            if (!data) return;
            console.log('[RECENT] raw keys:', Object.keys(data), 'items?', Array.isArray(data.items), 'recent?', Array.isArray(data.recent));
            if (Array.isArray(data.items) || Array.isArray(data.recent)) {
              const entries = normalizeNewHistoryFlat(data).slice(0, 5);
              console.log('[RECENT] normalized entries:', entries.length);
              setRecentHistory(entries);
            } else {
              const entries = normalizeHistory(data).slice(0, 5);
              console.log('[RECENT] normalized (old format) entries:', entries.length);
              setRecentHistory(entries);
            }
          })
          .catch(() => {});
      });
  }

  function humanReadableLabel(intent: string): string {
    const known: Record<string, string> = {
      daily_briefing: 'Daily Briefing', best_trades: 'Best Trades', macro_overview: 'Macro Overview',
      headlines: 'Headlines', upcoming_catalysts: 'Upcoming Catalysts', trending_now: 'Trending Now',
      social_momentum: 'Social Momentum', sector_rotation: 'Sector Rotation',
      best_investments: 'Best Investments', asymmetric_rr: 'Asymmetric R:R',
      small_cap_spec: 'Small Cap Spec', short_squeeze: 'Short Squeeze',
      fundamental_leaders: 'Fundamental Leaders', rapidly_improving: 'Rapidly Improving',
      earnings_watch: 'Earnings Watch', insider_buying: 'Insider Buying',
      earnings_agent: 'Earnings Agent', prediction_markets: 'Prediction Markets',
      news_intelligence: 'NotifAI', freeform_query: 'Terminal Query',
    };
    return known[intent] || intent.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function relativeTime(ts: number): string {
    const now = Date.now();
    const diff = Math.max(0, Math.floor((now - ts * 1000) / 1000));
    if (diff < 60) return 'just now';
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function loadRecentEntry(entry: typeof recentHistory[0]) {
    // If the entry has a conversation_id, restore the full thread from the backend.
    // This preserves cross-model continuity — the backend is source of truth.
    if (entry.conversation_id) {
      fetch(`${AGENT_BACKEND_URL}/api/conversations/${entry.conversation_id}`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          // Build thread from backend messages
          const msgs: { role: string; content: string }[] = Array.isArray(data.messages) ? data.messages : [];
          const thread: PanelMessage[] = msgs.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
            parsed: m.role === 'assistant' ? (() => { try { return JSON.parse(m.content); } catch { return null; } })() : null,
            timestamp: m.timestamp ? m.timestamp * 1000 : Date.now(),
          }));
          // The last assistant message becomes the panel data
          const lastAsst = [...msgs].reverse().find((m: any) => m.role === 'assistant');
          let responseText = '';
          if (lastAsst) {
            try {
              const p = JSON.parse(lastAsst.content);
              responseText = p?.analysis || p?.structured?.message || p?.message || lastAsst.content;
            } catch { responseText = lastAsst.content; }
          }
          const title = entry.title || entry.query || humanReadableLabel(entry.intent);
          const newPanel: Panel = {
            id: Date.now(), title,
            userQuery: entry.query || '',
            data: { role: 'assistant', content: responseText, parsed: lastAsst ? (() => { try { return JSON.parse(lastAsst.content); } catch { return null; } })() : null },
            timestamp: entry.timestamp * 1000,
            conversationId: entry.conversation_id,
            thread,
            reasoningModel: entry.model_used || 'agent_collab',
          };
          setPanels(prev => [...prev, newPanel]);
          setConversationId(entry.conversation_id!);
        })
        .catch(() => {
          // Network error — fall back to stored content
          _loadEntryFromContent(entry);
        });
      return;
    }
    _loadEntryFromContent(entry);
  }

  function _loadEntryFromContent(entry: typeof recentHistory[0]) {
    // Use structured_response directly when available — feeds the full structured data
    // into the Terminal's existing renderAssistantMessage pipeline
    let parsed: any = null;
    if (entry.structured_response && typeof entry.structured_response === 'object') {
      parsed = entry.structured_response;
    } else {
      try { parsed = JSON.parse(entry.content); } catch { /* plain text */ }
    }
    const responseText = parsed?.analysis || parsed?.structured?.message || parsed?.message || entry.content;
    const title = entry.query
      ? entry.query.slice(0, 60)
      : (entry.title || (parsed?._user_query ? (parsed._user_query as string).slice(0, 60) : humanReadableLabel(entry.intent)));
    const newPanel: Panel = {
      id: Date.now(), title,
      userQuery: entry.query || parsed?._user_query || '',
      data: { role: 'assistant', content: responseText, parsed },
      timestamp: entry.timestamp * 1000,
    };
    setPanels(prev => [...prev, newPanel]);
  }

  function newChat() {
    // Abort any in-flight request immediately
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    // Reset loading state so the terminal returns to idle
    loadingRef.current = false;
    setLoading(false);
    setLoadingStage('');
    setPrompt('');
    setError(null);
    setExpandedTicker(null);
    setPanels([]);
    setConversationId(null);
  }



  function closePanel(id: number) {
    setPanels(prev => prev.filter(p => p.id !== id));
  }

  function togglePinPanel(id: number) {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, pinned: !p.pinned } : p));
  }


  async function sendFollowUp(panelId: number, followUpText: string) {
    const panel = panels.find(p => p.id === panelId);
    if (!panel || !followUpText.trim()) return;

    const convId = panel.conversationId || conversationId;
    const userContent = panel.userQuery || panel.title || 'query';
    const parsed = panel.data?.parsed;
    let assistantContent = '';
    if (typeof panel.data?.content === 'string' && panel.data.content.trim()) {
      assistantContent = panel.data.content;
    }
    if (parsed && !assistantContent) {
      const fallback = parsed.analysis || parsed.structured?.message || parsed.message;
      if (typeof fallback === 'string' && fallback.trim()) {
        assistantContent = fallback;
      } else {
        assistantContent = JSON.stringify(parsed).substring(0, 8000);
      }
    }
    if (!assistantContent) assistantContent = 'No response content available.';

    const history: Array<{role: string, content: string}> = [
      { role: 'user', content: userContent },
      { role: 'assistant', content: assistantContent },
    ];
    if (panel.thread) {
      for (const msg of panel.thread) {
        const msgContent = typeof msg.content === 'string' && msg.content.trim()
          ? msg.content
          : (msg.parsed ? (msg.parsed.analysis || JSON.stringify(msg.parsed).substring(0, 8000)) : 'No content');
        history.push({ role: msg.role, content: msgContent });
      }
    }

    const userMsg: PanelMessage = { role: 'user', content: followUpText, timestamp: Date.now() };
    setPanels(prev => prev.map(p => p.id === panelId ? { ...p, thread: [...(p.thread || []), userMsg] } : p));

    const url = `${AGENT_BACKEND_URL}/api/query`;
    const payload = {
      query: followUpText,
      preset_intent: null,
      conversation_id: convId || null,
      history,
      ...buildCollabPayload(collabConfig, selectedModel),
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      let data: any;
      try { data = JSON.parse(raw); } catch { data = { analysis: raw }; }

      if (data.conversation_id) {
        setPanels(prev => prev.map(p => p.id === panelId ? { ...p, conversationId: data.conversation_id } : p));
        setConversationId(data.conversation_id);
      }

      let responseText = data.analysis?.trim() || data.structured?.message?.trim() || data.message?.trim() || '';
      const assistantMsg: PanelMessage = { role: 'assistant', content: responseText, parsed: data, timestamp: Date.now() };
      setPanels(prev => prev.map(p => p.id === panelId ? { ...p, thread: [...(p.thread || []), assistantMsg] } : p));
      fetchRecentHistory();
    } catch (err: any) {
      const errMsg: PanelMessage = { role: 'assistant', content: `Follow-up failed: ${err.message || 'Unknown error'}`, timestamp: Date.now() };
      setPanels(prev => prev.map(p => p.id === panelId ? { ...p, thread: [...(p.thread || []), errMsg] } : p));
    }
  }

  // ── Serenity-only discovery helpers ─────────────────────────────────────────
  // These are only called by explicit user clicks — never auto-fired.

  async function runDiscovery(opts: { // route=/api/playbooks/discover
    mode?: string;
    theme_ids?: string[];
    include_foreign?: boolean;
    only_hidden?: boolean;
    label: string;
  }) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    setExpandedTicker(null);
    setLoadingStage(`Running ${opts.label}...`);

    // Build request using real backend field names
    const payload: Record<string, unknown> = {
      playbook_id: 'serenity',
      mode: opts.mode || 'theme_scan',
      ...(discoveryDepth > 0 ? { max_depth: discoveryDepth } : {}), // 0 = Auto, omit to let backend choose
      include_foreign: opts.include_foreign ?? discoveryIncludeForeign,
      include_adr_or_etf_proxies: discoveryIncludeProxies,
      only_hidden: opts.only_hidden ?? discoveryHiddenOnly,
      limit: 20,
    };
    // Anchor: use giant_anchors array when backend supports it (from capabilities), else anchor_ticker
    if (discoveryAnchor && discoveryAnchor !== 'AI Power') {
      if (discoveryCapabilities?.giant_anchors) {
        payload.giant_anchors = [discoveryAnchor];
      } else {
        payload.anchor_ticker = discoveryAnchor;
      }
    }
    // Theme
    if (opts.theme_ids && opts.theme_ids.length) payload.theme_ids = opts.theme_ids;
    else if (discoveryTheme) payload.theme_ids = [discoveryTheme.toLowerCase().replace(/[\s/]+/g, '_')];
    // Region
    if (discoveryRegion !== 'Global') payload.region = discoveryRegion;

    try {
      const data = await discoverPlaybook(payload as any);
      const newPanel: Panel = {
        id: Date.now(), title: opts.label, userQuery: '',
        data: { role: 'assistant', content: data.summary || data.analysis || '',
          parsed: { ...data, display_type: 'serenity_discovery', _label: opts.label } },
        timestamp: Date.now(), thread: [],
      };
      setPanels(prev => [...prev, newPanel]);
    } catch (err: any) {
      const failPanel: Panel = {
        id: Date.now(), title: opts.label, userQuery: '',
        data: { role: 'assistant',
          content: `Discovery failed: ${err.message || 'Unknown error'}. You can retry — discovery is rate-limit sensitive.`,
          parsed: null },
        timestamp: Date.now(), thread: [],
      };
      setPanels(prev => [...prev, failPanel]);
      setError(err.message || 'Discovery error');
    } finally {
      setLoadingStage(''); setLoading(false); loadingRef.current = false;
    }
  }

  async function runSupplyChainMap(opts?: { anchorOverride?: string; themeOverride?: string }) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    setExpandedTicker(null);
    const anchor = opts?.anchorOverride ?? discoveryAnchor;
    const theme = opts?.themeOverride ?? discoveryTheme;
    const label = `Supply Chain Map — ${anchor}${theme ? ` / ${theme}` : ''}`;
    setLoadingStage(`Mapping supply chain...`);

    const payload: Record<string, unknown> = {
      playbook_id: 'serenity',
      include_foreign: discoveryIncludeForeign,
      max_depth: discoveryDepth,
    };
    if (anchor && anchor !== 'AI Power') payload.anchor = anchor;
    if (theme) payload.theme = theme;
    if (discoveryRegion !== 'Global') payload.region = discoveryRegion;

    try {
      const data = await supplyChainMap(payload as any);
      const newPanel: Panel = {
        id: Date.now(), title: label, userQuery: '',
        data: { role: 'assistant', content: data.summary || '',
          parsed: { ...data, display_type: 'serenity_supply_chain', _label: label } },
        timestamp: Date.now(), thread: [],
      };
      setPanels(prev => [...prev, newPanel]);
    } catch (err: any) {
      const failPanel: Panel = {
        id: Date.now(), title: label, userQuery: '',
        data: { role: 'assistant',
          content: `Supply chain map failed: ${err.message || 'Unknown error'}. You can retry.`,
          parsed: null },
        timestamp: Date.now(), thread: [],
      };
      setPanels(prev => [...prev, failPanel]);
      setError(err.message || 'Supply chain map error');
    } finally {
      setLoadingStage(''); setLoading(false); loadingRef.current = false;
    }
  }

  async function runCompare(tickers: string[], label?: string) {
    if (!tickers.length || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    setExpandedTicker(null);
    const lbl = label || `Compare vs S&J — ${tickers.slice(0, 3).join(', ')}${tickers.length > 3 ? '…' : ''}`;
    setLoadingStage('Comparing Serenity vs S&J...');
    try {
      const data = await comparePlaybook({ tickers, playbook_ids: ['serenity', 'sjcapital'] });
      const newPanel: Panel = {
        id: Date.now(), title: lbl, userQuery: '',
        data: { role: 'assistant', content: data.summary || '',
          parsed: { ...data, display_type: 'serenity_compare', _label: lbl } },
        timestamp: Date.now(), thread: [],
      };
      setPanels(prev => [...prev, newPanel]);
    } catch (err: any) {
      const failPanel: Panel = {
        id: Date.now(), title: lbl, userQuery: '',
        data: { role: 'assistant',
          content: `Compare failed: ${err.message || 'Unknown error'}. You can retry — this endpoint is rate-limit sensitive.`,
          parsed: null },
        timestamp: Date.now(), thread: [],
      };
      setPanels(prev => [...prev, failPanel]);
      setError(err.message || 'Compare error');
    } finally {
      setLoadingStage(''); setLoading(false); loadingRef.current = false;
    }
  }

  async function runPlaybookAnalysis(queryText: string, freshChat?: boolean) {
    const playbook = strategyPlaybooks.find(p => p.id === selectedStrategy);
    const playbookLabel = playbook?.short_label || selectedStrategy;

    // Extract uppercase ticker-looking tokens from the query (1-5 letters)
    const rawMatches = queryText.match(/\b[A-Z]{1,5}\b/g) || [];
    const tickers = [...new Set(rawMatches.filter(t => t.length >= 2))].slice(0, 20);
    const contextMode = tickers.length > 0 ? 'custom' : 'universe';

    loadingRef.current = true;
    setLoading(true);
    setError(null);
    setExpandedTicker(null);
    setPrompt('');
    if (freshChat) setConversationId(null);

    setLoadingStage(`Running ${playbookLabel} playbook analysis...`);

    try {
      const data = await analyzePlaybook({
        playbook_id: selectedStrategy,
        query: queryText,
        context_mode: contextMode,
        tickers,
        limit: 10,
        include_breakdown: true,
      });

      const analysisText = data.analysis || data.summary || data.message || '';
      const newPanel: Panel = {
        id: Date.now(),
        title: queryText || `${playbookLabel} Analysis`,
        userQuery: queryText,
        data: {
          role: 'assistant',
          content: analysisText,
          parsed: {
            ...data,
            display_type: 'playbook_analysis',
            _playbook_id: selectedStrategy,
            _playbook_label: playbookLabel,
          },
        },
        timestamp: Date.now(),
        thread: [],
      };
      setPanels(prev => [...prev, newPanel]);
    } catch (err: any) {
      const failPanel: Panel = {
        id: Date.now(),
        title: queryText || `${playbookLabel} Analysis`,
        userQuery: queryText,
        data: {
          role: 'assistant',
          content: `${playbookLabel} playbook analysis failed: ${err.message || 'Unknown error'}. You can retry or switch to Default mode.`,
          parsed: null,
        },
        timestamp: Date.now(),
        thread: [],
      };
      setPanels(prev => [...prev, failPanel]);
      setError(err.message || 'Playbook analysis error');
    } finally {
      setLoadingStage('');
      setLoading(false);
      loadingRef.current = false;
    }
  }

  async function askAgent(customPrompt?: string, freshChat?: boolean, presetIntent?: string | null) {
    const queryText = (customPrompt ?? prompt ?? '').trim();

    if (!queryText && !presetIntent && !csvData) return;
    if (loadingRef.current) { console.log('[GUARD] Already loading, ignoring duplicate call'); return; }

    // ── STRATEGY MODE: non-default strategy → playbook analyze route ──────
    // Preset intents and CSV analysis always use the default /api/query path.
    if (selectedStrategy !== 'default' && !presetIntent && !csvData) {
      console.log('[ROUTE] mode=', selectedStrategy, '| action=freeform | route=/api/playbooks/analyze | customizeActive=false');
      await runPlaybookAnalysis(queryText, freshChat);
      return;
    }
    // ── DEFAULT MODE: existing /api/query path continues below ─────────────
    console.log('[ROUTE] mode=', selectedStrategy, '| action=', presetIntent ? `preset:${presetIntent}` : csvData ? 'csv' : 'freeform', '| route=/api/query | collabActive=', !!collabConfig, '| model=', selectedModel);

    const url = `${AGENT_BACKEND_URL}/api/query`;
    const payload: Record<string, any> = {
      query: presetIntent ? '' : queryText,
      preset_intent: typeof presetIntent === 'string' ? presetIntent : null,
      conversation_id: freshChat ? null : (typeof conversationId === 'string' ? conversationId : null),
      ...(csvData ? { csv_data: csvData } : {}),
    };
    if (presetIntent) {
      // Per-preset reasoning family overrides — family alias, backend picks exact model/tier
      const PRESET_MODEL_OVERRIDES: Record<string, string> = {
        crypto: 'grok',
      };
      payload.collaboration_mode = 'auto';
      payload.collab_preset = null;
      payload.reasoning_model = PRESET_MODEL_OVERRIDES[presetIntent] ?? 'claude';
      payload.collab_agents = [];
    } else if (collabConfig) {
      Object.assign(payload, buildCollabPayload(collabConfig, selectedModel));
    } else {
      Object.assign(payload, buildCollabPayload(null, selectedModel));
    }
    if (csvData) setCsvData(null);
    if (csvFileName) setCsvFileName(null);

    console.log('[SEND]', url, payload);
    console.log('[CSV_DEBUG]', 'csvData length:', csvData?.length || 0, 'payload has csv_data:', !!payload.csv_data, 'csv_data length:', payload.csv_data?.length || 0);

    loadingRef.current = true;
    setLoading(true); setError(null); setExpandedTicker(null);
    setPrompt('');
    const displayText = queryText || presetIntent || '';

    if (freshChat) setConversationId(null);

    setLoadingStage('Classifying query...');
    const stages = ['Scanning market data...','Pulling technicals & volume...','Checking social sentiment...','Analyzing insider activity...','Fetching options flow...','Reading macro indicators...','Generating analysis...'];
    let idx = 0;
    const iv = setInterval(() => { if (idx < stages.length) { setLoadingStage(stages[idx]); idx++; } }, 1600);

    try {
      try {
        const ping = await fetch(`${AGENT_BACKEND_URL}/ping`, { method: 'GET' });
        console.log('[PING]', ping.status);
      } catch (pingErr: any) {
        console.log('[PING_FAIL]', pingErr, pingErr?.message);
        const unreachPanel: Panel = {
          id: Date.now(), title: displayText, userQuery: queryText,
          data: { role: 'assistant', content: `Backend unreachable. Check deploy status.\n\nURL: ${AGENT_BACKEND_URL}\nTime: ${new Date().toISOString()}\nError: ${pingErr?.message || 'Network error'}`, parsed: null },
          timestamp: Date.now(),
        };
        setPanels(prev => [...prev, unreachPanel]);
        return;
      }

      console.log('[CSV_PAYLOAD]', JSON.stringify(payload).substring(0, 500));
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const res = await fetch(url, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const raw = (await res.text()).trim();
      console.log('[RECV_RAW]', res.status, raw.slice(0, 800));

      if (!res.ok) {
        console.log('[ERROR]', res.status, raw);
        throw new Error(`Status ${res.status}: ${raw || 'Empty response'}`);
      }

      if (!raw || !raw.trim()) {
        const emptyPanel: Panel = {
          id: Date.now(), title: displayText, userQuery: queryText,
          data: { role: 'assistant', content: `Backend returned empty response.\n\nURL: ${url}\nTime: ${new Date().toISOString()}`, parsed: null },
          timestamp: Date.now(),
        };
        setPanels(prev => [...prev, emptyPanel]);
        return;
      }

      let data: any;
      try { data = JSON.parse(raw); } catch (parseErr) {
        console.error('[JSON_PARSE_ERROR]', parseErr, raw.slice(0, 500));
        const parsePanel: Panel = {
          id: Date.now(), title: displayText, userQuery: queryText,
          data: { role: 'assistant', content: 'Backend returned invalid JSON. Check console logs.\n\nRaw: ' + raw.slice(0, 200), parsed: null },
          timestamp: Date.now(),
        };
        setPanels(prev => [...prev, parsePanel]);
        return;
      }

      console.log('[RECV]', res.status, data);
      console.log('[SUGGESTIONS]', data.suggested_followups || 'none');
      if (data.conversation_id) setConversationId(data.conversation_id);

      if (data.type === 'error' || data.error) {
        const rawErr = data.error;
        const errContent = (typeof rawErr === 'object' && rawErr !== null ? rawErr.message || JSON.stringify(rawErr) : rawErr) || data.structured?.message || data.analysis || 'Unknown error from backend.';
        const errPanel: Panel = {
          id: Date.now(), title: displayText, userQuery: queryText,
          data: { role: 'assistant', content: `Error: ${errContent}${data.request_id ? `\n\nRequest ID: ${data.request_id}` : ''}`, parsed: data },
          timestamp: Date.now(),
        };
        setPanels(prev => [...prev, errPanel]);
        return;
      }

      let responseText = '';
      if (data.analysis && data.analysis.trim()) {
        responseText = data.analysis;
      } else if (data.structured?.message && data.structured.message.trim()) {
        responseText = data.structured.message;
      } else if (data.message && data.message.trim()) {
        responseText = data.message;
      } else {
        responseText = '';
      }

      const newPanel: Panel = {
        id: Date.now(),
        title: displayText,
        userQuery: queryText,
        data: { role: 'assistant', content: responseText, parsed: data },
        timestamp: Date.now(),
        conversationId: data.conversation_id || conversationId,
        thread: [],
        reasoningModel: data?.meta?.reasoning_model || (collabConfig ? collabConfig.reasoningModelRequest : selectedModel),
      };
      setPanels(prev => [...prev, newPanel]);
      fetchRecentHistory();
      // Auto-save ALL successful responses to history
      const usedModel = data?.meta?.reasoning_model || (collabConfig ? collabConfig.reasoningModelRequest : selectedModel);
      if (presetIntent) {
        saveToPromptHistory(presetIntent, raw, data.display_type || data.type, usedModel, queryText || presetIntent);
      } else if (queryText) {
        let contentToSave: string;
        let sr: any = undefined;
        try { const p = JSON.parse(raw); contentToSave = JSON.stringify({ _user_query: queryText, ...p }); sr = { analysis: p.analysis, structured: p.structured, type: p.type }; } catch { contentToSave = raw; }
        fetch(`${AGENT_BACKEND_URL}/api/history`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ category: 'terminal', intent: 'freeform_query', content: contentToSave, model_used: usedModel, query: queryText, structured_response: sr }) }).catch(e => console.error('[HISTORY_SAVE]', e));
      }
      setTimeout(fetchRecentHistory, 1500);
    } catch (err: any) {
      // User-initiated abort (New button) — exit silently, no error panel
      if (err?.name === 'AbortError') {
        console.log('[ABORT] Request cancelled by user');
        return;
      }
      console.log('[FETCH_FAIL]', err, err?.message);
      const errMsg = err.message?.includes('429') ? 'Rate limit reached. Wait a moment.'
        : err.message?.includes('403') ? 'Auth failed.'
        : err.message?.includes('Failed to fetch') ? `Backend unreachable (${AGENT_BACKEND_URL}). Check deploy status.`
        : err.message || 'Unknown error';
      const failPanel: Panel = {
        id: Date.now(), title: displayText, userQuery: queryText,
        data: { role: 'assistant', content: `Request failed: ${errMsg}\n\nBackend: ${AGENT_BACKEND_URL}\nTime: ${new Date().toISOString()}`, parsed: null },
        timestamp: Date.now(),
      };
      setPanels(prev => [...prev, failPanel]);
      setError(errMsg);
    } finally { clearInterval(iv); setLoadingStage(''); setLoading(false); loadingRef.current = false; abortControllerRef.current = null; }
  }


  const C = {
    bg: '#0b0c10', card: '#111318', border: '#1a1d25', text: '#c9cdd6', bright: '#e8eaef',
    dim: '#6b7280', green: '#22c55e', red: '#ef4444', blue: '#3b82f6', gold: '#f59e0b',
    purple: '#a78bfa',
  };
  const font = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";
  const sansFont = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  function convColor(c?: string) { return c === 'High' ? C.green : c === 'Medium' ? C.gold : C.red; }
  function changeColor(s?: string) { return (parseFloat(s || '0') >= 0) ? C.green : C.red; }
  function trendColor(s?: string) { if (!s) return C.dim; if (s.includes('↑') || s.toLowerCase().includes('improv') || s.toLowerCase().includes('accel') || s.toLowerCase().includes('expand') || s.toLowerCase().includes('bullish') || s.toLowerCase().includes('above')) return C.green; if (s.includes('↓') || s.toLowerCase().includes('declin') || s.toLowerCase().includes('contract') || s.toLowerCase().includes('bearish') || s.toLowerCase().includes('below')) return C.red; return C.text; }

  function Badge({ children, color, bg }: { children: React.ReactNode, color: string, bg?: string }) {
    return <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:4, fontSize:10, fontWeight:700, fontFamily:font, color, background: bg || `${color}12`, border:`1px solid ${color}25`, letterSpacing:'0.04em', textTransform:'uppercase' }}>{children}</span>;
  }

  function StatRow({ label, value, color }: { label: string, value?: string, color?: string }) {
    if (!value) return null;
    return <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${C.border}` }}>
      <span style={{ color:C.dim, fontSize:11, fontFamily:font }}>{label}</span>
      <span style={{ color: color || trendColor(value), fontSize:12, fontWeight:600, fontFamily:font }}>{value}</span>
    </div>;
  }

  function IndicatorPill({ label, value, signal }: { label: string, value?: string|number, signal?: string }) {
    return <div style={{ background:C.bg, borderRadius:8, padding:'10px 12px', border:`1px solid ${C.border}` }}>
      <div style={{ color:C.dim, fontSize:9, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{label}</div>
      <div style={{ color:C.bright, fontSize:16, fontWeight:700, fontFamily:font }}>{value ?? '—'}</div>
      {signal && <div style={{ color:trendColor(signal), fontSize:10, fontFamily:font, marginTop:2 }}>{signal}</div>}
    </div>;
  }

  function CardWrap({ children, onClick, expanded, borderColor }: { children: React.ReactNode, onClick?: () => void, expanded?: boolean, borderColor?: string }) {
    return <div onClick={onClick} style={{ background:C.card, border:`1px solid ${expanded ? C.blue+'40' : C.border}`, borderLeft:`3px solid ${borderColor || C.border}`, borderRadius:10, overflow:'hidden', cursor: onClick ? 'pointer' : 'default', transition:'all 0.2s' }}>{children}</div>;
  }

  // Canonical TradingView futures symbols for common commodities.
  // Used when the backend item doesn't include a tradingview_symbol field.
  const COMMODITY_TV_MAP: Record<string, string> = {
    'WTI': 'NYMEX:CL1!', 'WTI CRUDE OIL': 'NYMEX:CL1!', 'CRUDE OIL': 'NYMEX:CL1!',
    'CRUDE': 'NYMEX:CL1!', 'OIL': 'NYMEX:CL1!', 'CL': 'NYMEX:CL1!', 'CL1!': 'NYMEX:CL1!',
    'BRENT': 'ICEEUR:B1!', 'BRENT CRUDE': 'ICEEUR:B1!', 'BZ': 'NYMEX:BB1!', 'BZ1!': 'NYMEX:BB1!',
    'GOLD': 'COMEX:GC1!', 'GC': 'COMEX:GC1!', 'GC1!': 'COMEX:GC1!',
    'SILVER': 'COMEX:SI1!', 'SI': 'COMEX:SI1!', 'SI1!': 'COMEX:SI1!',
    'COPPER': 'COMEX:HG1!', 'HG': 'COMEX:HG1!', 'HG1!': 'COMEX:HG1!',
    'NATURAL GAS': 'NYMEX:NG1!', 'NATGAS': 'NYMEX:NG1!', 'NG': 'NYMEX:NG1!', 'NG1!': 'NYMEX:NG1!',
    'WHEAT': 'CBOT:ZW1!', 'ZW': 'CBOT:ZW1!', 'ZW1!': 'CBOT:ZW1!',
    'CORN': 'CBOT:ZC1!', 'ZC': 'CBOT:ZC1!', 'ZC1!': 'CBOT:ZC1!',
    'SOYBEANS': 'CBOT:ZS1!', 'SOYBEAN': 'CBOT:ZS1!', 'ZS': 'CBOT:ZS1!', 'ZS1!': 'CBOT:ZS1!',
    'PLATINUM': 'NYMEX:PL1!', 'PL': 'NYMEX:PL1!', 'PL1!': 'NYMEX:PL1!',
    'PALLADIUM': 'NYMEX:PA1!', 'PA': 'NYMEX:PA1!', 'PA1!': 'NYMEX:PA1!',
    'LUMBER': 'CME:LB1!', 'LB': 'CME:LB1!', 'LB1!': 'CME:LB1!',
    'COCOA': 'ICEEUR:C1!', 'CC': 'ICEEUR:C1!', 'CC1!': 'ICEEUR:C1!',
    'COFFEE': 'ICEEUR:KC1!', 'KC': 'ICEEUR:KC1!', 'KC1!': 'ICEEUR:KC1!',
    'SUGAR': 'ICEEUR:SB1!', 'SB': 'ICEEUR:SB1!', 'SB1!': 'ICEEUR:SB1!',
  };

  function getTVSymbol(ticker: string, pick?: any): string {
    // Priority 1: explicit TradingView symbol from backend (any alias)
    if (pick?.tradingview_symbol) return pick.tradingview_symbol;
    if (pick?.tv_symbol) return pick.tv_symbol;
    if (pick?.chart_symbol) return pick.chart_symbol;
    // Priority 2: crypto — prefix with exchange
    if (pick?.asset_class === 'crypto' || pick?.asset_type === 'crypto' || pick?.category === 'crypto') return `BINANCE:${ticker}USDT`;
    // Priority 3: commodity futures map — resolve vague names/tickers to canonical exchange:contract
    const upperTicker = ticker.toUpperCase();
    if (COMMODITY_TV_MAP[upperTicker]) return COMMODITY_TV_MAP[upperTicker];
    // Also check the item's name field in case symbol is vague
    if (pick?.name) {
      const upperName = String(pick.name).toUpperCase();
      if (COMMODITY_TV_MAP[upperName]) return COMMODITY_TV_MAP[upperName];
    }
    return ticker;
  }

  function TradingViewMini({ ticker, pick }: { ticker: string; pick?: any }) {
    const sym = getTVSymbol(ticker, pick);
    const [ivl, setIvl] = useState('D');
    const intervals = [{l:'1H',v:'60'},{l:'4H',v:'240'},{l:'1D',v:'D'},{l:'1W',v:'W'},{l:'1M',v:'M'}];
    return <div style={{ margin:'12px 0' }}>
      <div style={{ display:'flex', gap:4, marginBottom:6 }}>
        {intervals.map(iv => <button key={iv.v} onClick={(e) => { e.stopPropagation(); setIvl(iv.v); }} style={{ padding:'2px 8px', fontSize:9, fontWeight:600, fontFamily:font, background: ivl === iv.v ? C.blue+'20' : 'transparent', color: ivl === iv.v ? C.blue : C.dim, border:`1px solid ${ivl === iv.v ? C.blue+'40' : C.border}`, borderRadius:3, cursor:'pointer' }}>{iv.l}</button>)}
      </div>
      <div style={{ borderRadius:8, overflow:'hidden', border:`1px solid ${C.border}` }}>
        <iframe src={`https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=400&interval=${ivl}&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=false&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=%5B%22volume_force_overlay%22%2C%22create_volume_indicator_by_default%22%5D&enabled_features=%5B%22use_localstorage_for_settings%22%2C%22study_templates%22%2C%22header_indicators%22%2C%22header_compare%22%2C%22header_undo_redo%22%2C%22header_screenshot%22%2C%22header_chart_type%22%2C%22header_settings%22%2C%22header_resolutions%22%2C%22header_fullscreen_button%22%2C%22left_toolbar%22%2C%22drawing_templates%22%5D&symbol=${encodeURIComponent(sym)}`} style={{ width:'100%', height:400, border:'none', display:'block' }} title={`${sym} chart`} />
      </div>
    </div>;
  }

  function formatAnalysis(text: string) {
    if (!text) return '';
    return text
      .replace(/```[\w]*\n?/g, '')
      .replace(/^---+$/gm, '')
      .replace(/^# (.*?)$/gm, `<div style="color:${C.bright};font-weight:800;font-size:18px;margin:20px 0 10px;font-family:${sansFont}">$1</div>`)
      .replace(/^## (.*?)$/gm, `<div style="color:${C.bright};font-weight:700;font-size:16px;margin:16px 0 8px;font-family:${sansFont}">$1</div>`)
      .replace(/^### (.*?)$/gm, `<div style="color:${C.blue};font-weight:700;font-size:14px;margin:12px 0 6px;font-family:${sansFont}">$1</div>`)
      .replace(/\*\*(.*?)\*\*/g, `<span style="color:${C.bright};font-weight:700">$1</span>`)
      .replace(/\n/g, '<br/>');
  }

  function renderTrades(s: any) {
    const topTrades = s.top_trades || s.picks || [];
    const bearish = s.bearish_setups || [];
    const summary = s.summary || s.market_context || '';

    const actionColor = (a?: string) => { if (!a) return C.dim; const l = String(a).toLowerCase(); if (l.includes('strong buy')) return C.green; if (l.includes('buy')) return '#4ade80'; if (l.includes('hold') || l.includes('neutral') || l.includes('watch')) return C.gold; if (l.includes('sell')) return C.red; return C.dim; };
    const setupColor = (st?: string) => (!st ? C.dim : C.blue);
    const toggleRisk = (id: string, e: React.MouseEvent) => { e.stopPropagation(); setExpandedRiskIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };

    const renderTradeCard = (t: any, prefix: string, i: number) => {
      const cardId = `${prefix}-${i}`;
      const isExp = expandedTicker === cardId;
      const riskExpanded = expandedRiskIds.has(cardId);
      const ticker = t.ticker || t.symbol || '';
      const name = t.name || t.company || '';
      const action = t.action || t.rating || '';
      const confidence = t.confidence_score ?? t.confidence;
      const setupType = t.setup_type || t.classification || '';
      const entry = t.entry || t.trade_plan?.entry;
      const stop = t.stop || t.stop_loss || t.trade_plan?.stop;
      const target = t.target || t.target_1 || t.trade_plan?.target_1;
      const target2 = t.target_2 || t.trade_plan?.target_2;
      const rr = t.risk_reward || t.trade_plan?.risk_reward;
      const tf = t.timeframe || t.trade_plan?.timeframe;
      const risk = t.risk || t.why_could_fail || '';
      const signals = t.indicator_signals || t.signals_stacking || [];
      const tvSym = getTVSymbol(ticker, t);
      const tvUrl = t.tradingview_url || t.tv_url || `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSym)}`;
      const thesis = t.thesis || '';
      const thesisBullets = t.thesis_bullets || [];

      return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : cardId)} expanded={isExp} borderColor={actionColor(action)}>
        <div style={{ padding:'14px 18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{ticker}</span>
              {name && <span style={{ color:C.dim, fontSize:10, fontFamily:sansFont }}>{name}</span>}
              {action && <Badge color={actionColor(action)}>{String(action).toUpperCase()}</Badge>}
              {setupType && <Badge color={setupColor(setupType)}>{setupType}</Badge>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              {confidence != null && <span style={{ background:`${C.gold}15`, color:C.gold, padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:700, fontFamily:font }}>{confidence}</span>}
              {t.conviction && <Badge color={convColor(t.conviction)}>{t.conviction}</Badge>}
            </div>
          </div>

          {signals.length > 0 && <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:8 }}>
            {signals.map((sig: string, j: number) => (
              <span key={j} style={{ padding:'2px 8px', borderRadius:4, fontSize:9, fontWeight:600, fontFamily:font, color:C.gold, background:`${C.gold}10`, border:`1px solid ${C.gold}20` }}>{String(sig).replace(/_/g, ' ')}</span>
            ))}
          </div>}

          {thesis && <div style={{ color:C.text, fontSize:11, lineHeight:1.6, fontFamily:sansFont, marginBottom:8 }}>{thesis}</div>}
          {!thesis && thesisBullets.length > 0 && <div style={{ marginBottom:8 }}>
            {thesisBullets.filter((b: string) => b).slice(0, 3).map((b: string, j: number) => (
              <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:3 }}>
                <span style={{ color:C.blue, fontSize:9, marginTop:3 }}>▸</span>
                <span style={{ color:C.text, fontSize:11, lineHeight:1.5, fontFamily:sansFont }}>{b}</span>
              </div>
            ))}
          </div>}

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px, 1fr))', gap:6, marginBottom:8 }}>
            {[['Entry', entry, C.bright], ['Stop', stop, C.red], ['Target', target, C.green], ['Target 2', target2, C.green], ['R/R', rr, C.gold], ['Timeframe', tf, C.dim]].map(([l, v, c]) => v ? <div key={l as string} style={{ background:C.bg, borderRadius:6, padding:'6px 10px' }}>
              <div style={{ color:C.dim, fontSize:8, fontFamily:font, textTransform:'uppercase' }}>{l as string}</div>
              <div style={{ color:c as string, fontSize:13, fontWeight:700, fontFamily:font, marginTop:2 }}>{v as string}</div>
            </div> : null)}
          </div>

          {risk && <div style={{ marginTop:4 }}>
            <div style={{ color:C.dim, fontSize:10, fontFamily:sansFont, fontStyle:'italic', whiteSpace:'normal', wordBreak:'break-word', overflow:'hidden', ...(riskExpanded ? {} : { display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const }) }}>Risk: {risk}</div>
            {risk.length > 120 && <button onClick={(e) => toggleRisk(cardId, e)} style={{ background:'none', border:'none', padding:0, marginTop:2, color:C.blue, fontSize:9, fontFamily:font, cursor:'pointer', fontWeight:600 }}>{riskExpanded ? 'Show less' : 'Show more'}</button>}
          </div>}

          {tvUrl && <a href={tvUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', marginTop:8, background:`${C.blue}10`, border:`1px solid ${C.blue}30`, borderRadius:4, color:C.blue, fontSize:10, fontWeight:700, fontFamily:font, textDecoration:'none', cursor:'pointer' }}>TradingView ↗</a>}
        </div>

        {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
          <TradingViewMini ticker={ticker} pick={t} />
        </div>}
      </CardWrap>;
    };

    const dh = s.meta?.data_health;
    const dhWarnings: string[] = [];
    if (dh) {
      if (dh.rate_limited && (Array.isArray(dh.rate_limited) ? dh.rate_limited.length : true)) dhWarnings.push(`Rate-limited: ${Array.isArray(dh.rate_limited) ? dh.rate_limited.join(', ') : dh.rate_limited}`);
      if (dh.budget_exhausted && (Array.isArray(dh.budget_exhausted) ? dh.budget_exhausted.length : true)) dhWarnings.push(`Budget exhausted: ${Array.isArray(dh.budget_exhausted) ? dh.budget_exhausted.join(', ') : dh.budget_exhausted}`);
      if (dh.errors && (Array.isArray(dh.errors) ? dh.errors.length : true)) dhWarnings.push(`Errors: ${Array.isArray(dh.errors) ? dh.errors.join(', ') : dh.errors}`);
    }
    const dhBanner = dhWarnings.length > 0 ? <div style={{ padding:'8px 14px', background:`${C.gold}10`, border:`1px solid ${C.gold}25`, borderRadius:6, marginBottom:10, display:'flex', alignItems:'flex-start', gap:8 }}>
      <span style={{ color:C.gold, fontSize:13, lineHeight:1, flexShrink:0 }}>⚠</span>
      <div style={{ color:C.gold, fontSize:11, fontFamily:sansFont, lineHeight:1.5 }}>{dhWarnings.join(' · ')}<span style={{ color:C.dim, fontSize:10 }}> — Some data sources may be incomplete.</span></div>
    </div> : null;

    return <div>
      <div style={{ padding:'16px 20px', background:`linear-gradient(135deg, ${C.card} 0%, ${C.bg} 100%)`, border:`1px solid ${C.border}`, borderRadius:12, marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:summary ? 8 : 0 }}>
          <span style={{ fontSize:20 }}>⚔️</span>
          <span style={{ color:C.bright, fontSize:18, fontWeight:800, fontFamily:sansFont }}>Best Trades</span>
        </div>
        {summary && <div style={{ color:C.text, fontSize:12, lineHeight:1.7, fontFamily:sansFont }}>{summary}</div>}
      </div>
      {dhBanner}
      {topTrades.length > 0 && <div style={{ marginBottom:12 }}>
        {bearish.length > 0 && <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ color:C.green, fontSize:14 }}>▲</span> Top Trades
        </div>}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {topTrades.map((t: any, i: number) => renderTradeCard(t, 'tt', i))}
        </div>
      </div>}
      {bearish.length > 0 && <div style={{ marginBottom:12 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ color:C.red, fontSize:14 }}>▼</span> Bearish (High Conviction)
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {bearish.map((t: any, i: number) => renderTradeCard(t, 'bear', i))}
        </div>
      </div>}
      {topTrades.length === 0 && bearish.length === 0 && <div style={{ padding:20, color:C.dim, fontSize:12, fontFamily:sansFont, textAlign:'center' }}>No trade signals available at this time.</div>}
    </div>;
  }

  function renderFundamentals(s: any) {
    const picks = s.picks || [];
    return <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {picks.map((p: any, i: number) => {
        const isExp = expandedTicker === `f-${i}`;
        const fin = p.financials || {};
        const val = p.valuation || {};
        return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `f-${i}`)} expanded={isExp} borderColor={convColor(p.conviction)}>
          <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ width:22, height:22, borderRadius:'50%', background:`${C.blue}15`, display:'inline-flex', alignItems:'center', justifyContent:'center', color:C.blue, fontSize:10, fontWeight:800, fontFamily:font, flexShrink:0 }}>{i+1}</span>
              <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{p.ticker}</span>
              <span style={{ color:C.dim, fontSize:12 }}>{p.company}</span>
              <span style={{ color:changeColor(p.change), fontWeight:600, fontSize:13, fontFamily:font }}>{p.price} {p.change}</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <Badge color={C.dim}>{p.market_cap}</Badge>
              <Badge color={C.dim}>{p.sector}</Badge>
              <Badge color={convColor(p.conviction)}>{p.conviction}</Badge>
            </div>
          </div>
          {p.headline && <div style={{ padding:'0 18px 10px', color:C.gold, fontSize:12, fontWeight:600, fontFamily:sansFont }}>{p.headline}</div>}
          <div style={{ padding:'4px 14px', background:`${convColor(p.conviction)}08`, borderTop:`1px solid ${C.border}`, color:convColor(p.conviction), fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em' }}>{p.conviction} CONVICTION{p.why_conviction ? ' — ' + p.why_conviction : ''}</div>
          {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <div style={{ color:C.green, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>Revenue & Growth</div>
                <StatRow label="Revenue (Latest Q)" value={fin.revenue_latest_q} color={C.bright} />
                <StatRow label="Revenue YoY" value={fin.revenue_yoy_growth} />
                <StatRow label="Revenue QoQ" value={fin.revenue_qoq_growth} />
                <StatRow label="Revenue Trend" value={fin.revenue_trend} />
                <StatRow label="Gross Margin" value={fin.gross_margin} />
                <StatRow label="Gross Margin Δ" value={fin.gross_margin_change} />
              </div>
              <div>
                <div style={{ color:C.blue, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>EBITDA & Profitability</div>
                <StatRow label="EBITDA" value={fin.ebitda} />
                <StatRow label="EBITDA Margin" value={fin.ebitda_margin} />
                <StatRow label="EBITDA Margin (Prev Q)" value={fin.ebitda_margin_prev_q} />
                <StatRow label="EBITDA Margin (Prev Yr)" value={fin.ebitda_margin_prev_year} />
                <StatRow label="EBITDA Trend" value={fin.ebitda_trend} />
                <StatRow label="Net Income" value={fin.net_income} />
                <StatRow label="EPS Surprise" value={fin.eps_surprise} />
                <StatRow label="EPS Streak" value={fin.eps_streak} />
                <StatRow label="FCF" value={fin.fcf} />
                <StatRow label="FCF Margin" value={fin.fcf_margin} />
              </div>
            </div>
            <div style={{ marginTop:16 }}>
              <div style={{ color:C.gold, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>Valuation</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:8 }}>
                {Object.entries(val).map(([k, v]) => <IndicatorPill key={k} label={k.replace(/_/g,' ')} value={v as string} />)}
              </div>
            </div>
            {p.catalyst && <div style={{ marginTop:14, padding:12, background:`${C.gold}08`, border:`1px solid ${C.gold}15`, borderRadius:8, color:C.text, fontSize:12, fontFamily:sansFont }}><span style={{ color:C.gold, fontWeight:700 }}>Catalyst: </span>{p.catalyst}</div>}
          </div>}
        </CardWrap>;
      })}
    </div>;
  }

  function renderTechnicals(s: any) {
    const picks = s.picks || [];
    return <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {picks.map((p: any, i: number) => {
        const isExp = expandedTicker === `ta-${i}`;
        const ind = p.indicators || {};
        return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `ta-${i}`)} expanded={isExp} borderColor={convColor(p.conviction)}>
          <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ width:22, height:22, borderRadius:'50%', background:`${C.blue}15`, display:'inline-flex', alignItems:'center', justifyContent:'center', color:C.blue, fontSize:10, fontWeight:800, fontFamily:font, flexShrink:0 }}>{i+1}</span>
              <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{p.ticker}</span>
              <span style={{ color:C.dim, fontSize:12 }}>{p.company}</span>
              <span style={{ color:changeColor(p.change), fontWeight:600, fontSize:13, fontFamily:font }}>{p.price} {p.change}</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <Badge color={C.dim}>{p.market_cap}</Badge>
              <Badge color={convColor(p.conviction)}>{p.conviction}</Badge>
            </div>
          </div>
          <div style={{ padding:'0 18px 10px', color:C.gold, fontSize:12, fontWeight:600, fontFamily:sansFont }}>{p.setup_name}</div>
          <div style={{ padding:'4px 14px', background:`${convColor(p.conviction)}08`, borderTop:`1px solid ${C.border}`, color:convColor(p.conviction), fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em' }}>{p.conviction} CONVICTION{p.why_conviction ? ' — ' + p.why_conviction : ''}</div>
          {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
            <TradingViewMini ticker={p.ticker} pick={p} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8, marginBottom:10 }}>
              <IndicatorPill label="Stage" value={ind.stage} />
              <IndicatorPill label="RSI (14)" value={ind.rsi_14} signal={ind.rsi_signal} />
              <IndicatorPill label="MACD" value="—" signal={ind.macd} />
              <IndicatorPill label="MACD Histogram" value="—" signal={ind.macd_histogram} />
              <IndicatorPill label="SMA 20" value="—" signal={ind.sma_20} />
              <IndicatorPill label="SMA 50" value="—" signal={ind.sma_50} />
              <IndicatorPill label="SMA 200" value="—" signal={ind.sma_200} />
              <IndicatorPill label="Bollinger" value="—" signal={ind.bollinger} />
              <IndicatorPill label="Volume" value={ind.volume_today} signal={`${ind.volume_ratio || ''} ${ind.volume_pattern || ''}`} />
              <IndicatorPill label="Rel. Strength" value="—" signal={ind.relative_strength} />
              <IndicatorPill label="Support" value="—" signal={ind.support} />
              <IndicatorPill label="Resistance" value="—" signal={ind.resistance} />
            </div>
            {p.pattern && <div style={{ padding:12, background:`${C.blue}06`, border:`1px solid ${C.blue}15`, borderRadius:8, color:C.text, fontSize:12, lineHeight:1.6, fontFamily:sansFont, marginBottom:10 }}>{p.pattern}</div>}
            {p.trade_plan && <div style={{ background:`${C.green}06`, border:`1px solid ${C.green}15`, borderRadius:8, padding:14 }}>
              <div style={{ color:C.green, fontSize:11, fontWeight:700, fontFamily:font, marginBottom:10, textTransform:'uppercase' }}>Trade Plan</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:8 }}>
                {[['Entry', p.trade_plan.entry, C.bright], ['Stop', p.trade_plan.stop, C.red], ['Target 1', p.trade_plan.target_1, C.green], ['Target 2', p.trade_plan.target_2, C.green], ['R/R', p.trade_plan.risk_reward, C.gold]].map(([l,v,c]) => v ? <div key={l as string}><div style={{ color:C.dim, fontSize:9, fontFamily:font, textTransform:'uppercase' }}>{l as string}</div><div style={{ color:c as string, fontSize:14, fontWeight:700, fontFamily:font, marginTop:2 }}>{v as string}</div></div> : null)}
              </div>
            </div>}
          </div>}
        </CardWrap>;
      })}
    </div>;
  }

  function renderAnalysis(s: any) {
    return <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 22px', background:C.card, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ color:C.blue, fontWeight:800, fontSize:22, fontFamily:font }}>{s.ticker}</span>
          <span style={{ color:C.dim, fontSize:13 }}>{s.company}</span>
          <span style={{ color:changeColor(s.change), fontWeight:700, fontSize:15, fontFamily:font }}>{s.price} {s.change}</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Badge color={C.dim}>{s.market_cap}</Badge>
          <Badge color={C.blue}>{s.stage}</Badge>
        </div>
      </div>
      {s.verdict && <div style={{ padding:'14px 18px', background:`${C.green}08`, border:`1px solid ${C.green}20`, borderRadius:10, marginBottom:10, color:C.bright, fontSize:13, fontWeight:600, fontFamily:sansFont }}>{s.verdict}</div>}
      {s.ticker && <TradingViewMini ticker={s.ticker} pick={s} />}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
        {s.ta && <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:16 }}>
          <div style={{ color:C.blue, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:12 }}>Technical</div>
          {Object.entries(s.ta).map(([k,v]) => <StatRow key={k} label={k.replace(/_/g,' ')} value={v as string} />)}
        </div>}
        {s.fundamentals && <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:16 }}>
          <div style={{ color:C.green, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:12 }}>Fundamentals</div>
          {Object.entries(s.fundamentals).map(([k,v]) => <StatRow key={k} label={k.replace(/_/g,' ')} value={v as string} />)}
        </div>}
        {s.sentiment && <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:16 }}>
          <div style={{ color:C.purple, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:12 }}>Sentiment</div>
          <StatRow label="Buzz" value={s.sentiment.buzz_level} />
          <StatRow label="Bull %" value={`${s.sentiment.bull_pct}%`} color={C.green} />
          <StatRow label="Fear & Greed" value={String(s.sentiment.fear_greed)} />
          <StatRow label="Put/Call" value={s.sentiment.put_call} />
          <div style={{ marginTop:10, padding:10, background:`${C.green}08`, borderRadius:6, fontSize:11, color:C.text, lineHeight:1.5 }}>🐂 {s.sentiment.bull_thesis}</div>
          <div style={{ marginTop:6, padding:10, background:`${C.red}08`, borderRadius:6, fontSize:11, color:C.text, lineHeight:1.5 }}>🐻 {s.sentiment.bear_thesis}</div>
        </div>}
      </div>
      {s.trade_plan && <div style={{ background:`${C.blue}06`, border:`1px solid ${C.blue}15`, borderRadius:10, padding:16 }}>
        <div style={{ color:C.blue, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:12 }}>Trade Plan</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:10 }}>
          {[['Entry', s.trade_plan.entry, C.bright], ['Stop Loss', s.trade_plan.stop, C.red], ['Target 1', s.trade_plan.target_1, C.green], ['Target 2', s.trade_plan.target_2, C.green], ['R/R', s.trade_plan.risk_reward, C.gold], ['Timeframe', s.trade_plan.timeframe, C.dim]].map(([l,v,c]) => v ? <div key={l as string}><div style={{ color:C.dim, fontSize:9, fontFamily:font, textTransform:'uppercase' }}>{l as string}</div><div style={{ color:c as string, fontSize:16, fontWeight:700, fontFamily:font, marginTop:3 }}>{v as string}</div></div> : null)}
        </div>
      </div>}
    </div>;
  }

  function renderInvestments(s: any) {
    const picks = s.picks || [];
    return <div>
      {s.market_context && <div style={{ padding:'14px 18px', background:`${C.green}06`, border:`1px solid ${C.green}15`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6 }}>{s.market_context}</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {picks.map((p: any, i: number) => {
          const isExp = expandedTicker === `inv-${i}`;
          const fund = p.fundamentals || {};
          const sq = p.sqglp || {};
          return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `inv-${i}`)} expanded={isExp} borderColor={convColor(p.conviction)}>
            <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ width:22, height:22, borderRadius:'50%', background:`${C.blue}15`, display:'inline-flex', alignItems:'center', justifyContent:'center', color:C.blue, fontSize:10, fontWeight:800, fontFamily:font, flexShrink:0 }}>{i+1}</span>
                <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{p.ticker}</span>
                <span style={{ color:C.dim, fontSize:12 }}>{p.company}</span>
                <span style={{ color:C.bright, fontWeight:600, fontSize:13, fontFamily:font }}>{p.price}</span>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Badge color={C.dim}>{p.market_cap}</Badge>
                <Badge color={convColor(p.conviction)}>{p.conviction}</Badge>
              </div>
            </div>
            <div style={{ padding:'0 18px 10px', color:C.text, fontSize:12, lineHeight:1.6, fontFamily:sansFont, ...(isExp ? {} : { overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }) }}>{p.investment_thesis}</div>
            <div style={{ padding:'4px 14px', background:`${convColor(p.conviction)}08`, borderTop:`1px solid ${C.border}`, color:convColor(p.conviction), fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em' }}>{p.conviction} CONVICTION{p.why_conviction ? ' — ' + p.why_conviction : ''}</div>
            {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
              {p.moat && <div style={{ padding:12, background:`${C.purple}08`, border:`1px solid ${C.purple}15`, borderRadius:8, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont }}><span style={{ color:C.purple, fontWeight:700 }}>Moat: </span>{p.moat}</div>}
              <div style={{ marginBottom:10 }}>
                <div style={{ color:C.gold, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>SQGLP Assessment</div>
                {Object.entries(sq).map(([k, v]) => <StatRow key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v as string} />)}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:10 }}>
                <div>
                  <div style={{ color:C.green, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>Growth & Profitability</div>
                  <StatRow label="Revenue YoY" value={fund.revenue_growth_yoy} />
                  <StatRow label="EBITDA Margin" value={fund.ebitda_margin} />
                  <StatRow label="EBITDA Trend" value={fund.ebitda_margin_trend} />
                  <StatRow label="Insider Buying" value={fund.insider_buying} />
                  <StatRow label="Short Float" value={fund.short_float} />
                </div>
                <div>
                  <div style={{ color:C.blue, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>Valuation</div>
                  <StatRow label="P/E" value={fund.pe_ratio} color={C.bright} />
                  <StatRow label="P/S" value={fund.ps_ratio} color={C.bright} />
                  <StatRow label="EV/EBITDA" value={fund.ev_ebitda} color={C.bright} />
                  <StatRow label="Analyst Target" value={fund.analyst_target} />
                  <StatRow label="Earnings Streak" value={fund.earnings_streak} />
                </div>
              </div>
              {p.risk && <div style={{ padding:12, background:`${C.red}08`, border:`1px solid ${C.red}15`, borderRadius:8, color:C.text, fontSize:12, fontFamily:sansFont }}><span style={{ color:C.red, fontWeight:700 }}>Risk: </span>{p.risk}</div>}
              {p.stage && <div style={{ marginTop:10, color:C.dim, fontSize:11, fontFamily:font }}>Weinstein: {p.stage}</div>}
              <TradingViewMini ticker={p.ticker} pick={p} />
            </div>}
          </CardWrap>;
        })}
      </div>
    </div>;
  }

  function renderScreener(s: any) {
    const topPicks = s.top_picks || [];
    const rows = s.results || s.rows || [];
    const sortedRows = [...rows].sort((a: any, b: any) => {
      if (!screenerSortCol) return 0;
      const av = a[screenerSortCol] ?? '';
      const bv = b[screenerSortCol] ?? '';
      const an = parseFloat(String(av).replace(/[^0-9.\-]/g, ''));
      const bn = parseFloat(String(bv).replace(/[^0-9.\-]/g, ''));
      if (!isNaN(an) && !isNaN(bn)) return screenerSortAsc ? an - bn : bn - an;
      return screenerSortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    const cols = [
      {key:'ticker', label:'Ticker', w:'70px'},
      {key:'company', label:'Company', w:'1fr'},
      {key:'price', label:'Price', w:'80px'},
      {key:'change', label:'Chg%', w:'70px'},
      {key:'market_cap', label:'Mkt Cap', w:'80px'},
      {key:'rev_growth', label:'Rev Grw', w:'70px'},
      {key:'margin', label:'Margin', w:'65px'},
      {key:'pe', label:'P/E', w:'55px'},
      {key:'rsi', label:'RSI', w:'50px'},
      {key:'volume', label:'Vol', w:'70px'},
      {key:'analyst_rating', label:'Rating', w:'70px'},
      {key:'upside', label:'Upside', w:'65px'},
    ];
    const handleSort = (key: string) => {
      if (screenerSortCol === key) setScreenerSortAsc(!screenerSortAsc);
      else { setScreenerSortCol(key); setScreenerSortAsc(true); }
    };

    return <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
      {s.summary && <div style={{ padding:'14px 18px', background:`${C.purple}08`, border:`1px solid ${C.purple}20`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.7 }}>{s.summary}</div>}

      {topPicks.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:14, fontWeight:800, fontFamily:sansFont, marginBottom:10 }}>Top Picks</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {topPicks.map((pick: any, i: number) => (
            <div key={i} style={{ padding:'14px 18px', background:C.card, border:`1px solid ${C.purple}25`, borderRadius:10, borderLeft:`3px solid ${C.purple}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <span style={{ color:C.gold, fontWeight:800, fontSize:16, fontFamily:font }}>#{i+1}</span>
                <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{pick.ticker}</span>
                <span style={{ color:C.dim, fontSize:11 }}>{pick.company}</span>
                <span style={{ color:C.bright, fontSize:14, fontWeight:700, fontFamily:font }}>{pick.price}</span>
                <span style={{ color:changeColor(pick.change), fontSize:12, fontWeight:600, fontFamily:font }}>{pick.change}</span>
                {pick.conviction && <Badge color={convColor(pick.conviction)}>{pick.conviction}</Badge>}
              </div>
              <div style={{ color:C.text, fontSize:12, lineHeight:1.7, fontFamily:sansFont }}>{pick.analysis || pick.thesis}</div>
            </div>
          ))}
        </div>
      </div>}

      {sortedRows.length > 0 && <div style={{ borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}` }}>
        <div style={{ display:'grid', gridTemplateColumns:cols.map(c => c.w).join(' '), background:'#0d0e12', borderBottom:`1px solid ${C.border}` }}>
          {cols.map(col => (
            <div key={col.key} onClick={() => handleSort(col.key)} style={{ padding:'8px 6px', color:screenerSortCol === col.key ? C.blue : C.dim, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em', cursor:'pointer', userSelect:'none', display:'flex', alignItems:'center', gap:2 }}>
              {col.label}{screenerSortCol === col.key ? (screenerSortAsc ? ' ↑' : ' ↓') : ''}
            </div>
          ))}
        </div>
        {sortedRows.map((row: any, i: number) => {
          const isExp = expandedTicker === `scr-${i}`;
          const isTop = topPicks.some((p: any) => p.ticker === row.ticker);
          return <div key={i}>
            <div onClick={() => setExpandedTicker(isExp ? null : `scr-${i}`)} style={{ display:'grid', gridTemplateColumns:cols.map(c => c.w).join(' '), background: isTop ? `${C.purple}06` : (i % 2 === 0 ? C.card : C.bg), borderBottom:`1px solid ${C.border}`, cursor:'pointer', transition:'background 0.1s', borderLeft: isTop ? `2px solid ${C.purple}` : '2px solid transparent' }} onMouseEnter={e => e.currentTarget.style.background = `${C.blue}08`} onMouseLeave={e => e.currentTarget.style.background = isTop ? `${C.purple}06` : (i % 2 === 0 ? C.card : C.bg)}>
              <div style={{ padding:'8px 6px', color:C.blue, fontSize:12, fontWeight:700, fontFamily:font }}>{row.ticker ?? '—'}</div>
              <div style={{ padding:'8px 6px', color:C.text, fontSize:11, fontFamily:sansFont, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.company ?? '—'}</div>
              <div style={{ padding:'8px 6px', color:C.bright, fontSize:12, fontWeight:600, fontFamily:font }}>{row.price ?? '—'}</div>
              <div style={{ padding:'8px 6px', color:changeColor(row.change), fontSize:11, fontWeight:600, fontFamily:font }}>{row.change ?? '—'}</div>
              <div style={{ padding:'8px 6px', color:C.text, fontSize:11, fontFamily:font }}>{row.market_cap ?? '—'}</div>
              <div style={{ padding:'8px 6px', color:trendColor(row.rev_growth), fontSize:11, fontWeight:600, fontFamily:font }}>{row.rev_growth ?? '—'}</div>
              <div style={{ padding:'8px 6px', color:trendColor(row.margin), fontSize:11, fontFamily:font }}>{row.margin ?? '—'}</div>
              <div style={{ padding:'8px 6px', color:C.text, fontSize:11, fontFamily:font }}>{row.pe ?? '—'}</div>
              <div style={{ padding:'8px 6px', color: parseFloat(row.rsi||'50') < 35 ? C.green : parseFloat(row.rsi||'50') > 70 ? C.red : C.text, fontSize:11, fontWeight:600, fontFamily:font }}>{row.rsi ?? '—'}</div>
              <div style={{ padding:'8px 6px', color:C.text, fontSize:11, fontFamily:font }}>{row.volume ?? '—'}</div>
              <div style={{ padding:'8px 6px', color: row.analyst_rating?.toLowerCase().includes('buy') ? C.green : row.analyst_rating?.toLowerCase().includes('sell') ? C.red : C.text, fontSize:10, fontWeight:600, fontFamily:font }}>{row.analyst_rating ?? '—'}</div>
              <div style={{ padding:'8px 6px', color:changeColor(row.upside), fontSize:11, fontWeight:600, fontFamily:font, display:'flex', alignItems:'center', gap:4 }}>{row.upside ?? '—'}{row.insider?.form4_recent && <span style={{ padding:'1px 5px', borderRadius:3, fontSize:8, fontWeight:700, fontFamily:font, color:C.gold, background:`${C.gold}12`, border:`1px solid ${C.gold}20` }} title={row.insider?.form4_latest_date || ''}>Form 4</span>}{row.catalyst?.recent_8k && <span style={{ padding:'1px 5px', borderRadius:3, fontSize:8, fontWeight:700, fontFamily:font, color:C.purple, background:`${C.purple}12`, border:`1px solid ${C.purple}20` }} title={row.catalyst?.latest_8k_date || ''}>8-K</span>}</div>
            </div>
            {isExp && <div style={{ padding:14, background:`${C.card}`, borderBottom:`1px solid ${C.border}` }}>
              <TradingViewMini ticker={row.ticker} pick={row} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10 }}>
                {row.ta_summary && <div style={{ background:C.bg, borderRadius:8, padding:12, border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.blue, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:6 }}>Technical</div>
                  <div style={{ color:C.text, fontSize:11, lineHeight:1.7, fontFamily:sansFont }}>{row.ta_summary}</div>
                </div>}
                {row.fundamental_summary && <div style={{ background:C.bg, borderRadius:8, padding:12, border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.green, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:6 }}>Fundamentals</div>
                  <div style={{ color:C.text, fontSize:11, lineHeight:1.7, fontFamily:sansFont }}>{row.fundamental_summary}</div>
                </div>}
              </div>
              {row.thesis && <div style={{ padding:10, background:`${C.blue}06`, border:`1px solid ${C.blue}15`, borderRadius:8, marginBottom:12, color:C.text, fontSize:11, fontFamily:sansFont, lineHeight:1.6 }}>{row.thesis}</div>}
              {row.trade_plan && <div style={{ background:`${C.green}06`, border:`1px solid ${C.green}15`, borderRadius:8, padding:14 }}>
                <div style={{ color:C.green, fontSize:11, fontWeight:700, fontFamily:font, marginBottom:10, textTransform:'uppercase' }}>Trade Plan</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:8 }}>
                  {[['Entry', row.trade_plan.entry, C.bright], ['Stop', row.trade_plan.stop, C.red], ['Target', row.trade_plan.target, C.green], ['R/R', row.trade_plan.risk_reward, C.gold]].map(([l,v,col]) => v ? <div key={l as string}><div style={{ color:C.dim, fontSize:9, fontFamily:font, textTransform:'uppercase' }}>{l as string}</div><div style={{ color:col as string, fontSize:14, fontWeight:700, fontFamily:font, marginTop:2 }}>{v as string}</div></div> : null)}
                </div>
              </div>}
            </div>}
          </div>;
        })}
      </div>}
    </div>;
  }

  function renderCrypto(s: any) {
    const momentum = s.top_momentum || [];
    const categories = s.hot_categories || [];
    const funding = s.funding_analysis || {};
    const catalysts = s.upcoming_catalysts || [];
    const onChain = s.on_chain_signals || {};
    const btcEth = s.btc_eth_summary || {};
    const perpsOverview = s.perps_overview || null;
    const perpsSummary = perpsOverview?.market_summary || null;
    const perpsSqueezes = s.perps_squeezes || [];
    const perpsCrowded = s.perps_crowded_longs || [];
    const perpsDivergences = s.perps_divergences || [];
    const perpsTopVol = s.perps_top_volume || [];
    const perpsTopOi = s.perps_top_oi || [];
    const xSentiment = s.x_sentiment || null;
    const socialMovers = xSentiment?.top_social_movers || xSentiment?.trending_tickers || [];
    const narrativeHeat = xSentiment?.narrative_heat || [];
    const contrarianSignals = xSentiment?.contrarian_signals || [];

    const fmtBig = (n: any): string => {
      if (n == null) return 'N/A';
      if (typeof n === 'string') return n;
      const num = Number(n);
      if (isNaN(num)) return String(n);
      if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
      if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
      return `$${num.toFixed(0)}`;
    };
    const fmtFunding = (r: any): string => {
      if (r == null) return 'N/A';
      if (typeof r === 'string') return r;
      return `${(Number(r) * 100).toFixed(4)}%`;
    };
    const fmtFundingAnn = (r: any): string => {
      if (r == null) return '';
      if (typeof r === 'string') return r;
      return `${Number(r).toFixed(1)}%`;
    };
    const fmtPct = (r: any): string => {
      if (r == null) return '—';
      if (typeof r === 'string') return r;
      return `${Number(r) >= 0 ? '+' : ''}${Number(r).toFixed(1)}%`;
    };
    const biasColor = (b: string) => {
      const l = (b || '').toLowerCase();
      if (l.includes('long') || l.includes('bullish')) return C.green;
      if (l.includes('short') || l.includes('bearish')) return C.red;
      return C.dim;
    };
    const oiMap = new Map(perpsTopOi.map((x: any) => [x.coin, x]));

    return <div>
      {s.market_overview && <div style={{ padding:'16px 20px', background:`${C.purple}08`, border:`1px solid ${C.purple}20`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.7 }}>{s.market_overview}</div>}

      {(btcEth.btc || btcEth.eth) && <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10 }}>
        {['btc', 'eth'].map(key => {
          const d = btcEth[key];
          if (!d) return null;
          return <div key={key} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ color:key === 'btc' ? '#f7931a' : '#627eea', fontWeight:800, fontSize:16, fontFamily:font }}>{key.toUpperCase()}</span>
              <span style={{ color:C.bright, fontSize:18, fontWeight:700, fontFamily:font }}>{d.price}</span>
            </div>
            <div style={{ display:'flex', gap:12, fontSize:11, fontFamily:font, marginBottom:8 }}>
              <span style={{ color:C.dim }}>24h: <span style={{ color:changeColor(d.change_24h), fontWeight:600 }}>{d.change_24h}</span></span>
              {d.change_7d && <span style={{ color:C.dim }}>7d: <span style={{ color:changeColor(d.change_7d), fontWeight:600 }}>{d.change_7d}</span></span>}
              {d.dominance && <span style={{ color:C.dim }}>Dom: <span style={{ color:C.bright }}>{d.dominance}</span></span>}
              {d.funding_rate && <span style={{ color:C.dim }}>Funding: <span style={{ color:parseFloat(d.funding_rate) > 0.03 ? C.red : parseFloat(d.funding_rate) < -0.01 ? C.green : C.text, fontWeight:600 }}>{d.funding_rate}</span></span>}
            </div>
            {d.signal && <div style={{ color:trendColor(d.signal), fontSize:11, fontFamily:sansFont }}>{d.signal}</div>}
          </div>;
        })}
      </div>}

      {Object.keys(funding).length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Derivatives & Funding Rates</div>
        {funding.market_bias && <div style={{ padding:'10px 16px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, marginBottom:10, display:'flex', gap:16, fontSize:11, fontFamily:font }}>
          <span style={{ color:C.dim }}>Market Bias: <span style={{ color:trendColor(funding.market_bias), fontWeight:600 }}>{funding.market_bias}</span></span>
          <span style={{ color:C.dim }}>Avg Funding: <span style={{ color:C.bright }}>{funding.avg_funding_rate}%</span></span>
          <span style={{ color:C.dim }}>Perps Tracked: <span style={{ color:C.bright }}>{funding.total_perps_tracked}</span></span>
        </div>}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {funding.crowded_longs && funding.crowded_longs.length > 0 && <div style={{ background:`${C.red}06`, border:`1px solid ${C.red}12`, borderRadius:8, padding:12 }}>
            <div style={{ color:C.red, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:8 }}>Crowded Longs (Correction Risk)</div>
            {funding.crowded_longs.slice(0, 5).map((f: any, i: number) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none', fontSize:11, fontFamily:font }}>
                <span style={{ color:C.bright }}>{f.symbol}</span>
                <span style={{ color:C.red, fontWeight:600 }}>+{f.funding}%</span>
              </div>
            ))}
          </div>}
          {funding.squeeze_candidates && funding.squeeze_candidates.length > 0 && <div style={{ background:`${C.green}06`, border:`1px solid ${C.green}12`, borderRadius:8, padding:12 }}>
            <div style={{ color:C.green, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:8 }}>Squeeze Candidates (Short Crowding)</div>
            {funding.squeeze_candidates.slice(0, 5).map((f: any, i: number) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none', fontSize:11, fontFamily:font }}>
                <span style={{ color:C.bright }}>{f.symbol}</span>
                <span style={{ color:C.green, fontWeight:600 }}>{f.funding}%</span>
              </div>
            ))}
          </div>}
        </div>
      </div>}

      {categories.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Narrative Rotation — Hot Categories</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10 }}>
          {categories.map((cat: any, i: number) => (
            <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:12 }}>
              <div style={{ color:C.purple, fontWeight:700, fontSize:12, fontFamily:font, marginBottom:4 }}>{cat.name}</div>
              <div style={{ color:changeColor(cat.market_cap_change_24h), fontSize:16, fontWeight:700, fontFamily:font, marginBottom:4 }}>{cat.market_cap_change_24h}</div>
              {cat.top_coins && <div style={{ color:C.dim, fontSize:10, fontFamily:font }}>Leaders: <span style={{ color:C.text }}>{cat.top_coins}</span></div>}
              {cat.signal && <div style={{ color:trendColor(cat.signal), fontSize:10, fontFamily:sansFont, marginTop:4 }}>{cat.signal}</div>}
            </div>
          ))}
        </div>
      </div>}

      {(perpsSummary || perpsSqueezes.length > 0 || perpsCrowded.length > 0 || perpsDivergences.length > 0 || perpsTopVol.length > 0) && <div style={{ marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <span style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont }}>Futures & Perps — Hyperliquid</span>
          <Badge color="#f59e0b">PERPS</Badge>
        </div>

        {perpsSummary && <div style={{ display:'flex', gap:0, marginBottom:12, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 18px', flexWrap:'wrap' }}>
          {[
            ['Total OI', fmtBig(perpsSummary.total_open_interest_usd ?? perpsSummary.total_oi), false],
            ['24h Vol', fmtBig(perpsSummary.total_volume_24h_usd ?? perpsSummary.volume_24h), false],
            ['Avg Funding', perpsSummary.avg_funding_annualized != null ? fmtFundingAnn(perpsSummary.avg_funding_annualized) : (perpsSummary.avg_funding ?? 'N/A'), false],
            ['Bias', perpsSummary.market_bias, true],
          ].map(([label, val, isBias], i) => val && val !== 'N/A' ? <div key={i} style={{ flex:1, minWidth:120, padding:'0 12px', borderRight: i < 3 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ color:C.dim, fontSize:9, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{label as string}</div>
            <div style={{ color: isBias ? biasColor(val as string) : '#5cc8f0', fontSize:15, fontWeight:700, fontFamily:font }}>{val as string}</div>
          </div> : null)}
        </div>}

        {perpsSqueezes.length > 0 && <div style={{ marginBottom:12 }}>
          <div style={{ color:'#f97316', fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
            <Badge color="#f97316">SQUEEZE</Badge> Squeeze Candidates — High Signal
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {perpsSqueezes.map((sq: any, i: number) => {
              const fr = sq.funding_rate;
              const frDisplay = fmtFunding(fr);
              const frAnn = sq.funding_annualized != null ? ` (ann: ${fmtFundingAnn(sq.funding_annualized)})` : '';
              const frNeg = fr != null && Number(fr) < 0;
              const oi = sq.open_interest_usd ?? sq.oi ?? sq.open_interest;
              const ch24 = sq.price_change_24h ?? sq.change_24h ?? sq['24h'];
              return <div key={i} style={{ background:C.card, border:`1px solid #f9731630`, borderLeft:`3px solid #f97316`, borderRadius:8, padding:'12px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    <span style={{ color:C.bright, fontWeight:800, fontSize:14, fontFamily:font }}>{sq.coin || sq.symbol}</span>
                    <span style={{ color:C.dim, fontSize:11, fontFamily:font }}>Funding: <span style={{ color: frNeg ? C.red : C.green, fontWeight:600 }}>{frDisplay}{frAnn}</span></span>
                    {oi != null && <span style={{ color:C.dim, fontSize:11, fontFamily:font }}>OI: <span style={{ color:'#5cc8f0', fontWeight:600 }}>{fmtBig(oi)}</span></span>}
                    {ch24 != null && <span style={{ color:C.dim, fontSize:11, fontFamily:font }}>24h: <span style={{ color:changeColor(fmtPct(ch24)), fontWeight:600 }}>{fmtPct(ch24)}</span></span>}
                  </div>
                  <Badge color="#f97316">SQUEEZE</Badge>
                </div>
                {sq.signal && <div style={{ color:C.text, fontSize:11, fontFamily:sansFont, lineHeight:1.5, fontStyle:'italic' }}>{sq.signal}</div>}
              </div>;
            })}
          </div>
        </div>}

        {perpsCrowded.length > 0 && <div style={{ marginBottom:12 }}>
          <div style={{ color:C.gold, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:8 }}>⚠️ Crowded Longs — Liquidation Risk</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {perpsCrowded.map((cl: any, i: number) => {
              const oi = cl.open_interest_usd ?? cl.oi ?? cl.open_interest;
              return <div key={i} style={{ background:C.card, border:`1px solid ${C.gold}20`, borderLeft:`3px solid ${C.gold}`, borderRadius:8, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <span style={{ color:C.bright, fontWeight:700, fontSize:13, fontFamily:font }}>{cl.coin || cl.symbol}</span>
                  <span style={{ color:C.dim, fontSize:11, fontFamily:font }}>Funding: <span style={{ color:C.red, fontWeight:600 }}>{fmtFunding(cl.funding_rate)}</span></span>
                  {oi != null && <span style={{ color:C.dim, fontSize:11, fontFamily:font }}>OI: <span style={{ color:'#5cc8f0', fontWeight:600 }}>{fmtBig(oi)}</span></span>}
                </div>
                {cl.signal && <span style={{ color:C.gold, fontSize:10, fontFamily:sansFont, maxWidth:300 }}>⚠️ {cl.signal}</span>}
              </div>;
            })}
          </div>
        </div>}

        {perpsDivergences.length > 0 && <div style={{ marginBottom:12 }}>
          <div style={{ color:C.bright, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:8 }}>Funding Divergences</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {perpsDivergences.map((dv: any, i: number) => {
              const isBullish = (dv.type || '').toLowerCase().includes('bullish');
              const accentColor = isBullish ? C.green : C.red;
              const badgeText = isBullish ? 'BULLISH ↑' : 'BEARISH ↓';
              const ch24 = dv.price_change_24h ?? dv.price_change ?? dv.price;
              return <div key={i} style={{ background:C.card, border:`1px solid ${accentColor}20`, borderLeft:`3px solid ${accentColor}`, borderRadius:8, padding:'10px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{ color:C.bright, fontWeight:700, fontSize:13, fontFamily:font }}>{dv.coin || dv.symbol}</span>
                  <Badge color={accentColor}>{badgeText}</Badge>
                  <span style={{ color:C.dim, fontSize:11, fontFamily:font }}>Funding: <span style={{ color:accentColor, fontWeight:600 }}>{fmtFunding(dv.funding_rate)}</span></span>
                  {ch24 != null && <span style={{ color:C.dim, fontSize:11, fontFamily:font }}>Price: <span style={{ color:changeColor(fmtPct(ch24)), fontWeight:600 }}>{fmtPct(ch24)}</span></span>}
                </div>
                {dv.signal && <div style={{ color:C.text, fontSize:11, fontFamily:sansFont, lineHeight:1.5 }}>{dv.signal}</div>}
              </div>;
            })}
          </div>
        </div>}

        {perpsTopVol.length > 0 && <div style={{ marginBottom:12 }}>
          <div style={{ color:C.bright, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:8 }}>Top Perps by Volume</div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr 1fr 1fr', padding:'8px 14px', background:`${C.border}40`, fontSize:9, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em', color:C.dim }}>
              <span>Coin</span><span style={{ textAlign:'right' }}>Volume 24h</span><span style={{ textAlign:'right' }}>OI</span><span style={{ textAlign:'right' }}>Funding</span><span style={{ textAlign:'right' }}>24h</span>
            </div>
            {perpsTopVol.slice(0, 10).map((tv: any, i: number) => {
              const vol = tv.volume_24h_usd ?? tv.volume_24h ?? tv.volume;
              const fr = tv.funding_rate ?? tv.funding;
              const ch = tv.price_change_24h ?? tv.change_24h ?? tv['24h'];
              const oiEntry = oiMap.get(tv.coin) || {};
              const oi = tv.open_interest_usd ?? oiEntry.open_interest_usd ?? tv.oi;
              const frNum = typeof fr === 'number' ? fr : parseFloat(String(fr || '0'));
              return <div key={i} style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr 1fr 1fr', padding:'8px 14px', borderBottom: i < Math.min(perpsTopVol.length, 10) - 1 ? `1px solid ${C.border}` : 'none', fontSize:12, fontFamily:font }}>
                <span style={{ color:C.bright, fontWeight:700 }}>{tv.coin || tv.symbol}</span>
                <span style={{ textAlign:'right', color:'#5cc8f0' }}>{fmtBig(vol)}</span>
                <span style={{ textAlign:'right', color:'#5cc8f0' }}>{oi != null ? fmtBig(oi) : '—'}</span>
                <span style={{ textAlign:'right', color: frNum > 0 ? C.green : C.red, fontWeight:600 }}>{fmtFunding(fr)}</span>
                <span style={{ textAlign:'right', color:changeColor(fmtPct(ch)), fontWeight:600 }}>{fmtPct(ch)}</span>
              </div>;
            })}
          </div>
        </div>}
      </div>}

      {xSentiment && <div style={{ marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <span style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont }}>𝕏 Sentiment — Powered by Grok</span>
          {xSentiment.market_mood && (() => {
            const m = (xSentiment.market_mood || '').toLowerCase();
            const moodColor = m.includes('euphoric') ? '#4ade80' : m.includes('risk-on') ? C.green : m.includes('fearful') ? '#ff4444' : m.includes('risk-off') ? C.red : C.dim;
            return <Badge color={moodColor}>{xSentiment.market_mood}</Badge>;
          })()}
        </div>

        {xSentiment.btc_sentiment && (() => {
          const bs = xSentiment.btc_sentiment;
          const sent = (bs.overall || bs.sentiment || bs.direction || '').toLowerCase();
          const sentColor = sent.includes('bullish') ? C.green : sent.includes('bearish') ? C.red : C.dim;
          const bgTint = sent.includes('bullish') ? `${C.green}08` : sent.includes('bearish') ? `${C.red}08` : `${C.dim}08`;
          return <div style={{ background:bgTint, border:`1px solid ${sentColor}20`, borderLeft:`3px solid ${sentColor}`, borderRadius:10, padding:'14px 18px', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
              <span style={{ color:'#f7931a', fontWeight:800, fontSize:15, fontFamily:font }}>BTC</span>
              <Badge color={sentColor}>{bs.overall || bs.sentiment || bs.direction || 'N/A'}</Badge>
              {bs.score != null && <span style={{ color:C.dim, fontSize:11, fontFamily:font }}>Score: <span style={{ color:sentColor, fontWeight:700 }}>{bs.score}</span></span>}
            </div>
            {(bs.key_narrative || bs.narrative) && <div style={{ color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6 }}>{bs.key_narrative || bs.narrative}</div>}
          </div>;
        })()}

        {socialMovers.length > 0 && <div style={{ marginBottom:12 }}>
          <div style={{ color:C.bright, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:8 }}>Top Social Movers</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {socialMovers.slice(0, 8).map((sm: any, i: number) => {
              const vel = (sm.social_velocity || sm.velocity || '').toLowerCase();
              const velColor = vel.includes('exploding') ? '#ff4444' : vel.includes('surging') ? '#f97316' : vel.includes('rising') ? C.gold : C.dim;
              const sentL = (sm.sentiment || '').toLowerCase();
              const smSentColor = sentL.includes('bullish') ? C.green : sentL.includes('bearish') ? C.red : C.dim;
              return <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${velColor}`, borderRadius:8, padding:'12px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ color:C.bright, fontWeight:800, fontSize:14, fontFamily:font }}>{sm.symbol || sm.coin || sm.ticker}</span>
                    <Badge color={velColor}>{sm.social_velocity || sm.velocity || 'active'}</Badge>
                    <Badge color={smSentColor}>{sm.sentiment || 'mixed'}</Badge>
                  </div>
                </div>
                {(sm.why_trending || sm.reason) && <div style={{ color:C.text, fontSize:11, fontFamily:sansFont, lineHeight:1.5, marginBottom:4 }}>{sm.why_trending || sm.reason}</div>}
                {sm.catalyst && <div style={{ color:C.gold, fontSize:10, fontFamily:sansFont }}>Catalyst: {sm.catalyst}</div>}
              </div>;
            })}
          </div>
        </div>}

        {narrativeHeat.length > 0 && <div style={{ marginBottom:12 }}>
          <div style={{ color:C.bright, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:8 }}>Narrative Heat</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10 }}>
            {narrativeHeat.map((nh: any, i: number) => {
              const buzz = (nh.buzz_level || nh.heat || '').toLowerCase();
              const heatColor = buzz.includes('hot') || buzz.includes('high') ? '#f97316' : buzz.includes('warm') || buzz.includes('medium') ? C.gold : '#5cc8f0';
              return <div key={i} style={{ background:C.card, border:`1px solid ${heatColor}25`, borderLeft:`3px solid ${heatColor}`, borderRadius:8, padding:12 }}>
                <div style={{ color:C.bright, fontWeight:700, fontSize:12, fontFamily:font, marginBottom:4 }}>{nh.narrative || nh.name}</div>
                <div style={{ display:'flex', gap:8, marginBottom:4 }}>
                  <Badge color={heatColor}>{nh.buzz_level || nh.heat || 'active'}</Badge>
                  {nh.direction && <span style={{ color:trendColor(nh.direction), fontSize:10, fontWeight:600, fontFamily:font }}>{nh.direction}</span>}
                </div>
                {(nh.top_tokens || nh.tokens) && <div style={{ color:C.dim, fontSize:10, fontFamily:font }}>Top: <span style={{ color:C.text }}>{Array.isArray(nh.top_tokens || nh.tokens) ? (nh.top_tokens || nh.tokens).join(', ') : (nh.top_tokens || nh.tokens)}</span></div>}
              </div>;
            })}
          </div>
        </div>}

        {contrarianSignals.length > 0 && <div style={{ marginBottom:12 }}>
          {contrarianSignals.map((cs: any, i: number) => (
            <div key={i} style={{ padding:'10px 14px', background:`${C.gold}08`, border:`1px solid ${C.gold}25`, borderRadius:8, marginBottom:6, display:'flex', alignItems:'flex-start', gap:8 }}>
              <span style={{ fontSize:14 }}>⚠️</span>
              <div>
                <span style={{ color:C.gold, fontSize:11, fontWeight:700, fontFamily:font }}>Contrarian Signal: </span>
                <span style={{ color:C.text, fontSize:11, fontFamily:sansFont }}>{typeof cs === 'string' ? cs : cs.signal || cs.text || JSON.stringify(cs)}</span>
              </div>
            </div>
          ))}
        </div>}

        {xSentiment.summary && <div style={{ padding:'14px 18px', background:`${C.purple}06`, border:`1px solid ${C.purple}15`, borderRadius:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.7 }}>{xSentiment.summary}</div>}
      </div>}

      {momentum.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Top Momentum Picks</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {momentum.map((c: any, i: number) => {
            const isExp = expandedTicker === `crypto-${i}`;
            return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `crypto-${i}`)} expanded={isExp}>
              {(() => {
                const mPrice = c.price || c.current_price || c.mark_price;
                const mCh24 = c.change_24h || c.price_change_24h;
                const mCh7d = c.change_7d ?? c['7d'] ?? c.price_change_7d ?? c['7d_change'] ?? c.change_7d_pct;
                const mCh30d = c.change_30d ?? c['30d'] ?? c.price_change_30d ?? c['30d_change'] ?? c.change_30d_pct;
                const mFr = c.funding_rate ?? c.fundingRate;
                const mOi = c.open_interest ?? c.openInterest ?? c.open_interest_usd;
                const mMcap = c.market_cap ?? c.marketCap;
                const dispPrice = mPrice != null && mPrice !== '' && mPrice !== 'N/A' && mPrice !== 0 ? (typeof mPrice === 'number' ? `$${mPrice.toLocaleString()}` : `${mPrice}`) : null;
                const fmt7d = mCh7d != null && mCh7d !== '' && mCh7d !== 'N/A' ? (typeof mCh7d === 'number' ? `${mCh7d >= 0 ? '+' : ''}${mCh7d.toFixed(2)}%` : String(mCh7d)) : null;
                const fmt30d = mCh30d != null && mCh30d !== '' && mCh30d !== 'N/A' ? (typeof mCh30d === 'number' ? `${mCh30d >= 0 ? '+' : ''}${mCh30d.toFixed(2)}%` : String(mCh30d)) : null;
                const fmtFr = (() => {
                  if (mFr == null || mFr === '' || mFr === 'N/A') return null;
                  if (typeof mFr === 'string' && mFr.includes('%')) return mFr;
                  if (typeof mFr === 'number') return Math.abs(mFr) < 1 ? `${(mFr * 100).toFixed(4)}%` : `${mFr.toFixed(4)}%`;
                  return String(mFr);
                })();
                const frNum = typeof mFr === 'number' ? mFr : parseFloat(String(mFr || '0'));
                const dispOi = mOi != null && mOi !== '' && mOi !== 'N/A' ? (typeof mOi === 'number' ? fmtBig(mOi) : String(mOi)) : null;
                return <>
                  <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ color:C.purple, fontWeight:800, fontSize:15, fontFamily:font }}>{c.symbol}</span>
                      <span style={{ color:C.dim, fontSize:11 }}>{c.coin}</span>
                      {dispPrice && <span style={{ color:C.bright, fontSize:15, fontWeight:700, fontFamily:font }}>{dispPrice}</span>}
                      {mCh24 && <span style={{ color:changeColor(mCh24), fontWeight:600, fontSize:12, fontFamily:font }}>{mCh24}</span>}
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      {mMcap && <Badge color={C.dim}>{mMcap}</Badge>}
                      <Badge color={convColor(c.conviction)}>{c.conviction}</Badge>
                    </div>
                  </div>
                  <div style={{ padding:'0 18px 10px', display:'flex', gap:8, fontSize:11, fontFamily:font, flexWrap:'wrap' }}>
                    {fmt7d && <span style={{ color:C.dim }}>7d: <span style={{ color:changeColor(fmt7d), fontWeight:600 }}>{fmt7d}</span></span>}
                    {fmt30d && <span style={{ color:C.dim }}>30d: <span style={{ color:changeColor(fmt30d), fontWeight:600 }}>{fmt30d}</span></span>}
                    {dispOi && <span style={{ color:C.dim }}>OI: <span style={{ color:C.bright }}>{dispOi}</span></span>}
                  </div>
                </>;
              })()}
              <div style={{ padding:'0 18px 14px', color:C.text, fontSize:12, lineHeight:1.6, fontFamily:sansFont }}>{c.thesis}</div>
              {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
                <TradingViewMini ticker={c.symbol || c.coin} pick={{ ...c, asset_class: 'crypto' }} />
                {c.social && <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:8, marginBottom:10 }}>
                  {c.social.twitter_followers && <IndicatorPill label="Twitter" value={c.social.twitter_followers} />}
                  {c.social.reddit_subscribers && <IndicatorPill label="Reddit" value={c.social.reddit_subscribers} />}
                  {c.social.dev_activity && <IndicatorPill label="Dev Activity" value="—" signal={c.social.dev_activity} />}
                  {c.social.sentiment && <IndicatorPill label="Sentiment" value={c.social.sentiment} />}
                </div>}
                {c.setup && <div style={{ padding:10, background:`${C.blue}06`, border:`1px solid ${C.blue}15`, borderRadius:8, marginBottom:12, color:C.text, fontSize:11, fontFamily:sansFont }}><span style={{ color:C.blue, fontWeight:700 }}>Setup: </span>{c.setup}</div>}
                {c.risk && <div style={{ padding:10, background:`${C.red}06`, border:`1px solid ${C.red}12`, borderRadius:8, marginBottom:12, color:C.text, fontSize:11, fontFamily:sansFont }}><span style={{ color:C.red, fontWeight:700 }}>Risk: </span>{c.risk}</div>}
                {c.trade_plan && <div style={{ background:`${C.green}06`, border:`1px solid ${C.green}15`, borderRadius:8, padding:14 }}>
                  <div style={{ color:C.green, fontSize:11, fontWeight:700, fontFamily:font, marginBottom:10, textTransform:'uppercase' }}>Trade Plan</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:8 }}>
                    {[['Entry', c.trade_plan.entry, C.bright], ['Stop', c.trade_plan.stop, C.red], ['Target 1', c.trade_plan.target_1, C.green], ['Target 2', c.trade_plan.target_2, C.green], ['R/R', c.trade_plan.risk_reward, C.gold]].map(([l,v,col]) => v ? <div key={l as string}><div style={{ color:C.dim, fontSize:9, fontFamily:font, textTransform:'uppercase' }}>{l as string}</div><div style={{ color:col as string, fontSize:14, fontWeight:700, fontFamily:font, marginTop:2 }}>{v as string}</div></div> : null)}
                  </div>
                </div>}
              </div>}
            </CardWrap>;
          })}
        </div>
      </div>}

      {Object.keys(onChain).length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>On-Chain Signals</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:8 }}>
          {Object.entries(onChain).map(([k, v]) => <IndicatorPill key={k} label={k.replace(/_/g, ' ')} value={v as string} />)}
        </div>
      </div>}

      {catalysts.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Upcoming Catalysts</div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
          {catalysts.map((cat: string, i: number) => (
            <div key={i} style={{ padding:'6px 0', borderBottom: i < catalysts.length - 1 ? `1px solid ${C.border}` : 'none', color:C.text, fontSize:12, fontFamily:sansFont }}>📅 {cat}</div>
          ))}
        </div>
      </div>}
    </div>;
  }

  function renderBriefing(s: any) {
    const pulse = s.market_pulse || {};
    const numbers = s.key_numbers || {};
    const moving = s.whats_moving || [];
    const highlights = s.signal_highlights || {};
    const topMoves = s.top_moves || [];
    const catalysts = s.upcoming_catalysts || [];

    const verdictColor = (v?: string) => {
      if (!v) return C.dim;
      const lower = v.toLowerCase();
      if (lower.includes('bullish') && !lower.includes('cautious')) return C.green;
      if (lower.includes('cautiously bullish')) return '#4ade80';
      if (lower.includes('neutral')) return C.gold;
      if (lower.includes('cautiously bearish')) return '#f97316';
      if (lower.includes('bearish')) return C.red;
      return C.dim;
    };

    const regimeColor = (r?: string) => {
      if (!r) return C.dim;
      if (r.toLowerCase().includes('risk-on')) return C.green;
      if (r.toLowerCase().includes('risk-off')) return C.red;
      return C.gold;
    };

    return <div>
      <div style={{ padding:'22px 26px', background:`linear-gradient(135deg, ${C.card} 0%, ${C.bg} 100%)`, border:`1px solid ${C.border}`, borderRadius:12, marginBottom:12, boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:22 }}>⚡</span>
            <span style={{ color:verdictColor(pulse.verdict), fontSize:20, fontWeight:800, fontFamily:sansFont }}>{pulse.verdict || 'Loading...'}</span>
          </div>
          {pulse.regime && <Badge color={regimeColor(pulse.regime)}>{pulse.regime}</Badge>}
        </div>
        {pulse.summary && <div style={{ color:C.text, fontSize:13, lineHeight:1.8, fontFamily:sansFont }}>{pulse.summary}</div>}
      </div>

      {Object.keys(numbers).length > 0 && <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:10, marginBottom:12 }}>
        {Object.entries(numbers).map(([key, val]: [string, any]) => (
          <div key={key} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px' }}>
            <div style={{ color:C.dim, fontSize:9, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{key.replace(/_/g, ' ')}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
              <span style={{ color:C.bright, fontSize:15, fontWeight:700, fontFamily:font }}>{val?.price || val?.value || '—'}</span>
              {val?.change && <span style={{ color:changeColor(val.change), fontSize:11, fontWeight:600, fontFamily:font }}>{val.change}</span>}
            </div>
            {val?.trend && <div style={{ color:trendColor(val.trend), fontSize:10, fontFamily:font, marginTop:2 }}>{val.trend}</div>}
            {val?.label && <div style={{ color:trendColor(val.label), fontSize:10, fontFamily:font, marginTop:2 }}>{val.label}</div>}
          </div>
        ))}
      </div>}

      {moving.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>What's Moving</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {moving.map((item: any, i: number) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8 }}>
              {/* Backend now sends item.ticker (ticker label); fall back to item.category for older responses */}
              <Badge color={C.blue}>{item.ticker || item.category}</Badge>
              <span style={{ color:C.text, fontSize:12, fontFamily:sansFont, flex:1 }}>{item.headline}</span>
            </div>
          ))}
        </div>
      </div>}

      {Object.keys(highlights).length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Top Signal From Each Scanner</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10 }}>
          {Object.entries(highlights).map(([key, val]: [string, any]) => {
            const labelMap: Record<string, {icon: string, color: string}> = {
              'best_ta_setup': {icon: '📈', color: C.blue},
              'best_fundamental': {icon: '💎', color: C.green},
              'hottest_social': {icon: '🚀', color: C.purple},
              'top_squeeze': {icon: '💥', color: C.red},
              'biggest_volume': {icon: '📊', color: C.gold},
              'strongest_sector': {icon: '🔄', color: '#80d8f8'},
              'strongest_overall': {icon: '🔄', color: '#80d8f8'},
            };
            // Human-readable display names — strongest_sector becomes "Strongest Overall"
            // to match updated backend labeling; strongest_overall also maps to same label.
            const displayNames: Record<string, string> = {
              'best_ta_setup': 'Best TA Setup',
              'best_fundamental': 'Best Fundamental',
              'hottest_social': 'Hottest Social',
              'top_squeeze': 'Top Squeeze',
              'biggest_volume': 'Biggest Volume',
              'strongest_sector': 'Strongest Overall',
              'strongest_overall': 'Strongest Overall',
            };
            const cfg = labelMap[key] || {icon: '•', color: C.dim};
            const displayLabel = displayNames[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return <div key={key} onClick={() => { if (val?.ticker) { setSignalPopup({ ticker: val.ticker, signal: val.signal || '', scannerName: displayLabel, color: cfg.color, icon: cfg.icon }); setSignalChartInterval('D'); } }} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14, cursor: val?.ticker ? 'pointer' : 'default', transition:'all 0.2s', position:'relative', overflow:'hidden' }} onMouseEnter={e => { if (val?.ticker) { (e.currentTarget as HTMLElement).style.borderColor = cfg.color + '60'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${cfg.color}15`; } }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:14 }}>{cfg.icon}</span>
                <span style={{ color:cfg.color, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em' }}>{displayLabel}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ color:C.bright, fontSize:14, fontWeight:700, fontFamily:font, marginBottom:4 }}>{val?.ticker || '—'}</div>
                {val?.ticker && <span style={{ color:cfg.color, fontSize:9, fontWeight:600, fontFamily:font, opacity:0.7 }}>VIEW</span>}
              </div>
              <div style={{ color:C.text, fontSize:11, lineHeight:1.5, fontFamily:sansFont }}>{val?.signal || ''}</div>
            </div>;
          })}
        </div>
      </div>}

      {/* ── Watchlist Today
           SECTOR preset responses (identified by s.sector_key existing) use the new
           nested shape: watchlist_today.{ large_cap[], mid_cap[], low_cap[], buy_right_now }
           Non-sector briefings fall back to the legacy flat top_moves array.
      ── */}
      {(() => {
        const isSectorPreset = Boolean(s.sector_key);
        const watchlist = s.watchlist_today;
        const legacyMoves: any[] = topMoves;

        // Sector preset path — use new nested fields (exact backend keys)
        if (isSectorPreset && watchlist && typeof watchlist === 'object') {
          const largeCap: any[]  = Array.isArray(watchlist.large_cap)  ? watchlist.large_cap.filter((e: any) => e.ticker)  : [];
          const midCap: any[]    = Array.isArray(watchlist.mid_cap)    ? watchlist.mid_cap.filter((e: any) => e.ticker)    : [];
          const lowCap: any[]    = Array.isArray(watchlist.low_cap)    ? watchlist.low_cap.filter((e: any) => e.ticker)    : [];
          const buyNow: any      = (watchlist.buy_right_now && watchlist.buy_right_now.ticker) ? watchlist.buy_right_now : null;

          // Helper: render a single watchlist entry card
          const WatchCard = ({ m, keyPrefix, idx }: { m: any; keyPrefix: string; idx: number }) => {
            const isExp = expandedTicker === `${keyPrefix}-${idx}`;
            return <CardWrap key={idx} onClick={() => setExpandedTicker(isExp ? null : `${keyPrefix}-${idx}`)} expanded={isExp}>
              <div style={{ padding:'12px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:4 }}>
                  {m.rank != null && <span style={{ color:C.gold, fontWeight:800, fontSize:14, fontFamily:font }}>#{m.rank}</span>}
                  <span style={{ color:C.blue, fontWeight:800, fontSize:15, fontFamily:font }}>{m.ticker}</span>
                  {m.company && <span style={{ color:C.dim, fontSize:11, fontFamily:sansFont }}>{m.company}</span>}
                  {m.conviction && <Badge color={convColor(m.conviction)}>{m.conviction}</Badge>}
                  {m.conviction_score != null && <span style={{ color:C.dim, fontSize:10, fontFamily:font }}>{m.conviction_score}</span>}
                </div>
                {m.why_now && <div style={{ color:C.text, fontSize:12, lineHeight:1.6, fontFamily:sansFont, marginBottom:4 }}>{m.why_now}</div>}
                {m.catalyst && <div style={{ color:C.dim, fontSize:11, fontFamily:font, lineHeight:1.5 }}>{m.catalyst}</div>}
              </div>
              {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
                <TradingViewMini ticker={m.ticker} pick={m} />
              </div>}
            </CardWrap>;
          };

          return <div style={{ marginBottom:10 }}>
            <div style={{ color:C.bright, fontSize:14, fontWeight:800, fontFamily:sansFont, marginBottom:10 }}>Watchlist Today</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

              {/* ── #1 Buy Right Now ── */}
              <div style={{ padding:'14px 18px', background:`linear-gradient(135deg, ${C.gold}10 0%, ${C.bg} 100%)`, border:`1px solid ${C.gold}30`, borderRadius:10 }}>
                <div style={{ color:C.gold, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>#1 Buy Right Now</div>
                {buyNow ? (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:6 }}>
                      <span style={{ color:C.bright, fontSize:16, fontWeight:800, fontFamily:font }}>{buyNow.ticker}</span>
                      {buyNow.company && <span style={{ color:C.dim, fontSize:12, fontFamily:sansFont }}>{buyNow.company}</span>}
                      {buyNow.conviction && <Badge color={convColor(buyNow.conviction)}>{buyNow.conviction}</Badge>}
                      {buyNow.conviction_score != null && <span style={{ color:C.dim, fontSize:10, fontFamily:font }}>score {buyNow.conviction_score}</span>}
                    </div>
                    {buyNow.why_now && <div style={{ color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6, marginBottom:4 }}>{buyNow.why_now}</div>}
                    {buyNow.catalyst && <div style={{ color:C.dim, fontSize:11, fontFamily:font }}>{buyNow.catalyst}</div>}
                  </div>
                ) : <div style={{ color:C.dim, fontSize:12, fontFamily:sansFont }}>No top pick identified.</div>}
              </div>

              {/* ── Large Caps ── */}
              <div>
                <div style={{ color:C.dim, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Large Caps</div>
                {largeCap.length > 0
                  ? <div style={{ display:'flex', flexDirection:'column', gap:6 }}>{largeCap.map((m, i) => <WatchCard key={i} m={m} keyPrefix="wl-lc" idx={i} />)}</div>
                  : <div style={{ color:C.dim, fontSize:12, fontFamily:sansFont, padding:'8px 0' }}>No large-cap setups identified for this sector.</div>}
              </div>

              {/* ── Mid-Cap Growth ── */}
              <div>
                <div style={{ color:C.dim, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Mid-Cap Growth</div>
                {midCap.length > 0
                  ? <div style={{ display:'flex', flexDirection:'column', gap:6 }}>{midCap.map((m, i) => <WatchCard key={i} m={m} keyPrefix="wl-mc" idx={i} />)}</div>
                  : <div style={{ color:C.dim, fontSize:12, fontFamily:sansFont, padding:'8px 0' }}>No mid-cap setups identified.</div>}
              </div>

              {/* ── Low Caps ── */}
              <div>
                <div style={{ color:C.dim, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Low Caps</div>
                {lowCap.length > 0
                  ? <div style={{ display:'flex', flexDirection:'column', gap:6 }}>{lowCap.map((m, i) => <WatchCard key={i} m={m} keyPrefix="wl-sc" idx={i} />)}</div>
                  : <div style={{ color:C.dim, fontSize:12, fontFamily:sansFont, padding:'8px 0' }}>No small-cap setups identified.</div>}
              </div>

            </div>
          </div>;
        }

        // Non-sector briefing fallback — legacy flat top_moves list
        if (legacyMoves.length === 0) return null;
        return <div style={{ marginBottom:10 }}>
          <div style={{ color:C.bright, fontSize:14, fontWeight:800, fontFamily:sansFont, marginBottom:10 }}>Watchlist Today</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {legacyMoves.map((move: any, i: number) => {
              const isExp = expandedTicker === `brief-${i}`;
              return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `brief-${i}`)} expanded={isExp}>
                <div style={{ padding:'16px 20px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ color:C.gold, fontWeight:800, fontSize:18, fontFamily:font }}>#{move.rank}</span>
                      <span style={{ color:C.blue, fontWeight:800, fontSize:18, fontFamily:font }}>{move.ticker}</span>
                      <Badge color={move.action === 'BUY' ? C.green : move.action === 'SHORT' ? C.red : C.gold}>{move.action}</Badge>
                      <Badge color={convColor(move.conviction)}>{move.conviction}</Badge>
                    </div>
                    <span style={{ color:C.gold, fontSize:11, fontWeight:700, fontFamily:font }}>{move.signal_count} signals</span>
                  </div>
                  {move.signals_stacking && <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:8 }}>
                    {move.signals_stacking.map((sig: string, j: number) => (
                      <span key={j} style={{ padding:'2px 8px', borderRadius:4, fontSize:9, fontWeight:600, fontFamily:font, color:C.gold, background:`${C.gold}10`, border:`1px solid ${C.gold}20` }}>{sig.replace(/_/g, ' ')}</span>
                    ))}
                  </div>}
                  <div style={{ color:C.text, fontSize:12, lineHeight:1.7, fontFamily:sansFont }}>{move.thesis}</div>
                </div>
                {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
                  <TradingViewMini ticker={move.ticker} pick={move} />
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:8, marginTop:12 }}>
                    {([['Entry', move.entry, C.bright], ['Stop Loss', move.stop, C.red], ['Target', move.target, C.green], ['R/R', move.risk_reward, C.gold], ['Timeframe', move.timeframe, C.dim]] as [string, any, string][]).map(([l, v, c]) => v ? <div key={l as string}><div style={{ color:C.dim, fontSize:9, fontFamily:font, textTransform:'uppercase' }}>{l as string}</div><div style={{ color:c as string, fontSize:15, fontWeight:700, fontFamily:font, marginTop:2 }}>{v as string}</div></div> : null)}
                  </div>
                </div>}
              </CardWrap>;
            })}
          </div>
        </div>;
      })()}

      {catalysts.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:8 }}>Upcoming Catalysts</div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:12 }}>
          {catalysts.map((cat: string, i: number) => (
            <div key={i} style={{ padding:'5px 0', borderBottom: i < catalysts.length - 1 ? `1px solid ${C.border}` : 'none', color:C.text, fontSize:11, fontFamily:sansFont, display:'flex', gap:8 }}>
              <span style={{ color:C.gold }}>📅</span> {cat}
            </div>
          ))}
        </div>
      </div>}

      {s.portfolio_bias && <div style={{ padding:'14px 18px', background:`${C.blue}06`, border:`1px solid ${C.blue}15`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, lineHeight:1.7, fontFamily:sansFont }}>
        <span style={{ color:C.blue, fontWeight:700 }}>Portfolio Bias: </span>{s.portfolio_bias}
      </div>}
    </div>;
  }

  function renderPortfolio(s: any) {
    const positions = s.positions || [];
    const insights = s.portfolio_insights || {};

    const ratingConfig: Record<string, {color: string, bg: string}> = {
      'Strong Buy': { color: '#22c55e', bg: '#22c55e12' },
      'Buy': { color: '#4ade80', bg: '#4ade8012' },
      'Hold': { color: '#f59e0b', bg: '#f59e0b12' },
      'Sell': { color: '#ef4444', bg: '#ef444412' },
      'Short': { color: '#dc2626', bg: '#dc262612' },
    };

    return <div>
      {s.summary && <div style={{ padding:'16px 20px', background:`${C.blue}08`, border:`1px solid ${C.blue}15`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.7 }}>{s.summary}</div>}

      {s.spy_context && <div style={{ display:'flex', alignItems:'center', gap:16, padding:'10px 16px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, marginBottom:10 }}>
        <span style={{ color:C.dim, fontSize:11, fontWeight:700, fontFamily:font }}>SPY BENCHMARK</span>
        <span style={{ color:C.bright, fontSize:14, fontWeight:700, fontFamily:font }}>{s.spy_context.price}</span>
        <span style={{ color:changeColor(s.spy_context.change), fontSize:12, fontWeight:600, fontFamily:font }}>{s.spy_context.change}</span>
        <span style={{ color:trendColor(s.spy_context.trend), fontSize:11, fontFamily:font }}>{s.spy_context.trend}</span>
      </div>}

      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:10 }}>
        {positions.map((p: any, i: number) => {
          const isExp = expandedTicker === `port-${i}`;
          const rc = ratingConfig[p.rating] || ratingConfig['Hold'];
          return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `port-${i}`)} expanded={isExp}>
            <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{p.ticker}</span>
                <span style={{ color:C.dim, fontSize:11 }}>{p.company}</span>
                <span style={{ color:changeColor(p.change), fontWeight:600, fontSize:13, fontFamily:font }}>{p.price} {p.change}</span>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <Badge color={C.dim}>{p.market_cap}</Badge>
                <span style={{ display:'inline-block', padding:'4px 14px', borderRadius:6, fontSize:11, fontWeight:800, fontFamily:font, color:rc.color, background:rc.bg, border:`1px solid ${rc.color}30`, letterSpacing:'0.04em', textTransform:'uppercase' }}>{p.rating}</span>
              </div>
            </div>
            <div style={{ padding:'0 18px 10px', display:'flex', gap:16, fontSize:10, fontFamily:font }}>
              <span style={{ color:C.dim }}>Combined: <span style={{ color:C.bright, fontWeight:700 }}>{p.combined_score}</span></span>
              <span style={{ color:C.dim }}>Trade: <span style={{ color:C.blue }}>{p.trade_score}</span></span>
              <span style={{ color:C.dim }}>Invest: <span style={{ color:C.green }}>{p.invest_score}</span></span>
              {p.relative_strength && <span style={{ color:C.dim }}>vs SPY: <span style={{ color:trendColor(p.relative_strength) }}>{p.relative_strength}</span></span>}
            </div>
            <div style={{ padding:'0 18px 14px', color:C.text, fontSize:12, lineHeight:1.6, fontFamily:sansFont }}>{p.thesis}</div>
            {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
              <TradingViewMini ticker={p.ticker} pick={p} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10 }}>
                <div style={{ background:C.bg, borderRadius:8, padding:12, border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.blue, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:6 }}>Technical</div>
                  <div style={{ color:C.text, fontSize:11, lineHeight:1.7, fontFamily:sansFont }}>{p.ta_summary}</div>
                </div>
                <div style={{ background:C.bg, borderRadius:8, padding:12, border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.green, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:6 }}>Fundamentals</div>
                  <div style={{ color:C.text, fontSize:11, lineHeight:1.7, fontFamily:sansFont }}>{p.fundamental_summary}</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:10 }}>
                {p.sentiment && <div style={{ background:C.bg, borderRadius:8, padding:10, border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.purple, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:4 }}>Sentiment</div>
                  <div style={{ color:C.text, fontSize:11, fontFamily:sansFont }}>{p.sentiment}</div>
                </div>}
                {p.insider_activity && <div style={{ background:C.bg, borderRadius:8, padding:10, border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.gold, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:4 }}>Insider Activity</div>
                  <div style={{ color:C.text, fontSize:11, fontFamily:sansFont }}>{p.insider_activity}</div>
                </div>}
                {p.key_risk && <div style={{ background:`${C.red}06`, borderRadius:8, padding:10, border:`1px solid ${C.red}12` }}>
                  <div style={{ color:C.red, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:4 }}>Key Risk</div>
                  <div style={{ color:C.text, fontSize:11, fontFamily:sansFont }}>{p.key_risk}</div>
                </div>}
              </div>
              {p.action && <div style={{ padding:12, background:`${rc.bg}`, border:`1px solid ${rc.color}20`, borderRadius:8, color:C.bright, fontSize:12, fontWeight:600, fontFamily:sansFont }}>
                <span style={{ color:rc.color, fontWeight:700 }}>Action: </span>{p.action}
              </div>}
            </div>}
          </CardWrap>;
        })}
      </div>

      {Object.keys(insights).length > 0 && <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:14, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Portfolio Insights</div>
        {insights.sector_concentration && <div style={{ marginBottom:12 }}>
          <div style={{ color:C.blue, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:6 }}>Sector Concentration</div>
          <div style={{ color:C.text, fontSize:12, fontFamily:sansFont }}>{insights.sector_concentration}</div>
        </div>}
        {insights.risk_flags && insights.risk_flags.length > 0 && <div style={{ marginBottom:12 }}>
          <div style={{ color:C.red, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:6 }}>Risk Flags</div>
          {insights.risk_flags.map((flag: string, i: number) => (
            <div key={i} style={{ padding:'6px 0', borderBottom: i < insights.risk_flags.length - 1 ? `1px solid ${C.border}` : 'none', color:C.text, fontSize:11, fontFamily:sansFont, display:'flex', gap:8 }}>
              <span style={{ color:C.red }}>⚠️</span> {flag}
            </div>
          ))}
        </div>}
        {insights.suggested_actions && insights.suggested_actions.length > 0 && <div>
          <div style={{ color:C.green, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:6 }}>Suggested Actions</div>
          {insights.suggested_actions.map((action: string, i: number) => (
            <div key={i} style={{ padding:'6px 0', borderBottom: i < insights.suggested_actions.length - 1 ? `1px solid ${C.border}` : 'none', color:C.text, fontSize:11, fontFamily:sansFont, display:'flex', gap:8 }}>
              <span style={{ color:C.green }}>→</span> {action}
            </div>
          ))}
        </div>}
      </div>}
    </div>;
  }

  function renderCommodities(s: any) {
    const commodities = s.commodities || [];
    const sectors = s.sector_summary || {};
    const macro = s.macro_factors || {};
    const catalysts = s.upcoming_catalysts || [];
    const topPlays = s.top_conviction_plays || [];

    return <div>
      {s.market_overview && <div style={{ padding:'16px 20px', background:`${C.gold}08`, border:`1px solid ${C.gold}20`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.7 }}>{s.market_overview}</div>}

      {s.dxy_context && <div style={{ display:'flex', alignItems:'center', gap:16, padding:'12px 18px', background:C.card, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ color:C.gold, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase' }}>DXY</span>
          <span style={{ color:C.bright, fontSize:16, fontWeight:700, fontFamily:font }}>{s.dxy_context.price}</span>
          <span style={{ color:changeColor(s.dxy_context.change), fontSize:13, fontWeight:600, fontFamily:font }}>{s.dxy_context.change}</span>
        </div>
        <span style={{ color:trendColor(s.dxy_context.trend), fontSize:12, fontFamily:font }}>{s.dxy_context.trend}</span>
        <span style={{ color:C.dim, fontSize:11, fontFamily:sansFont, flex:1 }}>{s.dxy_context.impact}</span>
      </div>}

      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:10 }}>
        {commodities.map((c: any, i: number) => {
          const isExp = expandedTicker === `comm-${i}`;
          return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `comm-${i}`)} expanded={isExp}>
            <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ color:C.gold, fontWeight:800, fontSize:15, fontFamily:font }}>{c.name}</span>
                <span style={{ color:C.bright, fontSize:16, fontWeight:700, fontFamily:font }}>{c.price}</span>
                <span style={{ color:changeColor(c.change_today), fontWeight:600, fontSize:13, fontFamily:font }}>{c.change_today}</span>
              </div>
              <Badge color={convColor(c.conviction)}>{c.conviction}</Badge>
            </div>
            <div style={{ padding:'0 18px 10px', display:'flex', gap:16, fontSize:11, fontFamily:font }}>
              <span style={{ color:C.dim }}>1W: <span style={{ color:changeColor(c.change_1w), fontWeight:600 }}>{c.change_1w}</span></span>
              <span style={{ color:C.dim }}>1M: <span style={{ color:changeColor(c.change_1m), fontWeight:600 }}>{c.change_1m}</span></span>
              {c.ytd && <span style={{ color:C.dim }}>YTD: <span style={{ color:changeColor(c.ytd), fontWeight:600 }}>{c.ytd}</span></span>}
            </div>
            <div style={{ padding:'0 18px 14px', color:C.text, fontSize:12, lineHeight:1.6, fontFamily:sansFont }}>{c.thesis}</div>
            {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div style={{ background:`${C.green}06`, border:`1px solid ${C.green}12`, borderRadius:8, padding:12 }}>
                  <div style={{ color:C.green, fontSize:10, fontWeight:700, fontFamily:font, marginBottom:6, textTransform:'uppercase' }}>Drivers</div>
                  <div style={{ color:C.text, fontSize:11, lineHeight:1.6, fontFamily:sansFont }}>{c.drivers}</div>
                </div>
                <div style={{ background:`${C.red}06`, border:`1px solid ${C.red}12`, borderRadius:8, padding:12 }}>
                  <div style={{ color:C.red, fontSize:10, fontWeight:700, fontFamily:font, marginBottom:6, textTransform:'uppercase' }}>Risks</div>
                  <div style={{ color:C.text, fontSize:11, lineHeight:1.6, fontFamily:sansFont }}>{c.risks}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:16, marginBottom:12, fontSize:11 }}>
                {c.related_etfs && <div style={{ fontFamily:font }}><span style={{ color:C.dim }}>Trade via: </span><span style={{ color:C.blue, fontWeight:600 }}>{c.related_etfs}</span></div>}
                {c.sentiment && <div style={{ fontFamily:font }}><span style={{ color:C.dim }}>Sentiment: </span><span style={{ color:C.bright }}>{c.sentiment}</span></div>}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {c.outlook_3m && <div style={{ background:C.bg, borderRadius:8, padding:10, border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.blue, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:4 }}>3-Month Outlook</div>
                  <div style={{ color:C.text, fontSize:11, lineHeight:1.5, fontFamily:sansFont }}>{c.outlook_3m}</div>
                </div>}
                {c.outlook_12m && <div style={{ background:C.bg, borderRadius:8, padding:10, border:`1px solid ${C.border}` }}>
                  <div style={{ color:C.purple, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:4 }}>12-Month Outlook</div>
                  <div style={{ color:C.text, fontSize:11, lineHeight:1.5, fontFamily:sansFont }}>{c.outlook_12m}</div>
                </div>}
              </div>
              <TradingViewMini ticker={c.ticker || c.symbol || c.name} pick={c} />
            </div>}
          </CardWrap>;
        })}
      </div>

      {Object.keys(sectors).length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Commodity Sectors</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:10 }}>
          {Object.entries(sectors).map(([key, sec]: [string, any]) => (
            <div key={key} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:12 }}>
              <div style={{ color:C.gold, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:8 }}>{key.replace(/_/g, ' ')}</div>
              <StatRow label="Trend" value={sec.trend} />
              <StatRow label="Leader" value={sec.leader} />
              <StatRow label="Laggard" value={sec.laggard} />
            </div>
          ))}
        </div>
      </div>}

      {Object.keys(macro).length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Macro Factors Affecting Commodities</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:8 }}>
          {Object.entries(macro).map(([k, v]) => <IndicatorPill key={k} label={k.replace(/_/g, ' ')} value={v as string} />)}
        </div>
      </div>}

      {catalysts.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Upcoming Catalysts</div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
          {catalysts.map((cat: string, i: number) => (
            <div key={i} style={{ padding:'6px 0', borderBottom: i < catalysts.length - 1 ? `1px solid ${C.border}` : 'none', color:C.text, fontSize:12, fontFamily:sansFont, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:C.gold, fontSize:10 }}>📅</span> {cat}
            </div>
          ))}
        </div>
      </div>}

      {topPlays.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont, marginBottom:10 }}>Top Commodity Plays</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {topPlays.map((play: any, i: number) => (
            <div key={i} style={{ background:`${C.green}06`, border:`1px solid ${C.green}15`, borderRadius:10, padding:14, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <span style={{ color:C.bright, fontWeight:700, fontSize:14, fontFamily:font }}>{play.asset}</span>
                  <Badge color={play.direction === 'Long' ? C.green : C.red}>{play.direction}</Badge>
                  <Badge color={convColor(play.conviction)}>{play.conviction}</Badge>
                </div>
                <div style={{ color:C.text, fontSize:12, lineHeight:1.6, fontFamily:sansFont }}>{play.thesis}</div>
              </div>
            </div>
          ))}
        </div>
      </div>}
    </div>;
  }

  function renderSectorRotation(s: any) {
    const sectors = s.sectors || [];
    const stageColor = (sig?: string) => {
      if (!sig) return C.dim;
      const l = (sig || '').toLowerCase();
      if (l.includes('strong') || l.includes('stage 2 advancing') || l.includes('stage 2 —')) return C.green;
      if (l.includes('emerging') || l.includes('early stage 2')) return '#4ade80';
      if (l.includes('watch') || l.includes('stage 1') || l.includes('basing')) return C.gold;
      if (l.includes('caution') || l.includes('stage 3') || l.includes('topping')) return '#f97316';
      if (l.includes('avoid') || l.includes('stage 4') || l.includes('declining')) return C.red;
      return C.dim;
    };
    const stageBarColor = (trend?: string) => {
      if (!trend) return C.dim;
      const l = trend.toLowerCase();
      if (l.includes('stage 2')) return C.green;
      if (l.includes('stage 1')) return C.gold;
      if (l.includes('stage 3')) return '#f97316';
      if (l.includes('stage 4')) return C.red;
      return C.dim;
    };
    return <div>
      {s.summary && <div style={{ padding:'14px 18px', background:`${C.blue}08`, border:`1px solid ${C.blue}15`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6 }}>{s.summary}</div>}

      {s.rotation_signal && <div style={{ padding:'12px 18px', background:`${C.gold}08`, border:`1px solid ${C.gold}15`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6 }}><span style={{ color:C.gold, fontWeight:700 }}>Rotation Signal: </span>{s.rotation_signal}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:10, marginBottom:10 }}>
        {sectors.map((sec: any, i: number) => {
          const changeStr = sec.change_today != null ? (typeof sec.change_today === 'number' ? `${sec.change_today >= 0 ? '+' : ''}${sec.change_today}%` : sec.change_today) : null;
          const isPos = changeStr ? parseFloat(changeStr) >= 0 : false;
          const vsSpy = sec.vs_spy != null ? (typeof sec.vs_spy === 'number' ? `${sec.vs_spy >= 0 ? '+' : ''}${sec.vs_spy}%` : sec.vs_spy) : null;
          const borderCol = stageBarColor(sec.trend);

          return <CardWrap key={i} onClick={() => {
            setSignalPopup({ ticker: sec.etf, signal: sec.analysis || sec.signal || '', scannerName: sec.sector || '', color: borderCol, icon: '' });
            setSignalChartInterval('D');
          }} expanded={false} borderColor={borderCol}>
            <div style={{ padding:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:C.blue, fontWeight:700, fontSize:15, fontFamily:font }}>{sec.etf}</span>
                  <span style={{ color:C.dim, fontSize:11, fontFamily:sansFont }}>{sec.sector}</span>
                </div>
                <Badge color={convColor(sec.conviction)}>{sec.conviction}</Badge>
              </div>

              <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:8 }}>
                {changeStr && <div style={{ color:isPos ? C.green : C.red, fontSize:20, fontWeight:700, fontFamily:font }}>{changeStr}</div>}
                {vsSpy && <div style={{ color: parseFloat(vsSpy) >= 0 ? C.green : C.red, fontSize:12, fontFamily:font, opacity:0.8 }}>vs SPY {vsSpy}</div>}
              </div>

              {sec.trend && <div style={{ color:stageBarColor(sec.trend), fontSize:12, fontWeight:600, fontFamily:sansFont, marginBottom:4 }}>{sec.trend}</div>}

              <div style={{ marginTop:6, color:stageColor(sec.signal), fontSize:11, fontWeight:600, fontFamily:sansFont, padding:'4px 8px', background:`${stageColor(sec.signal)}10`, borderRadius:4, display:'inline-block' }}>{sec.signal}</div>

              {sec.rsi != null && sec.rsi > 0 && <div style={{ marginTop:8 }}><StatRow label="RSI" value={String(sec.rsi)} color={sec.rsi > 70 ? C.red : sec.rsi < 30 ? C.green : C.text} /></div>}
            </div>
          </CardWrap>;
        })}
      </div>

      {s.rotation_analysis && <div style={{ padding:'14px 18px', background:C.card, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:10, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.8 }}><div style={{ color:C.bright, fontWeight:700, fontSize:11, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>Rotation Analysis</div>{s.rotation_analysis}</div>}

      {s.action_items && s.action_items.length > 0 && s.action_items[0] && <div style={{ padding:'14px 18px', background:`${C.green}06`, border:`1px solid ${C.green}15`, borderRadius:10, marginBottom:10 }}>
        <div style={{ color:C.green, fontWeight:700, fontSize:11, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>Action Items</div>
        {s.action_items.filter((a: string) => a && a.trim()).map((item: string, i: number) => <div key={i} style={{ color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6, paddingLeft:12, borderLeft:`2px solid ${C.green}30`, marginBottom:6 }}>{item}</div>)}
      </div>}

      {s.macro_context && <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:8, marginBottom:10 }}>
        {Object.entries(s.macro_context).map(([k, v]) => <IndicatorPill key={k} label={k.replace(/_/g, ' ')} value={v as string} />)}
      </div>}

      {s.portfolio_bias && <div style={{ padding:'14px 18px', background:C.card, border:`1px solid ${C.border}`, borderRadius:10 }}>
        <div style={{ color:C.bright, fontWeight:700, fontSize:11, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>Portfolio Bias</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {s.portfolio_bias.risk_regime && <StatRow label="Risk Regime" value={s.portfolio_bias.risk_regime} />}
          {s.portfolio_bias.asset_class_bias && <StatRow label="Asset Bias" value={s.portfolio_bias.asset_class_bias} />}
          {s.portfolio_bias.cash_guidance && <StatRow label="Cash" value={s.portfolio_bias.cash_guidance} />}
          {s.portfolio_bias.hedge_considerations && <StatRow label="Hedging" value={s.portfolio_bias.hedge_considerations} />}
        </div>
      </div>}
    </div>;
  }

  function renderEarningsCatalyst(s: any) {
    const upcoming = s.upcoming || [];
    return <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {upcoming.map((e: any, i: number) => {
        const isExp = expandedTicker === `earn-${i}`;
        return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `earn-${i}`)} expanded={isExp}>
          <div style={{ padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{e.ticker}</span>
              <span style={{ color:C.dim, fontSize:12 }}>{e.company}</span>
              <Badge color={C.gold}>{e.earnings_date} ({e.days_away}d)</Badge>
            </div>
            <Badge color={C.dim}>{e.market_cap}</Badge>
          </div>
          {isExp && <div style={{ borderTop:`1px solid ${C.border}`, padding:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div>
                <div style={{ color:C.green, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>Estimates</div>
                <StatRow label="EPS Estimate" value={e.eps_estimate} color={C.bright} />
                <StatRow label="Revenue Est." value={e.revenue_estimate} color={C.bright} />
                <StatRow label="Beat Streak" value={e.beat_streak} />
                <StatRow label="Avg Move" value={e.avg_move_on_earnings} />
                <StatRow label="Implied Move" value={e.implied_move} />
              </div>
              <div>
                <div style={{ color:C.blue, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:10 }}>Setup</div>
                <StatRow label="Sentiment" value={e.sentiment} />
                <StatRow label="Pre-Earnings" value={e.pre_earnings_trend} />
                <StatRow label="Risk Level" value={e.risk_level} />
              </div>
            </div>
            {e.play && <div style={{ marginTop:14, padding:12, background:`${C.blue}06`, border:`1px solid ${C.blue}15`, borderRadius:8, color:C.bright, fontSize:12, fontWeight:600, fontFamily:sansFont }}>{e.play}</div>}
          </div>}
        </CardWrap>;
      })}
    </div>;
  }

  function renderCrossAssetTrending(s: any, fallbackAnalysis?: string) {
    const mr = s.macro_regime || {};
    const aca = s.asset_class_assessment || [];
    const rawSignal = s.social_trading_signal || null;
    const signal = rawSignal && rawSignal.symbol ? rawSignal : null;
    const equities = s.equities || {};
    const etfItems = s.etfs || [];
    const cryptoItems = s.crypto || [];
    const commodityItems = s.commodities || [];

    const ratingColor = (r?: string) => {
      if (!r) return C.dim;
      const l = r.toLowerCase();
      if (l.includes('strong buy')) return C.green;
      if (l.includes('buy')) return '#4ade80';
      if (l.includes('hold') || l.includes('neutral')) return C.gold;
      if (l.includes('sell')) return C.red;
      return C.dim;
    };
    const classColor = (c?: string) => (!c ? C.dim : c.toUpperCase().includes('TRADE') ? C.green : C.blue);
    const confirmIcon = (val?: boolean | string) => (val === true || val === 'yes' || val === 'Yes') ? { ic: '✓', cl: C.green } : { ic: '—', cl: C.dim };
    const regimeColor = (r?: string) => { if (!r) return C.dim; const l = r.toLowerCase(); return l.includes('bullish') || l.includes('risk-on') ? C.green : l.includes('bearish') || l.includes('risk-off') ? C.red : C.gold; };
    const confBar = (conf: any) => <div style={{ display:'flex', gap:6 }}>
      {['ta','volume','catalyst','fa'].map(k => { const { ic, cl } = confirmIcon(conf?.[k]); return <span key={k} style={{ padding:'1px 6px', borderRadius:3, fontSize:8, fontWeight:700, fontFamily:font, color:cl, background:`${cl}10`, border:`1px solid ${cl}20` }}>{k.toUpperCase()} {ic}</span>; })}
    </div>;

    const sections: { key: string; label: string; icon: string; items: any[]; accent?: string }[] = [
      { key: 'etfs', label: 'Trending ETFs', icon: '📈', items: etfItems, accent: '#8b5cf6' },
      { key: 'large_caps', label: 'Equities: Large Caps', icon: '🏛️', items: equities.large_caps || [] },
      { key: 'mid_caps', label: 'Equities: Mid Caps', icon: '📊', items: equities.mid_caps || [] },
      { key: 'small_micro', label: 'Equities: Small + Micro', icon: '🔬', items: equities.small_micro_caps || [] },
      { key: 'crypto', label: 'Crypto', icon: '₿', items: cryptoItems },
      { key: 'commodities', label: 'Commodities', icon: '🛢️', items: commodityItems },
    ];
    const hasStructured = signal || sections.some(sec => sec.items.length > 0);

    if (!hasStructured && !mr.verdict) {
      return <div style={{ padding:22, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, lineHeight:1.75, fontSize:13, fontFamily:sansFont }} dangerouslySetInnerHTML={{ __html: formatAnalysis(fallbackAnalysis || '') }} />;
    }

    const isNum = (v: any): boolean => { if (v == null) return false; const n = typeof v === 'number' ? v : parseFloat(String(v)); return isFinite(n); };
    const fmtPrice = (item: any): string | null => { const raw = item.price ?? item.last ?? item.last_price; if (!raw || raw === 'N/A') return null; const s = String(raw); if (!isNum(s.replace(/[$,]/g, ''))) return null; return s.startsWith('$') ? s : `$${s}`; };
    const fmtChange = (item: any): string | null => { const pct = item.change_pct ?? item.changePercent ?? item.pct_change ?? item.pct; if (pct && pct !== 'N/A' && isNum(String(pct).replace(/[%+\-]/g, ''))) return String(pct).includes('%') ? pct : `${pct}%`; const chg = item.change ?? item.change_abs; if (chg && chg !== 'N/A' && isNum(String(chg).replace(/[+\-]/g, ''))) return String(chg); return null; };

    const renderItemCard = (item: any, prefix: string, i: number) => {
      const isExp = expandedTicker === `${prefix}-${i}`;
      const priceStr = fmtPrice(item);
      const chgStr = fmtChange(item);
      return <CardWrap key={i} onClick={() => setExpandedTicker(isExp ? null : `${prefix}-${i}`)} expanded={isExp} borderColor={ratingColor(item.rating)}>
        <div style={{ padding:'14px 18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ color:C.blue, fontWeight:800, fontSize:16, fontFamily:font }}>{item.symbol}</span>
              {item.company && <span style={{ color:C.dim, fontSize:10, fontFamily:sansFont }}>{item.company}</span>}
              {item.classification && <Badge color={classColor(item.classification)}>{item.classification}</Badge>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              {item.rating && <Badge color={ratingColor(item.rating)}>{item.rating}</Badge>}
              {item.confidence != null && <span style={{ background:`${C.gold}15`, color:C.gold, padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:700, fontFamily:font }}>{item.confidence}</span>}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, flexWrap:'wrap' }}>
            {priceStr && <span style={{ color:C.bright, fontSize:12, fontWeight:600, fontFamily:font }}>{priceStr}</span>}
            {chgStr && <span style={{ color:changeColor(chgStr), fontSize:12, fontWeight:600, fontFamily:font }}>{chgStr}</span>}
            {item.market_cap && item.market_cap !== 'N/A' && <span style={{ color:C.dim, fontSize:10, fontFamily:font }}>MCap: {item.market_cap}</span>}
            {item.social_velocity_label && <Badge color={C.purple}>{item.social_velocity_label}</Badge>}
            {item.score != null && <span style={{ color:C.dim, fontSize:9, fontFamily:font }}>Score: {item.score}</span>}
          </div>
          {item.thesis_bullets && item.thesis_bullets.length > 0 && item.thesis_bullets[0] && (
            <div style={{ marginBottom:8 }}>
              {item.thesis_bullets.filter((b: string) => b).slice(0, 3).map((b: string, j: number) => (
                <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:3 }}>
                  <span style={{ color:C.blue, fontSize:9, marginTop:3 }}>▸</span>
                  <span style={{ color:C.text, fontSize:11, lineHeight:1.5, fontFamily:sansFont }}>{b}</span>
                </div>
              ))}
            </div>
          )}
          {item.catalyst && <div style={{ color:C.text, fontSize:10, fontFamily:sansFont, marginBottom:6 }}><span style={{ color:C.gold, fontWeight:700 }}>Catalyst:</span> {item.catalyst}</div>}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            {confBar(item.confirmations)}
            {item.position_size && <span style={{ color:C.dim, fontSize:9, fontFamily:font }}>{item.position_size}</span>}
          </div>
          {item.why_could_fail && <div style={{ marginTop:6, color:C.dim, fontSize:10, fontFamily:sansFont, fontStyle:'italic', whiteSpace:'normal', wordBreak:'break-word' }}>Risk: {item.why_could_fail}</div>}
        </div>
        {isExp && <div style={{ borderTop:`1px solid ${C.border}` }}>
          {item.trade_plan && <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px, 1fr))', gap:6, padding:14 }}>
            {item.trade_plan.entry && <div style={{ background:C.bg, borderRadius:6, padding:'6px 10px' }}><div style={{ color:C.dim, fontSize:8, fontFamily:font, textTransform:'uppercase' }}>Entry</div><div style={{ color:C.bright, fontSize:12, fontWeight:700, fontFamily:font }}>{item.trade_plan.entry}</div></div>}
            {item.trade_plan.stop && <div style={{ background:C.bg, borderRadius:6, padding:'6px 10px' }}><div style={{ color:C.dim, fontSize:8, fontFamily:font, textTransform:'uppercase' }}>Stop</div><div style={{ color:C.red, fontSize:12, fontWeight:700, fontFamily:font }}>{item.trade_plan.stop}</div></div>}
            {item.trade_plan.target_1 && <div style={{ background:C.bg, borderRadius:6, padding:'6px 10px' }}><div style={{ color:C.dim, fontSize:8, fontFamily:font, textTransform:'uppercase' }}>Target</div><div style={{ color:C.green, fontSize:12, fontWeight:700, fontFamily:font }}>{item.trade_plan.target_1}</div></div>}
            {item.trade_plan.risk_reward && <div style={{ background:C.bg, borderRadius:6, padding:'6px 10px' }}><div style={{ color:C.dim, fontSize:8, fontFamily:font, textTransform:'uppercase' }}>R:R</div><div style={{ color:C.gold, fontSize:12, fontWeight:700, fontFamily:font }}>{item.trade_plan.risk_reward}</div></div>}
          </div>}
          <div style={{ padding:14 }}><TradingViewMini ticker={item.symbol} pick={item} /></div>
        </div>}
      </CardWrap>;
    };

    return <div>
      <div style={{ padding:'18px 22px', background:`linear-gradient(135deg, ${C.card} 0%, ${C.bg} 100%)`, border:`1px solid ${C.border}`, borderRadius:12, marginBottom:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>🔥</span>
            <span style={{ color:C.bright, fontSize:18, fontWeight:800, fontFamily:sansFont }}>Trending Now</span>
          </div>
          {mr.verdict && <Badge color={regimeColor(mr.verdict)}>{mr.verdict}</Badge>}
        </div>
      </div>

      {mr.summary && <div style={{ padding:'14px 18px', background:C.card, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:10 }}>
        <div style={{ color:C.text, fontSize:12, lineHeight:1.7, fontFamily:sansFont, marginBottom:8 }}>{mr.summary}</div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          {mr.fear_greed && <span style={{ color:C.dim, fontSize:10, fontFamily:font }}>F&G: <span style={{ color:C.gold, fontWeight:600 }}>{mr.fear_greed}</span></span>}
          {mr.vix && <span style={{ color:C.dim, fontSize:10, fontFamily:font }}>VIX: <span style={{ color:C.text, fontWeight:600 }}>{mr.vix}</span></span>}
        </div>
      </div>}

      {aca.length > 0 && <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:8, marginBottom:10 }}>
        {aca.map((a: any, i: number) => (
          <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <span style={{ color:C.bright, fontSize:12, fontWeight:700, fontFamily:sansFont }}>{a.asset_class}</span>
              <Badge color={regimeColor(a.regime)}>{a.regime}</Badge>
            </div>
            <div style={{ color:C.dim, fontSize:10, lineHeight:1.4, fontFamily:sansFont }}>{a.rationale}</div>
          </div>
        ))}
      </div>}

      {signal && signal.symbol && <div style={{ background:C.card, border:`1px solid ${C.blue}30`, borderRadius:12, marginBottom:12, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px' }}>
          <div style={{ color:C.dim, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Social Trading Signal</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ color:C.blue, fontSize:20, fontWeight:800, fontFamily:font }}>{signal.symbol}</span>
              {signal.classification && <Badge color={classColor(signal.classification)}>{signal.classification}</Badge>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {signal.rating && <Badge color={ratingColor(signal.rating)}>{signal.rating}</Badge>}
              {signal.confidence > 0 && <span style={{ background:`${C.gold}15`, color:C.gold, padding:'2px 8px', borderRadius:4, fontSize:12, fontWeight:700, fontFamily:font }}>{signal.confidence}</span>}
            </div>
          </div>
          {signal.thesis_bullets && signal.thesis_bullets.filter((b: string) => b).length > 0 && (
            <div style={{ marginBottom:10 }}>
              {signal.thesis_bullets.filter((b: string) => b).map((t: string, i: number) => (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:3 }}>
                  <span style={{ color:C.blue, fontSize:9, marginTop:3 }}>▸</span>
                  <span style={{ color:C.text, fontSize:11, lineHeight:1.5, fontFamily:sansFont }}>{t}</span>
                </div>
              ))}
            </div>
          )}
          {confBar(signal.confirmations)}
          {signal.receipts && signal.receipts.length > 0 && <div style={{ marginTop:10 }}>
            {signal.receipts.slice(0, 2).map((r: any, i: number) => (
              <div key={i} style={{ padding:'6px 10px', background:`${C.blue}06`, borderLeft:`3px solid ${C.blue}30`, borderRadius:4, marginBottom:4, color:C.text, fontSize:10, fontStyle:'italic', fontFamily:sansFont }}>{typeof r === 'string' ? r : r.text || r.quote || ''}</div>
            ))}
          </div>}
          {signal.position_size && <div style={{ marginTop:8, color:C.gold, fontSize:10, fontWeight:600, fontFamily:sansFont }}>{signal.position_size}</div>}
        </div>
      </div>}

      {sections.map(({ key, label, icon, items, accent }) => {
        if (!items.length) return null;
        return <div key={key} style={{ marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ fontSize:14 }}>{icon}</span>
            <span style={{ color: accent || C.bright, fontSize:13, fontWeight:700, fontFamily:sansFont }}>{label}</span>
            <span style={{ color:C.dim, fontSize:10, fontFamily:font }}>({items.length})</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {items.map((item: any, i: number) => renderItemCard(item, `trend-${key}`, i))}
          </div>
        </div>;
      })}
    </div>;
  }

  function renderCsvWatchlist(s: any) {
    const intervals = [{l:'1H',v:'60'},{l:'4H',v:'240'},{l:'1D',v:'D'},{l:'1W',v:'W'},{l:'1M',v:'M'}];
    const sections = [
      { key: 'strong_buy', label: 'STRONG BUY', color: '#16a34a', bg: '#16a34a10', border: '#16a34a30', items: s.strong_buy || [] },
      { key: 'buy', label: 'BUY', color: '#4ade80', bg: '#4ade8010', border: '#4ade8030', items: s.buy || [] },
      { key: 'hold', label: 'HOLD', color: '#f59e0b', bg: '#f59e0b10', border: '#f59e0b30', items: s.hold || [] },
      { key: 'sell', label: 'SELL', color: '#ef4444', bg: '#ef444410', border: '#ef444430', items: s.sell || [] },
    ];
    const topPicks = s.top_picks || [];
    const totalCount = sections.reduce((sum, sec) => sum + sec.items.length, 0);

    const renderTickerRow = (item: any, i: number, sec: {key:string, color:string, border:string, items:any[]}) => {
      if (!item || !item.ticker) return null;
      const rowId = `${sec.key}-${item.ticker}`;
      const isExp = expandedTicker === rowId;
      const tvSym = item.ticker?.includes(':') ? item.ticker : item.ticker;
      return <div key={i}>
        <div onClick={() => setExpandedTicker(isExp ? null : rowId)} style={{ padding:'8px 14px', borderBottom: (i < sec.items.length - 1 || isExp) ? `1px solid ${C.border}` : 'none', display:'flex', alignItems:'center', gap:10, background: i % 2 === 0 ? 'transparent' : `${C.bg}80`, cursor:'pointer' }}>
          <span style={{ color:sec.color, fontSize:13, fontWeight:700, fontFamily:font, width:70, flexShrink:0 }}>{item.ticker}</span>
          {item.market_cap && <span style={{ color:C.dim, fontSize:10, fontWeight:600, fontFamily:font, background:C.bg, padding:'2px 6px', borderRadius:3, border:`1px solid ${C.border}`, flexShrink:0 }}>{item.market_cap}</span>}
          <span style={{ color:C.text, fontSize:11, fontFamily:sansFont, lineHeight:1.5, flex:1 }}>{item.reason}</span>
          <span style={{ color:C.dim, fontSize:9, flexShrink:0, transform: isExp ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform 0.15s' }}>▼</span>
        </div>
        {isExp && <div style={{ padding:'8px 14px', background:C.bg, borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', gap:4, marginBottom:6 }}>
            {intervals.map(iv => <button key={iv.v} onClick={(e) => { e.stopPropagation(); setCsvChartInterval(iv.v); }} style={{ padding:'2px 8px', fontSize:9, fontWeight:600, fontFamily:font, background: csvChartInterval === iv.v ? C.blue+'20' : 'transparent', color: csvChartInterval === iv.v ? C.blue : C.dim, border:`1px solid ${csvChartInterval === iv.v ? C.blue+'40' : C.border}`, borderRadius:3, cursor:'pointer' }}>{iv.l}</button>)}
          </div>
          <div style={{ borderRadius:6, overflow:'hidden', border:`1px solid ${C.border}` }}>
            <iframe src={`https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=400&interval=${csvChartInterval}&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=false&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=%5B%22volume_force_overlay%22%2C%22create_volume_indicator_by_default%22%5D&enabled_features=%5B%22use_localstorage_for_settings%22%2C%22study_templates%22%2C%22header_indicators%22%2C%22header_compare%22%2C%22header_undo_redo%22%2C%22header_screenshot%22%2C%22header_chart_type%22%2C%22header_settings%22%2C%22header_resolutions%22%2C%22header_fullscreen_button%22%2C%22left_toolbar%22%2C%22drawing_templates%22%5D&symbol=${encodeURIComponent(tvSym)}`} style={{ width:'100%', height:400, border:'none', display:'block' }} title={`${tvSym} chart`} />
          </div>
        </div>}
      </div>;
    };

    return <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {s.summary && <div style={{ padding:'12px 16px', background:`${C.blue}08`, border:`1px solid ${C.blue}20`, borderRadius:8, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6 }}>{s.summary}</div>}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {sections.map(sec => sec.items.length > 0 && <span key={sec.key} style={{ padding:'4px 10px', borderRadius:4, fontSize:10, fontWeight:700, fontFamily:font, color:sec.color, background:sec.bg, border:`1px solid ${sec.border}` }}>{sec.label}: {sec.items.length}</span>)}
        <span style={{ padding:'4px 10px', borderRadius:4, fontSize:10, fontWeight:600, fontFamily:font, color:C.dim, background:C.bg, border:`1px solid ${C.border}` }}>TOTAL: {totalCount}</span>
      </div>
      {topPicks.length > 0 && <div style={{ padding:14, background:`${C.gold}08`, border:`1px solid ${C.gold}25`, borderRadius:10 }}>
        <div style={{ color:C.gold, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>TOP PICKS</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {topPicks.map((pick: any, i: number) => <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
            <span style={{ color:C.gold, fontSize:16, fontWeight:800, fontFamily:font, flexShrink:0, width:20 }}>{i+1}.</span>
            <div>
              <span style={{ color:C.bright, fontSize:14, fontWeight:700, fontFamily:font }}>{pick.ticker}</span>
              <div style={{ color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6, marginTop:2 }}>{pick.thesis}</div>
            </div>
          </div>)}
        </div>
      </div>}
      {sections.map(sec => {
        if (!sec.items.length) return null;
        return <div key={sec.key} style={{ borderRadius:10, border:`1px solid ${sec.border}`, overflow:'hidden' }}>
          <div style={{ padding:'8px 14px', background:sec.bg, borderBottom:`1px solid ${sec.border}`, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:sec.color }} />
            <span style={{ color:sec.color, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em' }}>{sec.label}</span>
            <span style={{ color:C.dim, fontSize:10, fontFamily:font }}>({sec.items.length})</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            {sec.items.map((item: any, i: number) => renderTickerRow(item, i, sec))}
          </div>
        </div>;
      })}
    </div>;
  }

  const knownTypes = ['trades','investments','fundamentals','technicals','analysis','dashboard','sector_rotation','earnings_catalyst','commodities','portfolio','briefing','crypto','trending','screener','trending_now','cross_market','csv_watchlist','csv_watchlist_analysis','playbook_analysis','serenity_discovery','serenity_supply_chain','serenity_compare'];

  function renderCompareResult(data: any) {
    const label: string = data._label || 'Compare — Serenity vs S&J';
    const PBC = '#6366f1';
    const rows: any[] = data.results || [];
    const summaryText: string = data.summary || '';

    const classColor = (cls?: string) => {
      if (!cls) return C.dim;
      const c = cls.toLowerCase();
      if (c.includes('consensus')) return C.green;
      if (c.includes('serenity')) return PBC;
      if (c.includes('s&j') || c.includes('sj')) return C.gold;
      return C.red;
    };

    const scoreCell = (val?: number, color?: string) => val == null
      ? <span style={{ color:C.dim, fontSize:11, fontFamily:font }}>—</span>
      : <span style={{ color: color || C.bright, fontWeight:700, fontSize:13, fontFamily:font }}>{Math.round(val)}</span>;

    return <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:`${PBC}10`, border:`1px solid ${PBC}25`, borderRadius:8, marginBottom:10, flexWrap:'wrap' }}>
        <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:PBC, flexShrink:0 }} />
        <span style={{ color:PBC, fontWeight:700, fontSize:11, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
        {rows.length > 0 && <span style={{ color:C.dim, fontSize:9, fontFamily:font }}>{rows.length} tickers</span>}
      </div>

      {/* Summary */}
      {summaryText && summaryText.trim() && (
        <div style={{ padding:'12px 16px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, lineHeight:1.7, fontSize:12, fontFamily:sansFont, marginBottom:10 }}
          dangerouslySetInnerHTML={{ __html: formatAnalysis(summaryText) }} />
      )}

      {/* Classification overview pills */}
      {(data.consensus_tickers?.length || data.serenity_only?.length || data.sj_only?.length || data.low_fit_both?.length) && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
          {data.consensus_tickers?.length > 0 && (
            <div style={{ padding:'4px 12px', borderRadius:5, background:`${C.green}10`, border:`1px solid ${C.green}30` }}>
              <span style={{ fontSize:8, fontWeight:700, fontFamily:font, color:C.green, textTransform:'uppercase', display:'block', marginBottom:2 }}>Consensus</span>
              <span style={{ fontSize:11, fontWeight:700, fontFamily:font, color:C.green }}>{data.consensus_tickers.join(' · ')}</span>
            </div>
          )}
          {data.serenity_only?.length > 0 && (
            <div style={{ padding:'4px 12px', borderRadius:5, background:`${PBC}10`, border:`1px solid ${PBC}30` }}>
              <span style={{ fontSize:8, fontWeight:700, fontFamily:font, color:PBC, textTransform:'uppercase', display:'block', marginBottom:2 }}>Serenity Only</span>
              <span style={{ fontSize:11, fontWeight:700, fontFamily:font, color:PBC }}>{data.serenity_only.join(' · ')}</span>
            </div>
          )}
          {data.sj_only?.length > 0 && (
            <div style={{ padding:'4px 12px', borderRadius:5, background:`${C.gold}10`, border:`1px solid ${C.gold}30` }}>
              <span style={{ fontSize:8, fontWeight:700, fontFamily:font, color:C.gold, textTransform:'uppercase', display:'block', marginBottom:2 }}>S&J Only</span>
              <span style={{ fontSize:11, fontWeight:700, fontFamily:font, color:C.gold }}>{data.sj_only.join(' · ')}</span>
            </div>
          )}
          {data.low_fit_both?.length > 0 && (
            <div style={{ padding:'4px 12px', borderRadius:5, background:`${C.red}10`, border:`1px solid ${C.red}30` }}>
              <span style={{ fontSize:8, fontWeight:700, fontFamily:font, color:C.red, textTransform:'uppercase', display:'block', marginBottom:2 }}>Low Fit Both</span>
              <span style={{ fontSize:11, fontWeight:700, fontFamily:font, color:C.red }}>{data.low_fit_both.join(' · ')}</span>
            </div>
          )}
        </div>
      )}

      {/* Per-ticker rows */}
      {rows.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {rows.map((row: any, i: number) => {
            const ticker = row.ticker || '';
            const name = row.company_name || row.name || '';
            const cls = row.classification || '';
            const clsClr = classColor(cls);
            const delta = row.delta ?? ((row.serenity_score != null && row.sj_score != null) ? row.serenity_score - row.sj_score : undefined);
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${clsClr}`, borderRadius:7, flexWrap:'wrap' }}>
                {/* Ticker + name */}
                <div style={{ minWidth:80 }}>
                  {ticker && <span style={{ color:C.blue, fontWeight:700, fontSize:13, fontFamily:font, display:'block' }}>{ticker}</span>}
                  {name && <span style={{ color:C.dim, fontSize:10, fontFamily:sansFont }}>{name}</span>}
                </div>
                {/* Classification badge */}
                {cls && <span style={{ padding:'2px 8px', borderRadius:4, fontSize:9, fontWeight:700, fontFamily:font, color:clsClr, background:`${clsClr}12`, border:`1px solid ${clsClr}30`, whiteSpace:'nowrap' }}>{cls}</span>}
                {/* Score columns */}
                <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                  <div style={{ textAlign:'center' }}>
                    <span style={{ display:'block', fontSize:7, color:'#818cf8', fontFamily:font, fontWeight:700, textTransform:'uppercase', marginBottom:1 }}>Serenity</span>
                    {scoreCell(row.serenity_score, '#818cf8')}
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <span style={{ display:'block', fontSize:7, color:C.gold, fontFamily:font, fontWeight:700, textTransform:'uppercase', marginBottom:1 }}>S&J</span>
                    {scoreCell(row.sj_score, C.gold)}
                  </div>
                  {delta != null && (
                    <div style={{ textAlign:'center' }}>
                      <span style={{ display:'block', fontSize:7, color:C.dim, fontFamily:font, fontWeight:700, textTransform:'uppercase', marginBottom:1 }}>Δ</span>
                      <span style={{ color: delta > 0 ? '#818cf8' : delta < 0 ? C.gold : C.dim, fontWeight:700, fontSize:11, fontFamily:font }}>{delta > 0 ? '+' : ''}{Math.round(delta)}</span>
                    </div>
                  )}
                </div>
                {/* Explanation */}
                {row.explanation && <span style={{ color:C.dim, fontSize:11, fontFamily:sansFont, flex:1, minWidth:120 }}>{row.explanation}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>;
  }

  function renderSerenityDiscovery(data: any) {
    const label = data._label || 'Serenity Discovery';
    const PBC = '#6366f1';
    const summaryText: string = data.summary || data.analysis || '';
    const candidates: any[] = data.top_candidates || data.candidates || [];
    const meta = data.meta || {};

    // Regime / auto context — may be present when backend ran auto mode
    const rc: any = data.regime_context || data.auto_regime || null;

    // Compact numeric chip — green/amber/red by value, label above number
    const scoreChip = (title: string, val?: number) => val == null ? null : (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'4px 8px', background: val >= 70 ? `${C.green}12` : val >= 40 ? `${C.gold}12` : `rgba(239,68,68,0.1)`, border:`1px solid ${val >= 70 ? C.green : val >= 40 ? C.gold : '#ef4444'}30`, borderRadius:5, minWidth:48 }}>
        <span style={{ fontSize:7, fontWeight:700, fontFamily:font, color: val >= 70 ? C.green : val >= 40 ? C.gold : '#ef4444', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:1 }}>{title}</span>
        <span style={{ fontSize:11, fontWeight:700, fontFamily:font, color: val >= 70 ? C.green : val >= 40 ? C.gold : '#ef4444' }}>{Math.round(val)}</span>
      </div>
    );

    // Coverage / access badge — shown prominently
    const coverageBadge = (status?: string) => {
      if (!status) return null;
      const s = status.toLowerCase();
      const ok = s.includes('accessible') || s.includes('listed') || s.includes('direct');
      const warn = s.includes('adr') || s.includes('proxy') || s.includes('partial');
      const clr = ok ? C.green : warn ? C.gold : C.red;
      return <span style={{ padding:'2px 7px', borderRadius:3, fontSize:9, fontWeight:700, fontFamily:font, color:clr, background:`${clr}12`, border:`1px solid ${clr}30` }}>{status}</span>;
    };

    return <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:`${PBC}10`, border:`1px solid ${PBC}25`, borderRadius:8, marginBottom:10, flexWrap:'wrap' }}>
        <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:PBC, flexShrink:0 }} />
        <span style={{ color:PBC, fontWeight:700, fontSize:11, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
        {candidates.length > 0 && <span style={{ color:C.dim, fontSize:9, fontFamily:font }}>{candidates.length} candidates</span>}
        {meta.depth != null && <span style={{ color:C.dim, fontSize:9, fontFamily:font }}>depth {meta.depth}</span>}
        {meta.anchor && <span style={{ color:C.blue, fontSize:9, fontFamily:font, fontWeight:700 }}>↳ {meta.anchor}</span>}
      </div>

      {/* Regime context block — shown when backend included auto-mode context */}
      {rc && (rc.summary || rc.top_themes?.length || rc.top_anchors?.length) && (
        <div style={{ padding:'10px 14px', background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.18)', borderRadius:8, marginBottom:10, display:'flex', flexDirection:'column', gap:5 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            <span style={{ fontSize:8, fontWeight:700, fontFamily:font, color:'#6366f1', textTransform:'uppercase', letterSpacing:'0.06em' }}>Serenity chose</span>
            {rc.top_themes?.length > 0 && (
              <span style={{ fontSize:9, fontFamily:font, color:'#a5b4fc', fontWeight:600 }}>{rc.top_themes.slice(0,3).join(' + ')}</span>
            )}
            {rc.top_anchors?.length > 0 && (
              <span style={{ fontSize:9, fontFamily:font, color:'#6b7280' }}>· anchors: {rc.top_anchors.slice(0,3).join(', ')}</span>
            )}
            {rc.confidence && (
              <span style={{ fontSize:9, fontFamily:font, color: rc.confidence.toLowerCase().includes('high') ? '#10b981' : '#f59e0b', fontWeight:600, marginLeft:4 }}>
                {rc.confidence} confidence
              </span>
            )}
          </div>
          {rc.why_now && (
            <div style={{ fontSize:9, fontFamily:font, color:'#6b7280', fontStyle:'italic', lineHeight:1.5 }}>
              {rc.why_now}
            </div>
          )}
          {rc.summary && rc.summary !== rc.why_now && (
            <div style={{ fontSize:9, fontFamily:font, color:'#9ca3af', lineHeight:1.5 }}>
              {rc.summary}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {summaryText && summaryText.trim() && (
        <div style={{ padding:'14px 18px', background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, lineHeight:1.75, fontSize:13, fontFamily:sansFont, marginBottom:12 }}
          dangerouslySetInnerHTML={{ __html: formatAnalysis(summaryText) }} />
      )}

      {/* Ranked buckets — surface best ideas first */}
      {(() => {
        const buckets: { key: string; label: string; color: string; items: any[] }[] = [
          { key: 'best_blend_candidates',              label: 'Best Blend',              color: C.green,  items: data.best_blend_candidates              || [] },
          { key: 'highest_confidence_candidates',      label: 'Highest Confidence',      color: C.blue,   items: data.highest_confidence_candidates      || [] },
          { key: 'top_hidden_bottlenecks',             label: 'Hidden Bottlenecks',      color: PBC,      items: data.top_hidden_bottlenecks             || [] },
          { key: 'top_us_accessible_foreign_proxies',  label: 'US-Accessible Foreign',   color: C.gold,   items: data.top_us_accessible_foreign_proxies  || [] },
          { key: 'top_foreign_specialists',            label: 'Foreign Specialists',     color: C.gold,   items: data.top_foreign_specialists            || [] },
        ].filter(b => b.items.length > 0);
        if (!buckets.length) return null;
        return (
          <div style={{ marginBottom:14 }}>
            <div style={{ color:C.bright, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>Ranked Buckets</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {buckets.map(b => (
                <div key={b.key} style={{ padding:'8px 12px', background:`${b.color}08`, border:`1px solid ${b.color}25`, borderLeft:`3px solid ${b.color}`, borderRadius:7 }}>
                  <div style={{ color:b.color, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', marginBottom:5 }}>{b.label}</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {b.items.map((c: any, j: number) => {
                      const tk = c.ticker || c.symbol || '';
                      const nm = c.company_name || c.name || '';
                      const blend = c.best_blend_score ?? c.scores?.bottleneck_criticality_score ?? c.bottleneck_score;
                      return (
                        <div key={j} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', background:C.bg, border:`1px solid ${b.color}30`, borderRadius:5 }}>
                          {tk && <span style={{ color:C.blue, fontWeight:700, fontSize:11, fontFamily:font }}>{tk}</span>}
                          {nm && tk !== nm && <span style={{ color:C.dim, fontSize:9, fontFamily:sansFont }}>{nm}</span>}
                          {c.country && c.country !== 'US' && <span style={{ fontSize:8, color:C.gold, fontFamily:font }}>{c.country}</span>}
                          {blend != null && <span style={{ fontSize:9, fontWeight:700, fontFamily:font, color: blend >= 70 ? C.green : blend >= 40 ? C.gold : C.red }}>{Math.round(blend)}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {/* Compare top results across both playbooks */}
            {buckets.some(b => b.items.length) && (() => {
              const topTickers = [...new Set(buckets.flatMap(b => b.items.map((c: any) => c.ticker || c.symbol)).filter(Boolean))].slice(0, 8) as string[];
              return topTickers.length > 0 ? (
                <button onClick={() => { if (!loading) runCompare(topTickers, `Consensus Check — Top ${topTickers.length} Candidates`); }} style={{ marginTop:8, padding:'3px 12px', fontSize:9, fontWeight:600, fontFamily:font, background:`${C.green}10`, color:C.green, border:`1px solid ${C.green}30`, borderRadius:4, cursor:loading ? 'not-allowed' : 'pointer', opacity:loading ? 0.5 : 1 }}>
                  Consensus Check (Compare Top {topTickers.length})
                </button>
              ) : null;
            })()}
          </div>
        );
      })()}

      {/* Full candidate list */}
      {candidates.length > 0 && (
        <div>
          <div style={{ color:C.bright, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>
            All Candidates ({candidates.length})
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {candidates.map((c: any, i: number) => {
              const ticker = c.ticker || c.symbol || '';
              const name = c.company_name || c.name || '';
              const themes: string[] = c.themes || c.theme_tags || [];
              const giants: string[] = c.giant_anchors || [];
              const scores = c.scores || {};
              const criticality = scores.bottleneck_criticality_score ?? c.bottleneck_score;
              const hidden     = scores.hiddenness_score ?? c.hiddenness_score;
              const depth      = scores.chain_depth_score;
              const scConf     = scores.supply_chain_confidence_score ?? (c.confidence != null ? Math.round((c.confidence || 0) * 100) : undefined);
              const proxyAcc   = scores.proxy_accessibility_score;
              const blend      = c.best_blend_score;
              // Access / coverage
              const coverageStatus = c.coverage_status;
              const dataConf       = c.data_confidence;
              const directTrade    = c.direct_tradable;
              const adr    = c.adr_ticker || c.adr_proxy;
              const etfProxy = c.us_access_proxy || c.etf_proxy;
              // narrative
              const thesis = c.thesis_summary || c.rationale || c.fit_reasoning || '';
              const fitReason = c.fit_reasoning && c.fit_reasoning !== thesis ? c.fit_reasoning : '';
              // "why surfaced" fields — new optional backend fields
              const whyNow   = c.why_now;
              const whyHidden = c.why_hidden;
              const verifyNext = c.what_to_verify_next;
              const hiddenReason = c.hiddenness_reason;
              const visBucket = c.visibility_bucket;
              const roleType  = c.chain_role_type;
              const penalties: string[] = c.confidence_penalties || [];
              const dataGaps:  string[] = c.data_gaps || [];

              return (
                <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${PBC}`, borderRadius:8, padding:'12px 16px' }}>
                  {/* Identity row */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6 }}>
                    {ticker && <span style={{ color:C.blue, fontWeight:700, fontSize:14, fontFamily:font }}>{ticker}</span>}
                    {name && <span style={{ color:C.dim, fontSize:11, fontFamily:sansFont }}>{name}</span>}
                    {c.country && <span style={{ padding:'1px 6px', borderRadius:3, fontSize:8, fontWeight:600, fontFamily:font, color:C.gold, background:`${C.gold}10`, border:`1px solid ${C.gold}25` }}>{c.country}</span>}
                    {c.exchange && <span style={{ color:C.dim, fontSize:9, fontFamily:font }}>{c.exchange}</span>}
                    {(c.chain_layer || c.layer_depth != null) && (
                      <span style={{ padding:'1px 6px', borderRadius:3, fontSize:8, fontWeight:600, fontFamily:font, color:C.blue, background:`${C.blue}10`, border:`1px solid ${C.blue}25` }}>
                        {c.chain_layer || `L${c.layer_depth}`}
                      </span>
                    )}
                    {roleType && <span style={{ padding:'1px 6px', borderRadius:3, fontSize:8, fontWeight:600, fontFamily:font, color:C.dim, border:`1px solid ${C.border}` }}>{roleType}</span>}
                    {visBucket && <span style={{ padding:'1px 6px', borderRadius:3, fontSize:8, fontWeight:600, fontFamily:font, color:'#818cf8', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)' }}>{visBucket}</span>}
                  </div>

                  {/* Score chips — blend first if present */}
                  {(blend != null || criticality != null || hidden != null || depth != null || scConf != null || proxyAcc != null) && (
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                      {blend != null && scoreChip('Blend', blend)}
                      {scoreChip('Criticality', criticality)}
                      {scoreChip('Hiddenness', hidden)}
                      {scoreChip('Chain Depth', depth)}
                      {scoreChip('SC Confidence', scConf)}
                      {scoreChip('Proxy Access', proxyAcc)}
                    </div>
                  )}

                  {/* Coverage row — PROMINENT */}
                  {(coverageStatus || dataConf != null || directTrade != null || adr || etfProxy) && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', padding:'5px 10px', background:'rgba(99,102,241,0.04)', border:'1px solid rgba(99,102,241,0.12)', borderRadius:6, marginBottom:8 }}>
                      {coverageStatus && coverageBadge(coverageStatus)}
                      {dataConf && <span style={{ fontSize:9, fontFamily:font, color:C.dim }}>Data: <span style={{ color:C.bright }}>{dataConf}</span></span>}
                      {directTrade === true && <span style={{ padding:'2px 6px', borderRadius:3, fontSize:9, fontWeight:700, fontFamily:font, color:C.green, background:`${C.green}10`, border:`1px solid ${C.green}30` }}>Direct</span>}
                      {directTrade === false && <span style={{ padding:'2px 6px', borderRadius:3, fontSize:9, fontWeight:700, fontFamily:font, color:C.gold, background:`${C.gold}10`, border:`1px solid ${C.gold}30` }}>Indirect</span>}
                      {adr && <span style={{ fontSize:9, fontFamily:font, color:C.dim }}>ADR: <span style={{ color:C.green, fontWeight:700 }}>{adr}</span></span>}
                      {etfProxy && !adr && <span style={{ fontSize:9, fontFamily:font, color:C.dim }}>Proxy: <span style={{ color:C.green, fontWeight:700 }}>{etfProxy}</span></span>}
                    </div>
                  )}

                  {/* Theme + giant anchor tags */}
                  {(themes.length > 0 || giants.length > 0) && (
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:6 }}>
                      {giants.map((g: string, j: number) => <span key={`g${j}`} style={{ padding:'1px 6px', borderRadius:3, fontSize:8, fontWeight:600, fontFamily:font, color:C.blue, background:`${C.blue}10`, border:`1px solid ${C.blue}25` }}>↑{g}</span>)}
                      {themes.map((t: string, j: number) => <span key={`t${j}`} style={{ padding:'1px 6px', borderRadius:3, fontSize:8, fontWeight:600, fontFamily:font, color:PBC, background:`${PBC}10`, border:`1px solid ${PBC}25` }}>{t}</span>)}
                    </div>
                  )}

                  {/* Thesis / rationale */}
                  {thesis && <div style={{ color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6, marginBottom:4 }}>{thesis}</div>}
                  {fitReason && <div style={{ color:C.dim, fontSize:11, fontFamily:sansFont, lineHeight:1.5, marginBottom:4 }}>{fitReason}</div>}

                  {/* "Why surfaced" context — these make the card actionable */}
                  {(whyNow || whyHidden || hiddenReason) && (
                    <div style={{ display:'flex', flexDirection:'column', gap:3, padding:'6px 10px', background:'rgba(99,102,241,0.03)', border:'1px solid rgba(99,102,241,0.1)', borderRadius:5, marginBottom:6 }}>
                      {whyNow && <div style={{ fontSize:11, fontFamily:sansFont, color:C.text }}><span style={{ color:PBC, fontWeight:700 }}>Why now: </span>{whyNow}</div>}
                      {whyHidden && <div style={{ fontSize:11, fontFamily:sansFont, color:C.text }}><span style={{ color:PBC, fontWeight:700 }}>Why hidden: </span>{whyHidden}</div>}
                      {hiddenReason && !whyHidden && <div style={{ fontSize:11, fontFamily:sansFont, color:C.dim }}>{hiddenReason}</div>}
                    </div>
                  )}
                  {verifyNext && (
                    <div style={{ fontSize:11, fontFamily:sansFont, color:C.dim, marginBottom:6 }}>
                      <span style={{ color:C.gold, fontWeight:700 }}>Verify: </span>{verifyNext}
                    </div>
                  )}

                  {/* Penalties / data gaps — honest uncertainty */}
                  {(penalties.length > 0 || dataGaps.length > 0) && (
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:6 }}>
                      {penalties.map((p: string, j: number) => <span key={`p${j}`} style={{ padding:'1px 6px', borderRadius:3, fontSize:8, fontFamily:font, color:C.red, background:`${C.red}08`, border:`1px solid ${C.red}20` }}>−{p}</span>)}
                      {dataGaps.map((g: string, j: number) => <span key={`dg${j}`} style={{ padding:'1px 6px', borderRadius:3, fontSize:8, fontFamily:font, color:C.dim, border:`1px solid ${C.border}` }}>gap:{g}</span>)}
                    </div>
                  )}

                  {/* Action buttons */}
                  {ticker && (
                    <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                      <button onClick={() => { if (!loading) runSupplyChainMap({ anchorOverride: ticker }); }} style={{ padding:'3px 10px', fontSize:9, fontWeight:600, fontFamily:font, background:'transparent', color:PBC, border:`1px solid ${PBC}40`, borderRadius:4, cursor:loading ? 'not-allowed' : 'pointer', opacity:loading ? 0.5 : 1 }}>
                        Supply Chain Map
                      </button>
                      <button onClick={() => { if (!loading) runCompare([ticker], `Compare vs S&J — ${ticker}`); }} style={{ padding:'3px 10px', fontSize:9, fontWeight:600, fontFamily:font, background:'transparent', color:C.gold, border:`1px solid ${C.gold}40`, borderRadius:4, cursor:loading ? 'not-allowed' : 'pointer', opacity:loading ? 0.5 : 1 }}>
                        Compare vs S&J
                      </button>
                      <button onClick={() => { if (!loading) { const q = `Serenity analysis: ${ticker}${name ? ` (${name})` : ''}`; runPlaybookAnalysis(q); } }} style={{ padding:'3px 10px', fontSize:9, fontWeight:600, fontFamily:font, background:'transparent', color:C.blue, border:`1px solid ${C.blue}40`, borderRadius:4, cursor:loading ? 'not-allowed' : 'pointer', opacity:loading ? 0.5 : 1 }}>
                        Analyze
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>;
  }

  function renderSupplyChainMap(data: any) {
    const label = data._label || (data.anchor ? `Supply Chain Map — ${data.anchor}` : 'Supply Chain Map');
    const PBC = '#6366f1';
    const summaryText: string = data.summary || '';
    const anchor: string = data.anchor || '';
    const anchorType: string = data.anchor_type || '';
    const countryTags: string[] = data.country_tags || [];
    const adrProxies: Record<string, string> = data.adr_etf_proxies || {};
    const confidence: number | undefined = data.confidence;

    // Normalize layers — backend returns { layer_index, label, nodes[] }
    // Fallback: group flat nodes by their .layer field
    const rawLayers: any[] = data.layers && data.layers.length ? data.layers : [];
    const layers: { idx: number; label: string; nodes: any[] }[] = rawLayers.length
      ? rawLayers.map((l: any, i: number) => ({ idx: l.layer_index ?? i + 1, label: l.label || `Layer ${i + 1}`, nodes: l.nodes || [] }))
      : (() => {
          const flatNodes: any[] = data.nodes || [];
          const map: Record<string, { idx: number; label: string; nodes: any[] }> = {};
          flatNodes.forEach((n: any) => {
            const k = n.layer || 'Other';
            if (!map[k]) map[k] = { idx: Object.keys(map).length + 1, label: k, nodes: [] };
            map[k].nodes.push(n);
          });
          return Object.values(map);
        })();

    const nodeCard = (n: any, ni: number) => {
      const tk = n.ticker || '';
      const nm = n.company_name || n.name || '';
      const isForeign = n.is_foreign || (n.country && !['US','USA'].includes(n.country.toUpperCase()));
      const proxy = n.us_access_proxy || n.adr_ticker || n.adr_proxy || adrProxies[tk];
      const score = n.bottleneck_score;
      const conf  = n.confidence;
      return (
        <div key={ni} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 10px', background:C.bg, border:`1px solid ${isForeign ? C.gold + '50' : C.border}`, borderRadius:6, marginRight:5, marginBottom:5 }}>
          {tk && <span style={{ color:C.blue, fontWeight:700, fontSize:12, fontFamily:font }}>{tk}</span>}
          {nm && tk !== nm && <span style={{ color:C.dim, fontSize:10, fontFamily:sansFont, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nm}</span>}
          {n.country && <span style={{ padding:'1px 5px', borderRadius:3, fontSize:8, fontWeight:600, fontFamily:font, color: isForeign ? C.gold : C.dim, background: isForeign ? `${C.gold}10` : 'transparent', border:`1px solid ${isForeign ? C.gold + '30' : 'transparent'}` }}>{n.country}</span>}
          {score != null && <span style={{ fontSize:8, fontWeight:700, fontFamily:font, color: score >= 70 ? C.green : score >= 40 ? C.gold : C.red }}>{Math.round(score)}</span>}
          {conf != null && score == null && <span style={{ fontSize:8, color:C.dim, fontFamily:font }}>{typeof conf === 'number' && conf <= 1 ? `${Math.round(conf*100)}%` : `${Math.round(conf)}%`}</span>}
          {proxy && <span style={{ fontSize:8, color:C.green, fontFamily:font, fontWeight:700 }}>→{proxy}</span>}
        </div>
      );
    };

    return <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:`${PBC}10`, border:`1px solid ${PBC}25`, borderRadius:8, marginBottom:10, flexWrap:'wrap' }}>
        <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:PBC, flexShrink:0 }} />
        <span style={{ color:PBC, fontWeight:700, fontSize:11, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
        {anchorType && <span style={{ padding:'1px 6px', borderRadius:3, fontSize:8, fontWeight:600, fontFamily:font, color:C.blue, background:`${C.blue}10`, border:`1px solid ${C.blue}25` }}>{anchorType}</span>}
        {confidence != null && <span style={{ fontSize:9, color:C.dim, fontFamily:font }}>confidence {typeof confidence === 'number' && confidence <= 1 ? `${Math.round(confidence * 100)}%` : `${Math.round(confidence)}%`}</span>}
        {countryTags.map((ct, i) => <span key={i} style={{ padding:'1px 5px', borderRadius:3, fontSize:8, fontWeight:600, fontFamily:font, color:C.gold, background:`${C.gold}10`, border:`1px solid ${C.gold}25` }}>{ct}</span>)}
      </div>

      {/* Summary */}
      {summaryText && summaryText.trim() && (
        <div style={{ padding:'14px 18px', background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, lineHeight:1.75, fontSize:13, fontFamily:sansFont, marginBottom:12 }}
          dangerouslySetInnerHTML={{ __html: formatAnalysis(summaryText) }} />
      )}

      {/* ADR/ETF proxy index — only if populated */}
      {Object.keys(adrProxies).length > 0 && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', padding:'6px 12px', background:'rgba(16,185,129,0.04)', border:'1px solid rgba(16,185,129,0.15)', borderRadius:6, marginBottom:12 }}>
          <span style={{ fontSize:9, fontWeight:700, fontFamily:font, color:C.dim, textTransform:'uppercase', alignSelf:'center' }}>US Access</span>
          {Object.entries(adrProxies).map(([tk, pr]) => (
            <span key={tk} style={{ fontSize:9, fontFamily:font, color:C.dim }}>{tk}: <span style={{ color:C.green, fontWeight:700 }}>{pr}</span></span>
          ))}
        </div>
      )}

      {/* Layers */}
      {layers.length > 0 ? layers.map((layer, li) => (
        <div key={li} style={{ marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
            <span style={{ color:C.dim, fontSize:8, fontWeight:700, fontFamily:font, textTransform:'uppercase', padding:'1px 6px', background:`${PBC}10`, border:`1px solid ${PBC}20`, borderRadius:3 }}>L{layer.idx}</span>
            <span style={{ color:C.bright, fontSize:12, fontWeight:700, fontFamily:sansFont }}>{layer.label}</span>
            <span style={{ color:C.dim, fontSize:9, fontFamily:font }}>({layer.nodes.length})</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap' }}>
            {layer.nodes.map((n: any, ni: number) => nodeCard(n, ni))}
          </div>
        </div>
      )) : <div style={{ color:C.dim, fontSize:12, fontFamily:sansFont, padding:'12px 0' }}>No chain data returned — backend may need an anchor or theme to build the map.</div>}

      {/* Action: run discovery on this anchor */}
      {anchor && !loading && (
        <div style={{ marginTop:8 }}>
          <button onClick={() => runDiscovery({ mode:'giant_chain', label:`Hidden Bottlenecks — ${anchor}`, only_hidden: true })} style={{ padding:'3px 10px', fontSize:9, fontWeight:600, fontFamily:font, background:'transparent', color:PBC, border:`1px solid ${PBC}40`, borderRadius:4, cursor:'pointer' }}>
            Discover Hidden Bottlenecks
          </button>
        </div>
      )}
    </div>;
  }

  function renderPlaybookAnalysis(data: any) {
    const playbookId = data._playbook_id || data.playbook_id || '';
    const label = data._playbook_label || data.playbook_id || 'Strategy';
    const pbColor = strategyPlaybooks.find(p => p.id === playbookId)?.ui_color || '#6366f1';
    const analysisText = data.analysis || data.summary || data.message || '';
    const topFits: any[] = data.top_fits || data.top_ideas || data.ranked_ideas || [];
    const lowFits: any[] = data.low_fits || data.rejected || data.weak_fits || [];
    const reasoning: string = data.reasoning || '';

    return <div>
      {/* Strategy header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:`${pbColor}10`, border:`1px solid ${pbColor}25`, borderRadius:8, marginBottom:10 }}>
        <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:pbColor, flexShrink:0 }} />
        <span style={{ color:pbColor, fontWeight:700, fontSize:11, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label} Playbook Analysis</span>
      </div>

      {/* Main analysis text */}
      {analysisText && analysisText.trim() && (
        <div style={{ padding:'16px 20px', background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, lineHeight:1.75, fontSize:13, fontFamily:sansFont, marginBottom:10 }}
          dangerouslySetInnerHTML={{ __html: formatAnalysis(analysisText) }} />
      )}

      {/* Top Fits */}
      {topFits.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.bright, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>Top Fits</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {topFits.map((idea: any, i: number) => {
            const ticker = idea.ticker || idea.symbol || idea.name || '';
            const score = idea.score != null ? idea.score : idea.final_score;
            const scoreColor = score >= 80 ? C.green : score >= 60 ? C.gold : C.red;
            return <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${pbColor}`, borderRadius:8, padding:'12px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                {ticker && <span style={{ color:C.blue, fontWeight:700, fontSize:14, fontFamily:font }}>{ticker}</span>}
                {score != null && <Badge color={scoreColor}>{Math.round(score)}</Badge>}
              </div>
              {(idea.rationale || idea.thesis || idea.reason) && (
                <div style={{ color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.5 }}>{idea.rationale || idea.thesis || idea.reason}</div>
              )}
              {idea.risks && idea.risks.length > 0 && (
                <div style={{ marginTop:4, color:C.red, fontSize:10, fontFamily:sansFont }}>{idea.risks.slice(0, 2).join(' · ')}</div>
              )}
            </div>;
          })}
        </div>
      </div>}

      {/* Weak / Rejected */}
      {lowFits.length > 0 && <div style={{ marginBottom:10 }}>
        <div style={{ color:C.dim, fontSize:11, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:6 }}>Weak Fits / Filtered</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {lowFits.map((idea: any, i: number) => {
            const t = idea.ticker || idea.symbol || idea.name || (typeof idea === 'string' ? idea : '');
            return t ? <span key={i} style={{ padding:'3px 10px', borderRadius:4, fontSize:10, fontWeight:600, fontFamily:font, color:C.dim, background:C.bg, border:`1px solid ${C.border}` }}>{t}</span> : null;
          })}
        </div>
      </div>}

      {/* Reasoning */}
      {reasoning && reasoning.trim() && (
        <div style={{ padding:'12px 16px', background:`${C.blue}06`, border:`1px solid ${C.blue}15`, borderRadius:8, color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.6 }}>
          <div style={{ color:C.blue, fontSize:9, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Reasoning</div>
          {reasoning}
        </div>
      )}
    </div>;
  }

  function renderAssistantMessage(msg: {role: string, content: string, parsed?: any}) {
    const s = msg.parsed?.structured || (msg.parsed?.display_type ? msg.parsed : {});
    const displayType = s.display_type;
    const rawAnalysis = msg.parsed?.analysis || msg.parsed?.structured?.message || msg.parsed?.message || msg.content;
    const analysisText = (rawAnalysis && /^Response received\.?\s*(See panel data for details\.?)?$/i.test(rawAnalysis.trim())) ? '' : rawAnalysis;

    // Detect csv_watchlist_analysis from structured data or from raw analysis text
    const watchlistData = displayType === 'csv_watchlist_analysis' ? s
      : tryParseWatchlistAnalysis(analysisText || '');

    if (watchlistData) {
      return <div style={{ padding:22, background:C.card, border:`1px solid ${C.border}`, borderRadius:10 }}>
        <WatchlistAnalysis data={watchlistData} onTickerClick={(ticker: string) => { setModalTicker(ticker); setModalWatchlistData(watchlistData); }} />
      </div>;
    }

    return <div>
      {displayType === 'playbook_analysis' && renderPlaybookAnalysis(msg.parsed)}
      {displayType === 'serenity_discovery' && renderSerenityDiscovery(msg.parsed)}
      {displayType === 'serenity_supply_chain' && renderSupplyChainMap(msg.parsed)}
      {displayType === 'serenity_compare' && renderCompareResult(msg.parsed)}
      {displayType === 'trades' && renderTrades(s)}
      {displayType === 'investments' && renderInvestments(s)}
      {displayType === 'fundamentals' && renderFundamentals(s)}
      {displayType === 'technicals' && renderTechnicals(s)}
      {displayType === 'analysis' && renderAnalysis(s)}
      {displayType === 'trending' && renderTrades(s)}
      {(displayType === 'trending_now' || displayType === 'cross_market') && renderCrossAssetTrending(s, analysisText)}
      {displayType === 'screener' && renderScreener(s)}
      {displayType === 'crypto' && renderCrypto(s)}
      {displayType === 'briefing' && renderBriefing(s)}
      {displayType === 'portfolio' && renderPortfolio(s)}
      {displayType === 'commodities' && renderCommodities(s)}
      {displayType === 'sector_rotation' && renderSectorRotation(s)}
      {displayType === 'earnings_catalyst' && renderEarningsCatalyst(s)}
      {displayType === 'csv_watchlist' && renderCsvWatchlist(s)}
      {(displayType === 'chat' || !knownTypes.includes(displayType)) && analysisText && analysisText.trim() && <div style={{ padding:22, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, lineHeight:1.75, fontSize:13, fontFamily:sansFont }} dangerouslySetInnerHTML={{ __html: formatAnalysis(analysisText) }} />}
      {displayType && displayType !== 'chat' && displayType !== 'cross_market' && displayType !== 'trending_now' && displayType !== 'trades' && displayType !== 'playbook_analysis' && displayType !== 'serenity_discovery' && displayType !== 'serenity_supply_chain' && displayType !== 'serenity_compare' && knownTypes.includes(displayType) && analysisText && analysisText.trim() && <div style={{ marginTop:16, padding:22, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, lineHeight:1.75, fontSize:13, fontFamily:sansFont }} dangerouslySetInnerHTML={{ __html: formatAnalysis(analysisText) }} />}
    </div>;
  }

  const promptGroups: { id: string; title: string; buttons: { l: string; intent: string }[] }[] = [
    { id: 'g1', title: 'Overview', buttons: [
      {l:'Daily Briefing', intent:'daily_briefing'},
      {l:'Macro Overview', intent:'macro_overview'},
      {l:'Headlines', intent:'headlines'},
      {l:'Upcoming Catalysts', intent:'upcoming_catalysts'},
      {l:'Trending Now', intent:'trending_now'},
      {l:'Social Momentum', intent:'social_momentum'},
      {l:'Sector Rotation', intent:'sector_rotation'},
    ]},
    { id: 'g2', title: 'Trades & Ideas', buttons: [
      {l:'Best Trades', intent:'best_trades'},
      {l:'Best Investments', intent:'best_investments'},
      {l:'Asymmetric R:R', intent:'asymmetric_rr'},
      {l:'Small Cap Spec', intent:'small_cap_spec'},
      {l:'Short Squeeze', intent:'short_squeeze'},
    ]},
    { id: 'g3', title: 'Fundamental', buttons: [
      {l:'Fundamental Leaders', intent:'fundamental_leaders'},
      {l:'Rapidly Improving', intent:'rapidly_improving'},
      {l:'Earnings Watch', intent:'earnings_watch'},
      {l:'Insider Buying', intent:'insider_buying'},
      {l:'Revenue Reaccelerating', intent:'revenue_reaccelerating'},
      {l:'Margin Expansion', intent:'margin_expansion'},
      {l:'Undervalued Growth', intent:'undervalued_growth'},
      {l:'Institutional Accumulation', intent:'institutional_accumulation'},
      {l:'Free Cash Flow Leaders', intent:'free_cash_flow_leaders'},
    ]},
    { id: 'g4', title: 'Sectors', buttons: [
      {l:'Crypto', intent:'crypto'},
      {l:'Commodities', intent:'commodities'},
      {l:'Energy', intent:'energy'},
      {l:'Materials', intent:'materials'},
      {l:'Aerospace/Defense', intent:'aerospace_defense'},
      {l:'Tech', intent:'tech'},
      {l:'AI/Compute', intent:'ai_compute'},
      {l:'Quantum', intent:'quantum'},
      {l:'Fintech', intent:'fintech'},
      {l:'Biotech', intent:'biotech'},
      {l:'Real Estate', intent:'real_estate'},
    ]},
  ];

  function toggleGroup(id: string) {
    setGroupExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function handleCommandSubmit() {
    const text = prompt.trim();
    if (!text && !csvData) return;
    if (!text && csvData) {
      askAgent('Analyze this watchlist CSV and give me a buy/hold/sell for every asset, plus the top 2-3 best investments right now based on the data.');
      setCommandPaletteOpen(false);
      return;
    }
    const cmd = text.split(' ')[0].toLowerCase();
    if (slashCommands[cmd]) {
      askAgent('', true, slashCommands[cmd]);
    } else {
      askAgent();
    }
    setCommandPaletteOpen(false);
  }

  const filteredPromptGroups = promptGroups.map(group => ({
    ...group,
    buttons: group.buttons.filter(b =>
      leftRailSearch === '' || b.l.toLowerCase().includes(leftRailSearch.toLowerCase()) || b.intent.toLowerCase().includes(leftRailSearch.toLowerCase())
    ),
  })).filter(group => group.buttons.length > 0);


  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'transparent', fontFamily:sansFont, overflow:'hidden', flex:'1 1 auto', minHeight:0 }}>
      <style>{`
        @keyframes agent-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes caelyn-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes agent-progress { 0% { width: 0%; } 50% { width: 70%; } 100% { width: 100%; } }
        .terminal-input:focus { outline: none; border-color: ${C.blue} !important; }
        .rail-item:hover { background: ${C.blue}10 !important; color: ${C.bright} !important; }
        .panel-btn:hover { background: ${C.blue}15 !important; color: ${C.bright} !important; }
        .sidebar-chip:hover { border-color: ${C.purple} !important; color: ${C.bright} !important; }
        .suggestion-chip:hover { border-color: ${C.blue} !important; color: ${C.bright} !important; background: ${C.blue}10 !important; }
        .suggestion-chip::-webkit-scrollbar { display: none; }

        .agent-collab-dropdown { display: none !important; }
        .agent-collab-wrapper:hover .agent-collab-dropdown { display: block !important; }
        .agent-collab-dropdown div[style*="cursor: pointer"]:hover,
        .agent-collab-dropdown div[style*="cursor:pointer"]:hover { background: rgba(139,92,246,0.1) !important; }

        /* Follow-up loading animations */
        @keyframes followup-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .followup-shimmer {
          background: linear-gradient(90deg, transparent 0%, ${C.blue}90 25%, ${C.purple}90 50%, ${C.blue}90 75%, transparent 100%);
          width: 50%;
          animation: followup-shimmer 1.8s ease-in-out infinite;
        }

        @keyframes followup-stage-fade {
          0% { opacity: 0; transform: translateY(4px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
        .followup-stage-text {
          display: inline-block;
          animation: followup-stage-fade 2.4s ease-in-out;
        }

        @keyframes followup-ring-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes followup-ring-spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes followup-core-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        .followup-orb {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .followup-ring {
          position: absolute;
          border-radius: 50%;
          border: 1.5px solid transparent;
        }
        .followup-ring-1 {
          width: 22px; height: 22px;
          border-top-color: ${C.blue};
          border-right-color: ${C.blue}50;
          animation: followup-ring-spin 1.6s linear infinite;
        }
        .followup-ring-2 {
          width: 16px; height: 16px;
          border-bottom-color: ${C.purple};
          border-left-color: ${C.purple}50;
          animation: followup-ring-spin-reverse 1.2s linear infinite;
        }
        .followup-core {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: ${C.blue};
          box-shadow: 0 0 6px ${C.blue}aa, 0 0 12px ${C.purple}44;
          animation: followup-core-pulse 2s ease-in-out infinite;
        }

        .followup-loading-container {
          animation: followup-container-in 0.3s ease-out;
        }
        @keyframes followup-container-in {
          from { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
          to { opacity: 1; max-height: 80px; }
        }
        @media (max-width: 1023px) {
          .left-rail { display: none !important; }
          .right-sidebar { display: none !important; }
          .left-rail.mobile-open { display: flex !important; position: fixed; left: 0; top: 44px; bottom: 32px; z-index: 100; }
          .right-sidebar.mobile-open { display: flex !important; position: fixed; right: 0; top: 44px; bottom: 32px; z-index: 100; }
          .mobile-toggle { display: inline-flex !important; }
        }
        @media (min-width: 1024px) {
          .mobile-toggle { display: none !important; }
        }
        @keyframes signal-modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes signal-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .signal-modal-overlay {
          animation: signal-overlay-in 0.2s ease-out;
        }
        .signal-modal-content {
          animation: signal-modal-in 0.25s ease-out;
        }
        .signal-interval-btn:hover {
          background: ${C.blue}25 !important;
          color: ${C.blue} !important;
        }
      `}</style>

      {/* Signal Popup Modal */}
      {signalPopup && (
        <div className="signal-modal-overlay" onClick={() => setSignalPopup(null)} style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div className="signal-modal-content" onClick={e => e.stopPropagation()} style={{ background:C.bg, border:`1px solid ${signalPopup.color}30`, borderRadius:14, width:'100%', maxWidth:620, maxHeight:'90vh', overflow:'auto', boxShadow:`0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px ${signalPopup.color}10` }}>
            <div style={{ padding:'18px 22px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:18 }}>{signalPopup.icon}</span>
                <div>
                  <div style={{ color:C.bright, fontSize:18, fontWeight:800, fontFamily:font }}>{signalPopup.ticker}</div>
                  <div style={{ color:signalPopup.color, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em', marginTop:2 }}>{signalPopup.scannerName}</div>
                </div>
              </div>
              <button onClick={() => setSignalPopup(null)} style={{ width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.dim, fontSize:16, cursor:'pointer', fontFamily:font, transition:'all 0.15s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.bright; (e.currentTarget as HTMLElement).style.color = C.bright; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.color = C.dim; }}>x</button>
            </div>
            {signalPopup.signal && (
              <div style={{ padding:'14px 22px', borderBottom:`1px solid ${C.border}`, background:`${signalPopup.color}06` }}>
                <div style={{ color:C.text, fontSize:12, lineHeight:1.7, fontFamily:sansFont }}>{signalPopup.signal}</div>
              </div>
            )}
            <div style={{ padding:'16px 22px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ color:C.dim, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.06em' }}>Chart</span>
                <div style={{ display:'flex', gap:4 }}>
                  {[{l:'1H',v:'60'},{l:'4H',v:'240'},{l:'1D',v:'D'},{l:'1W',v:'W'},{l:'1M',v:'M'}].map(iv => (
                    <button key={iv.v} className="signal-interval-btn" onClick={() => setSignalChartInterval(iv.v)} style={{ padding:'3px 10px', fontSize:10, fontWeight:600, fontFamily:font, background: signalChartInterval === iv.v ? `${C.blue}20` : 'transparent', color: signalChartInterval === iv.v ? C.blue : C.dim, border:`1px solid ${signalChartInterval === iv.v ? C.blue+'40' : C.border}`, borderRadius:4, cursor:'pointer', transition:'all 0.15s' }}>{iv.l}</button>
                  ))}
                </div>
              </div>
              <div style={{ borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}` }}>
                <iframe src={`https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=450&interval=${signalChartInterval}&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=false&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=%5B%22volume_force_overlay%22%2C%22create_volume_indicator_by_default%22%5D&enabled_features=%5B%22use_localstorage_for_settings%22%2C%22study_templates%22%2C%22header_indicators%22%2C%22header_compare%22%2C%22header_undo_redo%22%2C%22header_screenshot%22%2C%22header_chart_type%22%2C%22header_settings%22%2C%22header_resolutions%22%2C%22header_fullscreen_button%22%2C%22left_toolbar%22%2C%22drawing_templates%22%5D&symbol=${encodeURIComponent(signalPopup.ticker)}`} style={{ width:'100%', height:450, border:'none', display:'block' }} title={`${signalPopup.ticker} chart`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP COMMAND BAR */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'rgba(11,12,16,0.85)', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0, position:'sticky', top:0, zIndex:50, backdropFilter:'blur(16px)' }}>
        <button className="mobile-toggle" onClick={() => setLeftRailOpen(!leftRailOpen)} style={{ display:'none', alignItems:'center', justifyContent:'center', width:28, height:28, background:'transparent', border:`1px solid ${C.border}`, borderRadius:3, color:C.dim, cursor:'pointer', fontSize:14, fontFamily:font }}>☰</button>

        <input type="file" ref={csvInputRef} accept=".csv,.tsv,.txt" style={{ display:'none' }} onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setCsvFileName(file.name);
          const reader = new FileReader();
          reader.onload = (ev) => { setCsvData(ev.target?.result as string); };
          reader.readAsText(file);
          e.target.value = '';
        }} />
        <button onClick={() => csvInputRef.current?.click()} title="Upload CSV watchlist" style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', background: csvData ? 'rgba(32,144,208,0.2)' : 'transparent', border: csvData ? '1px solid rgba(32,144,208,0.4)' : '1px solid rgba(255,255,255,0.08)', borderRadius:3, color: csvData ? '#a78bfa' : '#666', cursor:'pointer', fontSize:14, flexShrink:0 }}>+</button>
        {csvFileName && <div style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 8px', background:'rgba(32,144,208,0.15)', border:'1px solid rgba(32,144,208,0.3)', borderRadius:3, fontSize:10, color:'#a78bfa', fontFamily:'monospace', flexShrink:0, maxWidth:160, overflow:'hidden' }}><span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{csvFileName}</span><span onClick={() => { setCsvData(null); setCsvFileName(null); }} style={{ cursor:'pointer', color:'#ef4444', fontWeight:700, flexShrink:0 }}>x</span></div>}
        <div style={{ display:'flex', gap:3, alignItems:'center', flexShrink:0 }}>
          {/* Single Agent — Default mode only */}
          {selectedStrategy === 'default' && <div className="agent-collab-wrapper" style={{ position:'relative', display:'inline-block' }}>
            <button key="single_agent_trigger" style={{ padding:'3px 7px', borderRadius:10, fontSize:9, fontWeight:600, fontFamily:"'JetBrains Mono', monospace", background: !collabConfig ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)', color: !collabConfig ? '#60a5fa' : '#4b5563', border: !collabConfig ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(255,255,255,0.07)', cursor:'pointer', transition:'all 0.15s', letterSpacing:'0.2px' }}>
              Single Agent ▾
            </button>
            <div className="agent-collab-dropdown" style={{ position:'absolute', top:'100%', left:0, minWidth:200, background:'rgba(15,15,30,0.98)', border:'1px solid rgba(59,130,246,0.25)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', zIndex:1000, paddingTop:0 }}>
              <div style={{ padding:'10px 14px 8px', borderBottom:'1px solid rgba(255,255,255,0.06)', marginBottom:4 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#93c5fd', fontFamily:"'JetBrains Mono', monospace", letterSpacing:'0.3px' }}>Single Agent</div>
                <div style={{ fontSize:9, color:'#4b5563', fontFamily:"'JetBrains Mono', monospace", marginTop:2 }}>Route to one model directly</div>
              </div>
              {([
                { id: 'claude' as const,      label: 'Agent Athena (Strategist) - Claude',      icon: '🟣' },
                { id: 'gpt-4o' as const,      label: 'Agent Nexus (Coordinator) - ChatGPT',     icon: '🟢' },
                { id: 'grok' as const,        label: 'Agent Pulse (Sentiment) - Grok',          icon: '⚡' },
                { id: 'gemini' as const,      label: 'Agent Atlas (Research) - Gemini',         icon: '🔵' },
                { id: 'perplexity' as const,  label: 'Agent Beacon (News) - Perplexity',        icon: '🌐' },
                { id: 'deepseek' as const,    label: 'Deepseek',    icon: '🔷' },
              ]).map(({ id, label, icon }) => {
                const isActive = !collabConfig && selectedModel === id;
                return (
                  <div key={id} onClick={() => { setSelectedModel(id); setCollabConfig(null); }} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 14px', cursor:'pointer', borderRadius:6, background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent', transition:'background 0.1s', margin:'0 4px' }}>
                    <div style={{ width:14, height:14, borderRadius:'50%', border: isActive ? '2px solid #3b82f6' : '2px solid #4b5563', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {isActive && <div style={{ width:7, height:7, borderRadius:'50%', background:'#3b82f6' }} />}
                    </div>
                    <span style={{ fontSize:12 }}>{icon}</span>
                    <span style={{ fontSize:11, color: isActive ? '#e0e0e0' : '#9ca3af', fontFamily:"'JetBrains Mono', monospace" }}>{label}</span>
                  </div>
                );
              })}
              <div style={{ height:8 }} />
            </div>
          </div>}
          {/* Agent Collaboration — Default mode only */}
          {selectedStrategy === 'default' && <div className="agent-collab-wrapper" style={{ position:'relative', display:'inline-block' }}>
            <button key="customize_trigger" style={{ padding:'3px 7px', borderRadius:10, fontSize:9, fontWeight:600, fontFamily:"'JetBrains Mono', monospace", background: 'rgba(255,255,255,0.03)', color: collabConfig ? 'rgba(167,139,250,0.7)' : '#4b5563', border: '1px solid rgba(255,255,255,0.07)', cursor:'pointer', transition:'all 0.15s', letterSpacing:'0.2px' }}>
              Agent Collaboration ▾
            </button>
            <div className="agent-collab-dropdown" style={{ position:'absolute', top:'100%', left:0, minWidth:290, background:'rgba(15,15,30,0.98)', border:'1px solid rgba(139,92,246,0.25)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', padding:'8px 0', zIndex:1000, paddingTop:0 }}>
              {/* AGENT COLLABORATION HEADER */}
              <div style={{ padding:'10px 14px 8px', borderBottom:'1px solid rgba(255,255,255,0.06)', marginBottom:4 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#c4b5fd', fontFamily:"'JetBrains Mono', monospace", letterSpacing:'0.3px' }}>Agent Collaboration</div>
                <div style={{ fontSize:9, color:'#4b5563', fontFamily:"'JetBrains Mono', monospace", marginTop:2 }}>Advanced collaboration settings</div>
              </div>
              {/* PRESETS */}
              {(() => {
                const fallbackPresets = [
                  { id: 'default', label: 'Default', primary: 'claude', agents: ['grok', 'gemini'], lock_agents: true, lock_reasoning: false },
                  { id: 'auto', label: 'Auto', primary: 'claude', agents: [], lock_agents: true, lock_reasoning: false },
                  { id: 'full_collab', label: 'Full Collaboration', primary: 'claude', agents: ['claude', 'grok', 'gpt-4o', 'gemini', 'perplexity'], lock_agents: true, lock_reasoning: false },
                  { id: 'custom_collab', label: 'Custom Collaboration', primary: 'claude', agents: ['grok', 'perplexity'], lock_agents: false, lock_reasoning: false },
                ];
                const presetDefs = (collabOptions?.collab_presets?.length ? collabOptions.collab_presets : fallbackPresets).map((p: any) => ({
                  id: p.id, label: p.label || p.name || p.id, primary: p.primary || 'claude', reasoning_model: p.reasoning_model || 'claude',
                  agents: p.agents || [], lock_agents: p.lock_agents ?? true, lock_reasoning: p.lock_reasoning ?? false,
                }));
                const activePreset = presetDefs.find(p => p.id === collabConfig?.selectedPresetId) || presetDefs[0];
                const isReasoningLocked = collabConfig?.lockReasoning ?? activePreset.lock_reasoning;
                const isAgentsLocked = collabConfig?.lockAgents ?? activePreset.lock_agents;
                return (<>
              <div style={{ padding:'6px 14px 8px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.5px', color:'#6b7280', marginBottom:6, fontFamily:"'JetBrains Mono', monospace", fontWeight:700 }}>Presets</div>
                {presetDefs.map((preset) => (
                  <div key={preset.id} onClick={() => { setCollabConfig(applyPresetState(preset)); }} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', cursor:'pointer', borderRadius:6, background: collabConfig?.selectedPresetId === preset.id ? 'rgba(139,92,246,0.15)' : 'transparent', transition:'background 0.1s' }}>
                    <div style={{ width:14, height:14, borderRadius:'50%', border: collabConfig?.selectedPresetId === preset.id ? '2px solid #8b5cf6' : '2px solid #4b5563', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {collabConfig?.selectedPresetId === preset.id && <div style={{ width:7, height:7, borderRadius:'50%', background:'#8b5cf6' }} />}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column' }}>
                      <span style={{ fontSize:11, color: collabConfig?.selectedPresetId === preset.id ? '#e0e0e0' : '#9ca3af', fontFamily:"'JetBrains Mono', monospace" }}>{preset.label || preset.name}</span>
                      {collabConfig?.selectedPresetId === preset.id && preset.id === 'default' && <span style={{ fontSize:9, color:'#6b7280', fontFamily:"'JetBrains Mono', monospace", marginTop:2 }}>Athena synthesizes + Pulse social/X + Atlas web</span>}
                      {collabConfig?.selectedPresetId === preset.id && preset.id === 'auto' && <span style={{ fontSize:9, color:'#6b7280', fontFamily:"'JetBrains Mono', monospace", marginTop:2 }}>Agent selects the best collaboration mix for the prompt</span>}
                      {collabConfig?.selectedPresetId === preset.id && preset.id === 'full_collab' && <span style={{ fontSize:9, color:'#6b7280', fontFamily:"'JetBrains Mono', monospace", marginTop:2 }}>All agents reason independently → synthesis model combines</span>}
                      {collabConfig?.selectedPresetId === preset.id && preset.id === 'custom_collab' && <span style={{ fontSize:9, color:'#6b7280', fontFamily:"'JetBrains Mono', monospace", marginTop:2 }}>Custom agent selection → synthesis model combines</span>}
                    </div>
                  </div>
                ))}
              </div>
              {/* REASONING MODEL */}
              <div style={{ padding:'6px 14px 8px', borderBottom:'1px solid rgba(255,255,255,0.06)', opacity: isReasoningLocked ? 0.5 : 1, pointerEvents: isReasoningLocked ? 'none' : 'auto' }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.5px', color:'#6b7280', marginBottom:6, fontFamily:"'JetBrains Mono', monospace", fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>Reasoning Model{isReasoningLocked && <span title="Locked in this preset" style={{ fontSize:9, opacity:0.7 }}>🔒</span>}</div>
                {(collabOptions?.reasoning_models || [
                  { id: 'claude', label: 'Agent Athena (Strategist) - Claude', icon: '🟣' },
                  { id: 'gpt-4o', label: 'Agent Nexus (Coordinator) - ChatGPT', icon: '🟢' },
                  { id: 'gemini', label: 'Agent Atlas (Research) - Gemini', icon: '🔵' },
                  { id: 'grok', label: 'Agent Pulse (Sentiment) - Grok', icon: '⚡' },
                  { id: 'perplexity', label: 'Agent Beacon (News) - Perplexity', icon: '🌐' },
                  { id: 'deepseek', label: 'Deepseek', icon: '🔷' },
                ]).map((m: any) => (
                  <div key={m.id} onClick={() => { if (!isReasoningLocked) setCollabConfig(prev => prev ? { ...prev, primaryModel: m.id, reasoningModelUI: m.id } : { ...DEFAULT_COLLAB_STATE, primaryModel: m.id, reasoningModelUI: m.id }); }} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', cursor:'pointer', borderRadius:6, background: collabConfig?.reasoningModelUI === m.id ? 'rgba(59,130,246,0.15)' : 'transparent', transition:'background 0.1s' }}>
                    <div style={{ width:14, height:14, borderRadius:'50%', border: collabConfig?.reasoningModelUI === m.id ? '2px solid #3b82f6' : '2px solid #4b5563', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {collabConfig?.reasoningModelUI === m.id && <div style={{ width:7, height:7, borderRadius:'50%', background:'#3b82f6' }} />}
                    </div>
                    <span style={{ fontSize:13, marginRight:2 }}>{m.icon?.length > 2 ? '' : m.icon}</span>
                    <span style={{ fontSize:11, color: collabConfig?.reasoningModelUI === m.id ? '#e0e0e0' : '#9ca3af', fontFamily:"'JetBrains Mono', monospace" }}>{m.label || m.name || m.id}</span>
                  </div>
                ))}
              </div>
              {/* COLLABORATING AGENTS */}
              <div style={{ padding:'6px 14px 8px', opacity: isAgentsLocked ? 0.5 : 1, pointerEvents: isAgentsLocked ? 'none' : 'auto' }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.5px', color:'#6b7280', marginBottom:6, fontFamily:"'JetBrains Mono', monospace", fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>Collaborating Agents{isAgentsLocked && <span title="Locked in this preset" style={{ fontSize:9, opacity:0.7 }}>🔒</span>}</div>
                {(collabOptions?.collab_agents || [
                  { id: 'claude', label: 'Agent Athena (Strategist) - Claude', icon: '🟣' },
                  { id: 'grok', label: 'Agent Pulse (Sentiment) - Grok', icon: '⚡' },
                  { id: 'gpt-4o', label: 'Agent Nexus (Coordinator) - ChatGPT', icon: '🟢' },
                  { id: 'gemini', label: 'Agent Atlas (Research) - Gemini', icon: '🔵' },
                  { id: 'perplexity', label: 'Agent Beacon (News) - Perplexity', icon: '🌐' },
                  { id: 'deepseek', label: 'Deepseek', icon: '🔷' },
                ]).map((a: any) => {
                  const agents = collabConfig?.collabAgents || [];
                  const isChecked = agents.includes(a.id);
                  return (
                  <div key={a.id} onClick={() => { if (!isAgentsLocked) { const next = isChecked ? agents.filter((x: string) => x !== a.id) : [...agents, a.id]; setCollabConfig(prev => prev ? { ...prev, collabAgents: next } : { ...DEFAULT_COLLAB_STATE, selectedPresetId: 'custom_collab', collabAgents: next }); } }} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', cursor:'pointer', borderRadius:6, background: isChecked ? 'rgba(16,185,129,0.1)' : 'transparent', transition:'background 0.1s' }}>
                    <div style={{ width:14, height:14, borderRadius:3, border: isChecked ? '2px solid #10b981' : '2px solid #4b5563', background: isChecked ? '#10b981' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {isChecked && <span style={{ color:'#fff', fontSize:9, fontWeight:700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize:13, marginRight:2 }}>{a.icon?.length > 2 ? '' : a.icon}</span>
                    <span style={{ fontSize:11, color: isChecked ? '#e0e0e0' : '#9ca3af', fontFamily:"'JetBrains Mono', monospace" }}>{a.label || a.name || a.id}</span>
                  </div>
                  );
                })}
              </div>
                </>);
              })()}
            </div>
          </div>}
          {/* Non-default: Guided Brain indicator */}
          {selectedStrategy !== 'default' && (
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'2px 10px', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10 }}>
              <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'#6366f1', flexShrink:0 }} />
              <span style={{ fontSize:9, fontWeight:700, color:'#818cf8', fontFamily:"'JetBrains Mono', monospace", whiteSpace:'nowrap' }}>
                {selectedStrategy === 'serenity' ? 'Guided Brain' : 'Playbook Mode'}
              </span>
            </div>
          )}
          {/* Non-default: Advanced override toggle */}
          {selectedStrategy !== 'default' && !serenityAdvancedOverride && (
            <button onClick={() => setSerenityAdvancedOverride(true)} title="Model settings only affect preset-button runs in non-default modes" style={{ padding:'2px 8px', borderRadius:10, fontSize:9, fontWeight:600, fontFamily:"'JetBrains Mono', monospace", background:'transparent', color:'#4b5563', border:'1px solid rgba(255,255,255,0.07)', cursor:'pointer' }}>
              Advanced ▾
            </button>
          )}
          {selectedStrategy !== 'default' && serenityAdvancedOverride && (
            <button onClick={() => setSerenityAdvancedOverride(false)} style={{ padding:'2px 8px', borderRadius:10, fontSize:9, fontWeight:600, fontFamily:"'JetBrains Mono', monospace", background:'rgba(245,158,11,0.12)', color:'#d97706', border:'1px solid rgba(245,158,11,0.3)', cursor:'pointer' }}>
              Advanced ✕
            </button>
          )}
          {/* Non-default: model pills shown only when Advanced override is active (affects preset runs via /api/query only) */}
          {selectedStrategy !== 'default' && serenityAdvancedOverride && (
            <span style={{ fontSize:8, color:'#4b5563', fontFamily:"'JetBrains Mono', monospace", whiteSpace:'nowrap' }}>preset runs only:</span>
          )}
          {selectedStrategy !== 'default' && serenityAdvancedOverride && ([
            { id: 'claude', label: 'Athena' }, { id: 'gpt-4o', label: 'Nexus' },
            { id: 'grok', label: 'Pulse' }, { id: 'gemini', label: 'Atlas' },
            { id: 'perplexity', label: 'Beacon' },
          ] as const).map(({ id, label }) => (
            <button key={id} onClick={() => { setSelectedModel(id); setCollabConfig(null); }} style={{ padding:'3px 7px', borderRadius:10, fontSize:9, fontWeight:600, fontFamily:"'JetBrains Mono', monospace", background: !collabConfig && selectedModel === id ? '#3b82f6' : 'rgba(255,255,255,0.04)', color: !collabConfig && selectedModel === id ? '#ffffff' : '#6b7280', border:'none', cursor:'pointer', transition:'all 0.15s' }}>{label}</button>
          ))}
          {/* Strategy / Playbook selector */}
          {strategyPlaybooks.length > 0 && (
            <div ref={strategyDropdownRef} style={{ position:'relative', display:'inline-block', marginLeft:4 }}>
              <button
                onClick={() => setStrategyDropdownOpen(!strategyDropdownOpen)}
                style={{ padding:'3px 9px', borderRadius:10, fontSize:9, fontWeight:700, fontFamily:"'JetBrains Mono', monospace", background: selectedStrategy !== 'default' ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)', color: selectedStrategy !== 'default' ? '#a5b4fc' : '#6b7280', border: selectedStrategy !== 'default' ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)', cursor:'pointer', transition:'all 0.15s', display:'flex', alignItems:'center', gap:4, letterSpacing:'0.2px' }}
              >
                {selectedStrategy !== 'default' ? (strategyPlaybooks.find(p => p.id === selectedStrategy)?.short_label || selectedStrategy) : 'Strategy'}
                {' ▾'}
              </button>
              {strategyDropdownOpen && (
                <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, minWidth:240, background:'rgba(12,13,20,0.98)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,0.6)', zIndex:1100, overflow:'hidden' }}>
                  <div style={{ padding:'8px 12px 6px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#6b7280', fontFamily:"'JetBrains Mono', monospace" }}>Strategy Playbook</div>
                  </div>
                  {[{ id:'default', name:'Default', short_label:'Default', ui_color:undefined as string|undefined }, ...strategyPlaybooks].map(pb => {
                    const isSel = selectedStrategy === pb.id;
                    return (
                      <div key={pb.id} onClick={() => { setSelectedStrategy(pb.id); setStrategyDropdownOpen(false); }} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'8px 12px', cursor:'pointer', background: isSel ? 'rgba(99,102,241,0.1)' : 'transparent', borderLeft: isSel ? '2px solid #6366f1' : '2px solid transparent', transition:'background 0.1s' }}>
                        <div style={{ width:12, height:12, borderRadius:'50%', border: isSel ? '2px solid #6366f1' : '2px solid #4b5563', display:'flex', alignItems:'center', justifyContent:'center', marginTop:2, flexShrink:0 }}>
                          {isSel && <div style={{ width:6, height:6, borderRadius:'50%', background:'#6366f1' }} />}
                        </div>
                        <div>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                            {pb.ui_color && <span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:pb.ui_color }} />}
                            <span style={{ fontSize:11, fontWeight:700, color: isSel ? '#e0e0e0' : '#d1d5db', fontFamily:"'JetBrains Mono', monospace" }}>{pb.short_label || pb.name}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ position:'relative', flex:1 }}>
          <input
            ref={commandInputRef}
            className="terminal-input"
            value={prompt}
            onChange={e => {
              setPrompt(e.target.value);
              setCommandPaletteOpen(e.target.value.startsWith('/'));
            }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCommandSubmit(); } if (e.key === 'Escape') setCommandPaletteOpen(false); }}
            placeholder="Ask anything or type / for commands..."
            style={{ width:'100%', padding:'8px 14px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, color:C.bright, fontSize:13, fontFamily:font, boxSizing:'border-box' }}
          />
          {commandPaletteOpen && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:C.card, border:`1px solid ${C.border}`, borderRadius:8, marginTop:4, zIndex:60, maxHeight:240, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
              {Object.entries(slashCommands).map(([cmd, intent]) => (
                <div key={cmd} className="rail-item" onClick={() => { askAgent('', true, intent); setPrompt(''); setCommandPaletteOpen(false); }} style={{ padding:'10px 16px', cursor:'pointer', display:'flex', justifyContent:'space-between', borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ color:C.blue, fontSize:12, fontWeight:700, fontFamily:font }}>{cmd}</span>
                  <span style={{ color:C.dim, fontSize:11, fontFamily:sansFont }}>{intent.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          {loading && <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:10, height:10, border:`2px solid ${C.blue}`, borderTop:'2px solid transparent', borderRadius:'50%', animation:'agent-spin 0.8s linear infinite' }} />
            <span style={{ color:C.dim, fontSize:9, fontFamily:font, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{loadingStage}</span>
          </div>}
          <button onClick={newChat} className="panel-btn" style={{ padding:'6px 12px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, color:C.dim, fontSize:10, fontWeight:700, fontFamily:font, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.04em' }}>New</button>
          <button className="mobile-toggle" onClick={() => setRightSidebarOpen(!rightSidebarOpen)} style={{ display:'none', alignItems:'center', justifyContent:'center', width:28, height:28, background:'transparent', border:`1px solid ${C.border}`, borderRadius:3, color:C.dim, cursor:'pointer', fontSize:12, fontFamily:font }}>⚙</button>
        </div>
      </div>

      {/* Strategy-aware terminal banner */}
      {selectedStrategy !== 'default' && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 14px', background:'rgba(99,102,241,0.06)', borderBottom:'1px solid rgba(99,102,241,0.15)', flexShrink:0 }}>
          <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'#6366f1', flexShrink:0 }} />
          <span style={{ fontSize:9, color:'#818cf8', fontFamily:"'JetBrains Mono', monospace", fontWeight:600 }}>
            {strategyPlaybooks.find(p => p.id === selectedStrategy)?.short_label || selectedStrategy} playbook selected
          </span>
          <span style={{ fontSize:9, color:'#4b5563', fontFamily:"'JetBrains Mono', monospace" }}>
            — queries will use playbook analysis · preset buttons use default mode
          </span>
        </div>
      )}

      {/* Serenity: compact status bar — always visible when strategy = serenity */}
      {selectedStrategy === 'serenity' && (() => {
        const hasCustomAnchor = discoveryAnchor !== '';
        const hasCustomTheme  = discoveryTheme !== '';
        const hasCustomDepth  = discoveryDepth > 0;
        const hasCustomRegion = discoveryRegion !== 'Global';
        const hasAnyOverride  = hasCustomAnchor || hasCustomTheme || hasCustomDepth || hasCustomRegion || discoveryHiddenOnly;
        const depthLabel = (d: number) => d === 2 ? 'Direct' : d === 3 ? 'Upstream' : d === 4 ? 'Deep' : 'Auto';
        const resetToAuto = () => { setDiscoveryAnchor(''); setDiscoveryTheme(''); setDiscoveryDepth(0); setDiscoveryRegion('Global'); setDiscoveryHiddenOnly(false); };

        // Normalise regime: backend may put it at top-level or in regime_context/auto_regime
        const rc = serenityRegime
          ? (serenityRegime.regime_context || serenityRegime.auto_regime || serenityRegime)
          : null;
        const regimeLabel    = rc?.label;
        const regimeSummary  = rc?.summary;
        const regimeThemes   = rc?.top_themes?.slice(0, 3) || [];
        const regimeAnchors  = rc?.top_anchors?.slice(0, 3) || [];
        const regimeConfidence = rc?.confidence;
        const regimeWhyNow   = rc?.why_now;

        // Auto status line — prefer regime data; fall back to generic
        const autoStatusLine = regimeSummary || regimeLabel
          ? (regimeSummary || regimeLabel)!
          : 'Auto — brain chooses strongest path';

        return (
          <div style={{ flexShrink:0, borderBottom:'1px solid rgba(99,102,241,0.12)', background:'rgba(99,102,241,0.03)' }}>
            {/* Primary status row */}
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 14px' }}>
              <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background: hasAnyOverride ? '#f59e0b' : '#6366f1', flexShrink:0 }} />
              <span style={{ fontSize:9, fontWeight:700, color:'#818cf8', fontFamily:"'JetBrains Mono', monospace" }}>
                Serenity Brain
              </span>
              <span style={{ fontSize:9, color:'#4b5563', fontFamily:"'JetBrains Mono', monospace" }}>·</span>

              {hasAnyOverride ? (
                <>
                  <span style={{ fontSize:9, color:'#f59e0b', fontFamily:"'JetBrains Mono', monospace", fontWeight:600 }}>Auto overridden</span>
                  <span style={{ fontSize:9, color:'#6b7280', fontFamily:"'JetBrains Mono', monospace" }}>
                    {[hasCustomAnchor && discoveryAnchor, hasCustomTheme && discoveryTheme, hasCustomDepth && depthLabel(discoveryDepth), hasCustomRegion && discoveryRegion, discoveryHiddenOnly && 'Less Obvious'].filter(Boolean).join(' · ')}
                  </span>
                  <button onClick={resetToAuto}
                    style={{ fontSize:8, color:'#818cf8', fontFamily:"'JetBrains Mono', monospace", background:'transparent', border:'none', cursor:'pointer', padding:'0 4px', textDecoration:'underline' }}
                    title="Return to Auto — let Serenity choose anchor, theme, and depth">
                    Return to Auto
                  </button>
                </>
              ) : (
                <span style={{ fontSize:9, color:'#6b7280', fontFamily:"'JetBrains Mono', monospace" }}
                      title="Serenity auto-selects the strongest supply chain bottleneck path based on live regime analysis.">
                  {autoStatusLine}
                </span>
              )}

              <div style={{ flex:1 }} />
              <button
                onClick={() => setSerenityRefineOpen(v => !v)}
                title="Show optional scan filters — anchor, theme, region, depth, etc."
                style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 9px', fontSize:9, fontWeight:600, fontFamily:"'JetBrains Mono', monospace", background: serenityRefineOpen ? 'rgba(99,102,241,0.2)' : 'transparent', color: serenityRefineOpen ? '#a5b4fc' : '#6b7280', border:`1px solid ${serenityRefineOpen ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius:4, cursor:'pointer', transition:'all 0.1s' }}
              >
                <span>⚙</span>
                <span>Refine Scan {serenityRefineOpen ? '▴' : '▾'}</span>
              </button>
            </div>

            {/* Regime detail row — only in Auto mode when regime data is available */}
            {!hasAnyOverride && rc && (regimeThemes.length > 0 || regimeAnchors.length > 0 || regimeWhyNow) && (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 14px 5px', flexWrap:'wrap' }}>
                {regimeThemes.length > 0 && (
                  <span style={{ fontSize:8, fontFamily:"'JetBrains Mono', monospace", color:'#6b7280' }}>
                    <span style={{ color:'#4b5563', textTransform:'uppercase', fontSize:7, fontWeight:700 }}>themes </span>
                    {regimeThemes.join(', ')}
                  </span>
                )}
                {regimeAnchors.length > 0 && (
                  <span style={{ fontSize:8, fontFamily:"'JetBrains Mono', monospace", color:'#6b7280' }}>
                    <span style={{ color:'#4b5563', textTransform:'uppercase', fontSize:7, fontWeight:700 }}>anchors </span>
                    {regimeAnchors.join(', ')}
                  </span>
                )}
                {regimeConfidence && (
                  <span style={{ fontSize:8, fontFamily:"'JetBrains Mono', monospace", color: regimeConfidence.toLowerCase().includes('high') ? '#10b981' : '#f59e0b' }}>
                    {regimeConfidence} confidence
                  </span>
                )}
                {regimeWhyNow && (
                  <span style={{ fontSize:8, fontFamily:"'JetBrains Mono', monospace", color:'#4b5563', fontStyle:'italic', maxWidth:340, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={regimeWhyNow}>
                    {regimeWhyNow}
                  </span>
                )}
              </div>
            )}

            {/* Collapsible refine panel */}
            {serenityRefineOpen && (() => {
              const capAnchors = discoveryCapabilities?.giant_anchors?.length
                ? discoveryCapabilities.giant_anchors.slice(0, 8)
                : ['NVDA','MSFT','GOOGL','AMZN','META','TSM'];
              const anchors = ['', ...capAnchors.filter(a => a !== 'AI Power')];
              const capThemes = discoveryCapabilities?.themes?.length
                ? discoveryCapabilities.themes.slice(0, 9)
                : ['Photonics','Packaging','Grid','Memory','Defense','Cooling','Semicap'];
              const capRegions = discoveryCapabilities?.supported_regions?.length
                ? ['Global', ...discoveryCapabilities.supported_regions.filter((r: string) => r !== 'Global')]
                : ['Global','US','JP','KR','TW','EU'];
              const pill = (label: string, active: boolean, onClick: () => void, tip?: string) => (
                <button key={label} onClick={onClick} title={tip}
                  style={{ padding:'2px 8px', fontSize:9, fontWeight:600, fontFamily:"'JetBrains Mono', monospace", background: active ? 'rgba(99,102,241,0.25)' : 'transparent', color: active ? '#a5b4fc' : '#6b7280', border:`1px solid ${active ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius:4, cursor:'pointer', transition:'all 0.1s', whiteSpace:'nowrap' }}>{label}</button>
              );
              const sep = <span style={{ width:1, height:14, background:'rgba(255,255,255,0.06)', margin:'0 3px', flexShrink:0 }} />;
              const lbl = (t: string, tip?: string) => (
                <span title={tip} style={{ fontSize:8, color:'#4b5563', fontFamily:"'JetBrains Mono', monospace", fontWeight:700, textTransform:'uppercase', flexShrink:0, cursor: tip ? 'help' : undefined }}>{t}{tip ? ' ?' : ''}</span>
              );
              return (
                <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 14px 7px', flexWrap:'wrap' }}>
                  {lbl('Anchor', 'Giant anchor ticker — the supply chain is traced from this company. Auto lets Serenity choose.')}
                  {anchors.map(a => pill(a === '' ? 'Auto' : a, discoveryAnchor === a, () => setDiscoveryAnchor(a)))}
                  {sep}
                  {lbl('Theme', 'Filter candidates to a specific supply chain theme.')}
                  {pill('Auto', discoveryTheme === '', () => setDiscoveryTheme(''))}
                  {capThemes.map(t => pill(t, discoveryTheme === t, () => setDiscoveryTheme(prev => prev === t ? '' : t)))}
                  {sep}
                  {lbl('Region', 'Restrict candidates to a geographic region.')}
                  {capRegions.map(r => pill(r, discoveryRegion === r, () => setDiscoveryRegion(r)))}
                  {sep}
                  {lbl('Depth', 'Chain depth: Direct = immediate suppliers, Upstream = 2-3 layers back, Deep = 4+ layers.')}
                  {pill('Auto', discoveryDepth === 0, () => setDiscoveryDepth(0), 'Let Serenity choose depth automatically')}
                  {pill('Direct', discoveryDepth === 2, () => setDiscoveryDepth(2), 'Immediate supply chain connections only')}
                  {pill('Upstream', discoveryDepth === 3, () => setDiscoveryDepth(3), 'Up to 3 layers back in the supply chain')}
                  {pill('Deep', discoveryDepth === 4, () => setDiscoveryDepth(4), 'Deep supply chain trace, 4+ layers back')}
                  {sep}
                  {pill('Less Obvious', discoveryHiddenOnly, () => setDiscoveryHiddenOnly(v => !v), 'Surface less well-known names that analysts typically overlook')}
                  {pill('Foreign', discoveryIncludeForeign, () => setDiscoveryIncludeForeign(v => !v), 'Include non-US listed companies in results')}
                  {pill('US Proxies', discoveryIncludeProxies, () => setDiscoveryIncludeProxies(v => !v), 'Include ADR or ETF proxies for companies not directly US-tradeable')}
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* MAIN BODY */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* LEFT RAIL */}
        <div className={`left-rail ${leftRailOpen ? 'mobile-open' : ''}`} style={{ width:220, flexShrink:0, display:'flex', flexDirection:'column', background:'rgba(15,15,30,0.5)', borderRight:'1px solid rgba(255,255,255,0.06)', overflow:'hidden', backdropFilter:'blur(12px)' }}>
          <div style={{ padding:'8px 8px 4px' }}>
            <input
              value={leftRailSearch}
              onChange={e => setLeftRailSearch(e.target.value)}
              placeholder="Search scans..."
              className="terminal-input"
              style={{ width:'100%', padding:'6px 10px', background:C.bg, border:`1px solid ${C.border}`, borderRadius:3, color:C.bright, fontSize:11, fontFamily:font, boxSizing:'border-box' }}
            />
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'0 4px 8px' }}>
            {filteredPromptGroups.map(group => (
              <div key={group.id} style={{ marginBottom:2 }}>
                <button onClick={() => toggleGroup(group.id)} style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 8px', width:'100%', background:'transparent', border:'none', color:groupExpanded[group.id] ? C.bright : C.dim, fontSize:10, fontWeight:700, fontFamily:font, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.04em', textAlign:'left' }}>
                  <span style={{ fontSize:7, transform:groupExpanded[group.id] ? 'rotate(90deg)' : 'rotate(0deg)', transition:'transform 0.15s', display:'inline-block' }}>▶</span>
                  {group.title}
                </button>
                {groupExpanded[group.id] && (
                  <div style={{ paddingLeft:4 }}>
                    {group.buttons.map(q => (
                      <div key={q.intent} className="rail-item" onClick={() => { if (!loading) { newChat(); askAgent('', true, q.intent); setLeftRailOpen(false); } }} style={{ padding:'5px 10px', cursor:loading ? 'not-allowed' : 'pointer', color:C.dim, fontSize:11, fontFamily:sansFont, borderRadius:2, transition:'all 0.1s', opacity:loading ? 0.5 : 1 }}>
                        {q.l}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Serenity discovery preset group — only shown when strategy = serenity */}
            {selectedStrategy === 'serenity' && (
              <div style={{ marginTop:4, borderTop:'1px solid rgba(99,102,241,0.2)', paddingTop:4 }}>
                <div style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 8px' }}>
                  <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'#6366f1' }} />
                  <span style={{ color:'#818cf8', fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em' }}>Serenity Discovery</span>
                </div>
                <div style={{ paddingLeft:4 }}>
                  {[
                    { l: 'Hidden Bottlenecks', fn: () => runDiscovery({ mode: 'giant_chain', only_hidden: true, label: 'Hidden Bottlenecks' }) },
                    { l: 'Supply Chain Map', fn: () => runSupplyChainMap() },
                    { l: 'Foreign Bottlenecks', fn: () => runDiscovery({ mode: 'theme_scan', include_foreign: true, label: 'Foreign Bottlenecks' }) },
                    { l: 'AI Power Chokepoints', fn: () => runDiscovery({ mode: 'theme_scan', theme_ids: ['ai_power'], label: 'AI Power Chokepoints' }) },
                    { l: 'Photonics / CPO Chain', fn: () => runDiscovery({ mode: 'theme_scan', theme_ids: ['photonics_cpo'], label: 'Photonics / CPO Chain' }) },
                    { l: 'Packaging / Test', fn: () => runDiscovery({ mode: 'theme_scan', theme_ids: ['packaging_test'], label: 'Packaging / Test Bottlenecks' }) },
                    { l: 'Consensus Check', fn: () => {
                        // Compare the anchor ticker against both playbooks as a quick consensus check
                        const tickers = discoveryAnchor && discoveryAnchor !== 'AI Power' ? [discoveryAnchor] : [];
                        if (tickers.length) runCompare(tickers, `Consensus Check — ${tickers.join(', ')}`);
                        else runDiscovery({ mode: 'theme_scan', label: 'Consensus Discovery', include_foreign: discoveryIncludeForeign });
                    }},
                  ].map(item => (
                    <div key={item.l} className="rail-item" onClick={() => { if (!loading) { item.fn(); setLeftRailOpen(false); } }} style={{ padding:'5px 10px', cursor:loading ? 'not-allowed' : 'pointer', color:'#818cf8', fontSize:11, fontFamily:sansFont, borderRadius:2, transition:'all 0.1s', opacity:loading ? 0.5 : 1 }}>
                      {item.l}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MAIN WORKSPACE */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ flex:1, overflowY:'auto', padding:16 }}>
            {error && <div style={{ padding:'12px 16px', background:`${C.red}10`, border:`1px solid ${C.red}30`, borderRadius:8, marginBottom:14, color:C.red, fontSize:12, fontFamily:font }}>{error}</div>}

            {loading && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px', marginBottom:10 }}>
                <img
                  src={caelynLogo}
                  alt="loading"
                  style={{
                    width: 220,
                    height: 220,
                    objectFit: 'contain',
                    animation: 'caelyn-spin 3s linear infinite',
                    filter: 'drop-shadow(0 0 24px #3b82f6cc) drop-shadow(0 0 48px #a78bfa66)',
                    marginBottom: 28
                  }}
                />
                <span style={{ color:C.blue, fontSize:14, fontWeight:700, fontFamily:font, letterSpacing:'0.08em', marginBottom:8 }}>{loadingStage || 'Processing...'}</span>
                <span style={{ color:C.dim, fontSize:11, fontFamily:sansFont, marginBottom:24 }}>Analysis in progress — feel free to browse other pages</span>
                <div style={{ height:3, background:C.border, borderRadius:2, overflow:'hidden', width:'60%', maxWidth:400 }}>
                  <div style={{ height:'100%', background:`linear-gradient(90deg, ${C.blue}, ${C.purple})`, animation:'agent-progress 8s ease-in-out infinite', borderRadius:2 }} />
                </div>
              </div>
            )}

            {panels.length === 0 && !loading && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, color:C.dim, overflow:'hidden' }}>
                <div style={{ flex:1 }} />
                <img src={caelynLogo} alt="caelyn.ai" style={{ width:'auto', height:'auto', maxWidth:400, maxHeight:'calc(100vh - 380px)', objectFit:'contain', marginBottom:8, imageRendering:'auto', WebkitBackfaceVisibility:'hidden' }} />
                <link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;700&display=swap" rel="stylesheet" />
                <div style={{ fontSize:32, fontWeight:400, marginBottom:6, letterSpacing:'0.04em', color:'#ffffff', fontFamily:"'Comfortaa', sans-serif" }}>caelyn<span style={{ color:'rgba(255,255,255,0.5)' }}>.ai</span></div>
                <div style={{ color:'rgba(255,255,255,0.5)', fontSize:13, fontWeight:300, letterSpacing:'0.04em', marginBottom:20, fontFamily:sansFont }}>Your AI-powered trading assistant</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
                  {[
                    { l: '/briefing', intent: 'daily_briefing' },
                    { l: '/trades', intent: 'best_trades' },
                    { l: '/crypto', intent: 'crypto' },
                    { l: '/scan', intent: 'trending_now' },
                  ].map(cmd => (
                    <button key={cmd.l} className="panel-btn" onClick={() => askAgent('', true, cmd.intent)} style={{ padding:'8px 18px', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.blue, fontSize:11, fontWeight:600, fontFamily:font, cursor:'pointer', transition:'all 0.15s' }}>{cmd.l}</button>
                  ))}
                </div>
                <div style={{ flex:1 }} />
              </div>
            )}

            {panels.map(panel => {
              return (
              <div key={panel.id} style={{ marginBottom:14, border:`1px solid ${panel.pinned ? C.blue+'40' : C.border}`, borderRadius:10, background:C.card, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.2)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:`${C.bg}cc`, borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0 }}>
                    <span style={{ color:C.bright, fontSize:12, fontWeight:700, fontFamily:font, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{panel.title || 'Analysis'}</span>
                    {panel.reasoningModel && panel.reasoningModel !== 'agent_collab' && <span style={{ fontSize:8, fontWeight:600, fontFamily:font, textTransform:'uppercase', color:'#3b82f6', background:'#3b82f620', border:'1px solid #3b82f640', borderRadius:8, padding:'1px 6px', flexShrink:0 }}>{panel.reasoningModel}</span>}
                    <span style={{ color:C.dim, fontSize:9, fontFamily:font, flexShrink:0 }}>{new Date(panel.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                    <button className="panel-btn" onClick={(e) => { e.stopPropagation(); togglePinPanel(panel.id); }} style={{ width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:`1px solid ${panel.pinned ? C.blue : C.border}`, borderRadius:6, color:panel.pinned ? C.blue : C.dim, fontSize:10, cursor:'pointer', fontFamily:font }} title="Pin">📌</button>
                    <button className="panel-btn" onClick={(e) => { e.stopPropagation(); closePanel(panel.id); }} style={{ width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:`1px solid ${C.border}`, borderRadius:6, color:C.dim, fontSize:12, cursor:'pointer', fontFamily:font }} title="Close">x</button>
                  </div>
                </div>
                {(panel.data?.parsed?.user_query || panel.userQuery) && (
                  <div style={{ padding:'12px 16px', background:`${C.blue}06`, borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                      <span style={{ color:C.blue, fontSize:9, fontWeight:700, fontFamily:font, marginTop:2, flexShrink:0, padding:'2px 6px', background:`${C.blue}12`, borderRadius:4 }}>YOU</span>
                      <span style={{ color:C.bright, fontSize:12, fontFamily:sansFont, lineHeight:1.6 }}>{panel.data?.parsed?.user_query || panel.userQuery}</span>
                    </div>
                  </div>
                )}
                <div style={{ padding:16 }}>
                  {renderAssistantMessage(panel.data)}
                </div>
                {panel.thread && panel.thread.length > 0 && (
                  <div style={{ borderTop:`1px solid ${C.border}` }}>
                    {panel.thread.map((msg, idx) => (
                      <div key={idx} style={{ padding:'10px 14px', borderBottom:`1px solid ${C.border}`, background: msg.role === 'user' ? `${C.blue}06` : 'transparent' }}>
                        {msg.role === 'user' ? (
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ color:C.blue, fontSize:9, fontWeight:700, fontFamily:font }}>YOU</span>
                            <span style={{ color:C.bright, fontSize:12, fontFamily:sansFont }}>{msg.content}</span>
                          </div>
                        ) : (
                          <div>{msg.parsed ? renderAssistantMessage({ role:'assistant', content: msg.content, parsed: msg.parsed }) : <div style={{ color:C.text, fontSize:12, fontFamily:sansFont, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{msg.content}</div>}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {panel.reasoningModel && (
                  <div style={{ padding:'4px 16px 4px', textAlign:'right' }}>
                    <span style={{ fontSize:8, color: panel.reasoningModel === 'agent_collab' ? '#a78bfa' : C.dim, fontFamily:font, fontWeight:500, opacity:0.6 }}>
                      {panel.reasoningModel === 'agent_collab' ? 'Agent Collab' : panel.reasoningModel === 'gpt-4o' ? 'GPT-4o' : panel.reasoningModel.charAt(0).toUpperCase() + panel.reasoningModel.slice(1)}
                    </span>
                  </div>
                )}
                <FollowUpInput panelId={panel.id} onSubmit={sendFollowUp} C={C} font={font} sansFont={sansFont} suggestions={(() => {
                  const thread = panel.thread || [];
                  for (let i = thread.length - 1; i >= 0; i--) {
                    if (thread[i].role === 'assistant' && thread[i].parsed?.suggested_followups) {
                      return thread[i].parsed.suggested_followups;
                    }
                  }
                  return panel.data?.parsed?.suggested_followups;
                })()} />
              </div>
              );
            })}
            <div ref={scrollAnchorRef} />
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className={`right-sidebar ${rightSidebarOpen ? 'mobile-open' : ''}`} style={{ width:240, flexShrink:0, display:'flex', flexDirection:'column', background:'rgba(15,15,30,0.5)', borderLeft:'1px solid rgba(255,255,255,0.06)', overflow:'hidden', backdropFilter:'blur(12px)' }}>
          <div style={{ flex:1, overflowY:'auto', padding:8 }}>
            {/* Screener */}
            <div style={{ marginBottom:12 }}>
              <div style={{ color:C.bright, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:6, padding:'0 4px' }}>TA Screener</div>
              <textarea
                value={screenerInput}
                onChange={e => setScreenerInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (screenerInput.trim()) { askAgent(screenerInput); setScreenerInput(''); setRightSidebarOpen(false); } } }}
                placeholder="Screen stocks..."
                rows={3}
                style={{ width:'100%', padding:'8px 10px', border:`1px solid ${C.border}`, borderRadius:3, background:C.bg, color:C.bright, fontSize:11, fontFamily:sansFont, outline:'none', resize:'none', lineHeight:1.5, boxSizing:'border-box' }}
              />
              <button
                onClick={() => { if (screenerInput.trim()) { askAgent(screenerInput); setScreenerInput(''); setRightSidebarOpen(false); } }}
                disabled={loading || !screenerInput.trim()}
                className="panel-btn"
                style={{ width:'100%', padding:'6px', background:loading || !screenerInput.trim() ? C.bg : C.purple, color:loading || !screenerInput.trim() ? C.dim : 'white', border:'none', borderRadius:3, cursor:loading || !screenerInput.trim() ? 'not-allowed' : 'pointer', fontWeight:700, fontSize:11, fontFamily:font, marginTop:4 }}
              >
                SCAN
              </button>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:6 }}>
                {[
                  {l:'Oversold+Growing', intent:'oversold_growing'},
                  {l:'Value+Momentum', intent:'value_momentum'},
                  {l:'Insider+Breakout', intent:'insider_breakout'},
                  {l:'High Growth Small Cap', intent:'high_growth_sc'},
                  {l:'Dividend Value', intent:'dividend_value'},
                  {l:'Stage 2 Breakouts', intent:'technical_stage2'},
                  {l:'Bullish Breakouts', intent:'technical_bullish_breakouts'},
                  {l:'Bearish Breakdowns', intent:'technical_breakdowns'},
                  {l:'Bearish Setups', intent:'technical_bearish_setups'},
                  {l:'Oversold Bounces', intent:'technical_oversold'},
                  {l:'Overbought Warnings', intent:'technical_overbought'},
                  {l:'Crossover Signals', intent:'technical_crossovers'},
                  {l:'Momentum Shifts', intent:'momentum_shift_scan'},
                  {l:'Volume & Movers', intent:'volume_movers_scan'},
                ].map(chip => (
                  <button key={chip.l} className="sidebar-chip" onClick={() => { if (!loading) { newChat(); askAgent('', true, chip.intent); setRightSidebarOpen(false); } }} disabled={loading} style={{ padding:'3px 7px', background:`${C.purple}08`, border:`1px solid ${C.purple}18`, borderRadius:3, color:C.dim, fontSize:8, fontWeight:600, fontFamily:font, cursor:loading ? 'not-allowed' : 'pointer', transition:'all 0.15s', opacity:loading ? 0.5 : 1 }}>{chip.l}</button>
                ))}
              </div>
            </div>

            {/* Recent */}
            <div style={{ marginBottom:12 }}>
              <div style={{ color:C.bright, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:6, padding:'0 4px' }}>Recent</div>
              {recentHistory.length === 0 ? (
                <div style={{ color:C.dim, fontSize:10, fontFamily:font, padding:'8px 4px' }}>No history yet</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {recentHistory.slice(0, 10).map((entry, i) => {
                    // Use query text first, then title/intent as fallback label
                    let displayLabel = entry.query || entry.title || '';
                    if (!displayLabel) {
                      try { const p = JSON.parse(entry.content); if (p?._user_query) displayLabel = p._user_query; } catch {}
                    }
                    if (!displayLabel) displayLabel = humanReadableLabel(entry.intent);
                    const truncated = displayLabel.length > 55 ? displayLabel.slice(0, 52) + '...' : displayLabel;
                    const timeStr = relativeTime(entry.timestamp);
                    const modelStr = entry.model_used === 'agent_collab' ? 'collab' : (entry.model_used || '');
                    return (
                      <div key={`${entry.key}-${i}`} className="rail-item" onClick={() => loadRecentEntry(entry)} style={{ cursor:'pointer', padding:'5px 6px', borderRadius:2, border:`1px solid ${C.border}`, background:C.bg }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <div style={{ color:C.dim, fontSize:10, fontFamily:sansFont, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{truncated}</div>
                          {modelStr && <span style={{ fontSize:6, fontWeight:700, fontFamily:font, textTransform:'uppercase', color: entry.model_used === 'agent_collab' ? '#a78bfa' : C.blue, background: entry.model_used === 'agent_collab' ? 'rgba(139,92,246,0.12)' : `${C.blue}12`, borderRadius:4, padding:'1px 3px', flexShrink:0 }}>{modelStr}</span>}
                        </div>
                        <div style={{ color:C.dim, fontSize:8, fontFamily:font, marginTop:1 }}>{timeStr}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Context */}
            <div>
              <div style={{ color:C.bright, fontSize:10, fontWeight:700, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:6, padding:'0 4px' }}>Context</div>
              <div style={{ padding:'6px 8px', background:C.bg, borderRadius:3, border:`1px solid ${C.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ color:C.dim, fontSize:9, fontFamily:font }}>CONV_ID</span>
                  <span style={{ color:C.text, fontSize:9, fontFamily:font }}>{conversationId ? conversationId.slice(0, 12) + '...' : 'None'}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ color:C.dim, fontSize:9, fontFamily:font }}>PANELS</span>
                  <span style={{ color:C.text, fontSize:9, fontFamily:font }}>{panels.length}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:C.dim, fontSize:9, fontFamily:font }}>STATUS</span>
                  <span style={{ color:loading ? C.gold : C.green, fontSize:9, fontFamily:font }}>{loading ? 'RUNNING' : 'IDLE'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div style={{ padding:'8px', borderTop:`1px solid ${C.border}` }}>
            <button
              onClick={logout}
              style={{ width:'100%', padding:'6px', background:'transparent', color:C.dim, border:`1px solid ${C.border}`, borderRadius:3, cursor:'pointer', fontWeight:600, fontSize:9, fontFamily:font, textTransform:'uppercase', letterSpacing:'0.05em', transition:'all 0.15s' }}
              onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#ef444440'; }}
              onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.color = C.dim; (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Stock Detail Modal (triggered from watchlist analysis in chat) */}
      {modalTicker && (
        <StockDetailModal
          ticker={modalTicker}
          analysis={modalWatchlistData}
          newsItems={[]}
          onClose={() => { setModalTicker(null); setModalWatchlistData(null); }}
        />
      )}
    </div>
  );
}
