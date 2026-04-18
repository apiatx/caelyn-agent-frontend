import { useState, useCallback } from 'react';
import { RefreshCw, X, ChevronRight, ArrowLeft, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { fetchLatestSnapshot, fetchReport, refreshSnapshot } from '@/lib/screener';
import type { ScreenerSnapshot, ScreenerEntry, ScreenerReport } from '@/types/screener';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/* ── Design tokens — premium dark publication ─────────────────────── */
const C = {
  bg:       '#07090f',
  surface:  '#0c1120',
  card:     '#0f1628',
  border:   '#1c2a45',
  borderFaint: '#141e33',
  text:     '#e2e8f0',
  dim:      '#64748b',
  muted:    '#3d4f6b',
  bright:   '#f8fafc',
  indigo:   '#6366f1',
  indigoFg: '#a5b4fc',
  indigoSub:'rgba(99,102,241,0.08)',
  green:    '#22c55e',
  amber:    '#f59e0b',
  blue:     '#38bdf8',
  red:      '#ef4444',
  font:     "'JetBrains Mono','Fira Code',monospace",
  sans:     "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
};

/* ── Helpers ─────────────────────────────────────────────────────── */
function fmtCap(v?: number): string {
  if (!v) return '—';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

function gradeColor(g?: string): string {
  if (!g) return C.dim;
  const s = g.toUpperCase();
  if (s.startsWith('A')) return C.green;
  if (s.startsWith('B')) return C.blue;
  if (s.startsWith('C')) return C.amber;
  return C.dim;
}

function fmtDate(d?: string): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
}

function normaliseEntries(snap: ScreenerSnapshot): ScreenerEntry[] {
  return (snap.entries || snap.ranked_list || snap.candidates || snap.results || [])
    .map((e, i) => ({ ...e, rank: e.rank ?? i + 1 }));
}

function snapshotId(snap: ScreenerSnapshot): string {
  return snap.snapshot_id || snap.id || 'latest';
}

function tickerOf(e: ScreenerEntry): string {
  return e.ticker || e.symbol || '';
}

function nameOf(e: ScreenerEntry): string {
  return e.company_name || e.name || tickerOf(e);
}

function themeOf(e: ScreenerEntry): string {
  if (e.theme) return e.theme;
  if (e.themes?.length) return e.themes[0];
  if (e.theme_tags?.length) return e.theme_tags[0];
  return '—';
}

function layerOf(e: ScreenerEntry): string {
  if (e.chain_layer) return e.chain_layer;
  if (e.layer_depth != null) return `L${e.layer_depth}`;
  return '—';
}

function gradeOf(e: ScreenerEntry): string {
  return e.grade || (typeof e.confidence === 'string' ? e.confidence : '') || '';
}

function scoreOf(e: ScreenerEntry): number | undefined {
  return e.best_blend_score ?? e.final_score ?? e.score ?? e.bottleneck_score;
}

/* ── Sub-components ───────────────────────────────────────────────── */

function LoadingState() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:'80px 0', color:C.dim }}>
      <Loader2 size={28} style={{ animation:'spin 1s linear infinite', color:C.indigo }} />
      <span style={{ fontFamily:C.font, fontSize:11 }}>Loading snapshot…</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, padding:'60px 24px', textAlign:'center' }}>
      <AlertCircle size={28} style={{ color:C.amber }} />
      <p style={{ fontFamily:C.sans, fontSize:14, color:C.dim, maxWidth:380 }}>{message}</p>
      <button onClick={onRetry} style={{ padding:'7px 20px', background:C.indigoSub, border:`1px solid rgba(99,102,241,0.3)`, borderRadius:6, color:C.indigoFg, fontFamily:C.font, fontSize:11, cursor:'pointer' }}>
        Retry
      </button>
    </div>
  );
}

function GradeBadge({ grade }: { grade?: string }) {
  if (!grade) return <span style={{ color:C.muted, fontSize:11, fontFamily:C.font }}>—</span>;
  const clr = gradeColor(grade);
  return (
    <span style={{ display:'inline-block', minWidth:28, padding:'2px 7px', background:`${clr}14`, border:`1px solid ${clr}30`, borderRadius:4, color:clr, fontFamily:C.font, fontSize:10, fontWeight:700, textAlign:'center' }}>
      {grade}
    </span>
  );
}

function AccessBadge({ entry }: { entry: ScreenerEntry }) {
  const proxy = entry.adr_ticker || entry.adr_proxy || entry.us_access_proxy || entry.etf_proxy;
  if (entry.direct_tradable !== false && !proxy) return null;
  if (proxy) {
    return (
      <span style={{ display:'inline-block', padding:'1px 6px', background:`${C.amber}12`, border:`1px solid ${C.amber}30`, borderRadius:3, color:C.amber, fontFamily:C.font, fontSize:8, fontWeight:700, whiteSpace:'nowrap' }}>
        {proxy}
      </span>
    );
  }
  if (entry.direct_tradable === false) {
    return (
      <span style={{ display:'inline-block', padding:'1px 6px', background:`rgba(239,68,68,0.08)`, border:`1px solid rgba(239,68,68,0.2)`, borderRadius:3, color:'#f87171', fontFamily:C.font, fontSize:8, fontWeight:700 }}>
        Foreign
      </span>
    );
  }
  return null;
}

/* ── Report Section renderer ─────────────────────────────────────── */
function ReportSection({ title, content }: { title: string; content?: string }) {
  if (!content?.trim()) return null;
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <span style={{ display:'inline-block', width:3, height:14, background:C.indigo, borderRadius:2, flexShrink:0 }} />
        <h3 style={{ fontFamily:C.sans, fontSize:12, fontWeight:700, color:C.indigoFg, textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>{title}</h3>
      </div>
      <p style={{ fontFamily:C.sans, fontSize:14, color:C.text, lineHeight:1.8, margin:0, paddingLeft:11, borderLeft:`1px solid ${C.borderFaint}` }}>
        {content}
      </p>
    </div>
  );
}

/* ── Report Panel ────────────────────────────────────────────────── */
function ReportPanel({
  entry,
  snapshotId: sid,
  onClose,
}: {
  entry: ScreenerEntry;
  snapshotId: string;
  onClose: () => void;
}) {
  const tk = tickerOf(entry);
  const { data: report, isLoading, error } = useQuery<ScreenerReport>({
    queryKey: ['screener-report', sid, tk],
    queryFn: () => fetchReport(sid, tk),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const sectionsFromReport = (r: ScreenerReport) => [
    { title: 'Summary', content: r.summary },
    { title: 'Why It Matters', content: r.why_it_matters },
    { title: 'Supply Chain Position', content: r.supply_chain_position },
    { title: 'Supply Chain Map', content: r.supply_chain_map },
    { title: 'Competitors', content: r.competitors },
    { title: 'Catalysts', content: r.catalysts },
    { title: 'Rerating Case', content: r.rerating_case },
    { title: 'Why Hidden', content: r.why_hidden },
    { title: 'Key Risk', content: r.key_risk },
    { title: 'What to Verify Next', content: r.what_to_verify_next },
    { title: 'What Would Break Thesis', content: r.what_would_break_thesis },
  ];

  const extraSections: { title: string; content: string }[] = report?.sections
    ? report.sections.map(s => ({ title: s.label || '', content: s.content || s.text || '' }))
    : [];

  return (
    <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'min(680px, 100vw)', background:C.surface, borderLeft:`1px solid ${C.border}`, zIndex:80, display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(0,0,0,0.5)' }}>
      {/* Panel header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 22px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <button onClick={onClose} style={{ display:'flex', alignItems:'center', gap:6, background:'transparent', border:'none', color:C.dim, cursor:'pointer', padding:'4px 8px', borderRadius:4, fontFamily:C.font, fontSize:10 }}>
          <ArrowLeft size={14} />
          Back
        </button>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontFamily:C.font, fontSize:16, fontWeight:700, color:C.bright }}>{tk}</span>
            <GradeBadge grade={gradeOf(entry)} />
            <AccessBadge entry={entry} />
          </div>
          <div style={{ fontFamily:C.sans, fontSize:12, color:C.dim, marginTop:2 }}>{nameOf(entry)}</div>
        </div>
        <button onClick={onClose} style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:4, color:C.dim, cursor:'pointer', padding:4 }}>
          <X size={14} />
        </button>
      </div>

      {/* Meta strip */}
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'10px 22px', borderBottom:`1px solid ${C.borderFaint}`, background:C.indigoSub, flexShrink:0, flexWrap:'wrap' }}>
        {entry.theme || entry.themes?.[0] ? <span style={{ fontFamily:C.font, fontSize:10, color:C.indigoFg }}>{themeOf(entry)}</span> : null}
        {entry.layer_depth != null && <span style={{ fontFamily:C.font, fontSize:10, color:C.dim }}>Layer {entry.layer_depth}</span>}
        {entry.country && <span style={{ fontFamily:C.font, fontSize:10, color:C.dim }}>{entry.country}</span>}
        {entry.market_cap_usd && <span style={{ fontFamily:C.font, fontSize:10, color:C.dim }}>{fmtCap(entry.market_cap_usd)}</span>}
        {entry.why_now && <span style={{ fontFamily:C.sans, fontSize:11, color:C.dim, fontStyle:'italic', flex:1, minWidth:120 }}>{entry.why_now}</span>}
      </div>

      {/* Report body */}
      <div style={{ flex:1, overflowY:'auto', padding:'24px 22px' }}>
        {isLoading && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'40px 0', color:C.dim }}>
            <Loader2 size={18} style={{ animation:'spin 1s linear infinite', color:C.indigo }} />
            <span style={{ fontFamily:C.font, fontSize:11 }}>Loading report…</span>
          </div>
        )}
        {error && !report && (
          <div style={{ padding:'32px 0' }}>
            <p style={{ fontFamily:C.sans, fontSize:13, color:C.dim, textAlign:'center' }}>
              Report unavailable — showing snapshot data.
            </p>
            {entry.thesis_summary && <ReportSection title="Thesis" content={entry.thesis_summary} />}
            {entry.why_now && <ReportSection title="Why Now" content={entry.why_now} />}
            {entry.why_hidden && <ReportSection title="Why Hidden" content={entry.why_hidden} />}
          </div>
        )}
        {report && !report.error && (
          <>
            {report.headline && (
              <p style={{ fontFamily:C.sans, fontSize:15, color:C.indigoFg, fontStyle:'italic', marginBottom:24, lineHeight:1.7, borderLeft:`3px solid ${C.indigo}`, paddingLeft:14 }}>
                {report.headline}
              </p>
            )}
            {sectionsFromReport(report).map(s => <ReportSection key={s.title} title={s.title} content={s.content} />)}
            {extraSections.map(s => <ReportSection key={s.title} title={s.title} content={s.content} />)}
          </>
        )}
        {report?.error && (
          <div>
            <p style={{ fontFamily:C.sans, fontSize:13, color:C.dim, textAlign:'center', marginBottom:16 }}>Report load error — showing available data.</p>
            {entry.thesis_summary && <ReportSection title="Thesis" content={entry.thesis_summary} />}
            {entry.why_now && <ReportSection title="Why Now" content={entry.why_now} />}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function StrategyScreenerPage() {
  const [selectedEntry, setSelectedEntry] = useState<ScreenerEntry | null>(null);
  const [refreshMsg, setRefreshMsg] = useState<string>('');
  const qc = useQueryClient();

  const {
    data: snapshot,
    isLoading,
    error,
    refetch,
  } = useQuery<ScreenerSnapshot>({
    queryKey: ['strategy-screener-latest'],
    queryFn: fetchLatestSnapshot,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const refreshMut = useMutation({
    mutationFn: refreshSnapshot,
    onSuccess: (data) => {
      setRefreshMsg(data.message || data.status || 'Snapshot refreshed');
      setTimeout(() => setRefreshMsg(''), 4000);
      qc.invalidateQueries({ queryKey: ['strategy-screener-latest'] });
    },
    onError: () => {
      setRefreshMsg('Refresh failed — snapshot unchanged');
      setTimeout(() => setRefreshMsg(''), 3000);
    },
  });

  const entries: ScreenerEntry[] = snapshot ? normaliseEntries(snapshot) : [];
  const sid = snapshot ? snapshotId(snapshot) : 'latest';

  const handleRowClick = useCallback((e: ScreenerEntry) => {
    setSelectedEntry(e);
  }, []);

  return (
    <div style={{ minHeight:'100vh', background:C.bg, color:C.text }}>
      {/* CSS for spinner */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ss-row:hover { background: rgba(99,102,241,0.06) !important; cursor:pointer; }
        .ss-row td { border-bottom: 1px solid ${C.borderFaint}; }
      `}</style>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px 80px' }}>

        {/* ── Hero header ──────────────────────────────────────── */}
        <div style={{ padding:'40px 0 32px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:C.indigo }} />
                <span style={{ fontFamily:C.font, fontSize:9, fontWeight:700, color:C.indigoFg, textTransform:'uppercase', letterSpacing:'0.1em' }}>
                  Powered by Serenity Playbook
                </span>
                {snapshot?.cadence_label && (
                  <>
                    <span style={{ color:C.muted, fontSize:9, fontFamily:C.font }}>·</span>
                    <span style={{ fontFamily:C.font, fontSize:9, color:C.dim }}>{snapshot.cadence_label}</span>
                  </>
                )}
              </div>
              <h1 style={{ fontFamily:C.sans, fontSize:28, fontWeight:700, color:C.bright, margin:'0 0 8px', letterSpacing:'-0.01em' }}>
                Strategy Screener
              </h1>
              {snapshot?.summary && (
                <p style={{ fontFamily:C.sans, fontSize:14, color:C.dim, margin:'0 0 10px', maxWidth:600, lineHeight:1.7 }}>
                  {snapshot.summary}
                </p>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                {snapshot?.generated_at && (
                  <span style={{ fontFamily:C.font, fontSize:10, color:C.muted }}>
                    Generated {fmtDate(snapshot.generated_at)}
                  </span>
                )}
                {snapshot?.regime_label && (
                  <span style={{ padding:'2px 10px', background:C.indigoSub, border:`1px solid rgba(99,102,241,0.2)`, borderRadius:4, fontFamily:C.font, fontSize:10, color:C.indigoFg }}>
                    {snapshot.regime_label}
                  </span>
                )}
                {snapshot?.top_themes?.length ? (
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {snapshot.top_themes.slice(0,4).map(t => (
                      <span key={t} style={{ padding:'2px 8px', background:`rgba(56,189,248,0.08)`, border:`1px solid rgba(56,189,248,0.2)`, borderRadius:4, fontFamily:C.font, fontSize:9, color:C.blue }}>
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Refresh button */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
              <button
                onClick={() => refreshMut.mutate()}
                disabled={refreshMut.isPending || isLoading}
                style={{
                  display:'flex', alignItems:'center', gap:7, padding:'8px 16px',
                  background: refreshMut.isPending ? C.indigoSub : 'transparent',
                  border:`1px solid ${refreshMut.isPending ? C.indigo : C.border}`,
                  borderRadius:6, color: refreshMut.isPending ? C.indigoFg : C.dim,
                  fontFamily:C.font, fontSize:10, cursor: refreshMut.isPending ? 'not-allowed' : 'pointer',
                  transition:'all 0.15s',
                }}
              >
                <RefreshCw size={12} style={{ animation: refreshMut.isPending ? 'spin 1s linear infinite' : 'none' }} />
                {refreshMut.isPending ? 'Refreshing…' : 'Refresh Snapshot'}
              </button>
              {refreshMsg && (
                <span style={{ fontFamily:C.font, fontSize:9, color: refreshMsg.includes('fail') ? C.amber : C.green }}>
                  {refreshMsg}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Content area ─────────────────────────────────────── */}
        {isLoading && <LoadingState />}
        {error && !snapshot && (
          <ErrorState
            message={`Could not load snapshot: ${(error as Error).message || 'Unknown error'}`}
            onRetry={() => refetch()}
          />
        )}
        {snapshot?.error && (
          <ErrorState
            message={snapshot.error}
            onRetry={() => refetch()}
          />
        )}

        {snapshot && !snapshot.error && (
          <>
            {/* Stats strip */}
            <div style={{ display:'flex', alignItems:'center', gap:24, padding:'16px 0', borderBottom:`1px solid ${C.borderFaint}`, flexWrap:'wrap' }}>
              <div>
                <div style={{ fontFamily:C.font, fontSize:18, fontWeight:700, color:C.bright }}>{entries.length}</div>
                <div style={{ fontFamily:C.font, fontSize:9, color:C.dim, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Ranked Entries</div>
              </div>
              {snapshot.total_candidates != null && snapshot.total_candidates !== entries.length && (
                <div>
                  <div style={{ fontFamily:C.font, fontSize:18, fontWeight:700, color:C.dim }}>{snapshot.total_candidates}</div>
                  <div style={{ fontFamily:C.font, fontSize:9, color:C.dim, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Total Scanned</div>
                </div>
              )}
              {snapshot.regime_summary && (
                <p style={{ fontFamily:C.sans, fontSize:12, color:C.dim, fontStyle:'italic', margin:0, flex:1, maxWidth:500 }}>
                  {snapshot.regime_summary}
                </p>
              )}
            </div>

            {/* ── Ranked list table ─────────────────────────────── */}
            {entries.length === 0 ? (
              <div style={{ padding:'48px 0', textAlign:'center', color:C.dim, fontFamily:C.sans, fontSize:14 }}>
                No entries in this snapshot.
              </div>
            ) : (
              <div style={{ marginTop:24, overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'auto' }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                      {['#', 'Ticker', 'Company / Role', 'Theme', 'Mkt Cap', 'Layer', 'Market', 'Grade'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', fontFamily:C.font, fontSize:8, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'left', whiteSpace:'nowrap' }}>
                          {h}
                        </th>
                      ))}
                      <th style={{ width:20 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, idx) => {
                      const tk = tickerOf(e);
                      const score = scoreOf(e);
                      return (
                        <tr
                          key={tk || idx}
                          className="ss-row"
                          onClick={() => handleRowClick(e)}
                          style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', transition:'background 0.1s' }}
                        >
                          <td style={{ padding:'12px 12px', fontFamily:C.font, fontSize:10, color:C.muted, width:36 }}>
                            {e.rank ?? idx + 1}
                          </td>
                          <td style={{ padding:'12px 12px', whiteSpace:'nowrap' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                              <span style={{ fontFamily:C.font, fontSize:13, fontWeight:700, color:C.bright }}>{tk || '—'}</span>
                              <AccessBadge entry={e} />
                            </div>
                            {score != null && (
                              <div style={{ fontFamily:C.font, fontSize:8, color:C.muted, marginTop:2 }}>
                                score {Math.round(score)}
                              </div>
                            )}
                          </td>
                          <td style={{ padding:'12px 12px', maxWidth:220 }}>
                            <div style={{ fontFamily:C.sans, fontSize:12, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {nameOf(e)}
                            </div>
                            {(e.role || e.chain_role_type) && (
                              <div style={{ fontFamily:C.font, fontSize:9, color:C.dim, marginTop:2 }}>
                                {e.role || e.chain_role_type}
                              </div>
                            )}
                          </td>
                          <td style={{ padding:'12px 12px', whiteSpace:'nowrap' }}>
                            <span style={{ fontFamily:C.font, fontSize:10, color:C.blue }}>{themeOf(e)}</span>
                          </td>
                          <td style={{ padding:'12px 12px', fontFamily:C.font, fontSize:10, color:C.dim, whiteSpace:'nowrap' }}>
                            {fmtCap(e.market_cap_usd)}
                          </td>
                          <td style={{ padding:'12px 12px', fontFamily:C.font, fontSize:10, color:C.dim, whiteSpace:'nowrap' }}>
                            {layerOf(e)}
                          </td>
                          <td style={{ padding:'12px 12px', fontFamily:C.font, fontSize:10, color:C.dim, whiteSpace:'nowrap' }}>
                            {e.exchange || e.market || e.country || '—'}
                          </td>
                          <td style={{ padding:'12px 12px' }}>
                            <GradeBadge grade={gradeOf(e)} />
                          </td>
                          <td style={{ padding:'12px 8px' }}>
                            <ChevronRight size={14} style={{ color:C.muted }} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Empty fallback when no snapshot yet but no error ─── */}
        {!isLoading && !error && !snapshot && (
          <div style={{ padding:'64px 0', textAlign:'center', color:C.dim, fontFamily:C.sans, fontSize:14 }}>
            No snapshot available yet. Use the Refresh Snapshot button to generate one.
          </div>
        )}
      </div>

      {/* ── Report panel overlay ──────────────────────────────── */}
      {selectedEntry && snapshot && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelectedEntry(null)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:79, backdropFilter:'blur(2px)' }}
          />
          <ReportPanel
            entry={selectedEntry}
            snapshotId={sid}
            onClose={() => setSelectedEntry(null)}
          />
        </>
      )}
    </div>
  );
}
