// ABOUTME: Email verification page shown after magic link sign-in request.
// ABOUTME: Bilingual messaging directing user to check their email.

import Link from "next/link";
import styles from "./verify-request.module.css";

export default function VerifyRequest() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.iconContainer}>
            <span className={styles.icon}>📧</span>
          </div>

          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.subtitle}>בדקו את המייל</p>

          <p className={styles.message}>
            We sent a sign-in link to your email address. Click the link in your
            email to continue signing in.
          </p>
          <p className={styles.messageHe}>
            שלחנו קישור התחברות לכתובת המייל שלכם. לחצו על הקישור במייל כדי
            להמשיך.
          </p>

          <div className={styles.actions}>
            <Link href="/" className={styles.primaryButton}>
              Back to home
              <span className={styles.arrow}>→</span>
            </Link>
          </div>
        </div>

        <p className={styles.footer}>
          Didn't receive the email? Check your spam folder.
        </p>
      </div>
    </div>
  );
}
