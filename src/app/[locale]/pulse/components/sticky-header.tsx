// ABOUTME: Unified sticky header combining nav bar and controls bar.
// ABOUTME: Stays fixed at top of viewport while page content scrolls.

"use client";

import { ReactNode, useRef, useEffect, useState } from "react";
import { RotateCw, MoreVertical } from "lucide-react";
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
  activeFormulas?: Record<Exchange, RecommendationFormulaSummary | null>;
  onFormulaChange?: (exchange: Exchange, formula: RecommendationFormulaSummary | null) => void;
  onRefresh?: () => void;
  onPrint?: () => void;
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
    print?: string;
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
  activeFormulas,
  onFormulaChange,
  onRefresh,
  onPrint,
  isRefreshing = false,
  visibleStocks,
  rankMap,
  labels,
}: StickyHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const updateHeight = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty(
        "--sticky-header-height",
        `${height}px`
      );
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    window.addEventListener("resize", updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  const activeFormula = activeFormulas?.[exchange] ?? null;

  return (
    <div ref={headerRef} className={styles.stickyHeader}>
      <nav className={styles.nav}>
        {navContent}
        {/* Mobile-only: refresh and filter buttons in nav row */}
        <div className={styles.mobileNavButtons}>
          {isAdmin && onRefresh && (
            <button
              className="nav-icon-btn"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh data"
            >
              <RotateCw size={18} className={isRefreshing ? styles.spinning : ""} />
            </button>
          )}
          <button
            className="nav-icon-btn"
            onClick={() => setIsFilterSheetOpen(true)}
            aria-label="Open filters"
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </nav>

      {/* Mobile-only: formula name row, visible when recommended mode is active */}
      {showRecommendedOnly && activeFormula?.name && (
        <div className={styles.mobileFormulaRow}>
          {activeFormula.name}
        </div>
      )}

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
        activeFormulas={activeFormulas}
        onFormulaChange={onFormulaChange}
        onRefresh={onRefresh}
        onPrint={onPrint}
        isRefreshing={isRefreshing}
        visibleStocks={visibleStocks}
        rankMap={rankMap}
        labels={labels}
        isFilterSheetOpen={isFilterSheetOpen}
        onCloseFilterSheet={() => setIsFilterSheetOpen(false)}
      />
    </div>
  );
}
