// ABOUTME: Static demo data for unauthenticated users to preview the app.
// ABOUTME: Includes sample stock quotes and news items.

export type DemoQuote = {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  status: "live" | "stale";
  marketCap: string;
  updatedAgo: string;
};

export type DemoNews = {
  headline: string;
  source: string;
  time: string;
  sentiment: "positive" | "negative" | "neutral";
};

export const demoQuotes: DemoQuote[] = [
  {
    symbol: "AAPL",
    price: 192.68,
    change: 1.58,
    changePct: 0.82,
    status: "live",
    marketCap: "2.95T",
    updatedAgo: "45s",
  },
  {
    symbol: "MSFT",
    price: 404.12,
    change: 1.79,
    changePct: 0.44,
    status: "live",
    marketCap: "3.09T",
    updatedAgo: "50s",
  },
  {
    symbol: "NVDA",
    price: 542.17,
    change: -6.12,
    changePct: -1.12,
    status: "stale",
    marketCap: "1.33T",
    updatedAgo: "3m",
  },
];

export const demoNews: DemoNews[] = [
  {
    headline: "Semiconductors slide as yields rise; NVDA pulls back after rally",
    source: "Bloomberg",
    time: "12m ago",
    sentiment: "negative",
  },
  {
    headline: "Apple previews new AI on-device features for 2024 lineup",
    source: "WSJ",
    time: "28m ago",
    sentiment: "positive",
  },
  {
    headline: "Microsoft cloud growth steady; guidance reiterates capex expansion",
    source: "CNBC",
    time: "45m ago",
    sentiment: "neutral",
  },
];
