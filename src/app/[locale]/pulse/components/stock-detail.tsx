// ABOUTME: Stock detail slide-in panel showing company info, metrics, chart, and news.
// ABOUTME: Full-screen on mobile with back button, side panel on desktop.

"use client";

import { useEffect, useState } from "react";
import { PriceChart } from "./price-chart";
import type { StockDetailResponse, NewsResponse, NewsItem } from "@/lib/market-data/types";
import styles from "./stock-detail.module.css";

type StockDetailProps = {
  symbol: string;
  onClose: () => void;
  labels: {
    backToList: string;
    price: string;
    growth1m: string;
    growth6m: string;
    growth12m: string;
    pe: string;
    week52Range: string;
    latestNews: string;
    noNews: string;
    viewAllNews: string;
    live: string;
    loading: string;
    error: string;
  };
};

function formatPrice(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatGrowth(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  return `${diffDays}d ago`;
}

export function StockDetail({ symbol, onClose, labels }: StockDetailProps) {
  const [detail, setDetail] = useState<StockDetailResponse | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const [detailRes, newsRes] = await Promise.all([
          fetch(`/api/stock/${symbol}`),
          fetch(`/api/news/${symbol}`),
        ]);

        if (!detailRes.ok) {
          throw new Error("Failed to fetch stock details");
        }

        const detailData: StockDetailResponse = await detailRes.json();
        setDetail(detailData);

        if (newsRes.ok) {
          const newsData: NewsResponse = await newsRes.json();
          setNews(newsData.items);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [symbol]);

  if (isLoading) {
    return (
      <div className={styles.panel}>
        <button className={styles.backButton} onClick={onClose}>
          <svg className={styles.backIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div className={styles.loading}>{labels.loading}...</div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className={styles.panel}>
        <button className={styles.backButton} onClick={onClose}>
          <svg className={styles.backIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div className={styles.error}>{labels.error}: {error}</div>
      </div>
    );
  }

  const { profile, quote, history, growth1m, growth6m, growth12m } = detail;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onClose}>
          <svg className={styles.backIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <div className={styles.titleSection}>
        <div className={styles.symbolRow}>
          <h2 className={styles.symbol}>{profile.symbol}</h2>
          <button
            className={styles.copyButton}
            onClick={() => navigator.clipboard.writeText(profile.symbol)}
            title="Copy ticker"
          >
            ⧉
          </button>
        </div>
        <p className={styles.companyName}>{profile.name}</p>
      </div>

      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <span className={styles.metricValue}>{formatPrice(quote.price)}</span>
          <span className={styles.metricLabel}>{labels.price}</span>
        </div>
      </div>

      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <span
            className={styles.metricValue}
            data-positive={growth1m >= 0}
            data-negative={growth1m < 0}
          >
            {formatGrowth(growth1m)}
          </span>
          <span className={styles.metricLabel}>{labels.growth1m}</span>
        </div>
        <div className={styles.metricCard}>
          <span
            className={styles.metricValue}
            data-positive={growth6m >= 0}
            data-negative={growth6m < 0}
          >
            {formatGrowth(growth6m)}
          </span>
          <span className={styles.metricLabel}>{labels.growth6m}</span>
        </div>
        <div className={styles.metricCard}>
          <span
            className={styles.metricValue}
            data-positive={growth12m >= 0}
            data-negative={growth12m < 0}
          >
            {formatGrowth(growth12m)}
          </span>
          <span className={styles.metricLabel}>{labels.growth12m}</span>
        </div>
      </div>

      <div className={styles.chartSection}>
        <PriceChart data={history} height={250} />
      </div>

      <div className={styles.newsSection}>
        <h3 className={styles.newsTitle}>{labels.latestNews}</h3>
        {news.length === 0 ? (
          <p className={styles.noNews}>{labels.noNews}</p>
        ) : (
          <div className={styles.newsList}>
            {news.slice(0, 3).map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.newsItem}
              >
                <div className={styles.newsHeader}>
                  <span className={styles.newsHeadline}>{item.headline}</span>
                  <span
                    className={`badge ${
                      item.sentiment === "positive"
                        ? "positive"
                        : item.sentiment === "negative"
                        ? "negative"
                        : ""
                    }`}
                  >
                    {item.sentiment}
                  </span>
                </div>
                <div className={styles.newsMeta}>
                  <span>{item.source}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(item.publishedAt)}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
