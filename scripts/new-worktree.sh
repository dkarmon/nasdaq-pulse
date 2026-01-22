#!/bin/bash
# ABOUTME: Creates a new git worktree with environment and dependencies configured.
# ABOUTME: Symlinks .env.local from main repo and runs npm install.

BRANCH_NAME=$1
if [ -z "$BRANCH_NAME" ]; then
  echo "Usage: ./scripts/new-worktree.sh <branch-name>"
  echo "Example: ./scripts/new-worktree.sh feature/dark-mode"
  exit 1
fi

# Get main repo root (first worktree is always the main one)
MAIN_REPO=$(git worktree list --porcelain | head -1 | cut -d' ' -f2)
WORKTREE_PATH="$MAIN_REPO/.worktrees/$BRANCH_NAME"

# Create worktree and branch
git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"

# Change to worktree
cd "$WORKTREE_PATH"

# Symlink env file from main repo
if [ -f "$MAIN_REPO/.env.local" ]; then
  ln -s "$MAIN_REPO/.env.local" .env.local
  echo "Symlinked .env.local from main repo"
else
  echo "Warning: No .env.local found in main repo"
fi

# Install dependencies
npm install

echo ""
echo "Worktree ready at: $WORKTREE_PATH"
echo "Run: cd $WORKTREE_PATH"
