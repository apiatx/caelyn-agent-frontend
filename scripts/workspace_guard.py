#!/usr/bin/env python3
"""
CaelynAI Frontend — Workspace Guard
====================================
Single-writer workspace claim, Git-state enforcement, prepush/prepublish
validation, and postpublish classification for multi-agent safety.

Commands
--------
  claim          Claim the workspace for an actor/task
  status         Show current lock, git state, and working-tree classification
  preflight      Verify preconditions before editing (git state + lock)
  prepush        Full validation gate (git state + typecheck + build + tests)
  prepublish     Strict gate before Replit deployment publish
  postpublish    Read-only post-publish classification
  release        Release the workspace lock (--force required for stale locks)
  install-hooks  Configure git to use .githooks/

Stale-lock policy
-----------------
A lock older than 24 hours is labelled STALE but is NEVER automatically
released.  Explicit `release --force` with user authorization is required.
This avoids silently overriding long-running or manual tasks.

Git cases
---------
  A   HEAD == origin/main                        → proceed
  B   local behind, no divergence                → ff-only merge allowed
  C-GENERATED   ahead, all commits generated     → proceed
  C-SOURCE      ahead, some commits source       → stop unless completing task
  D   true divergence                            → stop, manual recovery required
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parent.parent
CLAIM_FILE = REPO_ROOT / ".agent-state" / "claim.json"
STALE_THRESHOLD_SECONDS = 24 * 60 * 60  # 24 hours

# ---------------------------------------------------------------------------
# Source / Generated classifier
# ---------------------------------------------------------------------------
# GENERATED is an explicit narrow allowlist.  Everything else is SOURCE.

GENERATED_EXACT: set[str] = {
    "frontend/market-overview-cache.json",
}

GENERATED_PREFIX: tuple[str, ...] = (
    ".opencode-reports/",
    ".codex-reports/",
    ".opencode-persistent/",
    ".opencode/",
    ".codex/",
    ".agent-state/",
    "attached_assets/",    # uploaded task instruction files
)

SOURCE_EXTENSIONS: tuple[str, ...] = (
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".css", ".scss", ".html",
)

SOURCE_EXACT_NAMES: set[str] = {
    "package.json", "package-lock.json",
    ".replit", "AGENTS.md", "Makefile",
}

SOURCE_GLOB_PREFIXES: tuple[str, ...] = (
    "scripts/",
    ".githooks/",
)

# tsconfig*.json, vite.config.*, esbuild.config.*, drizzle.config.*
SOURCE_PATTERN: list[str] = [
    r"^tsconfig.*\.json$",
    r"^frontend/tsconfig.*\.json$",
    r"^vite\.config\.",
    r"^frontend/vite\.config\.",
    r"^esbuild\.config\.",
    r"^drizzle\.config\.",
    r"^frontend/drizzle\.config\.",
]
_SOURCE_RE = [re.compile(p) for p in SOURCE_PATTERN]


def classify_path(rel_path: str) -> str:
    """Return 'SOURCE' or 'GENERATED' for a repo-relative path."""
    # Exact generated matches
    if rel_path in GENERATED_EXACT:
        return "GENERATED"
    # Prefix-based generated matches
    for pfx in GENERATED_PREFIX:
        if rel_path.startswith(pfx):
            return "GENERATED"
    # Source by exact filename (basename)
    basename = Path(rel_path).name
    if basename in SOURCE_EXACT_NAMES:
        return "SOURCE"
    # Source by extension
    for ext in SOURCE_EXTENSIONS:
        if rel_path.endswith(ext):
            return "SOURCE"
    # Source by prefix
    for pfx in SOURCE_GLOB_PREFIXES:
        if rel_path.startswith(pfx):
            return "SOURCE"
    # Source by pattern
    fname = Path(rel_path).name
    for rx in _SOURCE_RE:
        if rx.match(fname) or rx.match(rel_path):
            return "SOURCE"
    # JSON files not in generated list → SOURCE (conservative default)
    if rel_path.endswith(".json"):
        return "SOURCE"
    # Unknown → SOURCE (conservative)
    return "SOURCE"


# ---------------------------------------------------------------------------
# Git helpers
# ---------------------------------------------------------------------------

def _git(*args: str, check: bool = True, capture: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        cwd=REPO_ROOT,
        capture_output=capture,
        text=True,
        check=check,
    )


def git_out(*args: str) -> str:
    return _git(*args).stdout.strip()


def git_rc(*args: str) -> int:
    r = _git(*args, check=False)
    return r.returncode


def current_branch() -> str:
    return git_out("branch", "--show-current")


def head_sha() -> str:
    return git_out("rev-parse", "HEAD")


def origin_sha() -> str:
    try:
        return git_out("rev-parse", "origin/main")
    except subprocess.CalledProcessError:
        return ""


def fetch_origin() -> None:
    _git("fetch", "origin", "main", "--quiet")


def ahead_behind() -> tuple[int, int]:
    """Return (ahead, behind) counts vs origin/main."""
    try:
        out = git_out("rev-list", "--left-right", "--count", "HEAD...origin/main")
        parts = out.split()
        return int(parts[0]), int(parts[1])
    except Exception:
        return 0, 0


def commits_ahead() -> list[dict]:
    """Return list of dicts {sha, subject, files} for commits ahead of origin/main."""
    try:
        shas = git_out("rev-list", "origin/main..HEAD").splitlines()
    except subprocess.CalledProcessError:
        return []
    commits = []
    for sha in shas:
        subject = git_out("log", "-1", "--format=%s", sha)
        files_out = git_out("diff-tree", "--no-commit-id", "-r", "--name-only", sha)
        files = [f for f in files_out.splitlines() if f]
        commits.append({"sha": sha, "subject": subject, "files": files})
    return commits


def classify_commits(commits: list[dict]) -> str:
    """
    Return 'NONE', 'C-GENERATED', or 'C-SOURCE'.
    'NONE' means no commits ahead.
    """
    if not commits:
        return "NONE"
    has_source = False
    for c in commits:
        for f in c["files"]:
            if classify_path(f) == "SOURCE":
                has_source = True
                break
        if has_source:
            break
    return "C-SOURCE" if has_source else "C-GENERATED"


def dirty_source_files() -> list[str]:
    """Return tracked SOURCE files with uncommitted modifications."""
    # Use raw .stdout (not git_out) to preserve per-line leading whitespace.
    # git_out() calls .strip() on the full output, which destroys the XY status
    # prefix on the first line when there is only one dirty file, causing
    # classify_path() to receive a truncated path (e.g. 'rontend/...' instead
    # of 'frontend/...') that misses the GENERATED_EXACT allowlist.
    out = _git("status", "--porcelain").stdout
    dirty = []
    for line in out.splitlines():
        if len(line) < 3:
            continue
        status = line[:2].strip()
        path = line[3:].strip()
        # Ignore untracked
        if "?" in line[:2]:
            continue
        if classify_path(path) == "SOURCE":
            dirty.append(path)
    return dirty


def has_conflicts() -> bool:
    out = git_out("status", "--porcelain")
    for line in out.splitlines():
        if line[:2] in ("DD", "AU", "UD", "UA", "DU", "AA", "UU"):
            return True
    return False


def git_case() -> str:
    """
    Determine current git case:
      A           HEAD == origin/main
      B           local behind, no divergence
      C-GENERATED local ahead, only generated commits
      C-SOURCE    local ahead, includes source commits
      D           true divergence
    """
    ahead, behind = ahead_behind()
    if ahead == 0 and behind == 0:
        return "A"
    if ahead == 0 and behind > 0:
        return "B"
    if ahead > 0 and behind == 0:
        commits = commits_ahead()
        kind = classify_commits(commits)
        return kind if kind != "NONE" else "A"
    # ahead > 0 and behind > 0 → divergence
    return "D"


# ---------------------------------------------------------------------------
# Lock helpers
# ---------------------------------------------------------------------------

def load_claim() -> Optional[dict]:
    if not CLAIM_FILE.exists():
        return None
    try:
        return json.loads(CLAIM_FILE.read_text())
    except Exception:
        return None


def save_claim(data: dict) -> None:
    CLAIM_FILE.parent.mkdir(parents=True, exist_ok=True)
    CLAIM_FILE.write_text(json.dumps(data, indent=2))


def claim_age_seconds(claim: dict) -> float:
    ts = claim.get("timestamp", 0)
    return time.time() - ts


def is_stale(claim: dict) -> bool:
    return claim_age_seconds(claim) > STALE_THRESHOLD_SECONDS


def format_age(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    return f"{h}h {m}m"


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def run_typecheck() -> tuple[int, str]:
    """Run `cd frontend && npm run check`. Return (exit_code, output)."""
    result = subprocess.run(
        ["npm", "run", "check"],
        cwd=REPO_ROOT / "frontend",
        capture_output=True,
        text=True,
    )
    output = result.stdout + result.stderr
    return result.returncode, output


def run_build() -> tuple[int, str]:
    """Run root `npm run build` (mirrors Replit deployment build). Return (exit_code, output)."""
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    output = result.stdout + result.stderr
    return result.returncode, output


def changed_source_files_vs_origin() -> list[str]:
    """Return list of SOURCE files changed between origin/main and HEAD."""
    try:
        out = git_out("diff", "--name-only", "origin/main..HEAD")
    except subprocess.CalledProcessError:
        return []
    return [f for f in out.splitlines() if f and classify_path(f) == "SOURCE"]


def detect_relevant_tests(changed_files: list[str]) -> list[str]:
    """
    Given a list of changed source files, return test file paths to run.
    Uses simple keyword matching against existing test files.
    """
    test_dirs = [
        REPO_ROOT / "frontend" / "client" / "src" / "pages" / "__tests__",
        REPO_ROOT / "frontend" / "client" / "src" / "__tests__",
        REPO_ROOT / "frontend" / "src" / "__tests__",
    ]

    # Collect all existing test files
    existing_tests: list[Path] = []
    for d in test_dirs:
        if d.exists():
            existing_tests.extend(d.glob("*.test.ts"))
            existing_tests.extend(d.glob("*.test.tsx"))

    if not existing_tests:
        return []

    # Keywords extracted from changed file names/paths
    keywords: set[str] = set()
    for f in changed_files:
        stem = Path(f).stem.lower()
        # Extract meaningful tokens
        for token in re.split(r"[-_./]", stem):
            if len(token) >= 4:
                keywords.add(token)

    if not keywords:
        return []

    selected: list[str] = []
    for test_path in existing_tests:
        test_name = test_path.stem.lower()
        for kw in keywords:
            if kw in test_name:
                selected.append(str(test_path))
                break

    return selected


def run_tests(test_files: list[str]) -> tuple[int, str]:
    """Run given test files using Node tsx test runner. Return (exit_code, output)."""
    if not test_files:
        return 0, "No test files to run."

    tsx_import = str(REPO_ROOT / "frontend" / "node_modules" / "tsx" / "dist" / "esm" / "index.cjs")
    cmd = [
        "node",
        "--import", tsx_import,
        "--test",
        *test_files,
    ]
    result = subprocess.run(
        cmd,
        cwd=REPO_ROOT / "frontend",
        capture_output=True,
        text=True,
    )
    return result.returncode, result.stdout + result.stderr


def smoke_test_server(timeout: int = 30) -> tuple[bool, str]:
    """
    Start the production server (dist/index.js) and verify it responds
    to a homepage request within `timeout` seconds.
    Returns (success, message).
    """
    import socket
    import threading

    dist = REPO_ROOT / "frontend" / "dist" / "index.js"
    if not dist.exists():
        return False, "dist/index.js not found — run build first"

    env = os.environ.copy()
    env["NODE_ENV"] = "production"
    env["PORT"] = "5099"  # use a spare port to avoid conflicting with dev server

    proc = subprocess.Popen(
        ["node", str(dist)],
        cwd=REPO_ROOT / "frontend",
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    try:
        # Poll until the port opens or timeout
        deadline = time.time() + timeout
        connected = False
        while time.time() < deadline:
            time.sleep(0.5)
            if proc.poll() is not None:
                out, err = proc.communicate()
                return False, f"Server exited prematurely (rc={proc.returncode})\n{err[:500]}"
            try:
                with socket.create_connection(("127.0.0.1", 5099), timeout=1):
                    connected = True
                    break
            except OSError:
                pass

        if not connected:
            proc.terminate()
            return False, f"Server did not open port 5099 within {timeout}s"

        # Issue a minimal HTTP request
        import http.client
        try:
            conn = http.client.HTTPConnection("127.0.0.1", 5099, timeout=10)
            conn.request("GET", "/")
            resp = conn.getresponse()
            conn.close()
            if resp.status >= 500:
                proc.terminate()
                return False, f"Homepage returned HTTP {resp.status}"
            return True, f"Server OK — homepage HTTP {resp.status}"
        except Exception as e:
            proc.terminate()
            return False, f"HTTP request failed: {e}"
    finally:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_claim(args: argparse.Namespace) -> int:
    existing = load_claim()
    if existing:
        age = claim_age_seconds(existing)
        stale_marker = " [STALE]" if is_stale(existing) else ""
        print(f"ERROR: Workspace already claimed{stale_marker}.")
        print(f"  actor:   {existing.get('actor')}")
        print(f"  task:    {existing.get('task')}")
        print(f"  age:     {format_age(age)}")
        print(f"  started: {existing.get('started_at')}")
        if is_stale(existing):
            print()
            print("Lock is STALE (>24h) but will NOT be auto-released.")
            print("Run:  python scripts/workspace_guard.py release --force")
            print("Only do this with explicit user authorization.")
        return 1

    fetch_origin()
    claim_data = {
        "actor": args.actor,
        "task": args.task,
        "timestamp": time.time(),
        "started_at": datetime.now(timezone.utc).isoformat(),
        "starting_head": head_sha(),
        "starting_origin_main": origin_sha(),
        "workspace": str(REPO_ROOT),
        "branch": current_branch(),
    }
    save_claim(claim_data)
    print(f"Workspace claimed.")
    print(f"  actor:  {args.actor}")
    print(f"  task:   {args.task}")
    print(f"  head:   {claim_data['starting_head'][:12]}")
    print(f"  origin: {claim_data['starting_origin_main'][:12]}")
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    fetch_origin()

    print("=== Workspace Status ===")
    print()

    # Lock
    claim = load_claim()
    if claim:
        age = claim_age_seconds(claim)
        stale = is_stale(claim)
        stale_marker = " [STALE — >24h, release --force required]" if stale else ""
        print(f"Lock:    HELD{stale_marker}")
        print(f"  actor:   {claim.get('actor')}")
        print(f"  task:    {claim.get('task')}")
        print(f"  age:     {format_age(age)}")
        print(f"  started: {claim.get('started_at')}")
    else:
        print("Lock:    FREE")
    print()

    # Git
    branch = current_branch()
    h = head_sha()
    o = origin_sha()
    ahead, behind = ahead_behind()
    case = git_case()
    print(f"Branch:  {branch}")
    print(f"HEAD:    {h[:12]}")
    print(f"origin:  {o[:12]}")
    print(f"Ahead:   {ahead}  Behind: {behind}")
    print(f"Case:    {case}")
    print()

    # Commits ahead
    if ahead > 0:
        commits = commits_ahead()
        print(f"Commits ahead of origin/main ({ahead}):")
        for c in commits:
            src = [f for f in c["files"] if classify_path(f) == "SOURCE"]
            gen = [f for f in c["files"] if classify_path(f) == "GENERATED"]
            tag = "SOURCE" if src else "GENERATED"
            print(f"  {c['sha'][:8]} [{tag}] {c['subject']}")
        print()

    # Dirty working tree
    dirty_src = dirty_source_files()
    if dirty_src:
        print(f"Dirty SOURCE files ({len(dirty_src)}):")
        for f in dirty_src:
            print(f"  {f}")
    else:
        print("Dirty SOURCE files: none")
    print()

    return 0


def cmd_preflight(args: argparse.Namespace) -> int:
    fetch_origin()

    print("=== Preflight Check ===")
    errors: list[str] = []

    # Branch
    branch = current_branch()
    if branch != "main":
        errors.append(f"Not on main branch (current: {branch})")

    # Conflicts
    if has_conflicts():
        errors.append("Unresolved merge conflicts detected")

    # Workspace root
    root = git_out("rev-parse", "--show-toplevel")
    if root != str(REPO_ROOT):
        errors.append(f"Unexpected repo root: {root}")

    # Git case
    case = git_case()
    ahead, behind = ahead_behind()
    if case == "D":
        errors.append(
            f"CASE D — true divergence (ahead={ahead}, behind={behind}). "
            "Manual recovery required. Do not merge, rebase, or force-push."
        )
    elif case == "C-SOURCE":
        commits = commits_ahead()
        src_commits = [
            c for c in commits
            if any(classify_path(f) == "SOURCE" for f in c["files"])
        ]
        errors.append(
            f"CASE C-SOURCE — {len(src_commits)} local source commit(s) not yet at origin/main. "
            "Complete and push them before starting a new task, or confirm these are "
            "the current task's work in progress."
        )

    # Lock
    claim = load_claim()
    if claim and claim.get("actor") not in ("manual",):
        age = claim_age_seconds(claim)
        stale = is_stale(claim)
        if stale:
            print(f"WARNING: Stale lock held by '{claim.get('actor')}' ({format_age(age)}) — "
                  "not auto-released. Run `release --force` with user authorization.")
        # A stale lock is a warning, not a hard blocker for preflight
        # An active (non-stale) lock held by another actor IS a blocker
        if not stale:
            errors.append(
                f"Workspace locked by '{claim.get('actor')}' ({format_age(age)}). "
                "Release it before starting new work."
            )

    if errors:
        print("PREFLIGHT FAILED:")
        for e in errors:
            print(f"  ✗ {e}")
        return 1

    print("Preflight PASSED:")
    print(f"  ✓ branch = main")
    print(f"  ✓ no conflicts")
    print(f"  ✓ git case = {case}")
    print(f"  ✓ workspace = {REPO_ROOT}")
    return 0


def cmd_prepush(args: argparse.Namespace) -> int:
    fetch_origin()

    print("=== Pre-Push Validation ===")
    errors: list[str] = []
    warnings: list[str] = []

    # Branch
    branch = current_branch()
    if branch != "main":
        errors.append(f"Not on main branch (current: {branch})")

    # Conflicts
    if has_conflicts():
        errors.append("Unresolved merge conflicts")

    # Git case
    case = git_case()
    ahead, behind = ahead_behind()
    if case == "D":
        errors.append(
            f"CASE D — true divergence (ahead={ahead}, behind={behind}). "
            "Cannot push. Manual recovery required."
        )
    if behind > 0 and ahead > 0:
        errors.append(
            f"Non-fast-forward: local is {ahead} ahead AND {behind} behind origin/main. "
            "Fetch and ff-merge first."
        )
    if behind > 0 and ahead == 0:
        warnings.append(f"Local is {behind} commit(s) behind origin/main. Consider ff-merge.")

    # Dirty source (uncommitted SOURCE changes)
    dirty_src = dirty_source_files()
    if dirty_src:
        errors.append(
            f"Dirty uncommitted SOURCE files — commit them first:\n"
            + "\n".join(f"    {f}" for f in dirty_src)
        )

    # Fast-forward check: verify push would be FF
    if not errors:
        h = head_sha()
        o = origin_sha()
        if o:
            # Check if origin/main is an ancestor of HEAD (FF push)
            rc = git_rc("merge-base", "--is-ancestor", o, h)
            if rc != 0:
                errors.append(
                    "Push would not be fast-forward. origin/main is not an ancestor of HEAD."
                )

    # TypeScript check (SOFT gate — warns but does not hard-block)
    # NOTE: This project has 238 pre-existing TS errors present since before this guard
    # was installed (confirmed at origin/main).  Vite's production build succeeds despite
    # them.  The guard warns on TS failures to keep agents aware, but does NOT hard-block
    # because blocking would make all legitimate work impossible until a dedicated TS-fix
    # task is completed.  The production build is the hard gate.
    # When TS errors are fully resolved, change the conditional below to append to `errors`.
    print("  Running TypeScript check (cd frontend && npm run check)...")
    ts_rc, ts_out = run_typecheck()
    if ts_rc != 0:
        match = re.search(r"Found (\d+) errors? in (\d+) files?", ts_out)
        summary = match.group(0) if match else "TypeScript errors detected"
        warnings.append(
            f"TypeScript check: {summary} (pre-existing; soft-warn only — "
            "see scripts/workspace_guard.py for upgrade path)"
        )
        if args.verbose:
            print(ts_out[-3000:])
    else:
        print("  ✓ TypeScript check passed")

    # Production build
    print("  Running production build (npm run build)...")
    build_rc, build_out = run_build()
    if build_rc != 0:
        errors.append("Production build failed")
        print(build_out[-2000:])
    else:
        print("  ✓ Production build passed")

    # Targeted tests
    changed = changed_source_files_vs_origin()
    test_files = detect_relevant_tests(changed)
    if test_files:
        print(f"  Running targeted tests ({len(test_files)} file(s))...")
        test_rc, test_out = run_tests(test_files)
        if test_rc != 0:
            errors.append(f"Targeted tests failed")
            print(test_out[-2000:])
        else:
            # Extract pass/fail summary
            pass_match = re.search(r"pass\s+(\d+)", test_out)
            fail_match = re.search(r"fail\s+(\d+)", test_out)
            p = pass_match.group(1) if pass_match else "?"
            f_ = fail_match.group(1) if fail_match else "0"
            print(f"  ✓ Tests passed ({p} pass, {f_} fail)")
    else:
        print("  ℹ No targeted tests found for changed files — typecheck + build sufficient")

    # Summary
    print()
    if warnings:
        for w in warnings:
            print(f"  WARNING: {w}")

    if errors:
        print("PRE-PUSH FAILED:")
        for e in errors:
            print(f"  ✗ {e}")
        return 1

    print("PRE-PUSH PASSED — safe to push.")
    return 0


def cmd_prepublish(args: argparse.Namespace) -> int:
    fetch_origin()

    print("=== Pre-Publish Validation ===")
    errors: list[str] = []

    # Branch
    if current_branch() != "main":
        errors.append("Not on main branch")

    # Conflicts
    if has_conflicts():
        errors.append("Unresolved merge conflicts")

    # Dirty source
    dirty_src = dirty_source_files()
    if dirty_src:
        errors.append(
            "Dirty uncommitted SOURCE files:\n"
            + "\n".join(f"    {f}" for f in dirty_src)
        )

    # All authored source must be in origin/main
    case = git_case()
    if case in ("C-SOURCE", "D"):
        commits = commits_ahead()
        src_commits = [
            c for c in commits
            if any(classify_path(f) == "SOURCE" for f in c["files"])
        ]
        if src_commits:
            errors.append(
                f"Authored source changes not yet at origin/main ({len(src_commits)} commit(s)). "
                "Push first, then publish."
            )

    # TypeScript check (SOFT gate in prepublish — same reasoning as prepush)
    print("  Running TypeScript check...")
    ts_rc, ts_out = run_typecheck()
    if ts_rc != 0:
        match = re.search(r"Found (\d+) errors? in (\d+) files?", ts_out)
        summary = match.group(0) if match else "TypeScript errors"
        print(f"  ⚠ TypeScript: {summary} (pre-existing soft-warn; build is the hard gate)")
    else:
        print("  ✓ TypeScript check passed")

    # Production build
    print("  Running production build...")
    build_rc, build_out = run_build()
    if build_rc != 0:
        errors.append("Production build failed")
        print(build_out[-2000:])
    else:
        print("  ✓ Production build passed")

    if errors:
        print()
        print("PRE-PUBLISH FAILED:")
        for e in errors:
            print(f"  ✗ {e}")
        return 1

    # Smoke test
    if not args.skip_smoke:
        print("  Running server smoke test...")
        ok, msg = smoke_test_server()
        if not ok:
            print(f"  ✗ Smoke test failed: {msg}")
            # Smoke failure is a warning for publish (build is the hard gate)
            # but reported clearly
            print()
            print("PRE-PUBLISH: smoke test failed — review before publishing.")
            print("  (build passed; smoke failure may indicate runtime config issue)")
            return 1
        else:
            print(f"  ✓ {msg}")

    print()
    print("PRE-PUBLISH PASSED — safe to publish.")
    return 0


def cmd_postpublish(args: argparse.Namespace) -> int:
    fetch_origin()

    print("=== Post-Publish Classification ===")
    h = head_sha()
    o = origin_sha()
    print(f"Local HEAD:    {h[:12]}")
    print(f"origin/main:   {o[:12]}")
    print()

    ahead, behind = ahead_behind()
    if ahead == 0 and behind == 0:
        print("Local main is synchronized with origin/main. No publish commits to classify.")
        return 0

    if behind > 0:
        commits = []
        try:
            shas = git_out("rev-list", f"HEAD..origin/main").splitlines()
        except Exception:
            shas = []
        for sha in shas:
            subject = git_out("log", "-1", "--format=%s", sha)
            author = git_out("log", "-1", "--format=%an <%ae>", sha)
            files_out = git_out("diff-tree", "--no-commit-id", "-r", "--name-only", sha)
            files = [f for f in files_out.splitlines() if f]
            all_generated = all(classify_path(f) == "GENERATED" for f in files) if files else True
            tag = "GENERATED-ONLY" if all_generated else "CONTAINS-SOURCE"
            print(f"  {sha[:8]} [{tag}] {subject}")
            print(f"           author: {author}")
            for f in files:
                print(f"           {classify_path(f):9s}  {f}")
        print()

        if all(
            all(classify_path(f) == "GENERATED" for f in
                git_out("diff-tree", "--no-commit-id", "-r", "--name-only", sha).splitlines()
                if f)
            for sha in shas
        ):
            print("All new origin/main commits are GENERATED-ONLY — source is safe.")
        else:
            print("WARNING: origin/main contains SOURCE commits not in local HEAD.")
            print("Run: git fetch origin && git merge --ff-only origin/main")

    if ahead > 0:
        commits = commits_ahead()
        print(f"Local has {ahead} commit(s) ahead of origin/main:")
        for c in commits:
            src = [f for f in c["files"] if classify_path(f) == "SOURCE"]
            tag = "SOURCE" if src else "GENERATED"
            print(f"  {c['sha'][:8]} [{tag}] {c['subject']}")

    return 0


def cmd_release(args: argparse.Namespace) -> int:
    claim = load_claim()
    if not claim:
        print("No active claim to release.")
        return 0

    age = claim_age_seconds(claim)
    stale = is_stale(claim)

    if stale and not args.force:
        print(f"ERROR: Lock held by '{claim.get('actor')}' is STALE ({format_age(age)}).")
        print("Stale locks are NOT auto-released to avoid overriding long-running tasks.")
        print("Run with --force only after explicit user authorization:")
        print("  python scripts/workspace_guard.py release --force")
        return 1

    CLAIM_FILE.unlink(missing_ok=True)
    marker = " [STALE — force-released]" if stale else ""
    print(f"Lock released{marker}.")
    print(f"  actor: {claim.get('actor')}")
    print(f"  task:  {claim.get('task')}")
    print(f"  age:   {format_age(age)}")
    return 0


def cmd_install_hooks(args: argparse.Namespace) -> int:
    hooks_dir = REPO_ROOT / ".githooks"
    if not hooks_dir.exists():
        print(f"ERROR: .githooks/ directory not found at {hooks_dir}")
        print("Create it first, then run install-hooks.")
        return 1

    hook = hooks_dir / "pre-push"
    if not hook.exists():
        print(f"ERROR: .githooks/pre-push not found.")
        return 1

    result = subprocess.run(
        ["git", "config", "core.hooksPath", ".githooks"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"ERROR: git config failed: {result.stderr}")
        return 1

    # Verify
    val = git_out("config", "core.hooksPath")
    print(f"Hooks path configured: core.hooksPath = {val}")
    print(f"Pre-push hook: {hook}")
    print("Git hooks installed successfully.")
    return 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="CaelynAI Frontend Workspace Guard",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # claim
    p_claim = sub.add_parser("claim", help="Claim the workspace")
    p_claim.add_argument("--actor", required=True,
                         help="Agent or user identity (e.g. deepseek, codex, replit-agent, manual)")
    p_claim.add_argument("--task", required=True, help="Short task description")

    # status
    sub.add_parser("status", help="Show workspace status")

    # preflight
    sub.add_parser("preflight", help="Check preconditions before editing")

    # prepush
    p_prepush = sub.add_parser("prepush", help="Full validation gate before git push")
    p_prepush.add_argument("--verbose", action="store_true",
                           help="Show full TypeScript error output")

    # prepublish
    p_prepublish = sub.add_parser("prepublish", help="Strict gate before Replit publish")
    p_prepublish.add_argument("--skip-smoke", action="store_true",
                              help="Skip production server smoke test")

    # postpublish
    sub.add_parser("postpublish", help="Read-only post-publish classification")

    # release
    p_release = sub.add_parser("release", help="Release workspace lock")
    p_release.add_argument("--force", action="store_true",
                           help="Force-release a stale lock (requires explicit user authorization)")

    # install-hooks
    sub.add_parser("install-hooks", help="Configure git core.hooksPath to .githooks/")

    args = parser.parse_args()

    dispatch = {
        "claim": cmd_claim,
        "status": cmd_status,
        "preflight": cmd_preflight,
        "prepush": cmd_prepush,
        "prepublish": cmd_prepublish,
        "postpublish": cmd_postpublish,
        "release": cmd_release,
        "install-hooks": cmd_install_hooks,
    }
    return dispatch[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
