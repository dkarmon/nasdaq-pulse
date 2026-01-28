// ABOUTME: Collapsible section component for mobile stock detail view.
// ABOUTME: Animates content expansion with expand/collapse toggle button.

"use client";

import { useState } from "react";
import styles from "./collapsible-section.module.css";

type CollapsibleSectionProps = {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
};

export function CollapsibleSection({
  title,
  defaultExpanded = true,
  children,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={styles.section}>
      <button
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        data-expanded={isExpanded}
        aria-expanded={isExpanded}
      >
        <span className={styles.title}>{title}</span>
        <span className={styles.indicator}>
          {isExpanded ? "▲" : "▼"}
        </span>
      </button>
      {isExpanded && (
        <div className={styles.content}>
          {children}
        </div>
      )}
    </div>
  );
}
