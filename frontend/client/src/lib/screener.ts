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
  const token = localStorage.getItem('caelyn_jwt') || sessionStorage.getItem('caelyn_jwt');
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

export async function fetchAnchorRows(anchorKey: string): Promise<ScreenerSnapshot> {
  const path = `/api/bottlenecks/anchor/${encodeURIComponent(anchorKey)}`;
  const res = await fetch(path, { headers: screenerHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} — ${body.slice(0, 120)}`);
  }
  const data = await parseJsonSafely<any>(res, path);
  /* Log the response shape so we can confirm which key holds the rows */
  const d = data as any;
  const rowCount = (
    d.rows?.length       ??
    d.entries?.length    ??
    d.results?.length    ??
    d.ranked_list?.length??
    d.candidates?.length ??
    d.bottlenecks?.length??
    d.nodes?.length      ??
    d.tickers?.length    ??
    d.items?.length      ??
    d.data?.length       ??
    '?'
  );
  console.log(`[screener] anchor/${anchorKey} → top-level keys:`, Object.keys(d).join(', '), '| row count:', rowCount);
  return data as ScreenerSnapshot;
}

export async function fetchMultiAnchorScreener(params: { min_anchors?: number; limit?: number; min_score?: number } = {}): Promise<any> {
  const p = new URLSearchParams();
  if (params.min_anchors) p.set('min_anchors', String(params.min_anchors));
  if (params.limit)       p.set('limit',       String(params.limit));
  if (params.min_score)   p.set('min_score',   String(params.min_score));
  const path = `/api/bottlenecks/multi-anchor-screener${p.toString() ? `?${p}` : ''}`;
  const res = await fetch(path, { headers: screenerHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} — ${body.slice(0, 120)}`);
  }
  const data = await parseJsonSafely<any>(res, path);
  console.log('[screener] multi-anchor-screener → items:', data.items?.length, '| count:', data.count);
  return data;
}

export async function fetchAnchorList(): Promise<any> {
  const path = '/api/bottlenecks/anchors';
  const res = await fetch(path, { headers: screenerHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} — ${body.slice(0, 120)}`);
  }
  return parseJsonSafely<any>(res, path);
}

export async function fetchAnchorTickerDetail(anchorKey: string, ticker: string): Promise<any> {
  const path = `/api/bottlenecks/anchor/${encodeURIComponent(anchorKey)}/ticker/${encodeURIComponent(ticker)}`;
  const res = await fetch(path, { headers: screenerHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} — ${body.slice(0, 120)}`);
  }
  return parseJsonSafely<any>(res, path);
}

export async function fetchAnchorOverlap(): Promise<any> {
  const path = '/api/bottlenecks/anchor-overlap';
  const res = await fetch(path, { headers: screenerHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} — ${body.slice(0, 120)}`);
  }
  return parseJsonSafely<any>(res, path);
}

export async function createManualNode(payload: Record<string, unknown>): Promise<any> {
  const path = '/api/admin/bottlenecks/manual-node';
  const res = await fetch(path, {
    method: 'POST',
    headers: screenerHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} — ${body.slice(0, 120)}`);
  }
  return parseJsonSafely<any>(res, path);
}

export async function putManualNode(id: string, payload: Record<string, unknown>): Promise<any> {
  const path = `/api/admin/bottlenecks/manual-node/${encodeURIComponent(id)}`;
  const res = await fetch(path, {
    method: 'PUT',
    headers: screenerHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} — ${body.slice(0, 120)}`);
  }
  return parseJsonSafely<any>(res, path);
}

export async function deleteManualNode(id: string): Promise<any> {
  const path = `/api/admin/bottlenecks/manual-node/${encodeURIComponent(id)}`;
  const res = await fetch(path, { method: 'DELETE', headers: screenerHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} — ${body.slice(0, 120)}`);
  }
  return parseJsonSafely<any>(res, path);
}
