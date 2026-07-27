/** Stable contract for GET /api/watchlist/ticker-detail/:symbol.
 *
 * The backend owns earnings eligibility.  UI availability must never be
 * inferred from a missing optional earnings subsection.
 */
export interface CompanyProfile {
  symbol?: string | null;
  company_name?: string | null;
  name?: string | null;
  sector?: string | null;
  industry?: string | null;
  market_cap?: number | null;
  country?: string | null;
  beta?: number | null;
  ceo?: string | null;
  ceo_name?: string | null;
  employees?: number | null;
  exchange?: string | null;
  website?: string | null;
  description?: string | null;
  [key: string]: any;
}

export interface EarningsEligibility {
  eligible?: boolean | null;
  supported?: boolean | null;
  security_type?: string | null;
  reason?: string | null;
}

export interface TickerDetailResponse {
  symbol?: string;
  company?: CompanyProfile | null;
  earnings_intelligence?: unknown | null;
  /** Current backend contract; false means this security is explicitly unsupported. */
  earnings_eligible?: boolean | null;
  earnings_eligibility?: EarningsEligibility | null;
  security_type?: string | null;
  [key: string]: any;
}

/** Only an explicit backend exclusion hides the tab. Missing data is not an exclusion. */
export function isEarningsSupported(detail: TickerDetailResponse | null | undefined): boolean {
  if (!detail) return true;
  if (detail.earnings_eligible === false) return false;
  const eligibility = detail.earnings_eligibility;
  return eligibility?.eligible !== false && eligibility?.supported !== false;
}

export function hasCompanyProfile(detail: TickerDetailResponse | null | undefined): boolean {
  return detail?.company != null;
}
