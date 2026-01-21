// ABOUTME: Hook for fetching live stock quotes on component mount.
// ABOUTME: Returns quotes indexed by symbol with loading and error states.

"use client";

import { useState, useEffect, useRef } from "react";
import type { LiveQuote } from "@/app/api/live-quotes/route";

export type { LiveQuote };
export type QuotesMap = Record<string, LiveQuote>;

export type UseLiveQuotesResult = {
  quotes: QuotesMap;
  isLoading: boolean;
  error: string | null;
  fetchedAt: string | null;
};

export function useLiveQuotes(symbols: string[]): UseLiveQuotesResult {
  const [quotes, setQuotes] = useState<QuotesMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  // Track symbols to detect changes
  const symbolsKey = symbols.join(",");
  const prevSymbolsKeyRef = useRef<string>("");

  useEffect(() => {
    // Skip if no symbols
    if (symbols.length === 0) {
      setQuotes({});
      setIsLoading(false);
      setError(null);
      return;
    }

    // Only fetch if symbols changed
    if (prevSymbolsKeyRef.current === symbolsKey && Object.keys(quotes).length > 0) {
      return;
    }
    prevSymbolsKeyRef.current = symbolsKey;

    async function fetchQuotes() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/live-quotes?symbols=${symbolsKey}`);

        if (!response.ok) {
          throw new Error("Failed to fetch quotes");
        }

        const data = await response.json();
        const quotesMap: QuotesMap = {};

        for (const quote of data.quotes) {
          quotesMap[quote.symbol] = quote;
        }

        setQuotes(quotesMap);
        setFetchedAt(data.fetchedAt);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setQuotes({});
      } finally {
        setIsLoading(false);
      }
    }

    fetchQuotes();
  }, [symbolsKey, symbols.length]);

  return { quotes, isLoading, error, fetchedAt };
}
