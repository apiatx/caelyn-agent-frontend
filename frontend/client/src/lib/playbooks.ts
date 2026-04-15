import type {
  PlaybookSummary,
  WatchlistPlaybookResponse,
  PortfolioPlaybookResponse,
  PlaybookAnalyzeRequest,
  PlaybookAnalyzeResponse,
  PlaybookDiscoverRequest,
  PlaybookDiscoverResponse,
  SupplyChainMapRequest,
  SupplyChainMapResponse,
  PlaybookDiscoveryCapabilities,
  PlaybookCompareRequest,
  PlaybookCompareResponse,
} from "@/types/playbook";

const AGENT_KEY = "hippo_ak_7f3x9k2m4p8q1w5t";

function proxyHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", "X-API-Key": AGENT_KEY };
  const token = localStorage.getItem("caelyn_token") || sessionStorage.getItem("caelyn_token");
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export async function fetchPlaybooks(): Promise<PlaybookSummary[]> {
  const res = await fetch("/api/playbooks", { headers: proxyHeaders() });
  if (!res.ok) throw new Error(`Playbooks fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchDiscoveryCapabilities(): Promise<PlaybookDiscoveryCapabilities> {
  const res = await fetch("/api/playbooks/discovery-capabilities", { headers: proxyHeaders() });
  if (!res.ok) throw new Error(`discovery-capabilities failed: ${res.status}`);
  return res.json();
}

export async function scoreWatchlist(
  playbookId: string,
  tickers: string[]
): Promise<WatchlistPlaybookResponse> {
  const res = await fetch("/api/playbooks/score-watchlist", {
    method: "POST",
    headers: proxyHeaders(),
    body: JSON.stringify({ playbook_id: playbookId, tickers }),
  });
  if (!res.ok) throw new Error(`score-watchlist failed: ${res.status}`);
  return res.json();
}

export async function scorePortfolio(
  playbookId: string,
  holdings: { ticker: string; weight?: number }[]
): Promise<PortfolioPlaybookResponse> {
  const res = await fetch("/api/playbooks/score-portfolio", {
    method: "POST",
    headers: proxyHeaders(),
    body: JSON.stringify({ playbook_id: playbookId, holdings }),
  });
  if (!res.ok) throw new Error(`score-portfolio failed: ${res.status}`);
  return res.json();
}

export async function analyzePlaybook(
  req: PlaybookAnalyzeRequest
): Promise<PlaybookAnalyzeResponse> {
  const res = await fetch("/api/playbooks/analyze", {
    method: "POST",
    headers: proxyHeaders(),
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`playbooks/analyze failed: ${res.status}`);
  return res.json();
}

export async function discoverPlaybook(
  req: PlaybookDiscoverRequest
): Promise<PlaybookDiscoverResponse> {
  const res = await fetch("/api/playbooks/discover", {
    method: "POST",
    headers: proxyHeaders(),
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`playbooks/discover failed: ${res.status}`);
  return res.json();
}

export async function supplyChainMap(
  req: SupplyChainMapRequest
): Promise<SupplyChainMapResponse> {
  const res = await fetch("/api/playbooks/supply-chain-map", {
    method: "POST",
    headers: proxyHeaders(),
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`playbooks/supply-chain-map failed: ${res.status}`);
  return res.json();
}

export async function comparePlaybook(
  req: PlaybookCompareRequest
): Promise<PlaybookCompareResponse> {
  const res = await fetch("/api/playbooks/compare", {
    method: "POST",
    headers: proxyHeaders(),
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`playbooks/compare failed: ${res.status}`);
  return res.json();
}
