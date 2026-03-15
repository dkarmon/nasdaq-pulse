// ABOUTME: Compact buy/hold/sell badge used in the screener list (desktop + mobile).
// ABOUTME: Shows an animated clock icon when the analysis is stale and being refreshed.

"use client";

import type { Recommendation } from "@/lib/ai/types";
import styles from "./ai-recommendation-badge.module.css";

export function AiRecommendationBadge(props: {
  recommendation: Recommendation;
  labels: { buy: string; hold: string; sell: string };
  title?: string;
  stale?: boolean;
}) {
  const label =
    props.recommendation === "buy"
      ? props.labels.buy
      : props.recommendation === "hold"
        ? props.labels.hold
        : props.labels.sell;

  return (
    <span
      className={styles.badge}
      data-recommendation={props.recommendation}
      data-stale={props.stale || undefined}
      title={props.title}
    >
      {label}
      {props.stale && (
        <span className={styles.staleIcon} title="Refreshing analysis…">
          ⏳
        </span>
      )}
    </span>
  );
}
