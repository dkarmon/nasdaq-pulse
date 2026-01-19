// ABOUTME: Desktop stock table showing stocks with growth metrics.
// ABOUTME: Displays symbol/name, price, and 5D/1M/6M/12M growth percentages with recommendation stars.

"use client";

import type { Stock, SortPeriod } from "@/lib/market-data/types";
import styles from "./stock-table.module.css";

type StockTableProps = {
  stocks: Stock[];
  sortBy: SortPeriod;
  selectedSymbol: string | null;
  onSelectStock: (symbol: string) => void;
  onHideStock: (symbol: string) => void;
  labels: {
    stock: string;
    price: string;
    growth: string;
    growth5d: string;
    growth1m: string;
    growth6m: string;
    growth12m: string;
    view: string;
    noStocks: string;
    hide: string;
    recommended: string;
  };
};

function formatGrowth(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatPrice(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isRecommended(stock: Stock): boolean {
  if (stock.growth5d === undefined) return false;
  return stock.growth5d < stock.growth1m &&
         stock.growth1m < stock.growth6m &&
         stock.growth6m < stock.growth12m;
}

export function StockTable({
  stocks,
  sortBy,
  selectedSymbol,
  onSelectStock,
  onHideStock,
  labels,
}: StockTableProps) {
  if (stocks.length === 0) {
    return (
      <div className={styles.empty}>
        <p>{labels.noStocks}</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.stockCol}>{labels.stock}</th>
            <th className={styles.priceCol}>{labels.price}</th>
            <th className={styles.growthCol} data-active={sortBy === "5d"}>{labels.growth5d}</th>
            <th className={styles.growthCol} data-active={sortBy === "1m"}>{labels.growth1m}</th>
            <th className={styles.growthCol} data-active={sortBy === "6m"}>{labels.growth6m}</th>
            <th className={styles.growthCol} data-active={sortBy === "12m"}>{labels.growth12m}</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => {
            const isSelected = selectedSymbol === stock.symbol;

            return (
              <tr
                key={stock.symbol}
                data-selected={isSelected}
                className={styles.row}
                onClick={() => onSelectStock(stock.symbol)}
              >
                <td className={styles.stockCell}>
                  <div className={styles.symbolRow}>
                    {isRecommended(stock) && (
                      <span className={styles.starIcon} title={labels.recommended}>
                        ★
                      </span>
                    )}
                    <span className={styles.symbol}>{stock.symbol}</span>
                    {stock.hasSplitWarning && (
                      <span className={styles.splitWarning} title="Recent stock split - growth data may be inaccurate">
                        ⚠️
                      </span>
                    )}
                    <button
                      className={styles.copyButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(stock.symbol);
                      }}
                      title="Copy ticker"
                    >
                      ⧉
                    </button>
                    <button
                      className={styles.hideButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        onHideStock(stock.symbol);
                      }}
                      title={labels.hide}
                    >
                      ✕
                    </button>
                  </div>
                </td>
                <td className={styles.priceCell}>
                  {formatPrice(stock.price)}
                </td>
                <td
                  className={styles.growthCell}
                  data-positive={(stock.growth5d ?? 0) >= 0}
                  data-negative={(stock.growth5d ?? 0) < 0}
                  data-active={sortBy === "5d"}
                >
                  {formatGrowth(stock.growth5d ?? 0)}
                </td>
                <td
                  className={styles.growthCell}
                  data-positive={stock.growth1m >= 0}
                  data-negative={stock.growth1m < 0}
                  data-active={sortBy === "1m"}
                >
                  {formatGrowth(stock.growth1m)}
                </td>
                <td
                  className={styles.growthCell}
                  data-positive={stock.growth6m >= 0}
                  data-negative={stock.growth6m < 0}
                  data-active={sortBy === "6m"}
                >
                  {formatGrowth(stock.growth6m)}
                </td>
                <td
                  className={styles.growthCell}
                  data-positive={stock.growth12m >= 0}
                  data-negative={stock.growth12m < 0}
                  data-active={sortBy === "12m"}
                >
                  {formatGrowth(stock.growth12m)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
