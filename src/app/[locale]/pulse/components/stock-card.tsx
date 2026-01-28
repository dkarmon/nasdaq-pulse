// ABOUTME: Mobile card component for displaying stock information.
// ABOUTME: Swipe-to-hide on mobile, inline metrics, no visible hide button.

"use client";

import { useState, useRef } from "react";
import type { Stock, SortPeriod } from "@/lib/market-data/types";
import { isStockRecommended } from "@/lib/market-data/recommendation";
import { formatGrowth, formatPrice } from "@/lib/format";
import type { QuotesMap, LiveQuote } from "@/hooks/useLiveQuotes";
import styles from "./stock-card.module.css";

const SWIPE_THRESHOLD = 100;

type StockCardProps = {
  stock: Stock;
  sortBy: SortPeriod;
  isSelected: boolean;
  onSelect: () => void;
  onHide: () => void;
  hideLabel: string;
  recommendedLabel: string;
  liveQuote?: LiveQuote;
};

export function StockCard({
  stock,
  sortBy,
  isSelected,
  onSelect,
  onHide,
  hideLabel,
  recommendedLabel,
  liveQuote,
}: StockCardProps) {
  const isRecommended = isStockRecommended(stock);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // Only swipe if horizontal movement is dominant
    if (Math.abs(deltaX) > deltaY && deltaX < 0) {
      setIsSwiping(true);
      setSwipeOffset(Math.max(deltaX, -200));
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset < -SWIPE_THRESHOLD) {
      onHide();
    }
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartRef.current = null;
  };

  const handleClick = () => {
    if (!isSwiping) {
      onSelect();
    }
  };

  const isTLV = stock.symbol.endsWith(".TA");
  const primaryText = isTLV && stock.nameHebrew ? stock.nameHebrew : stock.symbol;

  return (
    <div
      className={styles.cardWrapper}
      data-testid="stock-card"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={styles.card}
        data-selected={isSelected}
        data-swiping={isSwiping}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        style={{
          transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined,
        }}
      >
        <div className={styles.header}>
          <div className={styles.symbolSection}>
            <span className={styles.symbol}>
              {isRecommended && (
                <span className={styles.starIcon} title={recommendedLabel}>★</span>
              )}
              {primaryText}
              {isRecommended && liveQuote && (
                <span
                  className={styles.liveGrowth}
                  data-positive={liveQuote.changePercent >= 0}
                  data-negative={liveQuote.changePercent < 0}
                >
                  {" "}({formatGrowth(liveQuote.changePercent)})
                </span>
              )}
              {stock.hasSplitWarning && (
                <span className={styles.splitWarning} title="Recent stock split - growth data may be inaccurate"> ⚠️</span>
              )}
            </span>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.price}>{formatPrice(liveQuote?.price ?? stock.price, stock.currency)}</span>
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
          <div className={styles.growthItem} data-active={sortBy === "1d"}>
            <span
              className={styles.growthValue}
              data-positive={(stock.growth1d ?? 0) >= 0}
              data-negative={(stock.growth1d ?? 0) < 0}
            >
              {formatGrowth(stock.growth1d ?? 0)}
            </span>
            <span className={styles.growthLabel}>1D</span>
          </div>
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

      {/* Reveal action behind card when swiping */}
      <div className={styles.swipeAction} data-visible={swipeOffset < -20}>
        <span>{hideLabel}</span>
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
  liveQuotes?: QuotesMap;
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
  liveQuotes = {},
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
          liveQuote={liveQuotes[stock.symbol]}
        />
      ))}
    </div>
  );
}
