import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function usePortfolioMigration() {
  const queryClient = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = localStorage.getItem('caelyn_token') || sessionStorage.getItem('caelyn_token');
    if (!token) return;

    (async () => {
      // ── Step 1: load local holdings (source of truth) ──────────────────────
      const localRes = await fetch('/api/stock-holdings');
      const localHoldings: any[] = localRes.ok ? await localRes.json() : [];
      const localSymbols = localHoldings.map(h => (h.ticker || h.symbol || '').toUpperCase()).sort();

      console.log('[portfolio-source-truth]', JSON.stringify({
        source:          '/api/stock-holdings (frontend/data/stock-holdings.json)',
        dashboardCount:  localHoldings.length,
        dashboardSymbols: localSymbols,
      }));

      if (localHoldings.length === 0) return;

      // ── Step 2: prove FastAPI target ───────────────────────────────────────
      let isFastAPI = false;
      try {
        const pingRes  = await fetch('/api/portfolio/ping');
        const pingData = pingRes.ok ? await pingRes.json() : null;
        isFastAPI = pingData?.isFastAPI === true;
        console.log('[portfolio-fastapi-target]', JSON.stringify({
          pingUrl:      pingData?.pingUrl ?? '/api/portfolio/ping',
          pingStatus:   pingRes.status,
          pingResponse: pingData?.pingResponse ?? null,
          isFastAPI,
        }));
      } catch (err: any) {
        console.warn('[portfolio-fastapi-target] ping error:', err?.message);
      }

      // ── Step 3: check canonical backend count ─────────────────────────────
      let canonicalHoldings: any[] = [];
      try {
        const canonRes = await fetch('/api/portfolio/holdings', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const canonRaw = canonRes.ok ? await canonRes.json() : null;
        canonicalHoldings = Array.isArray(canonRaw)
          ? canonRaw
          : Array.isArray(canonRaw?.holdings) ? canonRaw.holdings : [];
      } catch { /* non-fatal */ }

      const canonicalSymbols = canonicalHoldings.map(h => (h.ticker || h.symbol || '').toUpperCase()).sort();
      const shouldSync = localHoldings.length > canonicalHoldings.length
        || JSON.stringify(localSymbols) !== JSON.stringify(canonicalSymbols);

      if (!shouldSync) {
        console.log('[portfolio-sync-to-fastapi]', JSON.stringify({
          localCount:       localHoldings.length,
          localSymbols,
          syncUrl:          '/api/portfolio/sync',
          postStatus:       null,
          postResponse:     'skipped — already in sync',
          canonicalCount:   canonicalHoldings.length,
          canonicalSymbols,
          success:          true,
        }));
        return;
      }

      // ── Step 4: sync local → FastAPI via POST /api/portfolio/sync ─────────
      const syncLog: Record<string, any> = {
        localCount:       localHoldings.length,
        localSymbols,
        syncUrl:          '/api/portfolio/sync',
        postStatus:       null,
        postResponse:     null,
        canonicalCount:   null,
        canonicalSymbols: null,
        success:          false,
      };

      try {
        const syncRes = await fetch('/api/portfolio/sync', {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ holdings: localHoldings }),
        });

        syncLog.postStatus = syncRes.status;

        if (syncRes.ok) {
          const syncData = await syncRes.json();
          syncLog.postResponse     = syncData;
          syncLog.canonicalCount   = syncData.canonical_count ?? localHoldings.length;
          syncLog.canonicalSymbols = syncData.canonical_symbols ?? localSymbols;
          syncLog.success          = syncData.success === true || syncData.synced === true;

          // Invalidate so Terminal and Holdings refetch with new canonical
          queryClient.invalidateQueries({ queryKey: ['caelyn-terminal'] });
          queryClient.invalidateQueries({ queryKey: ['portfolio-holdings'] });
          queryClient.invalidateQueries({ queryKey: ['stock-holdings'] });
        } else {
          const errTxt = await syncRes.text().catch(() => '');
          syncLog.postResponse = errTxt.slice(0, 200);
          syncLog.success      = false;
        }
      } catch (err: any) {
        syncLog.postResponse = err?.message;
        syncLog.success      = false;
        console.warn('[portfolio-sync-to-fastapi] sync error:', err?.message);
      }

      console.log('[portfolio-sync-to-fastapi]', JSON.stringify(syncLog));
    })();
  }, [queryClient]);
}
