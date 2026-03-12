export interface HistoryEntry {
  id: string;
  timestamp: number;
  content: string;
  display_type: string | null;
  query?: string;
  model_used?: string;
  tickers?: { ticker: string; rec_price: number | null; current_price?: number | null; pct_change?: number | null }[];
  conversation?: { role: string; content: string }[];
}

export interface HistoryBucket {
  category: string;
  intent: string;
  entries: HistoryEntry[];
}

export interface NormalizedHistoryEntry extends HistoryEntry {
  key: string;
  category: string;
  intent: string;
}

export type HistoryApiResponse = Record<string, Partial<HistoryBucket> | null | undefined>;

function toSafeTimestamp(input: unknown): number {
  const n = typeof input === 'number' ? input : Number(input);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeHistoryBuckets(apiData: unknown): Record<string, HistoryBucket> {
  const source = (apiData && typeof apiData === 'object') ? (apiData as HistoryApiResponse) : {};
  const out: Record<string, HistoryBucket> = {};

  for (const [rawKey, rawBucket] of Object.entries(source)) {
    if (!rawBucket || typeof rawBucket !== 'object') continue;

    const key = String(rawKey || 'unknown::unknown');
    const [keyCategory, keyIntent] = key.split('::');
    const category = String(rawBucket.category || keyCategory || 'unknown');
    const intent = String(rawBucket.intent || keyIntent || 'unknown');

    const entriesSource = Array.isArray(rawBucket.entries) ? rawBucket.entries : [];
    const entries: HistoryEntry[] = entriesSource
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
      .map((entry) => ({
        id: String(entry.id || `${category}-${intent}-${toSafeTimestamp(entry.timestamp)}`),
        timestamp: toSafeTimestamp(entry.timestamp),
        content: typeof entry.content === 'string' ? entry.content : '',
        display_type: entry.display_type == null ? null : String(entry.display_type),
        query: typeof entry.query === 'string' ? entry.query : undefined,
        model_used: typeof entry.model_used === 'string' ? entry.model_used : undefined,
        tickers: Array.isArray(entry.tickers) ? entry.tickers as any : undefined,
        conversation: Array.isArray(entry.conversation) ? entry.conversation as any : undefined,
      }))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    out[`${category}::${intent}`] = { category, intent, entries };
  }

  return out;
}

export function normalizeHistory(apiData: unknown): NormalizedHistoryEntry[] {
  const buckets = normalizeHistoryBuckets(apiData);
  const flat: NormalizedHistoryEntry[] = [];

  for (const [key, bucket] of Object.entries(buckets)) {
    for (const entry of bucket.entries) {
      flat.push({ ...entry, key, category: bucket.category, intent: bucket.intent });
    }
  }

  return flat.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}
