# Git Worktree Workflow

## Decision Tree: Before ANY Work

```
START: User requests a code change
  │
  ▼
CHECK: git branch --show-current
  │
  ├─► "main" ──► STOP! Create a worktree first (see below)
  │
  └─► anything else ──► Proceed with work
```

## Creating a Worktree

When you need to work on a new feature or fix:

```bash
# 1. Create branch and worktree in one command
git worktree add .worktrees/<branch-name> -b <branch-name>

# 2. Change to the worktree directory
cd .worktrees/<branch-name>

# 3. Install dependencies (node_modules are not shared)
npm install
```

## Branch Naming Conventions

Use these prefixes based on the type of work:

| Prefix     | Use For                                    |
|------------|--------------------------------------------|
| `feature/` | New functionality                          |
| `fix/`     | Bug fixes                                  |
| `chore/`   | Maintenance, dependencies, config changes  |
| `docs/`    | Documentation only changes                 |

Examples:
- `feature/dark-mode`
- `fix/auth-redirect`
- `chore/update-deps`
- `docs/api-reference`

## Working in a Worktree

Once in a worktree, you're physically isolated from main:
- You cannot accidentally commit to main
- Each worktree has its own working directory
- Git operations work normally within the worktree

## After PR is Merged

Clean up the worktree:

```bash
# From the main repo directory (not inside the worktree)
cd /home/danny/projects/active/nasdaq-pulse

# Remove the worktree
git worktree remove .worktrees/<branch-name>

# Delete the remote branch (if not auto-deleted by PR merge)
git branch -d <branch-name>
```

## Quick Reference

```bash
# List all worktrees
git worktree list

# Create worktree for existing remote branch
git worktree add .worktrees/<branch-name> <branch-name>

# Remove a worktree
git worktree remove .worktrees/<branch-name>

# Prune stale worktree references
git worktree prune
```
