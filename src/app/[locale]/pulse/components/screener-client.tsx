// ABOUTME: Client component orchestrating the screener UI state and data fetching.
// ABOUTME: Manages preferences, filters, sorting, exchange selection, and selected stock state.

"use client";

import { useState, useEffect, useCallback, useMemo, ReactNode, useRef } from "react";
import { usePreferences } from "@/hooks/usePreferences";
import { useLiveQuotes, type QuotesMap } from "@/hooks/useLiveQuotes";
import { StickyHeader } from "./sticky-header";
import { StockTable } from "./stock-table";
import { StockCardList } from "./stock-card";
import { scoreStocksWithFormula } from "@/lib/market-data/recommendation";
import type { Exchange, Stock, ScreenerResponse, SortDirection, SortPeriod } from "@/lib/market-data/types";
import type { Dictionary } from "@/lib/i18n";
import styles from "./screener-client.module.css";
import type { RecommendationFormulaSummary } from "@/lib/recommendations/types";
import type { Recommendation } from "@/lib/ai/types";

const RECOMMENDED_SORT_OPTIONS: SortPeriod[] = [
  "score",
  "intraday",
  "1d",
  "5d",
  "1m",
  "3m",
  "6m",
  "12m",
];

type BadgePayload = {
  recommendation: Recommendation;
  generatedAt: string;
};

function formulaSignature(formula: RecommendationFormulaSummary | null | undefined): string {
  if (!formula) return "null";
  return [
    formula.id,
    formula.version,
    formula.updatedAt ?? "",
  ].join("|");
}

function formatOrderingLabel(
  sortBy: SortPeriod,
  labels: { score: string; intraday: string }
): string {
  switch (sortBy) {
    case "az":
      return "A-Z";
    case "score":
      return labels.score;
    case "intraday":
      return labels.intraday;
    default:
      return sortBy.toUpperCase();
  }
}

function formatPrintTitleTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}-${minutes}-${seconds}`;
}

function isRecommendation(value: unknown): value is Recommendation {
  return value === "buy" || value === "hold" || value === "sell";
}

function parseBadgeMap(input: unknown): Record<string, BadgePayload> {
  const map: Record<string, BadgePayload> = {};
  if (!input || typeof input !== "object") return map;

  for (const [symbol, value] of Object.entries(input as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;

    const recommendation = (value as { recommendation?: unknown }).recommendation;
    const generatedAt = (value as { generatedAt?: unknown }).generatedAt;
    if (!isRecommendation(recommendation) || typeof generatedAt !== "string") continue;

    map[String(symbol).toUpperCase()] = { recommendation, generatedAt };
  }

  return map;
}

function sortRecommendedStocks(
  stocks: Stock[],
  sortBy: SortPeriod,
  sortDirection: SortDirection,
  liveQuotes: QuotesMap
): Stock[] {
  const direction = sortDirection === "asc" ? 1 : -1;
  const sorted = [...stocks];

  sorted.sort((a, b) => {
    switch (sortBy) {
      case "intraday": {
        const aQuote = liveQuotes[a.symbol];
        const bQuote = liveQuotes[b.symbol];
        const aValue =
          typeof aQuote?.changePercent === "number" && Number.isFinite(aQuote.changePercent)
            ? aQuote.changePercent
            : null;
        const bValue =
          typeof bQuote?.changePercent === "number" && Number.isFinite(bQuote.changePercent)
            ? bQuote.changePercent
            : null;

        const aMissing = aValue === null;
        const bMissing = bValue === null;

        if (aMissing && bMissing) return 0;
        if (aMissing) return 1;
        if (bMissing) return -1;

        return (aValue - bValue) * direction;
      }
      case "1d": {
        const aValue = a.growth1d ?? 0;
        const bValue = b.growth1d ?? 0;
        return (aValue - bValue) * direction;
      }
      case "5d": {
        const aValue = a.growth5d ?? 0;
        const bValue = b.growth5d ?? 0;
        return (aValue - bValue) * direction;
      }
      case "6m":
        return (a.growth6m - b.growth6m) * direction;
      case "3m":
        return (a.growth3m - b.growth3m) * direction;
      case "12m":
        return (a.growth12m - b.growth12m) * direction;
      case "score": {
        const aValue = a.recommendationScore ?? 0;
        const bValue = b.recommendationScore ?? 0;
        return (aValue - bValue) * direction;
      }
      case "1m":
      default:
        return (a.growth1m - b.growth1m) * direction;
    }
  });

  return sorted;
}

type ScreenerClientProps = {
  initialData: ScreenerResponse;
  dict: Dictionary;
  onSelectStock: (symbol: string | null) => void;
  selectedSymbol: string | null;
  activeFormulas?: Record<Exchange, RecommendationFormulaSummary | null>;
  onFormulaChange?: (exchange: Exchange, formula: RecommendationFormulaSummary | null) => void;
  isAdmin: boolean;
  navContent: ReactNode;
};

export function ScreenerClient({
  initialData,
  dict,
  onSelectStock,
  selectedSymbol,
  activeFormulas,
  onFormulaChange,
  isAdmin,
  navContent,
}: ScreenerClientProps) {
  const {
    preferences,
    isLoaded,
    setSortBy,
    setSortDirection,
    setLimit,
    setExchange,
    hideStock,
    setShowRecommendedOnly,
    currentHiddenSymbols,
  } = usePreferences();

  const [stocks, setStocks] = useState<Stock[]>(initialData.stocks);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dailyAiBadges, setDailyAiBadges] = useState<Record<string, BadgePayload>>({});
  const [fallbackAiBadges, setFallbackAiBadges] = useState<Record<string, BadgePayload>>({});
  const [printTimestamp, setPrintTimestamp] = useState(() => new Date().toISOString());
  const onFormulaChangeRef = useRef(onFormulaChange);
  const lastFormulaSignatureRef = useRef<Record<Exchange, string>>({
    nasdaq: formulaSignature(activeFormulas?.nasdaq),
    tlv: formulaSignature(activeFormulas?.tlv),
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    onFormulaChangeRef.current = onFormulaChange;
  }, [onFormulaChange]);

  useEffect(() => {
    const next = {
      nasdaq: formulaSignature(activeFormulas?.nasdaq),
      tlv: formulaSignature(activeFormulas?.tlv),
    };
    if (
      lastFormulaSignatureRef.current.nasdaq !== next.nasdaq ||
      lastFormulaSignatureRef.current.tlv !== next.tlv
    ) {
      lastFormulaSignatureRef.current = next;
    }
  }, [activeFormulas?.nasdaq, activeFormulas?.tlv]);

  const resolvedActiveFormulas = activeFormulas ?? { nasdaq: null, tlv: null };
  const activeFormula = resolvedActiveFormulas[preferences.exchange] ?? null;

  const scoredStocks = useMemo(
    () => scoreStocksWithFormula(stocks, activeFormula ?? undefined),
    [stocks, activeFormula]
  );

  const recommendedSymbols = useMemo(() => {
    return scoredStocks
      .filter((stock) => (stock.recommendationScore ?? 0) > 0)
      .map((s) => s.symbol);
  }, [scoredStocks]);

  const { quotes: liveQuotes } = useLiveQuotes(recommendedSymbols);

  useEffect(() => {
    if (!isLoaded) return;

    const exchange = preferences.exchange;
    fetch(`/api/daily-ai-badges?exchange=${exchange}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        const badges =
          data && typeof data === "object"
            ? (data as { badges?: unknown }).badges
            : undefined;
        setDailyAiBadges(parseBadgeMap(badges));
      })
      .catch(() => {
        setDailyAiBadges({});
      });
  }, [isLoaded, preferences.exchange, activeFormula?.id]);

  const fetchScreenerData = useCallback(async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    try {
      const needsAllStocks = preferences.showRecommendedOnly || debouncedSearch;
      const limit = needsAllStocks ? 9999 : preferences.limit;
      const apiSortBy =
        preferences.showRecommendedOnly &&
        (preferences.sortBy === "score" || preferences.sortBy === "intraday")
          ? "1m"
          : preferences.sortBy;

      const params = new URLSearchParams({
        sortBy: apiSortBy,
        limit: limit.toString(),
        exchange: preferences.exchange,
        recommendedOnly: preferences.showRecommendedOnly ? "true" : "false",
        includeScores: "true",
      });

      const response = await fetch(`/api/screener?${params}`);
      const data: ScreenerResponse = await response.json();

      setStocks(data.stocks);
      const nextFormula = data.recommendation?.activeFormula ?? null;
      const nextSignature = formulaSignature(nextFormula);
      if (lastFormulaSignatureRef.current[preferences.exchange] !== nextSignature) {
        lastFormulaSignatureRef.current = {
          ...lastFormulaSignatureRef.current,
          [preferences.exchange]: nextSignature,
        };
        onFormulaChangeRef.current?.(preferences.exchange, nextFormula);
      }
    } catch (error) {
      console.error("Failed to fetch screener data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoaded,
    debouncedSearch,
    preferences.showRecommendedOnly,
    preferences.limit,
    preferences.sortBy,
    preferences.exchange,
  ]);

  useEffect(() => {
    if (isLoaded) {
      fetchScreenerData();
    }
  }, [isLoaded, fetchScreenerData]);

  const controlLabels = {
    sortBy: dict.screener.sortBy,
    show: dict.screener.show,
    score: dict.screener.score,
    intraday: dict.screener.intraday,
    direction: dict.screener.direction,
    search: dict.screener.search,
    recommendedOnly: dict.screener.recommendedOnly,
    recommendedMode: dict.screener.recommendedMode,
    exchange: dict.screener.exchange,
    nasdaq: dict.screener.nasdaq,
    tlv: dict.screener.tlv,
    formula: dict.settings?.recommendationsActive ?? "Formula",
    print: dict.screener.print,
  };

  const tableLabels = {
    stock: dict.screener.stock,
    price: dict.screener.price,
    growth: dict.screener.growth,
    growth1d: dict.screener.growth1d,
    growth5d: dict.screener.growth5d,
    growth1m: dict.screener.growth1m,
    growth3m: dict.screener.growth3m,
    growth6m: dict.screener.growth6m,
    growth12m: dict.screener.growth12m,
    view: dict.screener.view,
    noStocks: dict.screener.noStocks,
    hide: dict.screener.hide,
    recommended: dict.screener.recommended,
  };

  const cardLabels = {
    noStocks: dict.screener.noStocks,
    hide: dict.screener.hide,
    recommended: dict.screener.recommended,
  };

  const aiLabels = {
    buy: dict.aiAnalysis?.buy ?? "Buy",
    hold: dict.aiAnalysis?.hold ?? "Hold",
    sell: dict.aiAnalysis?.sell ?? "Sell",
  };

  const visibleStocks = useMemo(() => {
    let next = scoredStocks.filter(
      (stock) => !currentHiddenSymbols.includes(stock.symbol)
    );

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      next = next.filter((stock) =>
        stock.exchange === "tlv"
          ? stock.nameHebrew?.toLowerCase().includes(query)
          : stock.symbol.toLowerCase().includes(query)
      );
    }

    if (preferences.showRecommendedOnly) {
      const recommendedOnly = next.filter((stock) =>
        typeof stock.recommendationScore === "number" &&
        Number.isFinite(stock.recommendationScore) &&
        (stock.recommendationScore ?? 0) > 0
      );

      const effectiveSort =
        RECOMMENDED_SORT_OPTIONS.includes(preferences.sortBy) ? preferences.sortBy : "score";

      next = sortRecommendedStocks(
        recommendedOnly,
        effectiveSort,
        preferences.sortDirection,
        liveQuotes
      );
    }

    return next;
  }, [
    scoredStocks,
    currentHiddenSymbols,
    searchQuery,
    preferences.showRecommendedOnly,
    preferences.sortBy,
    preferences.sortDirection,
    liveQuotes,
  ]);

  const missingVisibleTop20Symbols = useMemo(() => {
    return visibleStocks
      .slice(0, 20)
      .map((stock) => stock.symbol.toUpperCase())
      .filter((symbol) => !dailyAiBadges[symbol]);
  }, [visibleStocks, dailyAiBadges]);

  const missingVisibleTop20Key = useMemo(
    () => missingVisibleTop20Symbols.join(","),
    [missingVisibleTop20Symbols]
  );

  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    visibleStocks.forEach((stock, index) => {
      map.set(stock.symbol, index + 1);
    });
    return map;
  }, [visibleStocks]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!missingVisibleTop20Key) {
      setFallbackAiBadges((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

    const abortController = new AbortController();
    const params = new URLSearchParams({ symbols: missingVisibleTop20Key });

    fetch(`/api/analysis/badges?${params.toString()}`, { signal: abortController.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        const badges =
          data && typeof data === "object"
            ? (data as { badges?: unknown }).badges
            : undefined;
        const map = parseBadgeMap(badges);
        setFallbackAiBadges((prev) => {
          const prevKeys = Object.keys(prev);
          const nextKeys = Object.keys(map);
          if (prevKeys.length !== nextKeys.length) return map;
          for (const key of nextKeys) {
            if (
              prev[key]?.recommendation !== map[key]?.recommendation ||
              prev[key]?.generatedAt !== map[key]?.generatedAt
            ) {
              return map;
            }
          }
          return prev;
        });
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setFallbackAiBadges((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      });

    return () => abortController.abort();
  }, [isLoaded, preferences.exchange, missingVisibleTop20Key]);

  const mergedAiBadges = useMemo(
    () => ({ ...fallbackAiBadges, ...dailyAiBadges }),
    [fallbackAiBadges, dailyAiBadges]
  );

  const cleanupPrintMode = useCallback(() => {
    if (typeof document === "undefined") return;
    document.documentElement.removeAttribute("data-printing");
    document.body.removeAttribute("data-printing");
  }, []);

  useEffect(() => {
    return () => cleanupPrintMode();
  }, [cleanupPrintMode]);

  const handlePrint = useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const printNow = new Date();
    const originalTitle = document.title;
    document.title = `Nasdaq Pulse ${formatPrintTitleTimestamp(printNow)}`;
    setPrintTimestamp(printNow.toISOString());
    document.documentElement.setAttribute("data-printing", "first-page");
    document.body.setAttribute("data-printing", "first-page");

    let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const onAfterPrint = () => {
      document.title = originalTitle;
      cleanupPrintMode();
      window.removeEventListener("afterprint", onAfterPrint);
      if (fallbackTimeoutId) {
        clearTimeout(fallbackTimeoutId);
      }
    };

    window.addEventListener("afterprint", onAfterPrint);
    fallbackTimeoutId = setTimeout(onAfterPrint, 1500);
    window.print();
  }, [cleanupPrintMode]);

  const printMeta = useMemo(() => {
    const exchangeLabel =
      preferences.exchange === "nasdaq" ? dict.screener.nasdaq : dict.screener.tlv;
    const orderingLabel = formatOrderingLabel(preferences.sortBy, {
      score: dict.screener.score,
      intraday: dict.screener.intraday,
    });
    const directionLabel = preferences.sortDirection === "asc" ? "ASC ↑" : "DESC ↓";
    const recommendedLabel = preferences.showRecommendedOnly
      ? dict.screener.printOn
      : dict.screener.printOff;
    const formulaName = activeFormula?.name?.trim();
    const formulaSubtitle = activeFormula?.description?.trim();
    const formulaLabel = formulaName
      ? [formulaName, formulaSubtitle].filter(Boolean).join(" - ")
      : dict.screener.printNone;
    const queryLabel = searchQuery.trim() || dict.screener.printNone;
    const printDateLabel = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(printTimestamp));
    const printTimeLabel = new Intl.DateTimeFormat(undefined, {
      timeStyle: "medium",
    }).format(new Date(printTimestamp));

    return {
      exchangeLabel,
      orderingLabel,
      directionLabel,
      recommendedLabel,
      formulaLabel,
      queryLabel,
      printDateLabel,
      printTimeLabel,
    };
  }, [
    preferences.exchange,
    preferences.sortBy,
    preferences.sortDirection,
    preferences.showRecommendedOnly,
    activeFormula?.name,
    activeFormula?.description,
    searchQuery,
    printTimestamp,
    dict.screener.nasdaq,
    dict.screener.tlv,
    dict.screener.printOn,
    dict.screener.printOff,
    dict.screener.printNone,
    dict.screener.score,
    dict.screener.intraday,
  ]);

  return (
    <div className={styles.screener}>
      <StickyHeader
        navContent={navContent}
        exchange={preferences.exchange}
        sortBy={preferences.sortBy}
        sortDirection={preferences.sortDirection}
        limit={preferences.limit}
        searchQuery={searchQuery}
        showRecommendedOnly={preferences.showRecommendedOnly}
        controlsDisabled={preferences.showRecommendedOnly}
        onExchangeChange={setExchange}
        onSortChange={setSortBy}
        onSortDirectionChange={setSortDirection}
        onLimitChange={setLimit}
        onSearchChange={setSearchQuery}
        onShowRecommendedOnlyChange={setShowRecommendedOnly}
        isAdmin={isAdmin}
        activeFormulas={resolvedActiveFormulas}
        onFormulaChange={onFormulaChange}
        onRefresh={fetchScreenerData}
        onPrint={handlePrint}
        isRefreshing={isLoading}
        visibleStocks={visibleStocks}
        rankMap={rankMap}
        labels={controlLabels}
      />

      <div className={styles.printPage}>
        <section className={styles.printSummary} aria-label={dict.screener.print}>
          <p className={styles.printSummaryLine}>
            <span className={styles.printBrand}>Nasdaq Pulse</span>
            <span className={styles.printDivider}>|</span>
            <span className={styles.printItem}>
              <strong>{dict.screener.exchange}:</strong> {printMeta.exchangeLabel}
            </span>
            <span className={styles.printDivider}>|</span>
            <span className={styles.printItem}>
              <strong>{dict.screener.ordering}:</strong> {printMeta.orderingLabel}
            </span>
            <span className={styles.printDivider}>|</span>
            <span className={styles.printItem}>
              <strong>{dict.screener.direction}:</strong> {printMeta.directionLabel}
            </span>
            <span className={styles.printDivider}>|</span>
            <span className={styles.printItem}>
              <strong>{dict.screener.show}:</strong> {preferences.limit}
            </span>
            <span className={styles.printDivider}>|</span>
            <span className={styles.printItem}>
              <strong>{dict.screener.recommendedOnly}:</strong> {printMeta.recommendedLabel}
            </span>
            <span className={styles.printDivider}>|</span>
            <span className={styles.printItem}>
              <strong>{dict.screener.query}:</strong> {printMeta.queryLabel}
            </span>
            <span className={styles.printDivider}>|</span>
            <span className={styles.printItem}>
              <strong>{dict.screener.formula}:</strong> {printMeta.formulaLabel}
            </span>
            <span className={styles.printDivider}>|</span>
            <span className={styles.printItem}>
              <strong>{dict.screener.printDate}:</strong> {printMeta.printDateLabel}
            </span>
            <span className={styles.printDivider}>|</span>
            <span className={styles.printItem}>
              <strong>{dict.screener.printTime}:</strong> {printMeta.printTimeLabel}
            </span>
          </p>
        </section>

        <div className={styles.stockList} data-loading={isLoading} data-testid="screener-stock-list">
          <StockTable
            stocks={visibleStocks}
            sortBy={preferences.sortBy}
            selectedSymbol={selectedSymbol}
            onSelectStock={onSelectStock}
            onHideStock={hideStock}
            liveQuotes={liveQuotes}
            rankMap={rankMap}
            aiBadges={mergedAiBadges}
            aiLabels={aiLabels}
            labels={tableLabels}
          />

          <StockCardList
            stocks={visibleStocks}
            sortBy={preferences.sortBy}
            selectedSymbol={selectedSymbol}
            onSelectStock={onSelectStock}
            onHideStock={hideStock}
            liveQuotes={liveQuotes}
            rankMap={rankMap}
            aiBadges={mergedAiBadges}
            aiLabels={aiLabels}
            labels={cardLabels}
          />
        </div>
      </div>
    </div>
  );
}
