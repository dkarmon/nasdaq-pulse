# Agent Workflow (nasdaq-pulse)

## Mandatory Branch Safety

Before any change (code, config, docs):

```bash
git branch --show-current
```

If the branch is `main`: **STOP.** Do not modify files on `main`.

## Required Worktree Workflow

Use the worktree flow documented in `CLAUDE.md` and `.claude/rules/worktree-workflow.md`.

### Create a Worktree (required)

```bash
./scripts/new-worktree.sh <branch-name>
cd .worktrees/<branch-name>
```

### Branch Naming

Use these prefixes:

- `feature/` for new functionality
- `fix/` for bug fixes
- `chore/` for maintenance/deps/config
- `docs/` for documentation-only changes

## Non-Main Rule

**Never write code to `main`.** All work must happen inside a worktree on a feature branch.

## Cleanup After Merge

From the main repo directory:

```bash
git worktree remove .worktrees/<branch-name>
git branch -d <branch-name>
```

## Source of Truth

This file mirrors the mandatory workflow in `CLAUDE.md` and `.claude/rules/worktree-workflow.md`.
