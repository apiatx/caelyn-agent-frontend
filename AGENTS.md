# CaelynAI Frontend — Coding Agent Operating Rules

## Agent identity and report routing

These rules apply to all coding agent runtimes:

- Codex CLI
- DeepSeek running through OpenCode
- Replit Agent
- Future providers

Determine the active agent runtime from the environment in which you are
operating.

Use exactly one agent-specific final report path:

- Codex CLI:
  `/home/runner/workspace/.codex-reports/latest.md`
- DeepSeek through OpenCode:
  `/home/runner/workspace/.opencode-reports/latest.md`
- Replit Agent:
  Report in the conversation. No file path. Do not invent one.

Never write to or overwrite another agent's report file.

The assigned report file is an operational artifact, not a production file.
Never stage or commit it.

The active agent may create its assigned report directory if it does not exist.

Every completed task, including a read-only audit, must produce its assigned
report unless the user explicitly says not to.

## Agent report files and final output

Use the report file that matches the active coding agent:

- DeepSeek/OpenCode:
  `/home/runner/workspace/.opencode-reports/latest.md`

- Codex CLI:
  `/home/runner/workspace/.codex-reports/latest.md`

- Replit Agent:
  Report directly in the conversation.

After completing the task and creating the approved local commit:

1. overwrite the matching `latest.md` report (or write the conversation report)
2. verify that the report exists and contains the current task heading
3. print the complete report into the agent conversation before stopping

For DeepSeek/OpenCode, run:

```bash
printf '\n===== BEGIN OPENCODE REPORT =====\n'
cat /home/runner/workspace/.opencode-reports/latest.md
printf '\n===== END OPENCODE REPORT =====\n'
```

For Codex CLI, run:

```bash
printf '\n===== BEGIN CODEX REPORT =====\n'
cat /home/runner/workspace/.codex-reports/latest.md
printf '\n===== END CODEX REPORT =====\n'
```

Do not merely state that the report exists.

Do not stop after showing only:

- the report path
- the line count
- the file size
- the commit summary

The complete report must appear in the agent output.

## User authority and scope

The user is the pilot and final decision-maker.

Perform only the requested task. Do not expand scope, redesign adjacent systems,
perform opportunistic cleanup, or fix unrelated issues.

Assume the existing architecture, APIs, queries, caches, contexts, props,
components, contracts, and UI relationships exist for deliberate reasons unless
direct repository evidence proves otherwise.

When an unrelated bug, risk, or major inefficiency is discovered:

1. report it separately
2. explain its impact
3. do not fix it without approval

For ordinary, clearly scoped tasks, inspect the existing path and proceed
without requiring a separate audit-approval round.

Stop for approval when:

- the request would require a meaningful architecture change
- more than two production files appear necessary
- the existing path cannot satisfy the request
- the approved scope is contradicted by repository evidence
- unrelated behavior would need to change

## Authorized Replit workspace

Work only in:

`/home/runner/workspace`

Work only on the existing local `main` branch.

Never create or use:

- another branch
- detached HEAD
- another clone
- a Git worktree
- a repository under `/tmp`
- a temporary packaging repository
- a separate copy of the project

Before editing:

1. confirm `git rev-parse --show-toplevel` is `/home/runner/workspace`
2. confirm `git branch --show-current` is `main`
3. run `git status -sb`
4. preserve all pre-existing user or agent work
5. confirm local `main` is not behind or diverged from `origin/main`

The active coding agent may run `git fetch origin main --quiet` only to refresh
remote tracking information before checking ahead/behind status.

If local `main` is behind or diverged:

STOP and report it.

Do not create a workaround, clone, branch, worktree, merge, or alternate commit
path.

## Workspace lock (multi-agent safety)

Before starting any implementation task, claim the workspace:

```bash
python3 scripts/workspace_guard.py claim --actor <runtime> --task "short description"
```

Actor values:

- `codex` for Codex CLI
- `deepseek` for DeepSeek/OpenCode
- `replit-agent` for Replit Agent
- `manual` for user-initiated work
- any free-form name for future providers

If the claim is rejected because another actor holds it:

STOP.

Do not proceed with edits.

Show the holder information and wait for an explicit release.

Stale locks (>24 hours) are FLAGGED but NEVER auto-released.

Force-release requires explicit user authorization:

```bash
python3 scripts/workspace_guard.py release --force
```

Release the lock after the task is fully complete (after push):

```bash
python3 scripts/workspace_guard.py release
```

## Successful implementation task lifecycle

Every completed source implementation follows this exact lifecycle:

1. `preflight` — verify preconditions
2. `claim` — lock the workspace
3. edit — make only approved changes
4. validate — typecheck + build + targeted tests
5. stage exact paths only
6. commit — one focused commit
7. `prepush` guard (via hook on `git push`)
8. `git push origin main` — push to remote
9. verify `HEAD == origin/main`
10. `release` — unlock workspace
11. final report

Successful completed source work must NOT be left only on local `main`.

Push is mandatory before handoff.

To push:

```bash
git push origin main
```

This triggers the pre-push hook automatically.

If using the Replit Agent runtime, use the `gitPush` platform callback for
authenticated pushes.

## Git workflow

All edits must remain in the existing Replit working tree.

The active coding agent may:

- inspect Git state
- claim the workspace lock
- edit local files
- run tests and validation
- stage only exact approved task files
- create exactly one local commit on `main`
- push via `git push origin main` (normal fast-forward only)
- release the workspace lock
- write its assigned agent-specific report

The active coding agent must never:

- force-push
- push another branch
- pull (only fetch for state checking)
- merge divergent history
- rebase
- cherry-pick
- reset
- stash
- switch or create branches
- clone
- create worktrees
- modify remotes
- use GitHub or `gh` write operations
- create PRs

Before committing:

1. run `git diff --check`
2. stage exact paths only
3. never use `git add .` or `git add -A`
4. never stage runtime data, caches, logs, `.replit`, `.codex-reports`,
   `.opencode-reports`, generated files, or unrelated dirty files
5. show the staged file list and staged diff
6. confirm only task-related files are staged

Create one descriptive local commit only after validation succeeds.

If validation fails, do not commit unless the user explicitly approves a
partial or failing state.

If the user says audit only, read only, do not edit, or do not commit, follow
that instruction instead.

## Git cases

Before editing, confirm which git case applies:

**Case A** — `HEAD == origin/main` — proceed normally.

**Case B** — local behind, no divergence — only `git fetch origin main` + `git
merge --ff-only origin/main` is allowed. Never create a merge commit.

**Case C-GENERATED** — local ahead, all commits are generated/runtime — work
may proceed. Do not reset or rebase.

**Case C-SOURCE** — local ahead, commits include source changes — STOP unless
these are the current actor's validated task commits being completed and pushed.

**Case D** — true divergence (ahead AND behind) — STOP. Report. Do not merge,
rebase, reset, cherry-pick, or force-push.

Check case with:

```bash
python3 scripts/workspace_guard.py preflight
```

## Source / generated classifier

The guard script (`scripts/workspace_guard.py`) is the single authoritative
classifier.

Source includes:

- `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.mjs`, `*.cjs`
- `*.css`, `*.scss`, `*.html`
- `package.json`, `package-lock.json`
- `tsconfig*.json`, `vite.config.*`, `drizzle.config.*`
- `.replit`, `AGENTS.md`
- `scripts/**`, `.githooks/**`
- tests (any `*.test.ts`, `*.test.tsx`)
- any JSON not explicitly listed as generated

Generated (explicit allowlist):

- `frontend/market-overview-cache.json`
- `.opencode-reports/**`, `.codex-reports/**`
- `.opencode-persistent/**`, `.opencode/**`, `.codex/**`
- `.agent-state/**`
- `attached_assets/**`

When uncertain: SOURCE.

## Preserve existing architecture

Before changing code, trace the current:

- data source
- endpoint or API proxy
- query key
- cache
- normalization and merge order
- context
- prop path
- consumer component
- fallback behavior

Prefer correcting or extending the existing path.

Do not create any of the following without explicit approval containing
`ARCHITECTURE CHANGE APPROVED`:

- parallel data pipeline
- replacement contract
- new endpoint or proxy
- new query or polling path
- new global context
- new cache or persistent store
- duplicate source of truth
- new provider call
- new dependency
- new status system
- broad component replacement

For display, layout, formatting, sorting, filtering, cards, toggles, visibility,
or selection behavior, default to frontend-only.

Backend work is justified only after proving the required data is absent from
the existing responses, queries, caches, contexts, props, and normalized maps.

Default maximum:

- two production files
- one existing data path
- no architecture changes

Do not refactor, rename, reorganize, or broadly format unrelated code.

## Frontend performance and data-loading contract

This contract extends the existing architecture rules above. The frontend must
remain responsive while preserving the current API, React Query, cache, context,
normalization, and component ownership model.

Preserve these invariants unless the user explicitly approves changing them:

1. **Reuse existing data before fetching again.** Before adding any request,
   inspect the page's existing queries, React Query cache, contexts, props,
   normalized maps, and already-fetched detail data. Prefer selecting, deriving,
   or passing existing data over issuing another request for the same information.

2. **Do not create duplicate fetch paths.** A component, tab, modal, card, or
   child view must not independently refetch data already owned by an existing
   page-level query, shared query, context, or established detail path merely
   because local access appears easier.

3. **Preserve query ownership and cache identity.** Do not casually change query
   keys, cache scope, invalidation behavior, stale-time behavior, refetch triggers,
   or normalization/merge order. These are shared contracts. If a feature can use
   the existing query and cache entry, extend that path instead of creating a
   parallel query.

4. **Do not add aggressive polling or automatic refetching by default.** New
   polling, short refetch intervals, refetch-on-focus, refetch-on-mount, or
   equivalent repeated network behavior requires proof that the existing data
   lifecycle cannot satisfy the feature and explicit approval when it creates a
   new query or polling path.

5. **Avoid request waterfalls.** Do not make a page wait on sequential network
   requests when the required data is already present, can be read from the
   existing shared cache/context, or is already fetched through an established
   parallel path. Do not move backend aggregation into a chain of frontend
   requests.

6. **Keep nonessential data off the critical render path.** Navigation, tab
   changes, and primary page content should not block on secondary detail,
   enrichment, modal-only, tooltip-only, or below-the-fold data when the current
   architecture already supports loading that data later.

7. **Protect render and scroll responsiveness.** Avoid introducing repeated
   full-universe sorting, filtering, grouping, normalization, cloning, or other
   expensive transformations on every render, scroll, hover, or keystroke.
   Reuse existing derived-data boundaries and only add memoization or
   virtualization when repository evidence and measurement justify it. Do not
   broadly rewrite components in the name of performance.

8. **Preserve bulk-versus-detail boundaries.** Do not pull large ticker-detail,
   history, filing, options, earnings, or other nested payloads into bulk list
   requests or shared page state when an existing detail path already owns that
   data. Do not duplicate large objects across multiple frontend stores or
   response-derived structures.

9. **Do not create render/fetch feedback loops.** Effects, query invalidations,
   state synchronization, URL synchronization, and derived-state updates must not
   cause repeated rerenders, repeated invalidations, or request loops. Preserve
   stable dependencies and existing defensive guards.

10. **Measure before changing shared performance behavior.** When a task is
    motivated by slowness, identify whether the bottleneck is network latency,
    response size, duplicate requests, render work, JavaScript execution,
    repeated state updates, or backend latency before changing architecture.

### Frontend performance validation

For changes touching page queries, shared cache behavior, large tables/lists,
normalization, filtering/sorting, contexts, polling, page initialization, or
navigation behavior, validate the relevant performance contract in addition to
the task-specific behavior.

At minimum, confirm as applicable:

- no duplicate network request was introduced for data already fetched
- no new polling or automatic refetch loop was introduced
- no new render loop or React object-child error was introduced
- page/tab navigation does not wait on unrelated secondary data
- existing query keys and cache ownership remain intact unless explicitly in scope
- large list/table scrolling and interaction remain responsive
- response payload size did not grow materially without a demonstrated need
- Watchlist and other shared high-traffic views did not regress

Stop and request explicit user approval before implementing a change that
requires any of the following:

- a new polling path
- a parallel query for data already owned by an existing query/cache/context
- a new global cache or persistent frontend store
- materially more aggressive automatic refetch behavior
- moving large backend aggregation or computation into the browser
- adding large nested detail payloads to a bulk endpoint or bulk frontend state
- replacing an existing shared query/cache path with a second source of truth
- a broad component rewrite primarily to address performance


## Frontend safety

Before adding an API call, inspect existing:

- page queries
- React Query cache
- contexts
- props
- normalized maps
- live-event data
- ticker-detail data already fetched

Prefer selecting or passing existing data over refetching it.

Do not alter unrelated:

- query keys
- global cache behavior
- API proxy behavior
- Watchlist membership
- company identity hydration
- quote hydration
- beta hydration
- ticker popup behavior
- screener modes
- defensive rendering guards

Never render an unvalidated object as a React child.

Preserve valid numeric zero values and distinguish zero from missing/null data.

## Pre-push and prepublish validation

The pre-push hook runs automatically on every `git push origin main`:

```bash
# .githooks/pre-push — delegates to:
python3 scripts/workspace_guard.py prepush
```

The hook validates:

- branch = main
- no conflicts
- no divergence
- no dirty committed source
- TypeScript check (soft-warn: pre-existing errors warn but do not block;
  new errors that increase the count should be treated as a hard failure
  by the responsible agent)
- production build (hard gate — `npm run build` must exit 0)
- targeted tests for changed source areas

**Note on TypeScript errors:** As of the guard installation, the project has
238 pre-existing TS errors across 39 files. These pre-date this guard. The
production Vite build succeeds. Agents must not introduce NEW TS errors. A
dedicated TS cleanup task is recommended.

Before publishing to Replit deployment:

```bash
python3 scripts/workspace_guard.py prepublish
```

This additionally requires that all authored source is already at origin/main
(no unpushed source commits).

## Manual-edit workflow

When a human is editing directly:

```bash
python3 scripts/workspace_guard.py claim --actor manual --task "description"
```

While a manual claim is active, coding agents must refuse production edits.

The user may either:

A. Manually validate, commit, and push through the same pre-push hook.

B. Explicitly hand dirty source to an agent by releasing the manual claim first.

Agents must never silently discard or overwrite manual uncommitted changes.

## Post-publish classification

After any Replit publish:

```bash
python3 scripts/workspace_guard.py postpublish
```

This is read-only. It identifies new publish commits, classifies each as
GENERATED-ONLY or CONTAINS-SOURCE, and reports synchronization status.

Generated-only publish commits are harmless source-wise.

## Validation

Validate:

- the reported broken example
- at least one existing working example
- one boundary or negative case
- browser console
- no React object-child errors
- no new render or fetch loop
- no unrelated Watchlist regression
- expected ticker or row counts when relevant
- build or TypeScript checks when practical

Clearly distinguish task-related failures from unrelated pre-existing failures.

## Final report

After completing the task, write the report assigned to the active agent.

The report must contain:

- task requested
- completion status
- proven root cause
- existing path preserved
- exact files changed
- exact behavior changed
- behavior deliberately preserved
- validation commands and results
- runtime or data effects
- risks and remaining issues
- final `git status -sb`
- commit SHA and message
- complete task commit diff

For an audit-only, read-only, or no-commit task:

- include the exact files inspected
- state that no production files were modified
- mark the commit SHA and message as not applicable
- mark the complete task commit diff as not applicable

Use the committed patch as the source of truth for the final diff when a
commit exists.

Stop after writing the assigned report. For implementation tasks, this follows
the push. Never force-push. Never push to another branch.
