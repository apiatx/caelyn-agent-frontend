import type {
  ScreenerConfig,
  ScreenerSnapshot,
  ScreenerReport,
  ScreenerRefreshResponse,
  BottlenecksCurrentResponse,
} from '@/types/screener';

const AGENT_KEY = 'hippo_ak_7f3x9k2m4p8q1w5t';

function screenerHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'X-API-Key': AGENT_KEY };
  const token = localStorage.getItem('caelyn_token') || sessionStorage.getItem('caelyn_token');
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function parseJsonSafely<T>(res: Response, path: string): Promise<T> {
  const ct = res.headers.get('content-type') || '';
  console.debug(`[screener] ${path} → status=${res.status} content-type="${ct}"`);
  if (!ct.includes('application/json')) {
    const preview = (await res.text()).slice(0, 200);
    console.error(`[screener] ${path} returned non-JSON (${ct}): ${preview}`);
    throw new Error(
      `Expected JSON from ${path}, got "${ct}" (status ${res.status}). ` +
      `Likely a proxy routing miss — server may need restart.`
    );
  }
  return res.json() as Promise<T>;
}

export interface ScreenerFilters {
  market_cap_bucket?: string;
  layer?: string;
  sort_by?: string;
  limit?: number;
}

export async function fetchLatestSnapshot(filters?: ScreenerFilters): Promise<ScreenerSnapshot> {
  const params = new URLSearchParams();
  if (filters?.market_cap_bucket) params.set('market_cap_bucket', filters.market_cap_bucket);
  if (filters?.layer) params.set('layer', filters.layer);
  if (filters?.sort_by) params.set('sort_by', filters.sort_by);
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  const path = `/api/strategy-screener/latest${qs ? `?${qs}` : ''}`;
  console.log('[screener] fetchLatestSnapshot → filters:', JSON.stringify(filters), '→ url:', path);
  const res = await fetch(path, { headers: screenerHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} — ${body.slice(0, 120)}`);
  }
  const data = await parseJsonSafely<ScreenerSnapshot>(res, path);
  console.log('[screener] response → entries:', (data as any).entries?.length ?? (data as any).ranked_list?.length ?? (data as any).results?.length ?? '?', '| filtered_result_count:', (data as any).filtered_result_count, '| available_result_count:', (data as any).available_result_count);
  return data;
}

export async function fetchReport(snapshotId: string, ticker: string): Promise<ScreenerReport> {
  const path = `/api/strategy-screener/report/${encodeURIComponent(snapshotId)}/${encodeURIComponent(ticker)}`;
  const res = await fetch(path, { headers: screenerHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} — ${body.slice(0, 120)}`);
  }
  return parseJsonSafely<ScreenerReport>(res, path);
}

export async function refreshSnapshot(): Promise<ScreenerRefreshResponse> {
  const path = '/api/admin/bottlenecks/refresh';
  const res = await fetch(path, { method: 'POST', headers: screenerHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Refresh failed: ${res.status} — ${body.slice(0, 120)}`);
  }
  return parseJsonSafely<ScreenerRefreshResponse>(res, path);
}

export async function fetchBottlenecksCurrent(params?: { limit?: number; full?: boolean; diagnostics?: boolean }): Promise<BottlenecksCurrentResponse> {
  const p = new URLSearchParams();
  if (params?.limit) p.set('limit', String(params.limit));
  if (params?.full) p.set('full', 'true');
  if (params?.diagnostics) p.set('diagnostics', 'true');
  const qs = p.toString();
  const path = `/api/bottlenecks/current${qs ? `?${qs}` : ''}`;
  console.log('[screener] fetchBottlenecksCurrent → url:', path);
  const res = await fetch(path, { headers: screenerHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} — ${body.slice(0, 120)}`);
  }
  const data = await parseJsonSafely<BottlenecksCurrentResponse>(res, path);
  console.log('[screener] bottlenecks/current → rows:', data.rows?.length, '| visible_count:', data.visible_count, '| themes:', data.themes_in_visible?.length);
  return data;
}

export async function fetchScreenerConfig(): Promise<ScreenerConfig> {
  const path = '/api/strategy-screener/config';
  const res = await fetch(path, { headers: screenerHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} — ${body.slice(0, 120)}`);
  }
  return parseJsonSafely<ScreenerConfig>(res, path);
}
