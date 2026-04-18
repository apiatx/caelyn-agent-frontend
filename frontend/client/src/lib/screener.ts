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

export async function fetchLatestSnapshot(): Promise<ScreenerSnapshot> {
  const res = await fetch('/api/strategy-screener/latest', { headers: screenerHeaders() });
  if (!res.ok) throw new Error(`strategy-screener/latest failed: ${res.status}`);
  return res.json();
}

export async function fetchReport(snapshotId: string, ticker: string): Promise<ScreenerReport> {
  const res = await fetch(`/api/strategy-screener/report/${encodeURIComponent(snapshotId)}/${encodeURIComponent(ticker)}`, {
    headers: screenerHeaders(),
  });
  if (!res.ok) throw new Error(`strategy-screener/report failed: ${res.status}`);
  return res.json();
}

export async function refreshSnapshot(): Promise<ScreenerRefreshResponse> {
  const res = await fetch('/api/strategy-screener/refresh', {
    method: 'POST',
    headers: screenerHeaders(),
  });
  if (!res.ok) throw new Error(`strategy-screener/refresh failed: ${res.status}`);
  return res.json();
}

export async function fetchScreenerConfig(): Promise<ScreenerConfig> {
  const res = await fetch('/api/strategy-screener/config', { headers: screenerHeaders() });
  if (!res.ok) throw new Error(`strategy-screener/config failed: ${res.status}`);
  return res.json();
}
