# nasdaq-pulse Project Instructions

## Branch Workflow - MANDATORY

**BEFORE doing ANY work (code changes, fixes, features), you MUST check which branch you're on:**

```bash
git branch --show-current
```

**If you are on `main`: STOP IMMEDIATELY.**

Do not make any changes on the main branch. Follow the worktree workflow in `.claude/rules/worktree-workflow.md` to create a feature worktree first.

## Project Overview

nasdaq-pulse is a Next.js application for tracking NASDAQ stock recommendations and performance metrics.

### Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data**: Stock market data with Hebrew localization for TLV stocks

### Key Directories
- `app/` - Next.js App Router pages and layouts
- `components/` - React components
- `lib/` - Utility functions and shared logic
- `types/` - TypeScript type definitions

## Development Notes

- Run `npm run dev` for development server
- Run `npm run build` to verify production builds
- This is a single-project repo (not a monorepo)
- Environment variables go in `.env.local`
