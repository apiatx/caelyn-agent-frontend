---
name: CORS caelyn.ai production domain
description: The caelyn.ai origin must be in the CORS allowlist; browsers send Origin header on same-origin POSTs causing 500s in production mode.
---

# CORS — caelyn.ai production domain

## Rule
`corsConfig()` in `frontend/server/security/middleware.ts` has a hardcoded origin allowlist. In `NODE_ENV=production`, any origin not in the list gets `callback(new Error('Not allowed by CORS'))` → Express 500. `caelyn.ai` was absent from the list when the domain went live.

**Why:** Modern browsers send `Origin: https://caelyn.ai` on same-origin fetch POST requests (Chrome 84+, Firefox 90+). The CORS middleware sees the header even though it's a same-origin request. In dev mode all origins are allowed so Preview never revealed this.

**How to apply:** Whenever a new production domain is added to caelyn.ai (or any new custom domain), add `origin.includes('<domain>')` to the allowlist before the production block at ~line 474. Long-term fix: wire the dead-code `securityConfig.corsOrigins` from `environment.ts` into `corsConfig()` so domain changes are env-only.

## Evidence
- Preview login (NODE_ENV=development): HTTP 200 — all origins allowed
- caelyn.ai login (NODE_ENV=production, before fix): HTTP 500 `{"error":"An error occurred","message":"Internal server error"}`
- caelyn.ai login (NODE_ENV=production, after fix): HTTP 200, token issued

## Related dead code
`ALLOWED_ORIGINS` env var → `securityConfig.corsOrigins` in `environment.ts` is parsed but `corsConfig()` never reads it. Wiring it would let domain changes happen without source commits.

## Git
Fix committed: `c2b0079d fix: add caelyn.ai to production CORS allowlist`
File: `frontend/server/security/middleware.ts`
