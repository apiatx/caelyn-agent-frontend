#!/usr/bin/env python3
"""
CaelynAI Frontend — Workspace Guard Tests
==========================================
Covers: classifier, lock, git cases, prepush gates, prepublish gates, targeted tests.
Uses temporary git repositories for git-state tests — never touches live history.

Run:
    python3 scripts/tests/test_workspace_guard.py
"""

import json
import os
import subprocess
import sys
import tempfile
import textwrap
import time
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add scripts/ to path so we can import workspace_guard
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))
import workspace_guard as wg


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_temp_repo(initial_file: str = "src/main.ts") -> Path:
    """Create a minimal git repo in a temp dir. Returns the repo path."""
    d = Path(tempfile.mkdtemp())
    subprocess.run(["git", "init", "-b", "main"], cwd=d, check=True,
                   capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@test.com"], cwd=d,
                   check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "Test"], cwd=d,
                   check=True, capture_output=True)
    # Initial commit
    src = d / initial_file
    src.parent.mkdir(parents=True, exist_ok=True)
    src.write_text("export const x = 1;\n")
    subprocess.run(["git", "add", "."], cwd=d, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=d, check=True,
                   capture_output=True)
    return d


def git_in(repo: Path, *args: str) -> str:
    r = subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True,
                       check=True)
    return r.stdout.strip()


def add_commit(repo: Path, filepath: str, content: str, message: str) -> str:
    f = repo / filepath
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(content)
    subprocess.run(["git", "add", str(f)], cwd=repo, check=True,
                   capture_output=True)
    subprocess.run(["git", "commit", "-m", message], cwd=repo, check=True,
                   capture_output=True)
    return git_in(repo, "rev-parse", "HEAD")


# ---------------------------------------------------------------------------
# 1. Classifier tests
# ---------------------------------------------------------------------------

class TestClassifier(unittest.TestCase):

    def test_ts_file_is_source(self):
        self.assertEqual(wg.classify_path("frontend/client/src/pages/watchlist.tsx"), "SOURCE")

    def test_js_file_is_source(self):
        self.assertEqual(wg.classify_path("frontend/server/routes.js"), "SOURCE")

    def test_css_file_is_source(self):
        self.assertEqual(wg.classify_path("frontend/client/src/styles/globals.css"), "SOURCE")

    def test_package_json_is_source(self):
        self.assertEqual(wg.classify_path("package.json"), "SOURCE")
        self.assertEqual(wg.classify_path("frontend/package.json"), "SOURCE")

    def test_tsconfig_is_source(self):
        self.assertEqual(wg.classify_path("tsconfig.json"), "SOURCE")
        self.assertEqual(wg.classify_path("frontend/tsconfig.json"), "SOURCE")
        self.assertEqual(wg.classify_path("tsconfig.app.json"), "SOURCE")

    def test_vite_config_is_source(self):
        self.assertEqual(wg.classify_path("vite.config.ts"), "SOURCE")
        self.assertEqual(wg.classify_path("frontend/vite.config.ts"), "SOURCE")

    def test_agents_md_is_source(self):
        self.assertEqual(wg.classify_path("AGENTS.md"), "SOURCE")

    def test_replit_is_source(self):
        self.assertEqual(wg.classify_path(".replit"), "SOURCE")

    def test_scripts_dir_is_source(self):
        self.assertEqual(wg.classify_path("scripts/workspace_guard.py"), "SOURCE")
        self.assertEqual(wg.classify_path("scripts/tests/test_workspace_guard.py"), "SOURCE")

    def test_githooks_is_source(self):
        self.assertEqual(wg.classify_path(".githooks/pre-push"), "SOURCE")

    def test_tests_are_source(self):
        self.assertEqual(
            wg.classify_path("frontend/client/src/pages/__tests__/watchlist-recovery-resilience.test.ts"),
            "SOURCE"
        )

    def test_market_cache_is_generated(self):
        self.assertEqual(wg.classify_path("frontend/market-overview-cache.json"), "GENERATED")

    def test_opencode_reports_is_generated(self):
        self.assertEqual(wg.classify_path(".opencode-reports/latest.md"), "GENERATED")
        self.assertEqual(
            wg.classify_path(".opencode-reports/TASK_1234.txt"),
            "GENERATED"
        )

    def test_codex_reports_is_generated(self):
        self.assertEqual(wg.classify_path(".codex-reports/latest.md"), "GENERATED")

    def test_agent_state_is_generated(self):
        self.assertEqual(wg.classify_path(".agent-state/claim.json"), "GENERATED")

    def test_attached_assets_is_generated(self):
        self.assertEqual(
            wg.classify_path("attached_assets/Pasted-TASK-DESCRIPTION.txt"),
            "GENERATED"
        )
        self.assertEqual(
            wg.classify_path("frontend/attached_assets/Pasted-anything.txt"),
            "GENERATED"
        )

    def test_unknown_attached_assets_remain_source(self):
        self.assertEqual(wg.classify_path("attached_assets/logo.png"), "SOURCE")
        self.assertEqual(wg.classify_path("frontend/attached_assets/photo.jpg"), "SOURCE")

    def test_unknown_json_is_source_conservative(self):
        # Any JSON not in the explicit generated list defaults to SOURCE
        self.assertEqual(wg.classify_path("some-config.json"), "SOURCE")
        self.assertEqual(wg.classify_path("frontend/drizzle.config.json"), "SOURCE")

    def test_drizzle_config_ts_is_source(self):
        self.assertEqual(wg.classify_path("drizzle.config.ts"), "SOURCE")


# ---------------------------------------------------------------------------
# 2. Lock / claim tests
# ---------------------------------------------------------------------------

class TestLock(unittest.TestCase):

    def setUp(self):
        self.tmpdir = Path(tempfile.mkdtemp())
        self.claim_file = self.tmpdir / "claim.json"
        # Patch CLAIM_FILE
        self._orig_claim = wg.CLAIM_FILE
        wg.CLAIM_FILE = self.claim_file

    def tearDown(self):
        wg.CLAIM_FILE = self._orig_claim

    def _write_claim(self, actor="test-agent", task="test task",
                     age_seconds=0):
        data = {
            "actor": actor,
            "task": task,
            "timestamp": time.time() - age_seconds,
            "started_at": "2026-01-01T00:00:00+00:00",
            "starting_head": "abc123",
            "starting_origin_main": "def456",
            "workspace": "/home/runner/workspace",
            "branch": "main",
        }
        self.claim_file.parent.mkdir(parents=True, exist_ok=True)
        self.claim_file.write_text(json.dumps(data))
        return data

    def test_no_claim_returns_none(self):
        self.assertIsNone(wg.load_claim())

    def test_claim_saved_and_loaded(self):
        wg.save_claim({"actor": "codex", "task": "test", "timestamp": time.time()})
        c = wg.load_claim()
        self.assertEqual(c["actor"], "codex")

    def test_active_claim_not_stale(self):
        self._write_claim(age_seconds=100)
        self.assertFalse(wg.is_stale(wg.load_claim()))

    def test_stale_claim_flagged(self):
        self._write_claim(age_seconds=25 * 3600)  # 25 hours
        self.assertTrue(wg.is_stale(wg.load_claim()))

    def test_stale_claim_not_auto_released(self):
        """Stale lock must remain until --force is given."""
        self._write_claim(age_seconds=25 * 3600)
        args = MagicMock(force=False)
        rc = wg.cmd_release(args)
        self.assertEqual(rc, 1)
        self.assertTrue(self.claim_file.exists(), "Claim file must still exist")

    def test_force_release_removes_stale_claim(self):
        self._write_claim(age_seconds=25 * 3600)
        args = MagicMock(force=True)
        rc = wg.cmd_release(args)
        self.assertEqual(rc, 0)
        self.assertFalse(self.claim_file.exists())

    def test_normal_release_removes_fresh_claim(self):
        self._write_claim(age_seconds=60)
        args = MagicMock(force=False)
        rc = wg.cmd_release(args)
        self.assertEqual(rc, 0)
        self.assertFalse(self.claim_file.exists())

    def test_manual_claim_blocks_agents(self):
        """While a non-stale manual claim exists, preflight should block other actors."""
        self._write_claim(actor="manual", task="reviewing code", age_seconds=5)
        # preflight checks lock — a non-stale lock held by any actor (including manual)
        # should surface as an error for a different incoming actor
        # We simulate by calling load_claim and checking is_stale
        claim = wg.load_claim()
        self.assertFalse(wg.is_stale(claim))
        self.assertEqual(claim["actor"], "manual")


class TestPreflight(unittest.TestCase):

    def _args(self, actor=None):
        return MagicMock(actor=actor)

    def _run(self, claim=None, actor=None, stale=False):
        with patch.object(wg, "fetch_origin"), \
             patch.object(wg, "current_branch", return_value="main"), \
             patch.object(wg, "has_conflicts", return_value=False), \
             patch.object(wg, "git_out", return_value=str(wg.REPO_ROOT)), \
             patch.object(wg, "git_case", return_value="A"), \
             patch.object(wg, "ahead_behind", return_value=(0, 0)), \
             patch.object(wg, "load_claim", return_value=claim), \
             patch.object(wg, "claim_age_seconds", return_value=60), \
             patch.object(wg, "is_stale", return_value=stale):
            return wg.cmd_preflight(self._args(actor))

    def test_no_lock_case_a_passes(self):
        self.assertEqual(self._run(), 0)

    def test_same_actor_active_lock_passes(self):
        self.assertEqual(
            self._run(claim={"actor": "replit-agent"}, actor="replit-agent"),
            0,
        )

    def test_different_actor_active_lock_fails(self):
        self.assertEqual(
            self._run(claim={"actor": "deepseek"}, actor="replit-agent"),
            1,
        )

    def test_active_non_manual_lock_without_actor_fails(self):
        self.assertEqual(self._run(claim={"actor": "replit-agent"}), 1)

    def test_stale_lock_remains_warning_not_blocker(self):
        self.assertEqual(
            self._run(claim={"actor": "deepseek"}, actor="replit-agent", stale=True),
            0,
        )


# ---------------------------------------------------------------------------
# 3. Git-state / Case tests (use temp repos)
# ---------------------------------------------------------------------------

class TestGitCases(unittest.TestCase):

    def _make_synced_pair(self):
        """Create origin + clone repos both at the same commit (Case A)."""
        origin = make_temp_repo("src/app.ts")
        clone_dir = Path(tempfile.mkdtemp())
        subprocess.run(["git", "clone", str(origin), str(clone_dir)],
                       check=True, capture_output=True)
        # Configure user in clone
        subprocess.run(["git", "config", "user.email", "test@test.com"],
                       cwd=clone_dir, check=True, capture_output=True)
        subprocess.run(["git", "config", "user.name", "Test"],
                       cwd=clone_dir, check=True, capture_output=True)
        return origin, clone_dir

    def _ahead_behind(self, repo: Path):
        out = git_in(repo, "rev-list", "--left-right", "--count",
                     "HEAD...origin/main")
        parts = out.split()
        return int(parts[0]), int(parts[1])

    def test_case_a_synced(self):
        """Case A: HEAD == origin/main — 0 ahead, 0 behind."""
        origin, clone = self._make_synced_pair()
        a, b = self._ahead_behind(clone)
        self.assertEqual(a, 0)
        self.assertEqual(b, 0)

    def test_case_b_behind(self):
        """Case B: local behind, no divergence."""
        origin, clone = self._make_synced_pair()
        # Add commit to origin directly
        add_commit(origin, "src/new.ts", "export const y = 2;", "add y")
        # Fetch in clone
        subprocess.run(["git", "fetch", "origin"], cwd=clone,
                       check=True, capture_output=True)
        a, b = self._ahead_behind(clone)
        self.assertEqual(a, 0)
        self.assertGreater(b, 0)

    def test_case_c_generated(self):
        """Case C-GENERATED: ahead with only generated commits."""
        origin, clone = self._make_synced_pair()
        # Add a generated-only commit to clone
        add_commit(clone, "frontend/market-overview-cache.json",
                   '{"data": []}', "Update market cache")
        # Don't push to origin
        subprocess.run(["git", "fetch", "origin"], cwd=clone,
                       check=True, capture_output=True)
        a, b = self._ahead_behind(clone)
        self.assertGreater(a, 0)
        self.assertEqual(b, 0)

        # Now check classification via classify_commits
        shas = git_in(clone, "rev-list", "origin/main..HEAD").splitlines()
        commits = []
        for sha in shas:
            subj = git_in(clone, "log", "-1", "--format=%s", sha)
            files_out = git_in(clone, "diff-tree", "--no-commit-id", "-r",
                               "--name-only", sha)
            files = [f for f in files_out.splitlines() if f]
            commits.append({"sha": sha, "subject": subj, "files": files})
        kind = wg.classify_commits(commits)
        self.assertEqual(kind, "C-GENERATED")

    def test_case_c_source(self):
        """Case C-SOURCE: ahead with source file commit."""
        origin, clone = self._make_synced_pair()
        add_commit(clone, "frontend/client/src/pages/watchlist.tsx",
                   "export const X = 1;", "fix: watchlist patch")
        subprocess.run(["git", "fetch", "origin"], cwd=clone,
                       check=True, capture_output=True)

        shas = git_in(clone, "rev-list", "origin/main..HEAD").splitlines()
        commits = []
        for sha in shas:
            subj = git_in(clone, "log", "-1", "--format=%s", sha)
            files_out = git_in(clone, "diff-tree", "--no-commit-id", "-r",
                               "--name-only", sha)
            files = [f for f in files_out.splitlines() if f]
            commits.append({"sha": sha, "subject": subj, "files": files})
        kind = wg.classify_commits(commits)
        self.assertEqual(kind, "C-SOURCE")

    def test_case_d_divergence(self):
        """Case D: true divergence — both ahead and behind."""
        origin, clone = self._make_synced_pair()
        # Add commit to origin
        add_commit(origin, "src/origin-change.ts", "export const o = 1;", "origin-side")
        # Add DIFFERENT commit to clone without pulling
        add_commit(clone, "src/clone-change.ts", "export const c = 1;", "clone-side")
        # Fetch so clone knows about origin's new commit
        subprocess.run(["git", "fetch", "origin"], cwd=clone,
                       check=True, capture_output=True)
        a, b = self._ahead_behind(clone)
        self.assertGreater(a, 0)
        self.assertGreater(b, 0)

    def test_replit_generated_publish_commit_accepted(self):
        """A Replit 'Published your App' commit touching only generated files is C-GENERATED."""
        commits = [{
            "sha": "abc123",
            "subject": "Published your App",
            "files": ["frontend/market-overview-cache.json"],
        }]
        self.assertEqual(wg.classify_commits(commits), "C-GENERATED")

    def test_non_ff_push_detection(self):
        """
        Non-fast-forward: origin has commits local doesn't → push should be blocked.
        We verify merge-base logic: if origin/main is NOT an ancestor of HEAD,
        the guard should detect non-FF.
        """
        origin, clone = self._make_synced_pair()
        # Advance origin
        add_commit(origin, "src/adv.ts", "1", "advance-origin")
        # Advance clone independently (divergence)
        add_commit(clone, "src/cloneadv.ts", "2", "advance-clone")
        subprocess.run(["git", "fetch", "origin"], cwd=clone,
                       check=True, capture_output=True)
        clone_head = git_in(clone, "rev-parse", "HEAD")
        origin_sha = git_in(clone, "rev-parse", "origin/main")
        # merge-base --is-ancestor should fail (origin is NOT ancestor of clone HEAD)
        rc = subprocess.run(
            ["git", "merge-base", "--is-ancestor", origin_sha, clone_head],
            cwd=clone, capture_output=True
        ).returncode
        self.assertNotEqual(rc, 0, "origin/main should NOT be ancestor of clone HEAD in diverged case")


class TestSync(unittest.TestCase):

    def setUp(self):
        self.original_root = wg.REPO_ROOT

    def tearDown(self):
        wg.REPO_ROOT = self.original_root

    def make_pair(self):
        origin = make_temp_repo("src/app.ts")
        clone = Path(tempfile.mkdtemp())
        subprocess.run(["git", "clone", str(origin), str(clone)], check=True,
                       capture_output=True)
        git_in(clone, "config", "user.email", "test@test.com")
        git_in(clone, "config", "user.name", "Test")
        wg.REPO_ROOT = clone
        return origin, clone

    def run_sync(self):
        return wg.cmd_sync(MagicMock())

    def test_equal_is_successful_no_op(self):
        _origin, clone = self.make_pair()
        before = git_in(clone, "rev-parse", "HEAD")
        self.assertEqual(self.run_sync(), 0)
        self.assertEqual(git_in(clone, "rev-parse", "HEAD"), before)

    def test_behind_only_fast_forwards(self):
        origin, clone = self.make_pair()
        expected = add_commit(origin, "src/new.ts", "export const y = 2;\n", "advance")
        self.assertEqual(self.run_sync(), 0)
        self.assertEqual(git_in(clone, "rev-parse", "HEAD"), expected)

    def test_multiple_generated_commits_are_reconciled(self):
        _origin, clone = self.make_pair()
        add_commit(clone, "attached_assets/Pasted-task.txt", "task\n", "instructions")
        add_commit(clone, "frontend/market-overview-cache.json", "{}\n", "cache")
        subprocess.run(["git", "commit", "--allow-empty", "-m", "Published your App"],
                       cwd=clone, check=True, capture_output=True)
        self.assertEqual(self.run_sync(), 0)
        self.assertEqual(
            git_in(clone, "rev-list", "--left-right", "--count", "HEAD...origin/main"),
            "0\t0",
        )
        self.assertTrue((clone / "attached_assets/Pasted-task.txt").exists())
        self.assertTrue((clone / "frontend/market-overview-cache.json").exists())

    def test_attached_assets_only_commit_is_reconciled(self):
        _origin, clone = self.make_pair()
        add_commit(clone, "attached_assets/Pasted-task.txt", "task\n", "instructions")
        self.assertEqual(self.run_sync(), 0)
        self.assertEqual(git_in(clone, "rev-list", "--count", "origin/main..HEAD"), "0")

    def test_market_cache_only_commit_is_reconciled(self):
        _origin, clone = self.make_pair()
        add_commit(clone, "frontend/market-overview-cache.json", "{}\n", "cache")
        self.assertEqual(self.run_sync(), 0)
        self.assertEqual(git_in(clone, "rev-list", "--count", "origin/main..HEAD"), "0")

    def test_agents_ahead_refuses(self):
        _origin, clone = self.make_pair()
        add_commit(clone, "AGENTS.md", "source\n", "source docs")
        before = git_in(clone, "rev-parse", "HEAD")
        self.assertEqual(self.run_sync(), 1)
        self.assertEqual(git_in(clone, "rev-parse", "HEAD"), before)

    def test_executable_source_ahead_refuses(self):
        _origin, _clone = self.make_pair()
        add_commit(wg.REPO_ROOT, "frontend/client/src/app.tsx",
                   "export const App = 1;\n", "source")
        self.assertEqual(self.run_sync(), 1)

    def test_dirty_and_staged_source_refuse(self):
        _origin, clone = self.make_pair()
        (clone / "src/app.ts").write_text("dirty\n")
        self.assertEqual(self.run_sync(), 1)
        subprocess.run(["git", "add", "src/app.ts"], cwd=clone, check=True)
        self.assertEqual(self.run_sync(), 1)

    def test_committed_source_to_generated_rename_refuses(self):
        _origin, clone = self.make_pair()
        destination = clone / "attached_assets/Pasted-app.ts"
        destination.parent.mkdir(parents=True, exist_ok=True)
        (clone / "src/app.ts").rename(destination)
        subprocess.run(["git", "add", "-A"], cwd=clone, check=True)
        subprocess.run(["git", "commit", "-m", "rename source"], cwd=clone,
                       check=True, capture_output=True)
        before = git_in(clone, "rev-parse", "HEAD")
        self.assertEqual(self.run_sync(), 1)
        self.assertEqual(git_in(clone, "rev-parse", "HEAD"), before)

    def test_source_change_in_merge_commit_refuses(self):
        _origin, clone = self.make_pair()
        git_in(clone, "checkout", "-b", "generated-side")
        add_commit(clone, "attached_assets/Pasted-side.txt", "side\n", "side generated")
        git_in(clone, "checkout", "main")
        add_commit(clone, "attached_assets/Pasted-main.txt", "main\n", "main generated")
        subprocess.run(
            ["git", "merge", "--no-ff", "--no-commit", "generated-side"],
            cwd=clone, check=True, capture_output=True,
        )
        (clone / "src/app.ts").write_text("export const merged = true;\n")
        subprocess.run(["git", "add", "src/app.ts"], cwd=clone, check=True)
        subprocess.run(["git", "commit", "-m", "merge with source resolution"],
                       cwd=clone, check=True, capture_output=True)
        before = git_in(clone, "rev-parse", "HEAD")
        self.assertEqual(self.run_sync(), 1)
        self.assertEqual(git_in(clone, "rev-parse", "HEAD"), before)

    def test_staged_source_to_generated_rename_refuses(self):
        _origin, clone = self.make_pair()
        destination = clone / "attached_assets/Pasted-app.ts"
        destination.parent.mkdir(parents=True, exist_ok=True)
        (clone / "src/app.ts").rename(destination)
        subprocess.run(["git", "add", "-A"], cwd=clone, check=True)
        self.assertEqual(self.run_sync(), 1)
        self.assertTrue(destination.exists())

    def test_unstaged_source_to_generated_rename_refuses(self):
        _origin, clone = self.make_pair()
        destination = clone / "attached_assets/Pasted-app.ts"
        destination.parent.mkdir(parents=True, exist_ok=True)
        (clone / "src/app.ts").rename(destination)
        self.assertEqual(self.run_sync(), 1)
        self.assertTrue(destination.exists())

    def test_divergence_refuses(self):
        origin, clone = self.make_pair()
        add_commit(origin, "src/origin.ts", "origin\n", "origin")
        add_commit(clone, "attached_assets/Pasted-local.txt", "local\n", "local")
        before = git_in(clone, "rev-parse", "HEAD")
        self.assertEqual(self.run_sync(), 1)
        self.assertEqual(git_in(clone, "rev-parse", "HEAD"), before)

    def test_wrong_branch_refuses(self):
        _origin, clone = self.make_pair()
        git_in(clone, "checkout", "-b", "feature")
        self.assertEqual(self.run_sync(), 1)

    def test_git_operation_in_progress_refuses(self):
        _origin, clone = self.make_pair()
        before = git_in(clone, "rev-parse", "HEAD")
        with patch.object(wg, "git_operation_in_progress", return_value="merge"):
            self.assertEqual(self.run_sync(), 1)
        self.assertEqual(git_in(clone, "rev-parse", "HEAD"), before)

    def test_sync_never_changes_remote_ref(self):
        origin, clone = self.make_pair()
        remote_before = git_in(origin, "rev-parse", "main")
        add_commit(clone, "attached_assets/Pasted-task.txt", "task\n", "generated")
        self.assertEqual(self.run_sync(), 0)
        self.assertEqual(git_in(origin, "rev-parse", "main"), remote_before)


# ---------------------------------------------------------------------------
# 4. Sync command and dirty-file tests
# ---------------------------------------------------------------------------

class TestDirtyFiles(unittest.TestCase):

    def test_dirty_ts_source_rejected(self):
        """dirty_source_files() should include .ts files."""
        with patch.object(
            wg,
            "git_out",
            side_effect=lambda *args: (
                "frontend/client/src/pages/watchlist.tsx"
                if args == ("diff", "--no-renames", "--name-only")
                else ""
            ),
        ):
            result = wg.dirty_source_files()
            self.assertIn("frontend/client/src/pages/watchlist.tsx", result)

    def test_dirty_tsx_source_rejected(self):
        with patch.object(
            wg,
            "git_out",
            side_effect=lambda *args: (
                "frontend/client/src/components/Foo.tsx"
                if args == ("diff", "--cached", "--no-renames", "--name-only")
                else ""
            ),
        ):
            result = wg.dirty_source_files()
            self.assertIn("frontend/client/src/components/Foo.tsx", result)

    def test_dirty_market_cache_accepted(self):
        """market-overview-cache.json is GENERATED — should NOT appear in dirty_source_files."""
        with patch.object(
            wg,
            "git_out",
            side_effect=lambda *args: (
                "frontend/market-overview-cache.json"
                if args == ("diff", "--no-renames", "--name-only")
                else ""
            ),
        ):
            result = wg.dirty_source_files()
            self.assertNotIn("frontend/market-overview-cache.json", result)


# ---------------------------------------------------------------------------
# 5. Targeted test selection tests
# ---------------------------------------------------------------------------

class TestTargetedTests(unittest.TestCase):

    def test_watchlist_changes_select_watchlist_tests(self):
        changed = [
            "frontend/client/src/pages/watchlist.tsx",
            "frontend/client/src/lib/watchlist-theme-taxonomy.ts",
        ]
        # Mock existing test discovery
        fake_tests = [
            Path("/repo/frontend/client/src/pages/__tests__/watchlist-recovery-resilience.test.ts"),
            Path("/repo/frontend/client/src/pages/__tests__/other-page.test.ts"),
        ]
        with patch.object(Path, "exists", return_value=True), \
             patch.object(Path, "glob", return_value=fake_tests):
            selected = wg.detect_relevant_tests(changed)
        self.assertTrue(any("watchlist" in t for t in selected))

    def test_unrelated_changes_no_test_forced(self):
        changed = ["frontend/server/routes.ts"]
        # With no matching test files
        with patch.object(Path, "exists", return_value=False):
            selected = wg.detect_relevant_tests(changed)
        self.assertEqual(selected, [])


# ---------------------------------------------------------------------------
# 6. Prepush gate unit tests
# ---------------------------------------------------------------------------

class TestPrepushGates(unittest.TestCase):

    def _make_args(self, verbose=False):
        return MagicMock(verbose=verbose)

    def test_wrong_branch_rejected(self):
        with patch.object(wg, "fetch_origin"), \
             patch.object(wg, "current_branch", return_value="feature-x"), \
             patch.object(wg, "has_conflicts", return_value=False), \
             patch.object(wg, "git_case", return_value="A"), \
             patch.object(wg, "ahead_behind", return_value=(0, 0)), \
             patch.object(wg, "dirty_source_files", return_value=[]), \
             patch.object(wg, "head_sha", return_value="abc"), \
             patch.object(wg, "origin_sha", return_value="abc"), \
             patch.object(wg, "run_typecheck", return_value=(0, "")), \
             patch.object(wg, "run_build", return_value=(0, "")), \
             patch.object(wg, "changed_source_files_vs_origin", return_value=[]), \
             patch.object(wg, "detect_relevant_tests", return_value=[]):
            rc = wg.cmd_prepush(self._make_args())
        self.assertEqual(rc, 1)

    def test_correct_branch_passes_basic(self):
        with patch.object(wg, "fetch_origin"), \
             patch.object(wg, "current_branch", return_value="main"), \
             patch.object(wg, "has_conflicts", return_value=False), \
             patch.object(wg, "git_case", return_value="A"), \
             patch.object(wg, "ahead_behind", return_value=(0, 0)), \
             patch.object(wg, "dirty_source_files", return_value=[]), \
             patch.object(wg, "head_sha", return_value="abc"), \
             patch.object(wg, "origin_sha", return_value="abc"), \
             patch.object(wg, "git_rc", return_value=0), \
             patch.object(wg, "run_typecheck", return_value=(0, "")), \
             patch.object(wg, "run_build", return_value=(0, "")), \
             patch.object(wg, "changed_source_files_vs_origin", return_value=[]), \
             patch.object(wg, "detect_relevant_tests", return_value=[]):
            rc = wg.cmd_prepush(self._make_args())
        self.assertEqual(rc, 0)

    def test_divergence_rejected(self):
        with patch.object(wg, "fetch_origin"), \
             patch.object(wg, "current_branch", return_value="main"), \
             patch.object(wg, "has_conflicts", return_value=False), \
             patch.object(wg, "git_case", return_value="D"), \
             patch.object(wg, "ahead_behind", return_value=(2, 1)), \
             patch.object(wg, "dirty_source_files", return_value=[]), \
             patch.object(wg, "run_typecheck", return_value=(0, "")), \
             patch.object(wg, "run_build", return_value=(0, "")), \
             patch.object(wg, "changed_source_files_vs_origin", return_value=[]), \
             patch.object(wg, "detect_relevant_tests", return_value=[]):
            rc = wg.cmd_prepush(self._make_args())
        self.assertEqual(rc, 1)

    def test_dirty_source_rejected(self):
        with patch.object(wg, "fetch_origin"), \
             patch.object(wg, "current_branch", return_value="main"), \
             patch.object(wg, "has_conflicts", return_value=False), \
             patch.object(wg, "git_case", return_value="A"), \
             patch.object(wg, "ahead_behind", return_value=(0, 0)), \
             patch.object(wg, "dirty_source_files",
                          return_value=["frontend/client/src/pages/watchlist.tsx"]), \
             patch.object(wg, "run_typecheck", return_value=(0, "")), \
             patch.object(wg, "run_build", return_value=(0, "")), \
             patch.object(wg, "changed_source_files_vs_origin", return_value=[]), \
             patch.object(wg, "detect_relevant_tests", return_value=[]):
            rc = wg.cmd_prepush(self._make_args())
        self.assertEqual(rc, 1)

    def test_typecheck_failure_is_soft_warn_not_hard_block(self):
        """TS errors are a soft-warn: push succeeds but warning is emitted."""
        with patch.object(wg, "fetch_origin"), \
             patch.object(wg, "current_branch", return_value="main"), \
             patch.object(wg, "has_conflicts", return_value=False), \
             patch.object(wg, "git_case", return_value="A"), \
             patch.object(wg, "ahead_behind", return_value=(0, 0)), \
             patch.object(wg, "dirty_source_files", return_value=[]), \
             patch.object(wg, "head_sha", return_value="abc"), \
             patch.object(wg, "origin_sha", return_value="abc"), \
             patch.object(wg, "git_rc", return_value=0), \
             patch.object(wg, "run_typecheck",
                          return_value=(1, "Found 238 errors in 39 files.")), \
             patch.object(wg, "run_build", return_value=(0, "")), \
             patch.object(wg, "changed_source_files_vs_origin", return_value=[]), \
             patch.object(wg, "detect_relevant_tests", return_value=[]):
            rc = wg.cmd_prepush(self._make_args())
        # TS failure is a WARNING, not a hard block — push should succeed (rc=0)
        self.assertEqual(rc, 0)

    def test_build_failure_rejected(self):
        with patch.object(wg, "fetch_origin"), \
             patch.object(wg, "current_branch", return_value="main"), \
             patch.object(wg, "has_conflicts", return_value=False), \
             patch.object(wg, "git_case", return_value="A"), \
             patch.object(wg, "ahead_behind", return_value=(0, 0)), \
             patch.object(wg, "dirty_source_files", return_value=[]), \
             patch.object(wg, "head_sha", return_value="abc"), \
             patch.object(wg, "origin_sha", return_value="abc"), \
             patch.object(wg, "run_typecheck", return_value=(0, "")), \
             patch.object(wg, "run_build", return_value=(1, "Build failed")), \
             patch.object(wg, "changed_source_files_vs_origin", return_value=[]), \
             patch.object(wg, "detect_relevant_tests", return_value=[]):
            rc = wg.cmd_prepush(self._make_args())
        self.assertEqual(rc, 1)


# ---------------------------------------------------------------------------
# 7. Prepublish gate unit tests
# ---------------------------------------------------------------------------

class TestPrepublishGates(unittest.TestCase):

    def test_dirty_source_rejected(self):
        with patch.object(wg, "fetch_origin"), \
             patch.object(wg, "current_branch", return_value="main"), \
             patch.object(wg, "has_conflicts", return_value=False), \
             patch.object(wg, "dirty_source_files",
                          return_value=["frontend/client/src/pages/watchlist.tsx"]), \
             patch.object(wg, "git_case", return_value="A"), \
             patch.object(wg, "run_typecheck", return_value=(0, "")), \
             patch.object(wg, "run_build", return_value=(0, "")):
            args = MagicMock(skip_smoke=True)
            rc = wg.cmd_prepublish(args)
        self.assertEqual(rc, 1)

    def test_unpushed_source_rejected(self):
        """C-SOURCE commits ahead = unpushed source → prepublish must fail."""
        with patch.object(wg, "fetch_origin"), \
             patch.object(wg, "current_branch", return_value="main"), \
             patch.object(wg, "has_conflicts", return_value=False), \
             patch.object(wg, "dirty_source_files", return_value=[]), \
             patch.object(wg, "git_case", return_value="C-SOURCE"), \
             patch.object(wg, "commits_ahead", return_value=[{
                 "sha": "abc",
                 "subject": "fix: something",
                 "files": ["frontend/client/src/pages/watchlist.tsx"],
             }]), \
             patch.object(wg, "run_typecheck", return_value=(0, "")), \
             patch.object(wg, "run_build", return_value=(0, "")):
            args = MagicMock(skip_smoke=True)
            rc = wg.cmd_prepublish(args)
        self.assertEqual(rc, 1)

    def test_clean_synced_passes(self):
        with patch.object(wg, "fetch_origin"), \
             patch.object(wg, "current_branch", return_value="main"), \
             patch.object(wg, "has_conflicts", return_value=False), \
             patch.object(wg, "dirty_source_files", return_value=[]), \
             patch.object(wg, "git_case", return_value="A"), \
             patch.object(wg, "run_typecheck", return_value=(0, "")), \
             patch.object(wg, "run_build", return_value=(0, "")):
            args = MagicMock(skip_smoke=True)
            rc = wg.cmd_prepublish(args)
        self.assertEqual(rc, 0)


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromModule(sys.modules[__name__])
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
