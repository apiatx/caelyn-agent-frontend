---
name: Alignment endpoint row shape
description: FastAPI /api/watchlist/:wid/alignment response shape and required confluenceRows flattening pattern
---

## Endpoint
`GET /api/watchlist/{wid}/alignment` → Express proxy at `/api/watchlist/:wid/alignment`

## Response shape
```json
{
  "watchlist_id": "...", "watchlist_name": "...", "row_count": 375,
  "snapshot_built_at": "...", "snapshot_stale": false, "rows": [...]
}
```

Each row uses **nested objects**, not flat fields:
- `actionability`: `{available, state, score, options_entry_conflict, setup_summary}`
- `trade_alignment`: `{available, score, archetype}`
- `investment_alignment`: `{available, score, state, unavailable_reason}`
- `entry`: `{available, state, score, grade}`
- `catalyst`: `{available, score, primary_event, rss_event, scheduled_event, bearish_conflict, v2_score, v2_primary_event, ...}`
- `theme`: `{id}` (may be `{id: null}` — NOT a renderable string)
- `options`: `{pressure_state, primary_signal}`
- `theme_policy`: null (field exists but is null currently)

`caelyn_confluence_score` and `caelyn_confluence_bucket` are null from backend (not yet computed).

## Required flattening (in confluenceRows useMemo in watchlist.tsx)
Must flatten all nested fields into flat shape for `caelyn-confluence.tsx` helpers. Also:
- **Never render `row.theme` directly** — it's an object `{id}`, not a string. Guard: `typeof row.theme === 'string' ? row.theme : (row.theme?.name ?? null)`
- **Derive `caelyn_confluence_bucket` from `actionability.state`** using full mapping:
  - READY/BUY → ACTIONABLE
  - WATCH/EARLY_WATCH → NEAR_ACTIONABLE
  - REVERSAL_WATCH → AT_SUPPORT
  - WAIT_FOR_RETEST/WAIT_FOR_BREAKOUT → WATCH_FOR_RESET
  - AVOID/SHORT_AVOID/TOO_EXTENDED → RISK_CONFLICT
  - NEUTRAL → NO_CLEAR_CONFLUENCE

## Actionability.state value counts (as of 2026-07-12, watchlist Primary, 375 rows)
AVOID:152, None:68, TOO_EXTENDED:57, WATCH:50, READY:18, WAIT_FOR_RETEST:14, REVERSAL_WATCH:9, WAIT_FOR_BREAKOUT:6, EARLY_WATCH:1

**Why:** caelyn-confluence.tsx helpers expect flat field names like `trade_alignment_score`, `investment_alignment_score`, `entry_risk_reward_state`, etc. The backend returns nested objects. The transform must bridge them.
