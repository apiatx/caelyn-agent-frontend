import type {
  ScreenerConfig,
  ScreenerSnapshot,
  ScreenerReport,
  ScreenerRefreshResponse,
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
  const res = await fetch(path, { headers: screenerHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} — ${body.slice(0, 120)}`);
  }
  return parseJsonSafely<ScreenerSnapshot>(res, path);
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
  const path = '/api/strategy-screener/refresh';
  const res = await fetch(path, { method: 'POST', headers: screenerHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${path} failed: ${res.status} — ${body.slice(0, 120)}`);
  }
  return parseJsonSafely<ScreenerRefreshResponse>(res, path);
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
