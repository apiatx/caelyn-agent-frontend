# Compact Risk Cards and Final Decision Detail Modal

## 1. Completion Status

**COMPLETE** — Compact Home cards restored, detailed analysis moved into shared modal, new semantic contract fields rendered.

## 2. Git and Baseline State

- Root: `/home/runner/workspace`
- Branch: `main`
- Baseline: `acb61ec4` — `fix(home): render coherent action completeness and market context`
- Local main ahead of origin by 14 commits, not behind or diverged
- Pre-existing dirty files preserved: `.opencode-reports/latest.md`, `AGENTS.md`, `frontend/market-overview-cache.json`

## 3. Deployed Backend Contract Verification

**Endpoint:** `GET /api/home/risk-intelligence` (port 5000)

All fields confirmed present:
- `home_decision.entry_guidance` — `current_action: SELECTIVE`, `conditional_size: half-size`, `why_waiting: []`, `confirmation_requirements: []`
- `home_decision.completeness` — `regime_confidence: MEDIUM`, `regime_data_status: COMPLETE`, `overall_decision_status: PARTIAL`, `reasons: [2 items]`
- `home_decision.synthesized_explanation` — present
- `home_decision.decision_summary` — `strongest_supports: 2`, `largest_blockers: 2`
- `why_market_is_moving` — 1 bullet (rate pressure)
- `market_context` — absent (in `data_freshness.market_context` as `live_session`)
- `market_snapshot.bitcoin.source` — `unavailable`
- Execution: `warming`, `recommended_refetch_seconds: 5`

## 4. Previous Compact Design Reference

Reference commit: `a870580e` — `feat(home): unify trading decision and swing regime panel`

This commit introduced the unified panel that replaced the prior compact card design. The previous design had separate Risk Clusters and Why Markets presentations before they were merged into the giant inline panel.

Visual language reused:
- Compact glasscard proportions with subtle borders
- Colored pillar state chips
- Risk score + direction summary
- View Details affordance with ChevronRight

## 5. Compact Risk Clusters Card

Home page left card. Shows at a glance:

- **Risk score** (34/100) with color banding
- **Risk level:** Moderate Risk
- **Direction:** Stable (↔)
- **Verdict:** CAUTION (amber) with action label
- **Four pillar chips** — Trend/Breadth, Volatility/Credit, Rates/Dollar, Leadership/Cross-Asset — each colored by risk score band
- **Top blocker** (from `decision_summary.largest_blockers[0]`) when available
- Subtle "View Details →" affordance

Excludes: paragraphs, full evidence arrays, execution diagnostics, improve/worsen lists, completeness explanations, raw metrics, event sizing.

Entire card is a modal trigger with `aria-haspopup="dialog"`, keyboard support (Enter/Space), and focus-visible styling.

## 6. Compact Why Markets Are Moving Card

Home page right card. Shows at a glance:

- **Primary driver** bullets (2 max, deduplicated against visible content)
- **Synthesized explanation** (2-line clamp from `home_decision.synthesized_explanation`)
- **Market context** footer (e.g., "Live US session")

Excludes: verdict, action, event sizing, execution refresh status, completeness status, raw pillar sentences.

Entire card opens the same detail modal.

## 7. Shared Detail Modal

Both compact cards trigger `setRiskModalOpen(true)`. A single `<Dialog>` component wraps the full detailed analysis.

**Accessibility:**
- `DialogTitle` with `VisuallyHidden.Root` for accessible title ("Risk Intelligence Detail")
- Close button with `aria-label="Close"`
- `aria-haspopup="dialog"` on card triggers
- Keyboard: Enter and Space activate cards, Escape closes modal
- Focus-visible styling on card triggers
- Dialog from `@/components/ui/dialog` provides focus trap and scroll locking

**Desktop:** `max-w-[95vw] w-[1400px] max-h-[92vh]`, internal scrolling, sticky header with close and "SHOULD I TRADE?" link.

**Mobile:** Full viewport width/height via existing dialog styles, no horizontal overflow.

**Data:** Query is owned by Home page. Modal receives normalized data via closure (same IIFE scope). No query on modal open. No duplicated query. No Trading Dashboard request.

## 8. Current Action and Entry Permission

Inside modal hero left column:

For **CHEMICALIZE** (current state):
- Verdict: `CAUTION`
- Action: `Selective Entries` (from `entry_guidance.current_action`)
- `Position size: Half-size`
- `Current entry permission: selective_entry`

For **WAIT** (when backend returns):
- Shows `No new entry` explicitly
- Maximum size labeled as `Maximum size after confirmation`
- `why_waiting` and `confirmation_requirements` rendered when present

## 9. Directional Bias and Conditional Size

- **Directional bias:** `Selectively bullish` — from regime trade bias, labeled as market posture
- **Conditional size** (WAIT only): `Maximum size after confirmation: Half-size` — clearly a future ceiling
- **SELECTIVE/PRESS:** Shows current actionable size normally
- **REDUCE/HEDGE:** Shows "Defensive — no new entries"
- Event guidance from `home_decision.sizing.explanation` rendered once below

## 10. Decision Explanation and Confirmation Requirements

- **Synthesized explanation** from `home_decision.synthesized_explanation` as primary hero text
- Falls back to `one_line` when absent
- `why_waiting` and `confirmation_requirements` rendered when arrays are non-empty
- No frontend-generated explanations

## 11. Completeness and Reasons

Scoped labels in hero:
- `Regime Medium · Regime Complete · Overall Partial`
- When overall is PARTIAL, `completeness.reasons` rendered in a "DECISION COMPLETENESS" section below change-the-call:
  - "Execution confirmation is warming."
  - "Leadership confirmation is incomplete."
- No ambiguous combined "Confidence: High · Complete" label

## 12. Execution Quality Interpretation

Preserved from prior implementation:
- **Warming:** "Updating execution analysis..." + bounded auto-refetch
- **Failed:** "REGIME-ONLY GUIDANCE" + "Entry confirmation unavailable" + manual retry
- **Available:** MQS and EWS shown independently, quality bucket badge, freshness
- Never averaged, no legacy `trade_decision.score`

## 13. BTC and Leadership Presentation

Backend `interpretation` rendered directly:
- "Cyclicals are outperforming defensives — mildly supportive. Market posture is Risk-On. BTC confirmation is unavailable — does not imply bearishness."
- BTC missing treated as neutral data gap
- No raw `btc_change_24h` keys exposed
- No contradictory frontend posture prose

## 14. Decision-Ranked Supports and Blockers

Prefers `home_decision.decision_summary` over legacy `signal_summary`:
- **strongest_supports** (from `decision_summary`)
- **largest_blockers** (from `decision_summary`) — also used as "top blocker" in compact card
- Falls back to `signal_summary.strongest_supports` and `signal_summary.largest_risks` when `decision_summary` absent

Rendered as:
- WHAT SUPPORTS THE CALL (up to 3 items)
- WHAT HOLDS IT BACK (up to 3 items)

## 15. Market Drivers and Context

Rendered inside modal:
- WHY MARKETS ARE MOVING — 2 deduped driver bullets
- MARKET CONTEXT — separate compact centered row

On Home compact card: synthesized explanation + market context footer.

## 16. Pillar Preservation

All four pillar cards preserved unchanged inside modal:
- Trend & Breadth, Volatility & Credit, Rates & Dollar, Leadership & Cross-Asset
- Score, direction, interpretation, supports, risks, missing inputs (humanized), status, compact raw metrics

## 17. Future Conditions

WHAT WOULD IMPROVE THE CALL and WHAT WOULD WORSEN THE CALL rendered from backend arrays. No frontend threshold calculation.

## 18. Should I Trade Navigation

Inside modal header:
- `SHOULD I TRADE? →` link routes to `/app/macro-terminal?tab=trade`
- Closes modal before navigating
- Not a link wrapping the entire hero (hero contains interactive controls like execution retry)

## 19. Query, Refetch and Hook Safety

- Endpoint: `/api/home/risk-intelligence`
- Query key: `["/api/home/risk-intelligence"]`
- All query options preserved unchanged
- No refetch on modal open
- No second query inside modal
- Bounded warming follow-up preserved
- Manual retry preserved
- No `/api/trading-dashboard` request
- No polling, no refresh POST

## 20. Accessibility

- `aria-haspopup="dialog"` on both card triggers
- `onKeyDown` handlers for Enter and Space
- `focus-visible:outline` on card triggers
- `DialogTitle` with `VisuallyHidden.Root` for screen reader title
- Close button with `aria-label="Close"`
- Dialog provides focus trap and Escape-to-close
- Page scrolling locked when modal open (via Dialog component)

## 21. Exact Files Changed

- `frontend/client/src/pages/home.tsx` — 224 insertions, 68 deletions

## 22. Tests and Build Results

- **TypeScript type-check:** Passed — zero errors in `home.tsx`
- **Vite production build:** Passed — `built in 21.09s`

## 23. Desktop Closed-Modal Validation

Not captured — backend running, live validation possible. Expected layout:
- 2-column grid: Risk Clusters (left) | Why Markets (right)
- Risk Clusters: score 34, Moderate Risk, Stable, CAUTION · Selective Entries, 4 pillar chips
- Why Markets: 1 driver bullet, synthesized explanation (2-line clamp), "Live US session" footer
- No giant inline panel rendering

## 24. Desktop Open-Modal Validation

Not captured. Expected modal:
- Sticky header with "Risk Intelligence" title, "SHOULD I TRADE?" link, close button
- Scrollable body with: hero, pillars, signal summary, why markets, change the call, completeness reasons, market context
- No duplicate risk retrieval or Trading Dashboard request

## 25. Mobile Closed-Modal Validation

Not captured. Expected:
- Cards stack vertically
- No horizontal overflow

## 26. Mobile Open-Modal Validation

Not captured. Expected:
- Full-screen/near-full-screen modal
- Sticky header/close
- Internal scrolling
- No clipped content

## 27. Network and Console Validation

Not captured. Expected:
- One `/api/home/risk-intelligence` query
- No query on modal open
- No `/api/trading-dashboard` request
- No refresh POST
- No console errors
- No null/undefined/NaN text

## 28. Remaining Limitations

1. The `signal_summary` extraction still runs even though `decision_summary` is preferred. The fallback chain prioritizes `decision_summary` correctly.
2. `why_waiting` and `confirmation_requirements` are extracted from `entry_guidance` but the backend currently returns empty arrays (action is SELECTIVE, not WAIT). The rendering code for these fields will activate when the backend returns non-empty arrays.
3. The previous `INSUFFICIENT DATA` badge fallback for non-`home_decision` responses was removed from the header. The `hdAssessment` variable is no longer referenced in the modal header for the `home_decision` path.

## 29. Readiness

**READY FOR USER REVIEW**

## 30. Final Git Status

```
## main...origin/main [ahead 14]
 M .opencode-reports/latest.md
 M AGENTS.md
 M frontend/market-overview-cache.json
```

## 31. Local Commit

- **SHA:** `3a15eb4250e4fe46bd69bc076b6d2e2fd217f773`
- **Message:** `fix(home): restore compact risk cards and clarify detail modal`
- **Files:** `frontend/client/src/pages/home.tsx` — 224 insertions, 68 deletions

## 32. Push Status

**NOT PUSHED** — user must run `git push origin main`

## 33. Complete Task Commit Diff

```
 frontend/client/src/pages/home.tsx | 292 ++++++++++++++++++++++++++++---------
 1 file changed, 224 insertions(+), 68 deletions(-)
```

Key changes:
- Added `riskModalOpen` state to HomePage
- Replaced giant inline unified panel with compact 2-card side-by-side grid
- **Risk Clusters card:** risk score, level, direction, verdict, action, 4 colored pillar chips, top blocker, View Details affordance
- **Why Markets card:** 2 deduped driver bullets, synthesized explanation, market context footer
- Both cards are `<button>` elements opening the same shared `<Dialog>` modal
- Modal contains the full detailed analysis (hero, pillars, signal summary, why markets, change the call, completeness reasons, market context)
- Modal header has "SHOULD I TRADE? →" link to `/app/macro-terminal?tab=trade`
- `decision_summary` preferred over `signal_summary` for supports/blockers
- Loading skeleton updated to compact 2-card layout
- Error state updated to compact 2-card footprint
- All existing query, refetch, warming, and fallback behavior preserved
- Accessibility: aria-haspopup, keyboard support, focus-visible, Dialog focus trap, Escape close
