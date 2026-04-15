import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Newspaper, Send, Loader2, MessageSquare, ExternalLink, Clock, RefreshCw, Sparkles, CalendarDays, TrendingUp } from 'lucide-react';
import { openSecureLink } from '@/utils/security';
import { Button } from '@/components/ui/button';

// ─── Constants ────────────────────────────────────────────────────

const AGENT_BACKEND_URL = "https://fast-api-server-trading-agent-aidanpilon.replit.app";
const AGENT_API_KEY = "hippo_ak_7f3x9k2m4p8q1w5t";

function getToken(): string | null {
  return localStorage.getItem('caelyn_token') || sessionStorage.getItem('caelyn_token');
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'X-API-Key': AGENT_API_KEY, ...extra };
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

function proxyHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

const CATEGORIES = [
  { id: 'finance', label: 'Finance' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'politics', label: 'Politics' },
  { id: 'world', label: 'World' },
] as const;

type Category = typeof CATEGORIES[number]['id'];

interface NewsArticle {
  title: string;
  description: string;
  source: string;
  url: string;
  published: string | number;
  image: string;
  symbol?: string;
}

interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// ─── Weekly Summary Types ─────────────────────────────────────────

interface WeeklySummaryDay {
  day: string;
  text: string;
}

interface WeeklySummaryData {
  week_label: string;
  headline: string;
  summary: string;
  sub_label: string;
  days: WeeklySummaryDay[];
  closing_note: string;
  outlook_label: string;
  generated_at: string;
}

// ─── The Brief Types ──────────────────────────────────────────────

interface EarningsTicker {
  ticker: string;
  eps_estimate: number | null;
  hour: string;
}

interface TheBriefData {
  week_start: string;
  week_end: string;
  earnings_by_day: Record<string, { bmo?: EarningsTicker[]; amc?: EarningsTicker[] }>;
  economic_events: Array<{ event: string; date: string; time: string }>;
}

const NEWS_SUGGESTED_PROMPTS = [
  "How are today's top headlines likely to impact the S&P 500 and crypto markets this week?",
  "What geopolitical risks in the news right now pose the biggest threat to my portfolio?",
  "Which sectors benefit most from the current news cycle and policy trends?",
  "Are there any breaking news catalysts that could trigger a major market move today?",
  "How should I position around the current tariff and trade policy developments?",
];

// ─── Time Formatting ──────────────────────────────────────────────

function formatTime(published: string | number): string {
  if (!published) return '';
  let date: Date;
  if (typeof published === 'number') {
    date = new Date(published > 1e12 ? published : published * 1000);
  } else {
    date = new Date(published);
  }
  if (isNaN(date.getTime())) return '';
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return iso; }
}

const DAY_ABBR: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

function dateToAbbr(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return DAY_ABBR[d.getDay()] ?? dateStr;
  } catch { return dateStr; }
}

function outlookColor(label: string): { bg: string; text: string; border: string } {
  const lower = label.toLowerCase();
  if (lower.includes('bear')) return { bg: 'rgba(239,68,68,0.12)', text: '#f87171', border: 'rgba(239,68,68,0.3)' };
  if (lower.includes('mixed') || lower.includes('cautious') || lower.includes('neutral')) {
    return { bg: 'rgba(234,179,8,0.12)', text: '#fbbf24', border: 'rgba(234,179,8,0.3)' };
  }
  return { bg: 'rgba(34,197,94,0.12)', text: '#4ade80', border: 'rgba(34,197,94,0.3)' };
}

// ─── Pulse keyframe (inline) ──────────────────────────────────────

const PULSE_STYLE = `
@keyframes caelyn-pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
@keyframes caelyn-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
.caelyn-pulse { animation: caelyn-pulse 1.8s ease-in-out infinite; }
.caelyn-spin  { animation: caelyn-spin  1s linear infinite; }
`;

// ─── Weekly Summary Skeleton ──────────────────────────────────────

function SkeletonBar({ w, h = 12, mb = 0 }: { w: string; h?: number; mb?: number }) {
  return (
    <div className="caelyn-pulse" style={{
      width: w, height: h, borderRadius: 5,
      background: 'rgba(255,255,255,0.06)',
      marginBottom: mb,
    }} />
  );
}

function WeeklySummarySkeleton() {
  return (
    <div style={{
      padding: '24px 28px', borderRadius: 14,
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <SkeletonBar w="200px" h={10} />
        <SkeletonBar w="130px" h={22} />
      </div>
      <SkeletonBar w="65%" h={26} mb={14} />
      <SkeletonBar w="100%" h={13} mb={7} />
      <SkeletonBar w="88%" h={13} mb={7} />
      <SkeletonBar w="72%" h={13} mb={22} />
      <SkeletonBar w="240px" h={14} mb={16} />
      {[1,2,3].map(i => (
        <div key={i} style={{ paddingBottom: 12, marginBottom: 2 }}>
          <SkeletonBar w="60px" h={11} mb={6} />
          <SkeletonBar w="100%" h={12} mb={4} />
          <SkeletonBar w="82%" h={12} />
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
        <Loader2 className="caelyn-spin" style={{ width: 13, height: 13 }} />
        Caelyn is writing the weekly summary — this takes 10–20 seconds…
      </div>
    </div>
  );
}

// ─── Weekly Summary Component ─────────────────────────────────────

function WeeklySummary() {
  const { data, isLoading, isError } = useQuery<WeeklySummaryData>({
    queryKey: ['notifai-weekly-summary'],
    queryFn: async () => {
      const res = await fetch('/api/notifai/weekly-summary', { headers: proxyHeaders() });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    staleTime: 10 * 60_000,
    retry: 1,
  });

  if (isLoading) return <WeeklySummarySkeleton />;

  if (isError || !data) {
    return (
      <div style={{
        padding: '20px 24px', borderRadius: 14,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center',
      }}>
        Weekly summary generating — check back in a moment.
      </div>
    );
  }

  const oc = outlookColor(data.outlook_label);

  return (
    <div style={{
      padding: '24px 28px', borderRadius: 14,
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
          CAELYN AI · {data.week_label}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 999,
          background: oc.bg, color: oc.text, border: `1px solid ${oc.border}`,
        }}>
          {data.outlook_label}
        </span>
      </div>

      {/* Headline */}
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 12px', lineHeight: 1.3 }}>
        {data.headline}
      </h2>

      {/* Opening paragraph */}
      <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 20px' }}>
        {data.summary}
      </p>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 0 16px' }} />

      {/* Sub-header */}
      <p style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.75)', margin: '0 0 14px' }}>
        {data.sub_label}
      </p>

      {/* Day-by-day */}
      <div>
        {data.days.map((d, i) => (
          <div key={d.day} style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            paddingTop: i === 0 ? 0 : 11, paddingBottom: 11,
            borderBottom: i < data.days.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#5cc8f0',
              minWidth: 60, flexShrink: 0, paddingTop: 2,
            }}>
              {d.day}
            </span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>
              {d.text}
            </span>
          </div>
        ))}
      </div>

      {/* Closing note */}
      {data.closing_note && (
        <p style={{ fontSize: 12.5, fontStyle: 'italic', color: 'rgba(255,255,255,0.35)', margin: '14px 0 0', lineHeight: 1.55 }}>
          {data.closing_note}
        </p>
      )}

      {/* Timestamp */}
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: '10px 0 0' }}>
        Generated {formatGeneratedAt(data.generated_at)}
      </p>
    </div>
  );
}

// ─── The Brief Component ──────────────────────────────────────────

function TheBrief() {
  const { data, isLoading: loading } = useQuery<TheBriefData>({
    queryKey: ['notifai-the-brief'],
    queryFn: async () => {
      const res = await fetch('/api/notifai/the-brief', { headers: proxyHeaders() });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const sortedEarningsEntries = data
    ? Object.entries(data.earnings_by_day).sort(([a], [b]) => a.localeCompare(b))
    : [];

  const hasEarnings = sortedEarningsEntries.length > 0;

  return (
    <div style={{
      padding: '22px 28px', borderRadius: 14,
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' }}>
          The Brief
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
      </div>

      <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.38)', margin: '0 0 20px', lineHeight: 1.55 }}>
        Need a concise summary of what's going on this week? Look no further. Here's a summary of this week's earnings and economic data.
      </p>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Loader2 className="caelyn-spin" style={{ width: 13, height: 13 }} />
          Loading weekly brief…
        </div>
      ) : !data ? (
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Unable to load weekly brief.</div>
      ) : (
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>

          {/* Earnings This Week */}
          <div style={{ flex: '1 1 280px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <TrendingUp style={{ width: 13, height: 13, color: '#5cc8f0', flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                Earnings This Week
              </span>
            </div>

            {!hasEarnings ? (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>No earnings reported this week.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {sortedEarningsEntries.map(([date, slots]) => (
                  <div key={date}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#5cc8f0', display: 'block', marginBottom: 7 }}>
                      {dateToAbbr(date)}
                    </span>

                    {slots.bmo && slots.bmo.length > 0 && (
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
                          Pre-Market
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {slots.bmo.map(t => (
                            <span key={t.ticker} style={{
                              fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                              background: 'rgba(92,200,240,0.07)', border: '1px solid rgba(92,200,240,0.18)',
                              color: 'rgba(255,255,255,0.7)',
                            }}>
                              ${t.ticker}
                              {t.eps_estimate != null && (
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, marginLeft: 3 }}>
                                  {t.eps_estimate > 0 ? '+' : ''}{t.eps_estimate}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {slots.amc && slots.amc.length > 0 && (
                      <div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
                          After-Hours
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {slots.amc.map(t => (
                            <span key={t.ticker} style={{
                              fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
                              color: 'rgba(255,255,255,0.65)',
                            }}>
                              ${t.ticker}
                              {t.eps_estimate != null && (
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, marginLeft: 3 }}>
                                  {t.eps_estimate > 0 ? '+' : ''}{t.eps_estimate}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Economic Calendar */}
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <CalendarDays style={{ width: 13, height: 13, color: '#5cc8f0', flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                Economic Calendar
              </span>
            </div>

            {data.economic_events.length === 0 ? (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>No major economic events this week.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {data.economic_events.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontSize: 10, color: '#5cc8f0', fontWeight: 600, flexShrink: 0, minWidth: 100 }}>
                      {dateToAbbr(ev.date)} {ev.time}
                    </span>
                    <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                      {ev.event}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ─── News Feed Component ──────────────────────────────────────────

function NewsFeed() {
  const [category, setCategory] = useState<Category>('finance');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchNews = useCallback(async (cat: Category) => {
    setLoading(true);
    setError('');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const url = `/api/proxy/news/feed?category=${cat}`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = await res.json();
      const arts = data.articles || [];
      setArticles(arts);
      if (arts.length === 0) setError('No articles found. News sources may be loading — try refreshing.');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError('Failed to load news. Please try again.');
      }
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews(category);
  }, [category, fetchNews]);

  return (
    <div>
      {/* Category Tabs */}
      <div className="flex items-center gap-2 mb-5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className="px-4 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all"
            style={{
              background: category === cat.id ? 'rgba(92,200,240,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${category === cat.id ? 'rgba(92,200,240,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: category === cat.id ? '#5cc8f0' : 'rgba(255,255,255,0.4)',
            }}
          >
            {cat.label}
          </button>
        ))}
        <button
          onClick={() => fetchNews(category)}
          disabled={loading}
          className="ml-auto p-2 rounded-lg transition-all hover:bg-white/[0.05]"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && <div className="text-center py-8 text-white/40 text-sm">{error}</div>}

      {loading && articles.length === 0 && (
        <div className="flex items-center justify-center py-12 gap-2 text-white/30 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading {category} news...
        </div>
      )}

      {!loading && articles.length === 0 && !error && (
        <div className="text-center py-12 text-white/30 text-sm">
          No articles found for this category.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {articles.map((article, i) => (
          <NewsCard key={`${article.title}-${i}`} article={article} />
        ))}
      </div>
    </div>
  );
}

// ─── News Card ────────────────────────────────────────────────────

function NewsCard({ article }: { article: NewsArticle }) {
  const [imgError, setImgError] = useState(false);
  const domain = extractDomain(article.url);
  const timeStr = formatTime(article.published);

  return (
    <div
      className="group rounded-xl overflow-hidden transition-all duration-200 hover:border-white/[0.12] cursor-pointer"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      onClick={() => article.url && openSecureLink(article.url)}
    >
      {article.image && !imgError ? (
        <div className="relative h-40 overflow-hidden">
          <img
            src={article.image}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(5,6,8,0.8) 0%, transparent 60%)' }} />
          {article.symbol && (
            <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded"
              style={{ background: 'rgba(92,200,240,0.2)', color: '#5cc8f0', border: '1px solid rgba(92,200,240,0.3)' }}>
              ${article.symbol}
            </span>
          )}
        </div>
      ) : (
        <div className="h-28 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.015)' }}>
          <Newspaper className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.06)' }} />
        </div>
      )}

      <div className="p-4">
        <h3 className="text-sm font-semibold text-white/90 leading-snug mb-2 line-clamp-2 group-hover:text-white transition-colors">
          {article.title}
        </h3>
        {article.description && (
          <p className="text-xs text-white/35 leading-relaxed mb-3 line-clamp-2">
            {article.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-white/25">
            {domain && <span>{domain}</span>}
            {timeStr && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {timeStr}
                </span>
              </>
            )}
          </div>
          <span className="text-[10px] text-white/25 group-hover:text-[#5cc8f0] transition-colors flex items-center gap-1">
            Read <ExternalLink className="w-2.5 h-2.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Top Stories (TradingView Timeline) ──────────────────────────

const TopStoriesWidget = memo(function TopStoriesWidget() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      displayMode: 'regular',
      feedMode: 'market',
      colorTheme: 'dark',
      isTransparent: false,
      locale: 'en',
      market: 'stock',
      width: '100%',
      height: '100%',
    });
    container.current.appendChild(script);
  }, []);
  return (
    <div ref={container} className="tradingview-widget-container" style={{ width: '100%', height: '100%' }}>
      <div className="tradingview-widget-container__widget" style={{ width: '100%', height: '100%' }} />
    </div>
  );
});

// ─── News Intelligence Agent ──────────────────────────────────────

function NewsAgent() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: AgentMessage = { role: 'user', content: text.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const payload: Record<string, unknown> = {
        query: text.trim(),
        preset_intent: 'news_intelligence',
        history: history.length > 0 ? history : undefined,
        conversation_id: conversationId,
      };

      const res = await fetch(`${AGENT_BACKEND_URL}/api/query`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Backend returned ${res.status}: ${errText.slice(0, 200)}`);
      }

      const rawText = (await res.text()).trim();
      const data = JSON.parse(rawText);
      const convId = data.conversation_id || conversationId;
      if (convId) setConversationId(convId);

      let analysisText = '';
      if (data.analysis) analysisText = data.analysis;
      else if (data.structured?.message) analysisText = data.structured.message;
      else if (data.structured?.analysis) analysisText = data.structured.analysis;
      else if (typeof data.message === 'string') analysisText = data.message;
      else analysisText = 'Received response but could not extract analysis.';

      setMessages((prev) => [...prev, { role: 'assistant', content: analysisText, timestamp: Date.now() }]);
      fetch(`${AGENT_BACKEND_URL}/api/history`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ category: 'news_intelligence', intent: 'news_intelligence', content: analysisText }),
      }).catch(() => {});
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Failed to reach agent.'}`, timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, conversationId]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  return (
    <div style={{ width: '100%' }}>
      <div className="rounded-xl p-5" style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 16px rgba(0,0,0,0.3)',
      }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2090d0, #5cc8f0, #80d8f8)' }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Ask Caelyn</h2>
            <p className="text-[10px] text-white/25">News impact analysis &amp; market implications</p>
          </div>
        </div>

        {messages.length === 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {NEWS_SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                className="text-left text-[11px] text-white/45 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 hover:bg-white/[0.06] hover:text-white/65 hover:border-white/10 transition-all disabled:opacity-40"
              >
                <MessageSquare className="w-3 h-3 inline mr-1.5 opacity-40" />
                {prompt}
              </button>
            ))}
          </div>
        )}

        {messages.length > 0 && (
          <div className="mb-4 max-h-[500px] overflow-y-auto space-y-3 scrollbar-hide">
            {messages.map((msg, i) => (
              <div key={i} className={`rounded-lg px-3.5 py-3 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[rgba(32,144,208,0.1)] border border-[rgba(32,144,208,0.2)] text-blue-100'
                  : 'bg-white/[0.03] border border-white/[0.06] text-white/80'
              }`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${msg.role === 'user' ? 'text-[#5cc8f0]' : 'text-[#80d8f8]'}`}>
                    {msg.role === 'user' ? 'You' : 'Caelyn'}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="rounded-lg px-3.5 py-3 bg-white/[0.03] border border-white/[0.06] text-xs text-white/40">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Analyzing current news and market implications...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about news impact on markets..."
            disabled={loading}
            rows={1}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/25 resize-none focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 disabled:opacity-40 transition-all"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="text-white px-3 py-2 rounded-lg transition-all disabled:opacity-30 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2090d0, #5cc8f0, #80d8f8)' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>

        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setConversationId(null); }}
            className="mt-2 text-[9px] text-white/20 hover:text-white/40 transition-colors"
          >
            Clear conversation
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function NotifAIPage() {
  return (
    <div
      className="text-white"
      style={{
        minHeight: '100vh',
        background: '#050608',
        fontFamily: "'Outfit', sans-serif",
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        ${PULSE_STYLE}
      `}</style>

      {/* Background gradient */}
      <div style={{
        position: 'fixed', top: '-40%', left: '-20%', width: '140%', height: '140%',
        background: 'radial-gradient(ellipse 800px 600px at 20% 15%, rgba(32,144,208,0.04) 0%, transparent 70%), radial-gradient(ellipse 600px 500px at 80% 70%, rgba(92,200,240,0.03) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '1.25rem 2rem 2rem' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #2090d0, #5cc8f0)', boxShadow: '0 0 20px rgba(92,200,240,0.2)',
          }}>
            <Newspaper className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 style={{
              fontSize: '1.5rem', fontWeight: 700,
              background: 'linear-gradient(135deg, #e2e8f0, #5cc8f0)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              margin: 0,
            }}>NotifAI</h1>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>Real-time market news intelligence</p>
          </div>
        </div>
        <div style={{
          width: 96, height: 2, borderRadius: 9999, margin: '10px 0 20px',
          background: 'linear-gradient(135deg, #2090d0, #5cc8f0, #80d8f8)',
        }} />

        {/* ── Existing: 2-column news layout ── */}
        <div style={{ display: 'flex', gap: 24, marginTop: 24, alignItems: 'flex-start' }}>

          {/* Left: NewsFeed */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <NewsFeed />
          </div>

          {/* Right: Ask Caelyn + Top Stories */}
          <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <NewsAgent />
            <div style={{
              height: 600, flexShrink: 0, borderRadius: 12, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.5)' }}>
                  TOP STORIES
                </span>
              </div>
              <div style={{ height: 561 }}>
                <TopStoriesWidget />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
