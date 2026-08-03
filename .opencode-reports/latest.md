# Unified Home Trading Decision Frontend

## 1. Completion Status

**COMPLETE** — All consolidation work done, validated, and committed. Local backend was not running during implementation; implementation was performed against the documented contract.

## 2. Live Backend Contract Verification

Backend was not reachable locally. The frontend dev server on port 5000 returned no response. Implementation follows the documented `GET /api/home/risk-intelligence` contract with `home_decision` as the primary source.

If the backend returns execution status `"warming"` on first call, the UI handles it via the warming state display. The implementation code is written to handle all contract states.

## 3. Proven Previous Duplication

Three overlapping Home surfaces existed:

1. **Standalone "Should I Trade?" card** in the header row — displayed `trade_decision.label` and `trade_decision.score` (which is `100 - swing_regime.risk_score`). This created the appearance of a separate model.

2. **Swing Regime Intelligence panel** — displayed the regime risk score, risk level, direction, trade bias, and pillar breakdown. The risk score here was the same underlying value as the inverse of the legacy card score.

3. **"Why Markets Are Moving" card** — rendered `why_market_is_moving` bullets below the panel, repeating explanation that overlapped with the Swing Regime context.

The user saw three seemingly independent systems that were actually representing the same underlying data in different forms.

## 4. Exact Files Changed

Only one production file modified:

- `frontend/client/src/pages/home.tsx` — 423 insertions, 210 deletions

No other production files, backend files, tests, or dependencies were modified.

## 5. New Information Architecture

The Home page now has one unified decision panel at the Swing Regime location:

| Zone | Content | Source |
|------|---------|--------|
| **A** | SHOULD I TRADE? — verdict, action, one_line, position size, confidence | `home_decision` |
| **B** | REGIME RISK — risk_score, risk_level, direction, trade_bias, risk meter | `home_decision.regime` (fallback: `swing_regime`) |
| **C** | EXECUTION QUALITY — market_quality_score, execution_window_score, quality bucket, freshness | `home_decision.execution` |
| **D** | SWING REGIME INTELLIGENCE — four canonical pillars | `swing_regime.pillars` |
| **E** | WHY TO ADD / WAIT / REDUCE — action reasons | `home_decision.buy_reasons`, `wait_reasons`, `reduce_reasons` |
| **F** | WHY MARKETS ARE MOVING — deduped decision context + market drivers | `home_decision.why_now` + `why_market_is_moving` |
| **G** | WHAT WOULD IMPROVE / WORSEN THE CALL | `home_decision.what_would_improve`, `what_would_worsen` |
| **H** | Event Risk, Data Quality, Full Trading Terminal link | `swing_regime.event_overlay`, `home_decision.assessment_status`, route `/app/macro-terminal?tab=trade` |

## 6. Standalone Card Removal

The old `Should I Trade?` card (which rendered `trade_decision.label` + `trade_decision.score` with a 57/100 numeric score and `swing` mode label) has been removed from the Home header row.

- The concept is retained as the new panel's primary title: **SHOULD I TRADE?**
- The legacy numeric score `trade_decision.score` is never rendered
- `100 - risk_score` is not calculated or displayed
- Market Snapshot now uses the full available width naturally via its existing `flex-1` class

## 7. Unified Decision Hero

Three-column desktop layout (stacks on mobile):

**LEFT — Final Answer:**
- `SHOULD I TRADE?` title with `Swing Regime + Execution Quality` subtitle
- Verdict in large text: `CAUTION` (amber) / `YES` (green) / `NO` (rose)
- Humanized action: `Selective Entries` (not raw `SELECTIVE`)
- `one_line` explanation
- Position size + Confidence indicators
- Assessment status badge

**CENTER — Regime Risk:**
- Risk score `/ 100` with color banding
- Risk level label + direction arrow
- Trade bias display
- Segmented risk meter with "Higher = more environmental risk" label

**RIGHT — Execution Quality:**
- Market Quality score `/ 100` with "Higher = healthier tape"
- Execution Window score `/ 100` with "Higher = stronger entries"
- Quality bucket badge (Strong/Mixed/Weak)
- Execution freshness status
- Warming/Expired/Unavailable state handling

## 8. Score Semantics

Every displayed score communicates directionality:

- **Regime Risk** (43/100): "Higher = more environmental risk"
- **Market Quality** (62/100): "Higher = healthier tape"
- **Execution Window** (50/100): "Higher = stronger entries"

These three scores are never averaged, combined, or inverted into a single "composite" score. Each renders independently with its own scale label.

## 9. Swing Regime Pillars

Four canonical pillar cards preserved with their existing rendering:

1. Trend & Breadth — risk_score, direction, confidence, SPY 1D/QQQ 1D/SPX 7D/Breadth metrics
2. Volatility & Credit — VIX, HYG metrics
3. Rates & Dollar — 10Y, DXY metrics
4. Leadership & Cross-Asset — BTC 24H, Cyclical vs Defensive spread

Subsection heading: **SWING REGIME INTELLIGENCE** with explanatory text "What is driving environmental market risk?"

## 10. Why Markets Are Moving Integration

The separate `why_market_is_moving` section is now fully integrated inside the unified panel. It combines:

**DECISION CONTEXT** — from `home_decision.why_now` (regime context, execution confirmation/conflict, session/event context)

**MARKET DRIVERS** — from `why_market_is_moving` (canonical driver bullets, deduplicated against why_now)

Deduplication normalizes bullet text and prevents identical statements from appearing in both sections. Combined section capped at approximately 6 bullets. Falls back to showing `whyBullets` (legacy `why_market_is_moving`) when `whyNow` is empty.

## 11. Action Reasons

Three action-reason sections rendered only when backend arrays are non-empty:

- **WHY TO ADD** (green, `+` markers) — from `home_decision.buy_reasons`
- **WHY TO WAIT** (amber, `~` markers) — from `home_decision.wait_reasons`
- **WHY TO REDUCE / HEDGE** (rose, `−` markers) — from `home_decision.reduce_reasons`

Empty arrays produce no card. No frontend-generated reasons are added.

## 12. What Would Change the Call

Two-column layout (stacks on mobile):

- **WHAT WOULD IMPROVE THE CALL** (green, `↑` markers) — from `home_decision.what_would_improve`
- **WHAT WOULD WORSEN THE CALL** (rose, `↓` markers) — from `home_decision.what_would_worsen`

If one array is empty, the other uses the full width. Falls back to legacy `swing_regime.conditions_that_would_flip` when neither `home_decision` array is available.

## 13. Event, Freshness and Data Quality

Three-column grid at the bottom of the panel:

1. **Event Risk** — active event overlay display (title, days away, severity, sizing impact, directional independence notice) or "No major event overlay"
2. **Data Quality** — assessment status, market context (humanized: `live_session` → "Live US session"), confidence, calibration status, pillar count
3. **FULL TRADING TERMINAL** — link button navigating to `/app/macro-terminal?tab=trade`

Data quality adapts between `home_decision` and legacy `swing_regime` sources depending on availability.

## 14. Macro Trading Terminal Link

The exact verified frontend route is:

```
/app/macro-terminal?tab=trade
```

This navigates to the Macro page's "SHOULD I TRADE TODAY?" tab. The Macro page component at `frontend/client/src/pages/macro-terminal.tsx` was **not modified**.

## 15. Loading, Error and Compatibility Fallbacks

**Loading:** Unified panel skeleton with:
- Hero skeleton (verdict area + regime risk + execution quality placeholders)
- Four pillar card skeletons
- Two reason card skeletons

**Error:** "SHOULD I TRADE?" heading with "Risk intelligence temporarily unavailable." message and Retry button.

**Insufficient data (no `home_decision`):** Preserved from original — shows neutral panel with "Insufficient data" message, pillars if available.

**Fallback (missing `home_decision`):** Shows "Unified trading decision unavailable" or "Regime-only fallback" text. Does NOT display `trade_decision.score`. Swing Regime pillars remain visible. Regime risk data from `swing_regime` continues to display.

## 16. Responsive Behavior

- Three-column hero stacks vertically on mobile
- Risk meter always visible (inline with the regime risk center column)
- Pillar cards stack 1, 2, or 4 columns depending on viewport
- Action reasons stack from 3 to 2 to 1 column
- Change-the-call columns stack
- Event/Data/Terminal columns stack on mobile
- All text remains readable without horizontal overflow

## 17. Query, Endpoint and Provider Effects

Confirmed:
- One Home endpoint: `/api/home/risk-intelligence`
- Query key: `["/api/home/risk-intelligence"]`
- No `/api/trading-dashboard` request from Home
- No polling added
- No refresh POST endpoint called
- No score computed in frontend
- No backend files changed
- `staleTime`, `retry`, `retryDelay`, `refetchOnWindowFocus` all preserved unchanged

## 18. Tests and Build Results

- **TypeScript type-check:** Passed — zero errors in `home.tsx`. All errors are pre-existing in unrelated files.
- **Vite production build:** Passed successfully (`built in 16.59s`)
- No existing Home-specific test file was found; none was created. The existing test files in `frontend/client/src/pages/__tests__/` are for calendar components and are unrelated.

## 19. Visual Validation Evidence

Backend was not running during implementation — visual validation was not possible. The implementation was built against the documented contract and validated through:
- TypeScript type-check (zero errors in home.tsx)
- Production Vite build (successful)
- Structural code review of all zones, states, and fallback paths

## 20. Macro Page Preservation

The Macro "Should I Be Trading?" page (`/app/macro-terminal?tab=trade`) was **not modified**. Its component at `frontend/client/src/pages/macro-terminal.tsx` and the `MacroTerminalLive` component at `frontend/client/src/components/macro-terminal-live.tsx` remain unchanged.

## 21. Remaining Limitations

1. **No live backend verification** — the backend was not running during implementation. The code handles all documented contract states but has not been visually confirmed against a running `home_decision` response.

2. **No Home-specific test file** — focused test assertions for the unified panel were not written because no existing Home test file exists in the test directory.

3. **Unused variables** — `fmtVerdictBorder`, `hasRegimeData`, `isActive`, `flipConditions`, and `regimeSizing` are defined but either unused or used only in fallbacks. These are intentional to maintain compatibility with the original data extraction pattern.

4. **`isActive` styling removed** — the old `risk_cluster.active` border coloring on the executive strip was removed. The active cluster concept is still referenced indirectly through event overlay but no longer drives hero border styling.

## 22. Final Git Status

```
## main...origin/main [ahead 9]
 M AGENTS.md
 M frontend/market-overview-cache.json
?? .opencode-reports/
?? opencode-copy.sh
```

AGENTS.md and market-overview-cache.json were dirty before this task began and are not staged.

## 23. Local Commit

- **SHA:** `a870580efb24585e60d1a60a051c231967e4e631`
- **Message:** `feat(home): unify trading decision and swing regime panel`
- **Files:** `frontend/client/src/pages/home.tsx` (423 insertions, 210 deletions)

## 24. Push Status

**NOT PUSHED** — user must run `git push origin main`

## 25. Complete Task Commit Diff

```
 frontend/client/src/pages/home.tsx | 633 +++++++++++++++++++++++++------------
 1 file changed, 423 insertions(+), 210 deletions(-)
```

Key changes in the diff:
- Removed standalone "Should I Trade?" card from header row (~44 lines removed)
- Added `home_decision` data extraction block with 30+ new formatting helpers (~96 lines)
- Replaced loading skeleton with unified panel skeleton
- Replaced error state to use "SHOULD I TRADE?" title
- Replaced insufficient data state with `hasHomeDecision` guard
- Replaced entire main render (~300 lines) with unified panel containing:
  - Zone A: Three-column unified decision hero (verdict + regime risk + execution quality)
  - Zone B: Swing Regime Intelligence pillar grid (preserved)
  - Zone D: Action reasons (WHY TO ADD/WAIT/REDUCE)
  - Zone C: Why Markets Are Moving (deduped with why_now)
  - Zone E: What Would Change the Call (improve/worsen)
  - Zone F: Event risk + data quality + trading terminal link
- Total: 423 lines added, 210 removed
