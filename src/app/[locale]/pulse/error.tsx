// ABOUTME: Error boundary for the pulse page.
// ABOUTME: Displays user-friendly error message with retry option.

"use client";

import { useEffect } from "react";
import Link from "next/link";
import styles from "./error.module.css";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Pulse page error:", error);
  }, [error]);

  return (
    <div className="page-shell">
      <div className="container">
        <div className={styles.errorContainer}>
          <div className={styles.icon}>⚠️</div>
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.message}>
            We couldn&apos;t load the screener data. This might be a temporary issue.
          </p>
          {error.digest && (
            <p className={styles.digest}>Error ID: {error.digest}</p>
          )}
          <div className={styles.actions}>
            <button className="btn primary" onClick={reset}>
              Try again
            </button>
            <Link href="/" className="btn secondary">
              Go home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
