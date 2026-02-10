// ABOUTME: Compact buy/hold/sell badge used in the screener list (desktop + mobile).

"use client";

import type { Recommendation } from "@/lib/ai/types";
import styles from "./ai-recommendation-badge.module.css";

export function AiRecommendationBadge(props: {
  recommendation: Recommendation;
  labels: { buy: string; hold: string; sell: string };
  title?: string;
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
      title={props.title}
    >
      {label}
    </span>
  );
}

