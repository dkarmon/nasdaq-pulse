// ABOUTME: Client wrapper managing page-level state for the screener.
// ABOUTME: Handles selected stock state and coordinates screener with detail panel.

"use client";

import { useState, ReactNode } from "react";
import { ScreenerClient } from "./screener-client";
import { StockDetail } from "./stock-detail";
import type { ScreenerResponse } from "@/lib/market-data/types";
import type { Dictionary } from "@/lib/i18n";
import styles from "./pulse-wrapper.module.css";
import type { RecommendationFormulaSummary } from "@/lib/recommendations/types";

type PulseWrapperProps = {
  initialData: ScreenerResponse;
  dict: Dictionary;
  locale: string;
  isAdmin: boolean;
  navContent: ReactNode;
};

export function PulseWrapper({ initialData, dict, locale, isAdmin, navContent }: PulseWrapperProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [activeFormula, setActiveFormula] = useState<RecommendationFormulaSummary | null>(
    initialData.recommendation?.activeFormula ?? null
  );

  const detailLabels = {
    backToList: dict.screener.backToList,
    price: dict.screener.price,
    growth1d: dict.screener.growth1d,
    growth5d: dict.screener.growth5d,
    growth1m: dict.screener.growth1m,
    growth6m: dict.screener.growth6m,
    growth12m: dict.screener.growth12m,
    pe: dict.screener.pe,
    week52Range: dict.screener.week52Range,
    latestNews: dict.screener.latestNews,
    noNews: dict.screener.noNews,
    viewAllNews: dict.screener.viewAllNews,
    live: dict.screener.live,
    loading: dict.screener.loading,
    error: dict.screener.error,
    recommended: dict.screener.recommended,
    sector: dict.screener.sector,
    industry: dict.screener.industry,
    marketCap: dict.screener.marketCap,
    companyOverview: dict.screener.companyOverview,
    website: dict.screener.website,
  };

  const aiAnalysisLabels = dict.aiAnalysis;

  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <div className={styles.mainPanel}>
          <ScreenerClient
            initialData={initialData}
            dict={dict}
            selectedSymbol={selectedSymbol}
            onSelectStock={setSelectedSymbol}
            activeFormula={activeFormula}
            onFormulaChange={setActiveFormula}
            isAdmin={isAdmin}
            navContent={navContent}
          />
        </div>

        {selectedSymbol && (
          <div className={styles.detailPanel}>
            <StockDetail
              symbol={selectedSymbol}
              onClose={() => setSelectedSymbol(null)}
              locale={locale}
              activeFormula={activeFormula}
              labels={detailLabels}
              aiAnalysisLabels={aiAnalysisLabels}
            />
          </div>
        )}
      </div>
    </div>
  );
}
