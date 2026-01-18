// ABOUTME: Reusable error fallback component for error boundaries.
// ABOUTME: Displays error message with optional retry functionality.

"use client";

import styles from "./error-fallback.module.css";

type ErrorFallbackProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorFallback({
  title = "Something went wrong",
  message = "An error occurred. Please try again.",
  onRetry,
  retryLabel = "Try again",
}: ErrorFallbackProps) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>⚠️</div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>
        {onRetry && (
          <button className={styles.button} onClick={onRetry}>
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
