import type { RealtimeQuote } from "@/hooks/useRealtimeQuotes";

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Overlay realtime price/change/volume fields onto an existing ticker record
 * without disturbing fundamentals (market cap, revenue, ratios, etc.).
 *
 * - Only price/last/change/change_percent/volume are overwritten, and only
 *   when the realtime quote provides a finite numeric value.
 * - Source/freshness metadata is attached so UI can render badges.
 */
export function mergeRealtimeQuote<T extends Record<string, any>>(
  existing: T | null | undefined,
  rt: RealtimeQuote | null | undefined
): T {
  const base: Record<string, any> = { ...(existing || {}) };
  if (!rt) return base as T;

  const livePrice = isFiniteNumber(rt.price)
    ? rt.price
    : isFiniteNumber(rt.last)
    ? rt.last
    : null;

  if (livePrice !== null) {
    base.price = livePrice;
    base.last = livePrice;
    // Common alternate field names used by various pages
    if ("current_price" in base || base.current_price !== undefined) {
      base.current_price = livePrice;
    } else {
      base.current_price = livePrice;
    }
  }

  if (isFiniteNumber(rt.change)) {
    base.change = rt.change;
  }

  if (isFiniteNumber(rt.change_percent)) {
    base.change_percent = rt.change_percent;
    base.change_pct = rt.change_percent;
    base.changePercent = rt.change_percent;
  }

  if (isFiniteNumber(rt.volume)) {
    base.volume = rt.volume;
  }

  if (isFiniteNumber(rt.high)) {
    base.high = rt.high;
  }

  if (isFiniteNumber(rt.low)) {
    base.low = rt.low;
  }

  // Always attach metadata so callers can render freshness badges.
  base.price_source = rt.source ?? base.price_source ?? "unknown";
  base.price_is_realtime = rt.is_realtime === true;
  base.price_is_live_backup = rt.is_live_backup === true;
  base.price_is_stale = rt.is_stale === true;
  base.price_updated_at = rt.updated_at ?? rt.quote_timestamp ?? base.price_updated_at ?? null;
  base.quote_timestamp = rt.quote_timestamp ?? base.quote_timestamp ?? null;
  base.staleness_seconds =
    typeof rt.staleness_seconds === "number" ? rt.staleness_seconds : base.staleness_seconds ?? null;
  if (rt.market_session) base.market_session = rt.market_session;

  return base as T;
}

export default mergeRealtimeQuote;
