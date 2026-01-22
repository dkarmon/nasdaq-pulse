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

Use the helper script to create a new worktree with all dependencies configured:

```bash
./scripts/new-worktree.sh <branch-name>
cd .worktrees/<branch-name>
```

The script automatically:
- Creates the git worktree and branch
- Symlinks `.env.local` from the main repo (credentials stay in one place)
- Runs `npm install`

### Manual Worktree Creation

If you need to create a worktree manually:

```bash
# 1. Create branch and worktree
git worktree add .worktrees/<branch-name> -b <branch-name>

# 2. Change to the worktree directory
cd .worktrees/<branch-name>

# 3. Symlink .env.local from main repo
ln -s "$(git rev-parse --show-toplevel)/../.env.local" .env.local

# 4. Install dependencies
npm install
```

## Environment Variables

Worktrees use symlinked `.env.local` files pointing to the main repo:
- Credentials are managed in one place
- Changes to env vars apply to all worktrees immediately
- No risk of credential drift between worktrees

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

# Delete the local branch (if not auto-deleted)
git branch -d <branch-name>
```

## Quick Reference

```bash
# Create new worktree (recommended)
./scripts/new-worktree.sh feature/my-feature

# List all worktrees
git worktree list

# Create worktree for existing remote branch
git worktree add .worktrees/<branch-name> <branch-name>

# Remove a worktree
git worktree remove .worktrees/<branch-name>

# Prune stale worktree references
git worktree prune
```
