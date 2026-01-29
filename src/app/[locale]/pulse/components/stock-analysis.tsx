// ABOUTME: AI-powered stock analysis component with collapsible section and recommendation badge.
// ABOUTME: Fetches and displays analysis, allows generating/refreshing via Gemini API.

"use client";

import { useEffect, useState, useCallback } from "react";
import { CollapsibleSection } from "./collapsible-section";
import type { StockAnalysis as StockAnalysisType, Recommendation } from "@/lib/ai/types";
import styles from "./stock-analysis.module.css";

type AnalysisLabels = {
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

type StockAnalysisProps = {
  symbol: string;
  locale: string;
  labels: AnalysisLabels;
};

type ApiResponse = {
  analysis: StockAnalysisType | null;
  error?: string;
  code?: string;
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m`;
  }
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  return `${diffDays}d`;
}

function getRecommendationLabel(rec: Recommendation, labels: AnalysisLabels): string {
  switch (rec) {
    case "buy":
      return labels.buy;
    case "hold":
      return labels.hold;
    case "sell":
      return labels.sell;
  }
}

export function StockAnalysis({ symbol, locale, labels }: StockAnalysisProps) {
  const [analysis, setAnalysis] = useState<StockAnalysisType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/analysis/${symbol}`);
      if (!res.ok) {
        throw new Error("Failed to fetch analysis");
      }
      const data: ApiResponse = await res.json();
      setAnalysis(data.analysis);
    } catch (err) {
      console.error("Error fetching analysis:", err);
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  const generateAnalysis = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/analysis/${symbol}`, {
        method: "POST",
      });

      const data: ApiResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate analysis");
      }

      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const analysisText = analysis
    ? locale === "he"
      ? analysis.analysisHe
      : analysis.analysisEn
    : null;

  const renderContent = () => {
    if (isLoading) {
      return <div className={styles.loading}>{labels.generate}...</div>;
    }

    if (error) {
      return (
        <div className={styles.error}>
          <p>{error}</p>
          <button className={styles.generateButton} onClick={generateAnalysis}>
            {labels.generate}
          </button>
        </div>
      );
    }

    if (!analysis) {
      return (
        <div className={styles.noAnalysis}>
          <button
            className={styles.generateButton}
            onClick={generateAnalysis}
            disabled={isGenerating}
          >
            {isGenerating ? labels.generating : labels.generate}
          </button>
        </div>
      );
    }

    return (
      <div className={styles.analysisContent}>
        <div
          className={styles.badge}
          data-recommendation={analysis.recommendation}
        >
          {getRecommendationLabel(analysis.recommendation, labels)}
        </div>

        <div className={styles.analysisText}>
          {analysisText?.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <div className={styles.footer}>
          <span className={styles.timestamp}>
            {labels.updated} {formatTimeAgo(analysis.generatedAt)}
          </span>
          <button
            className={styles.refreshButton}
            onClick={generateAnalysis}
            disabled={isGenerating}
            title={labels.refresh}
          >
            {isGenerating ? "..." : "↻"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile: Collapsible */}
      <div className={styles.mobileCollapsible}>
        <CollapsibleSection title={labels.title} defaultExpanded={false}>
          {renderContent()}
        </CollapsibleSection>
      </div>

      {/* Desktop: Always visible */}
      <div className={styles.desktopAlwaysVisible}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{labels.title}</h3>
          {renderContent()}
        </div>
      </div>
    </>
  );
}
