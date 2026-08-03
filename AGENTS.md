# CaelynAI Frontend — Coding Agent Operating Rules

## Agent identity and report routing

These rules apply to both:

- Codex CLI
- DeepSeek running through OpenCode

Determine the active agent runtime from the environment in which you are
operating.

Use exactly one agent-specific final report path:

- Codex CLI:
  `/home/runner/workspace/.codex-reports/latest.md`
- DeepSeek through OpenCode:
  `/home/runner/workspace/.opencode-reports/latest.md`

Never write to or overwrite the other agent's report file.

The assigned report file is an operational artifact, not a production file.
Never stage or commit it.

The active agent may create its assigned report directory if it does not exist.

Every completed task, including a read-only audit, must update the active
agent's assigned `latest.md` report unless the user explicitly says not to
create or update a report file.

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

If local `main` is behind or diverged, stop and report it. Do not create a
workaround, clone, branch, worktree, merge, or alternate commit path.

## Git workflow

All edits must remain in the existing Replit working tree.

The active coding agent may:

- inspect Git state
- edit local files
- run tests and validation
- stage only exact approved task files
- create exactly one local commit on `main`
- write its assigned agent-specific `latest.md` report

The active coding agent must never:

- push
- pull
- merge
- rebase
- cherry-pick
- reset
- clean
- stash
- switch or create branches
- clone
- create worktrees
- modify remotes
- force-push
- use GitHub or `gh` write operations

The user personally runs:

`git push origin main`

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

After completing the task, overwrite the report assigned to the active agent:

- Codex CLI:
  `/home/runner/workspace/.codex-reports/latest.md`
- DeepSeek through OpenCode:
  `/home/runner/workspace/.opencode-reports/latest.md`

For an implementation task, write the report after the local commit.

For an audit-only, read-only, or no-commit task, write the report after the
audit and validation are complete. Do not create a commit.

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

Use the committed patch as the source of truth for the final diff when a commit
exists.

Stop after writing the assigned report. For implementation tasks, this follows
the local commit. Never push.