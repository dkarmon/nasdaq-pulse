// ABOUTME: Access denied page shown when user's email is not allowlisted.
// ABOUTME: Clean, modern design matching the overall app aesthetic.

import Link from "next/link";
import styles from "./denied.module.css";

export default function AccessDenied() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.iconContainer}>
            <span className={styles.icon}>🔒</span>
          </div>

          <h1 className={styles.title}>Access not granted</h1>
          <p className={styles.subtitle}>אין הרשאה</p>

          <p className={styles.message}>
            Your Google account is not on the approved list. Please contact the
            administrator or try signing in with a different email.
          </p>
          <p className={styles.messageHe}>
            החשבון שלך אינו ברשימת המאושרים. פנו למנהל או נסו להתחבר עם מייל אחר.
          </p>

          <div className={styles.actions}>
            <Link href="/" className={styles.primaryButton}>
              Back to home
              <span className={styles.arrow}>→</span>
            </Link>
          </div>
        </div>

        <p className={styles.footer}>
          Need help? Contact your administrator.
        </p>
      </div>
    </div>
  );
}
