// ABOUTME: Loading skeleton for the pulse page during data fetching.
// ABOUTME: Displays placeholder UI while screener data loads.

import styles from "./loading.module.css";

export default function Loading() {
  return (
    <div className="page-shell">
      <div className="container">
        <div className={styles.skeleton}>
          <div className={styles.header}>
            <div className={styles.badge} />
            <div className={styles.title} />
          </div>

          <div className={styles.controls}>
            <div className={styles.pillGroup}>
              <div className={styles.pill} />
              <div className={styles.pill} />
              <div className={styles.pill} />
            </div>
            <div className={styles.pillGroup}>
              <div className={styles.pill} />
              <div className={styles.pill} />
              <div className={styles.pill} />
            </div>
          </div>

          <div className={styles.table}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.row}>
                <div className={styles.cellWide} />
                <div className={styles.cell} />
                <div className={styles.cell} />
                <div className={styles.cell} />
                <div className={styles.cellButton} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
