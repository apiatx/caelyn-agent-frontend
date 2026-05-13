import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function usePortfolioMigration() {
  const queryClient = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      // ── Step 1: Read local dashboard holdings ────────────────────────────
      const localRes = await fetch('/api/stock-holdings');
      const localHoldings: any[] = localRes.ok ? await localRes.json() : [];
      const localSymbols = localHoldings.map(h => (h.ticker || '').toUpperCase()).sort();

      console.log('[portfolio-dashboard-source]', JSON.stringify({
        dashboardCount:   localHoldings.length,
        dashboardSymbols: localSymbols,
        source:           '/api/stock-holdings (frontend/data/stock-holdings.json)',
      }));

      if (localHoldings.length === 0) return;

      // ── Step 2: Ping FastAPI (prove server=fastapi) ──────────────────────
      let isFastAPI = false;
      try {
        const pingRes  = await fetch('/api/portfolio/ping');
        const pingData = pingRes.ok ? await pingRes.json() : null;
        isFastAPI = pingData?.isFastAPI === true;
        console.log('[portfolio-fastapi-ping]', JSON.stringify({
          url:       pingData?.pingUrl ?? '/api/portfolio/ping',
          status:    pingRes.status,
          response:  pingData?.pingResponse ?? null,
          isFastAPI,
        }));
      } catch (err: any) {
        console.warn('[portfolio-fastapi-ping] error:', err?.message);
      }

      // ── Step 3: Get REAL FastAPI canonical count (no local masking) ───────
      let fastapiCount = 0;
      let fastapiSymbols: string[] = [];
      try {
        const canonRes  = await fetch('/api/portfolio/fastapi-canonical');
        const canonData = canonRes.ok ? await canonRes.json() : null;
        fastapiCount   = canonData?.count   ?? 0;
        fastapiSymbols = (canonData?.symbols ?? []).map((s: string) => s.toUpperCase()).sort();
      } catch { /* non-fatal */ }

      // ── Step 4: Compare and sync if needed ───────────────────────────────
      const localSorted  = localSymbols.join(',');
      const fapiSorted   = fastapiSymbols.join(',');
      const alreadyInSync = localSorted === fapiSorted && localHoldings.length === fastapiCount;

      if (alreadyInSync) {
        console.log('[portfolio-sync-write]', JSON.stringify({
          beforeBackendCount:   fastapiCount,
          beforeBackendSymbols: fastapiSymbols,
          dashboardCount:       localHoldings.length,
          dashboardSymbols:     localSymbols,
          postStatus:           null,
          postResponse:         'skipped — already in sync',
          afterBackendCount:    fastapiCount,
          afterBackendSymbols:  fastapiSymbols,
          success:              true,
        }));
        return;
      }

      // ── Step 5: POST local holdings to FastAPI /api/portfolio/sync ────────
      const syncLog: Record<string, any> = {
        beforeBackendCount:   fastapiCount,
        beforeBackendSymbols: fastapiSymbols,
        dashboardCount:       localHoldings.length,
        dashboardSymbols:     localSymbols,
        postStatus:           null,
        postResponse:         null,
        afterBackendCount:    null,
        afterBackendSymbols:  null,
        success:              false,
      };

      try {
        const syncRes = await fetch('/api/portfolio/sync', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ holdings: localHoldings }),
        });

        syncLog.postStatus = syncRes.status;

        if (syncRes.ok) {
          const syncData = await syncRes.json();
          syncLog.postResponse     = syncData;
          syncLog.afterBackendCount   = syncData.canonical_count ?? localHoldings.length;
          syncLog.afterBackendSymbols = (syncData.canonical_symbols ?? localSymbols).map((s: string) => s.toUpperCase()).sort();
          syncLog.success             = syncData.success === true || syncData.synced === true;

          // Invalidate so Terminal refetches with fresh FastAPI analytics
          queryClient.invalidateQueries({ queryKey: ['caelyn-terminal'] });
          queryClient.invalidateQueries({ queryKey: ['portfolio-holdings'] });
          queryClient.invalidateQueries({ queryKey: ['stock-holdings'] });

          console.log('[portfolio-terminal-gate]', JSON.stringify({
            dashboardSymbols: localSymbols,
            terminalSymbols:  localSymbols,
            backendSymbols:   syncLog.afterBackendSymbols,
            symbolsMatch:     syncLog.success,
            renderedState:    syncLog.success ? 'synced' : 'sync_failed',
          }));
        } else {
          const errTxt = await syncRes.text().catch(() => '');
          syncLog.postResponse = errTxt.slice(0, 200);
        }
      } catch (err: any) {
        syncLog.postResponse = err?.message;
        console.warn('[portfolio-sync-write] error:', err?.message);
      }

      console.log('[portfolio-sync-write]', JSON.stringify(syncLog));
    })();
  }, [queryClient]);
}
