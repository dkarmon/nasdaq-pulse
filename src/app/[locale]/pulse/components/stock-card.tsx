// ABOUTME: Mobile card component for displaying stock information.
// ABOUTME: Large touch targets and clear visual hierarchy with recommendation stars.

"use client";

import type { Stock, SortPeriod } from "@/lib/market-data/types";
import { isStockRecommended } from "@/lib/market-data/recommendation";
import styles from "./stock-card.module.css";

type StockCardProps = {
  stock: Stock;
  sortBy: SortPeriod;
  isSelected: boolean;
  onSelect: () => void;
  onHide: () => void;
  hideLabel: string;
  recommendedLabel: string;
};

function formatMarketCap(value: number): string {
  if (value >= 1e12) {
    return `${(value / 1e12).toFixed(1)}T`;
  }
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(0)}B`;
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(0)}M`;
  }
  return value.toLocaleString();
}

function formatGrowth(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatPrice(value: number, currency: string = "USD"): string {
  const symbol = currency === "ILS" ? "₪" : "$";
  return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function StockCard({
  stock,
  sortBy,
  isSelected,
  onSelect,
  onHide,
  hideLabel,
  recommendedLabel,
}: StockCardProps) {

  return (
    <div
      className={styles.card}
      data-selected={isSelected}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      <div className={styles.header}>
        <div className={styles.symbolSection}>
          {(() => {
            const isTLV = stock.symbol.endsWith(".TA");
            const primaryText = isTLV && stock.nameHebrew ? stock.nameHebrew : stock.symbol;
            const secondaryText = isTLV ? null : (stock.nameHebrew || stock.name);
            return (
              <>
                <span className={styles.symbol}>
                  {isStockRecommended(stock) && (
                    <span className={styles.starIcon} title={recommendedLabel}>★</span>
                  )}
                  {primaryText}
                  {stock.hasSplitWarning && (
                    <span className={styles.splitWarning} title="Recent stock split - growth data may be inaccurate"> ⚠️</span>
                  )}
                </span>
                {secondaryText && <span className={styles.companyName}>{secondaryText}</span>}
              </>
            );
          })()}
        </div>
        <div className={styles.headerRight}>
          <span className={styles.price}>{formatPrice(stock.price, stock.currency)}</span>
          <button
            className={styles.hideButton}
            onClick={(e) => {
              e.stopPropagation();
              onHide();
            }}
            title={hideLabel}
          >
            ✕
          </button>
        </div>
      </div>

      <div className={styles.growthRow}>
        <div className={styles.growthItem} data-active={sortBy === "5d"}>
          <span
            className={styles.growthValue}
            data-positive={(stock.growth5d ?? 0) >= 0}
            data-negative={(stock.growth5d ?? 0) < 0}
          >
            {formatGrowth(stock.growth5d ?? 0)}
          </span>
          <span className={styles.growthLabel}>5D</span>
        </div>
        <div className={styles.growthItem} data-active={sortBy === "1m"}>
          <span
            className={styles.growthValue}
            data-positive={stock.growth1m >= 0}
            data-negative={stock.growth1m < 0}
          >
            {formatGrowth(stock.growth1m)}
          </span>
          <span className={styles.growthLabel}>1M</span>
        </div>
        <div className={styles.growthItem} data-active={sortBy === "6m"}>
          <span
            className={styles.growthValue}
            data-positive={stock.growth6m >= 0}
            data-negative={stock.growth6m < 0}
          >
            {formatGrowth(stock.growth6m)}
          </span>
          <span className={styles.growthLabel}>6M</span>
        </div>
        <div className={styles.growthItem} data-active={sortBy === "12m"}>
          <span
            className={styles.growthValue}
            data-positive={stock.growth12m >= 0}
            data-negative={stock.growth12m < 0}
          >
            {formatGrowth(stock.growth12m)}
          </span>
          <span className={styles.growthLabel}>12M</span>
        </div>
      </div>
    </div>
  );
}

type StockCardListProps = {
  stocks: Stock[];
  sortBy: SortPeriod;
  selectedSymbol: string | null;
  onSelectStock: (symbol: string) => void;
  onHideStock: (symbol: string) => void;
  labels: {
    noStocks: string;
    hide: string;
    recommended: string;
  };
};

export function StockCardList({
  stocks,
  sortBy,
  selectedSymbol,
  onSelectStock,
  onHideStock,
  labels,
}: StockCardListProps) {
  if (stocks.length === 0) {
    return (
      <div className={styles.empty}>
        <p>{labels.noStocks}</p>
      </div>
    );
  }

  return (
    <div className={styles.cardList}>
      {stocks.map((stock) => (
        <StockCard
          key={stock.symbol}
          stock={stock}
          sortBy={sortBy}
          isSelected={selectedSymbol === stock.symbol}
          onSelect={() => onSelectStock(stock.symbol)}
          onHide={() => onHideStock(stock.symbol)}
          hideLabel={labels.hide}
          recommendedLabel={labels.recommended}
        />
      ))}
    </div>
  );
}
