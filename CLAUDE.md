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

## Multi-Task Workflow

When working on multiple tasks or features:

### Branch Discipline
- Each task gets its own branch - never mix unrelated features
- Use git worktrees for parallel work when available
- Prioritize independent, easy tasks first (low-hanging fruit)
- Never start a dependent task before its dependencies are complete

### Branch Completion Checklist
Before merging any branch:
1. Run code simplification/review plugins if available
2. Apply important changes from review
3. Run tests and fix any failures
4. Only commit when tests pass
5. Merge to main
6. Trigger deployment
7. Verify deployment succeeded
8. If deployment fails: collect logs, diagnose, and fix

### Tool Preferences
- Prefer MCP tools over CLI when both are available (e.g., Vercel MCP, Supabase MCP)
- For testing loops, use concrete completion criteria that can be verified
- For browser automation, prefer connecting to existing browser instances over starting new ones

## Browser Testing

When running UI verification or flow testing for this app:

1. Run pre-flight check for dev-browser (see global CLAUDE.md)
2. The app runs on `http://localhost:3000` (start with `npm run dev` if needed)
3. Use named pages like `"nasdaq-home"`, `"stock-detail-AAPL"` for different views
4. After testing, disconnect but leave relay running for future tests
