// ABOUTME: Unified sticky header combining nav bar and controls bar.
// ABOUTME: Stays fixed at top of viewport while page content scrolls.

"use client";

import { ReactNode, useRef, useEffect } from "react";
import { ControlsBar } from "./controls-bar";
import type { Stock, SortPeriod, SortDirection, Exchange } from "@/lib/market-data/types";
import type { RecommendationFormulaSummary } from "@/lib/recommendations/types";
import styles from "./sticky-header.module.css";

type StickyHeaderProps = {
  navContent: ReactNode;
  exchange: Exchange;
  sortBy: SortPeriod;
  sortDirection: SortDirection;
  limit: number;
  searchQuery: string;
  showRecommendedOnly: boolean;
  controlsDisabled?: boolean;
  onExchangeChange: (exchange: Exchange) => void;
  onSortChange: (sort: SortPeriod) => void;
  onSortDirectionChange: (direction: SortDirection) => void;
  onLimitChange: (limit: number) => void;
  onSearchChange: (query: string) => void;
  onShowRecommendedOnlyChange: (show: boolean) => void;
  isAdmin?: boolean;
  activeFormula?: RecommendationFormulaSummary | null;
  onFormulaChange?: (formula: RecommendationFormulaSummary) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  visibleStocks?: Stock[];
  rankMap?: Map<string, number>;
  labels: {
    sortBy: string;
    show: string;
    score: string;
    intraday: string;
    direction: string;
    search: string;
    recommendedOnly: string;
    recommendedMode: string;
    exchange: string;
    nasdaq: string;
    tlv: string;
    formula?: string;
  };
};

export function StickyHeader({
  navContent,
  exchange,
  sortBy,
  sortDirection,
  limit,
  searchQuery,
  showRecommendedOnly,
  controlsDisabled = false,
  onExchangeChange,
  onSortChange,
  onSortDirectionChange,
  onLimitChange,
  onSearchChange,
  onShowRecommendedOnlyChange,
  isAdmin = false,
  activeFormula,
  onFormulaChange,
  onRefresh,
  isRefreshing = false,
  visibleStocks,
  rankMap,
  labels,
}: StickyHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const height =
        entries[0]?.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight;
      document.documentElement.style.setProperty(
        "--sticky-header-height",
        `${height}px`
      );
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={headerRef} className={styles.stickyHeader}>
      <nav className={styles.nav}>{navContent}</nav>
      <ControlsBar
        exchange={exchange}
        sortBy={sortBy}
        sortDirection={sortDirection}
        limit={limit}
        searchQuery={searchQuery}
        showRecommendedOnly={showRecommendedOnly}
        controlsDisabled={controlsDisabled}
        onExchangeChange={onExchangeChange}
        onSortChange={onSortChange}
        onSortDirectionChange={onSortDirectionChange}
        onLimitChange={onLimitChange}
        onSearchChange={onSearchChange}
        onShowRecommendedOnlyChange={onShowRecommendedOnlyChange}
        isAdmin={isAdmin}
        activeFormula={activeFormula}
        onFormulaChange={onFormulaChange}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        visibleStocks={visibleStocks}
        rankMap={rankMap}
        labels={labels}
      />
    </div>
  );
}
