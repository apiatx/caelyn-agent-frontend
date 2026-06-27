---
name: Flex height chain — minHeight vs height
description: Why flex:1 children get 0px when ancestor uses minHeight instead of height, and how to fix treemap/chart containers reliably.
---

## The rule
`flex: 1` children only get correct height when the flex container has a **definite** height (`height: Npx` or `height: 100vh`). `minHeight: 100vh` does NOT create a definite height — the browser cannot use it to distribute space to `flex: 1` children.

**Why:** CSS flexbox spec: flex item growth only works against the container's definite size. `minHeight` creates a minimum constraint, not a definite size.

**How to apply:**
- When building a "fills remaining space" layout inside a page with `minHeight: 100vh`, use viewport-calc on the leaf container instead of relying on `flex: 1` propagating all the way up.
- Preferred fallback: `height: calc(100vh - Npx); minHeight: Npx` on the leaf panel — doesn't depend on ancestor heights at all.
- Alternative: change root to `height: 100vh; overflow: hidden` (only if all page content scrolls internally).

## Options page treemap fix (2026-06-27)
- Root `OptionsPage` div uses `minHeight: "100vh"` — cannot change without risking Screener tab.
- Treemap section uses `height: "calc(100vh - 310px)"; minHeight: 360` — concrete, reliable, matches original working code.
- `SFTreemap` also falls back to `clientWidth/clientHeight` if ResizeObserver hasn't fired yet.
