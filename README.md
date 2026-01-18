# Nasdaq Pulse

Live Nasdaq-focused dashboard with bilingual (EN/HE) UI, RTL support, Google auth with an allow-listed set of emails, and a responsive layout tuned for desktop and mobile.

## Quick start

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` (redirects to `/en`). Landing is public; `/en/pulse` (and `/he/pulse`) require Google sign-in.

## Environment variables

Create `.env.local`:

```
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
NEXTAUTH_SECRET=long_random_string
NEXTAUTH_URL=http://localhost:3000
ALLOWED_EMAILS=you@example.com,teammate@example.com

# Data providers (replace with your keys)
FINNHUB_API_KEY=your_key
TWELVEDATA_API_KEY=optional
ALPHAVANTAGE_API_KEY=optional
NEWSAPI_KEY=optional

# Cache tuning (seconds)
CACHE_TTL_QUOTES_SECONDS=60
CACHE_TTL_SERIES_SECONDS=21600
CACHE_TTL_FUNDAMENTALS_SECONDS=86400
```

## Authentication flow

- Google OAuth via NextAuth (beta). Only emails in `ALLOWED_EMAILS` are allowed.
- Middleware protects `/[locale]/pulse` and `/api/{stocks,news}`.
- Denied users see `/denied` with guidance.

## Data proxy (server-side)

`/api/stocks` and `/api/news` are stubbed with demo data and `unstable_cache`. Replace with live providers:
- Primary: Finnhub (quotes, fundamentals, news).
- Fallbacks: Twelve Data, Alpha Vantage (series + overview).
- News alternates: Finnhub company news, MarketAux, NewsAPI (respect their commercial terms).

Caching guidance (free-tier friendly):
- Quotes: 60–120s.
- 1M series: 6–12h.
- 6M/1Y series: 12–24h.
- Fundamentals: ~24h.

## UI/UX notes

- Branding: midnight slate background, emerald gains, rose losses, amber warnings; fonts: Manrope + Space Grotesk + Heebo (Hebrew).
- Layout: public landing with hero + demo; protected dashboard with watchlist table, detail card, news list, range pills, and RTL mirroring for Hebrew.
- Accessibility: keyboardable controls, high contrast, motion kept subtle.

## Deployment (Vercel)

1) Push to Git; import repo into Vercel.  
2) Add env vars above in Vercel → Settings → Environment Variables.  
3) Choose a region close to users (iad/cle).  
4) Optional: add Upstash Redis and point proxy to it if you need shared caching across regions.  
5) Protect preview deployments if the allowlist is small (Vercel password protection or middleware).

## Getting API keys

- **Google OAuth**: GCP Console → Credentials → OAuth client ID (Web). Add redirect `https://<domain>/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/google`. Use the issued client ID/secret.  
- **Finnhub**: sign up at finnhub.io → Dashboard → API Key. Free tier OK; rotate if exposed.  
- **Twelve Data**: twelvedata.com → API key (free 800 calls/day).  
- **Alpha Vantage**: alphavantage.co → free key via email (5 req/min).  
- **NewsAPI**: newsapi.org → key (note commercial restrictions).  
- **SEC filings (optional)**: sec-api.io → free tier key; or use public EDGAR with self-imposed rate limits.

## Tests/checks

- `npm run lint` to run ESLint.

## Next steps (implementation)

- Swap stubbed API handlers with live provider fetches and schema normalization.
- Add persistence for watchlists (per-user, keyed by email).
- Wire real chart component (e.g., `@visx/xychart` or `recharts`) and sentiment chips from provider data.
