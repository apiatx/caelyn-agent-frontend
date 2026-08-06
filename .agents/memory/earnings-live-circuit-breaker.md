---
name: EarningsLive circuit breaker
description: /api/earnings/live-events is permanently down (always 502). Circuit breaker added to EarningsLiveContext to prevent backend capacity drain.
---

## Rule

`EarningsLiveContext` must not poll `/api/earnings/live-events` without a circuit breaker. The endpoint is served by an external FastAPI process that is reliably offline, returning 502 after 10 s every time.

**Why:** Without a circuit breaker, `retry: 1` + `POLL_MS=25s` caused two 10-second backend connections every 50 seconds — ~40% of backend capacity — which delayed all other endpoints (Home dashboard: 18 → observed delays; Watchlist list: 1 s → 27 s under contention).

## How to apply

The circuit breaker in `EarningsLiveContext.tsx` (as of commit 595c3265):
- `CIRCUIT_TRIPS = 3` consecutive failures → `setPollEnabled(false)`
- `CIRCUIT_RESET_MS = 10 * 60_000` (10 min) → auto-resets via `setTimeout`
- `retry: 0` (no immediate retry on 5xx)
- `refetchOnWindowFocus: false` (tab focus must not bypass the circuit)
- `circuitQueryFn` is a stable `useCallback(fn, [])` to avoid React Query key invalidation

If someone edits `EarningsLiveContext.tsx` in the future:
- Do NOT reintroduce `retry: 1` or `retryDelay` without also adding backoff
- Do NOT change `refetchOnWindowFocus` back to `true`
- The `pollEnabled` state + `consecutiveFailsRef` pair are the circuit breaker; both must remain

## Test coverage

`frontend/client/src/contexts/__tests__/earnings-live-circuit-breaker.test.ts` — 15 source-pattern tests covering all the above constraints. Run with:
```
cd frontend && node --import tsx/esm --test client/src/contexts/__tests__/earnings-live-circuit-breaker.test.ts
```
