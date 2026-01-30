// ABOUTME: Stock detail slide-in panel showing company info, metrics, chart, and AI analysis.
// ABOUTME: Full-screen on mobile with collapsible sections, side panel on desktop.

"use client";

import { useEffect, useState, useMemo } from "react";
import { PriceChart } from "./price-chart";
import { CollapsibleSection } from "./collapsible-section";
import { StockAnalysis } from "./stock-analysis";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { isStockRecommended } from "@/lib/market-data/recommendation";
import type { StockDetailResponse, Stock } from "@/lib/market-data/types";
import { formatGrowth, formatPrice, formatMarketCap } from "@/lib/format";
import styles from "./stock-detail.module.css";
import type { RecommendationFormulaSummary } from "@/lib/recommendations/types";

type StockDetailProps = {
  symbol: string;
  onClose: () => void;
  locale?: string;
  activeFormula?: RecommendationFormulaSummary | null;
  labels: {
    backToList: string;
    price: string;
    growth1d: string;
    growth5d: string;
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
    recommended: string;
    sector: string;
    industry: string;
    marketCap: string;
    companyOverview: string;
    website: string;
  };
  aiAnalysisLabels: {
    title: string;
    generate: string;
    refresh: string;
    updated: string;
    notEnoughNews: string;
    generating: string;
    error: string;
    buy: string;
    hold: string;
    sell: string;
  };
};

export function StockDetail({ symbol, onClose, locale = "en", activeFormula, labels, aiAnalysisLabels }: StockDetailProps) {
  const [detail, setDetail] = useState<StockDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch live quote for this symbol (only when recommended)
  const symbolsToFetch = useMemo(() => {
    if (!detail) return [];
    const stockForCheck = {
      growth5d: detail.growth5d,
      growth1m: detail.growth1m,
      growth6m: detail.growth6m,
      growth12m: detail.growth12m,
    } as Stock;
    if (isStockRecommended(stockForCheck, activeFormula ?? undefined)) {
      return [symbol];
    }
    return [];
  }, [detail, symbol, activeFormula]);
  const { quotes: liveQuotes } = useLiveQuotes(symbolsToFetch);
  const liveQuote = liveQuotes[symbol];

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const detailRes = await fetch(`/api/stock/${symbol}`);

        if (!detailRes.ok) {
          throw new Error("Failed to fetch stock details");
        }

        const detailData: StockDetailResponse = await detailRes.json();
        setDetail(detailData);
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

  const { profile, quote, history, growth1d, growth5d, growth1m, growth6m, growth12m, nameHebrew } = detail;

  const isTLV = symbol.endsWith(".TA");
  const currency = isTLV ? "ILS" : "USD";
  const primaryText = isTLV && nameHebrew ? nameHebrew : profile.symbol;
  const secondaryText = isTLV ? null : (nameHebrew || profile.name);
  const stockForCheck = { growth5d, growth1m, growth6m, growth12m } as Stock;
  const isRecommended = isStockRecommended(stockForCheck, activeFormula ?? undefined);

  const hasCompanyInfo = profile.sector || profile.industry || profile.marketCap || profile.website || profile.description || profile.descriptionHebrew;

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
          {isRecommended && (
            <span className={styles.starIcon} title={labels.recommended}>★</span>
          )}
          <h2 className={styles.symbol}>{primaryText}</h2>
          <button
            className={styles.copyButton}
            onClick={() => navigator.clipboard.writeText(profile.symbol)}
            title="Copy ticker"
          >
            ⧉
          </button>
          <span className={styles.priceInline}>
            {formatPrice(liveQuote?.price ?? quote.price, currency)}
            {isRecommended && liveQuote && (
              <span
                className={styles.liveGrowth}
                data-positive={liveQuote.changePercent >= 0}
                data-negative={liveQuote.changePercent < 0}
              >
                {" "}({formatGrowth(liveQuote.changePercent)})
              </span>
            )}
          </span>
        </div>
        {secondaryText && <p className={styles.companyName}>{secondaryText}</p>}
      </div>

      {/* Growth metrics - always visible */}
      <div className={styles.metricsRow} dir="ltr">
        <div className={styles.metricCard}>
          <span
            className={styles.metricValue}
            data-positive={(growth1d ?? 0) >= 0}
            data-negative={(growth1d ?? 0) < 0}
          >
            {formatGrowth(growth1d ?? 0)}
          </span>
          <span className={styles.metricLabel}>{labels.growth1d}</span>
        </div>
        <div className={styles.metricCard}>
          <span
            className={styles.metricValue}
            data-positive={(growth5d ?? 0) >= 0}
            data-negative={(growth5d ?? 0) < 0}
          >
            {formatGrowth(growth5d ?? 0)}
          </span>
          <span className={styles.metricLabel}>{labels.growth5d}</span>
        </div>
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

      {/* Chart - always visible */}
      <div className={styles.chartSection}>
        <PriceChart data={history} height={250} />
      </div>

      {/* AI Analysis */}
      <StockAnalysis
        symbol={symbol}
        locale={locale}
        labels={aiAnalysisLabels}
      />

      {/* Company Info - collapsible on mobile, collapsed by default */}
      {hasCompanyInfo && (
        <div className={styles.mobileCollapsible}>
          <CollapsibleSection title="Company Info" defaultExpanded={false}>
            {(profile.sector || profile.industry || profile.marketCap || profile.website) && (
              <div className={styles.companyInfoInner}>
                {profile.sector && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{labels.sector}:</span>
                    <span className={styles.infoValue}>{profile.sector}</span>
                  </div>
                )}
                {profile.industry && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{labels.industry}:</span>
                    <span className={styles.infoValue}>{profile.industry}</span>
                  </div>
                )}
                {profile.marketCap > 0 && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{labels.marketCap}:</span>
                    <span className={styles.infoValue}>{formatMarketCap(profile.marketCap)}</span>
                  </div>
                )}
                {profile.website && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{labels.website}:</span>
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.infoLink}
                    >
                      {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  </div>
                )}
              </div>
            )}
            {(profile.description || profile.descriptionHebrew) && (
              <p className={styles.overviewText}>
                {locale === "he" && profile.descriptionHebrew
                  ? profile.descriptionHebrew
                  : profile.description}
              </p>
            )}
          </CollapsibleSection>
        </div>
      )}

      {/* Desktop: Always-visible company info - merged into single panel */}
      {hasCompanyInfo && (
        <div className={styles.desktopAlwaysVisible}>
          <div className={styles.companyPanel}>
            {(profile.sector || profile.industry || profile.marketCap || profile.website) && (
              <div className={styles.companyMeta}>
                {profile.sector && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{labels.sector}:</span>
                    <span className={styles.infoValue}>{profile.sector}</span>
                  </div>
                )}
                {profile.industry && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{labels.industry}:</span>
                    <span className={styles.infoValue}>{profile.industry}</span>
                  </div>
                )}
                {profile.marketCap > 0 && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{labels.marketCap}:</span>
                    <span className={styles.infoValue}>{formatMarketCap(profile.marketCap)}</span>
                  </div>
                )}
                {profile.website && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>{labels.website}:</span>
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.infoLink}
                    >
                      {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  </div>
                )}
              </div>
            )}
            {(profile.description || profile.descriptionHebrew) && (
              <div className={styles.companyDescription}>
                <h3 className={styles.overviewTitle}>{labels.companyOverview}</h3>
                <p className={styles.overviewText}>
                  {locale === "he" && profile.descriptionHebrew
                    ? profile.descriptionHebrew
                    : profile.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
