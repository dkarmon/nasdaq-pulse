// ABOUTME: Desktop stock table with 4 columns plus view button.
// ABOUTME: Shows stock symbol/name, price, market cap, and active growth metric.

"use client";

import type { Stock, SortPeriod } from "@/lib/market-data/types";
import styles from "./stock-table.module.css";

type StockTableProps = {
  stocks: Stock[];
  sortBy: SortPeriod;
  selectedSymbol: string | null;
  onSelectStock: (symbol: string) => void;
  labels: {
    stock: string;
    price: string;
    cap: string;
    growth: string;
    view: string;
    noStocks: string;
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

export function StockTable({
  stocks,
  sortBy,
  selectedSymbol,
  onSelectStock,
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
            <th className={styles.capCol}>{labels.cap}</th>
            <th className={styles.growthCol}>
              {labels.growth} ({sortBy.toUpperCase()})
            </th>
            <th className={styles.actionCol}></th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => {
            const growth = getGrowthValue(stock, sortBy);
            const isPositive = growth >= 0;
            const isSelected = selectedSymbol === stock.symbol;

            return (
              <tr
                key={stock.symbol}
                data-selected={isSelected}
                className={styles.row}
              >
                <td className={styles.stockCell}>
                  <span className={styles.symbol}>{stock.symbol}</span>
                  <span className={styles.name}>{stock.name}</span>
                </td>
                <td className={styles.priceCell}>
                  {formatPrice(stock.price)}
                </td>
                <td className={styles.capCell}>
                  {formatMarketCap(stock.marketCap)}
                </td>
                <td
                  className={styles.growthCell}
                  data-positive={isPositive}
                  data-negative={!isPositive}
                >
                  {formatGrowth(growth)}
                </td>
                <td className={styles.actionCell}>
                  <button
                    className={styles.viewButton}
                    onClick={() => onSelectStock(stock.symbol)}
                    aria-label={`${labels.view} ${stock.symbol}`}
                  >
                    {labels.view} &gt;
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
