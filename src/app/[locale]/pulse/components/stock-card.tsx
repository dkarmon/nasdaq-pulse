// ABOUTME: Mobile card component for displaying stock information.
// ABOUTME: Large touch targets and clear visual hierarchy for elderly users.

"use client";

import type { Stock, SortPeriod } from "@/lib/market-data/types";
import styles from "./stock-card.module.css";

type StockCardProps = {
  stock: Stock;
  sortBy: SortPeriod;
  isSelected: boolean;
  onSelect: () => void;
  labels: {
    cap: string;
    view: string;
  };
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

function formatPrice(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getGrowthValue(stock: Stock, sortBy: SortPeriod): number {
  switch (sortBy) {
    case "1m":
      return stock.growth1m;
    case "6m":
      return stock.growth6m;
    case "12m":
      return stock.growth12m;
  }
}

export function StockCard({
  stock,
  sortBy,
  isSelected,
  onSelect,
  labels,
}: StockCardProps) {
  const growth = getGrowthValue(stock, sortBy);
  const isPositive = growth >= 0;

  return (
    <div className={styles.card} data-selected={isSelected}>
      <div className={styles.header}>
        <div className={styles.symbolGroup}>
          <span className={styles.symbol}>{stock.symbol}</span>
          <span className={styles.name}>{stock.name}</span>
        </div>
        <span
          className={styles.growth}
          data-positive={isPositive}
          data-negative={!isPositive}
        >
          {formatGrowth(growth)} ({sortBy.toUpperCase()})
        </span>
      </div>

      <div className={styles.details}>
        <span className={styles.price}>{formatPrice(stock.price)}</span>
        <span className={styles.cap}>
          {labels.cap}: {formatMarketCap(stock.marketCap)}
        </span>
      </div>

      <button
        className={styles.viewButton}
        onClick={onSelect}
        aria-label={`${labels.view} ${stock.symbol}`}
      >
        {labels.view} &gt;
      </button>
    </div>
  );
}

type StockCardListProps = {
  stocks: Stock[];
  sortBy: SortPeriod;
  selectedSymbol: string | null;
  onSelectStock: (symbol: string) => void;
  labels: {
    cap: string;
    view: string;
    noStocks: string;
  };
};

export function StockCardList({
  stocks,
  sortBy,
  selectedSymbol,
  onSelectStock,
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
          labels={labels}
        />
      ))}
    </div>
  );
}
