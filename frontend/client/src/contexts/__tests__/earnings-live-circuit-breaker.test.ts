/**
 * Regression tests: EarningsLiveContext circuit breaker
 *
 * Source-pattern tests (no React mount) that verify the circuit-breaker
 * implementation is present and the old high-load settings are gone.
 *
 * Run: node --test src/contexts/__tests__/earnings-live-circuit-breaker.test.ts
 * (from the frontend/ directory with tsx loader, same as global-prefetch-ownership)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve(
  import.meta.dirname ?? __dirname,
  "../EarningsLiveContext.tsx"
);

function src(): string {
  return readFileSync(SRC, "utf8");
}

// ── helpers ──────────────────────────────────────────────────────────────────

function stripComments(code: string): string {
  // Remove // line comments and /* block comments */
  return code
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("EarningsLiveContext — circuit breaker", () => {
  it("imports useState from react", () => {
    const code = src();
    assert.match(
      code,
      /useState/,
      "EarningsLiveContext must import and use useState for circuit breaker state"
    );
  });

  it("defines CIRCUIT_TRIPS threshold", () => {
    const code = stripComments(src());
    assert.match(
      code,
      /CIRCUIT_TRIPS\s*=\s*\d/,
      "Must define CIRCUIT_TRIPS constant for the circuit breaker threshold"
    );
  });

  it("CIRCUIT_TRIPS is 3 (three consecutive failures before opening)", () => {
    const match = src().match(/CIRCUIT_TRIPS\s*=\s*(\d+)/);
    assert.ok(match, "CIRCUIT_TRIPS constant must be present");
    assert.equal(
      Number(match![1]),
      3,
      "CIRCUIT_TRIPS should be 3 consecutive failures"
    );
  });

  it("defines CIRCUIT_RESET_MS cooldown", () => {
    const code = stripComments(src());
    assert.match(
      code,
      /CIRCUIT_RESET_MS/,
      "Must define CIRCUIT_RESET_MS for the circuit cooldown period"
    );
  });

  it("CIRCUIT_RESET_MS is at least 5 minutes (300000 ms)", () => {
    // Matches both literal (600000) and expression (10 * 60_000)
    const match = src().match(/CIRCUIT_RESET_MS\s*=\s*([\d_ *]+)/);
    assert.ok(match, "CIRCUIT_RESET_MS constant must be present");
    // Evaluate the expression safely (digits, spaces, underscores, * only)
    const expr = match![1].replace(/_/g, "").replace(/\s+/g, "");
    const parts = expr.split("*").map(Number);
    const value = parts.reduce((a, b) => a * b, 1);
    assert.ok(
      value >= 300_000,
      `CIRCUIT_RESET_MS (${value}) must be at least 5 minutes`
    );
  });

  it("uses pollEnabled as the circuit breaker gate", () => {
    const code = stripComments(src());
    assert.match(
      code,
      /pollEnabled/,
      "Must use pollEnabled state to gate the query when circuit is open"
    );
  });

  it("enabled prop checks pollEnabled", () => {
    const code = stripComments(src());
    assert.match(
      code,
      /enabled\s*:\s*isAuthenticated\s*&&\s*pollEnabled/,
      "useQuery enabled must be gated on both isAuthenticated and pollEnabled"
    );
  });

  it("retry is set to 0 (no immediate retry on failure)", () => {
    const code = stripComments(src());
    // Must have `retry: 0`
    assert.match(
      code,
      /retry\s*:\s*0/,
      "retry must be 0 — immediate retry on a consistently-down endpoint wastes backend capacity"
    );
  });

  it("does NOT use retry: 1 (old setting removed)", () => {
    const code = stripComments(src());
    assert.doesNotMatch(
      code,
      /retry\s*:\s*1/,
      "retry: 1 must be removed — it was causing double 10s timeout every poll cycle"
    );
  });

  it("refetchOnWindowFocus is false (not true)", () => {
    const code = stripComments(src());
    assert.match(
      code,
      /refetchOnWindowFocus\s*:\s*false/,
      "refetchOnWindowFocus must be false so tab focus does not bypass the circuit"
    );
    assert.doesNotMatch(
      code,
      /refetchOnWindowFocus\s*:\s*true/,
      "refetchOnWindowFocus: true must be removed"
    );
  });

  it("incrementing logic reaches setPollEnabled(false) when threshold met", () => {
    const code = stripComments(src());
    assert.match(
      code,
      /consecutiveFailsRef\.current\s*>=\s*CIRCUIT_TRIPS/,
      "queryFn must compare consecutiveFailsRef.current to CIRCUIT_TRIPS before opening the circuit"
    );
    assert.match(
      code,
      /setPollEnabled\s*\(\s*false\s*\)/,
      "Circuit must open by calling setPollEnabled(false)"
    );
  });

  it("resets consecutive failures to 0 on success", () => {
    const code = stripComments(src());
    assert.match(
      code,
      /consecutiveFailsRef\.current\s*=\s*0/,
      "consecutiveFailsRef.current must be reset to 0 on a successful fetch"
    );
  });

  it("auto-resets circuit via setTimeout with CIRCUIT_RESET_MS", () => {
    const code = stripComments(src());
    assert.match(
      code,
      /setTimeout[\s\S]*?CIRCUIT_RESET_MS/,
      "Circuit must auto-reset via setTimeout keyed to CIRCUIT_RESET_MS"
    );
    assert.match(
      code,
      /setPollEnabled\s*\(\s*true\s*\)/,
      "Circuit must reset by calling setPollEnabled(true)"
    );
  });

  it("does NOT import or call retryDelay (old setting removed)", () => {
    const code = stripComments(src());
    assert.doesNotMatch(
      code,
      /retryDelay\s*:/,
      "retryDelay must be removed along with retry:1"
    );
  });

  it("circuitQueryFn is a stable useCallback with empty deps", () => {
    const code = stripComments(src());
    assert.match(
      code,
      /useCallback[\s\S]*?\[\s*\]/,
      "circuitQueryFn must be wrapped in useCallback with empty deps for a stable reference"
    );
  });
});
